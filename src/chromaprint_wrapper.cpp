#include "chromaprint_wrapper.h"
#include "audio_preprocessor.h"
#include <algorithm>
#include <stdexcept>
#include <iostream>

namespace AudioDuplicates {

ChromaprintWrapper::ChromaprintWrapper()
    : context_(nullptr), algorithm_(CHROMAPRINT_ALGORITHM_DEFAULT) {
    if (!initialize_context()) {
        throw std::runtime_error("Failed to initialize Chromaprint context");
    }
}

ChromaprintWrapper::~ChromaprintWrapper() {
    cleanup_context();
}

std::unique_ptr<Fingerprint> ChromaprintWrapper::generate_fingerprint(const std::string& file_path) {
    try {
        auto audio_data = audio_loader_.load(file_path);
        return generate_fingerprint(*audio_data, file_path);
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to generate fingerprint for " + file_path + ": " + e.what());
    }
}

std::unique_ptr<Fingerprint> ChromaprintWrapper::generate_fingerprint(const AudioData& audio_data, const std::string& file_path) {
    if (audio_data.samples.empty()) {
        throw std::runtime_error("Empty audio data");
    }

    // Resample to Chromaprint's required sample rate if necessary
    std::unique_ptr<AudioData> resampled_data;
    const AudioData* data_to_use = &audio_data;

    if (audio_data.sample_rate != CHROMAPRINT_SAMPLE_RATE) {
        resampled_data = audio_loader_.resample(audio_data, CHROMAPRINT_SAMPLE_RATE);
        data_to_use = resampled_data.get();
    }

    // Double short audio files to meet minimum duration requirement
    std::vector<float> samples_to_process = data_to_use->samples;
    const double MIN_DURATION_THRESHOLD = 3.0; // seconds

    if (data_to_use->duration < MIN_DURATION_THRESHOLD) {
        // Double the audio by concatenating it with itself
        samples_to_process.reserve(data_to_use->samples.size() * 2);
        samples_to_process.insert(samples_to_process.end(),
                                data_to_use->samples.begin(),
                                data_to_use->samples.end());
    }

    // Convert float samples to 16-bit integers for Chromaprint
    std::vector<int16_t> int_samples(samples_to_process.size());
    std::transform(samples_to_process.begin(), samples_to_process.end(), int_samples.begin(),
                   [](float sample) {
                       // Clamp and convert to 16-bit
                       float clamped = std::max(-1.0f, std::min(1.0f, sample));
                       return static_cast<int16_t>(clamped * 32767.0f);
                   });

    // Start Chromaprint processing
    if (!chromaprint_start(context_, CHROMAPRINT_SAMPLE_RATE, 1)) {
        throw std::runtime_error("Failed to start Chromaprint processing");
    }

    // Feed audio data to Chromaprint
    if (!chromaprint_feed(context_, int_samples.data(), int_samples.size())) {
        throw std::runtime_error("Failed to feed audio data to Chromaprint");
    }

    // Finish processing and get fingerprint
    if (!chromaprint_finish(context_)) {
        throw std::runtime_error("Failed to finish Chromaprint processing");
    }

    // Get raw fingerprint data
    uint32_t* fp_data = nullptr;
    int fp_size = 0;

    if (!chromaprint_get_raw_fingerprint(context_, &fp_data, &fp_size)) {
        throw std::runtime_error("Failed to get raw fingerprint from Chromaprint");
    }

    // Create fingerprint object
    auto fingerprint = std::make_unique<Fingerprint>();
    fingerprint->data.assign(fp_data, fp_data + fp_size);
    fingerprint->sample_rate = CHROMAPRINT_SAMPLE_RATE;
    fingerprint->duration = data_to_use->duration;
    fingerprint->file_path = file_path;

    // Free Chromaprint-allocated memory
    chromaprint_dealloc(fp_data);

    return fingerprint;
}

std::unique_ptr<Fingerprint> ChromaprintWrapper::generate_fingerprint_limited(const std::string& file_path, int max_duration) {
    try {
        auto audio_data = audio_loader_.load(file_path);

        // Limit audio duration if necessary
        if (audio_data->duration > max_duration) {
            size_t max_samples = max_duration * audio_data->sample_rate;
            if (audio_data->samples.size() > max_samples) {
                audio_data->samples.resize(max_samples);
                audio_data->frames = max_samples;
                audio_data->duration = max_duration;
            }
        }

        return generate_fingerprint(*audio_data, file_path);
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to generate limited fingerprint for " + file_path + ": " + e.what());
    }
}

std::unique_ptr<Fingerprint> ChromaprintWrapper::generate_fingerprint_with_preprocessing(
    const std::string& file_path, const PreprocessConfig& config) {
    try {
        // Load with preprocessing
        auto audio_data = audio_loader_.load_with_preprocessing(file_path, &config);
        return generate_fingerprint_with_smart_doubling(*audio_data, file_path, &config);
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to generate preprocessed fingerprint for " + file_path + ": " + e.what());
    }
}

std::unique_ptr<Fingerprint> ChromaprintWrapper::generate_fingerprint_with_smart_doubling(
    const AudioData& audio_data, const std::string& file_path, const PreprocessConfig* config) {
    if (audio_data.samples.empty()) {
        throw std::runtime_error("Empty audio data");
    }

    // Resample to Chromaprint's required sample rate if necessary
    std::unique_ptr<AudioData> resampled_data;
    const AudioData* data_to_use = &audio_data;

    if (audio_data.sample_rate != CHROMAPRINT_SAMPLE_RATE) {
        resampled_data = audio_loader_.resample(audio_data, CHROMAPRINT_SAMPLE_RATE);
        data_to_use = resampled_data.get();
    }

    // Smart doubling logic based on preprocessing config
    std::vector<float> samples_to_process = data_to_use->samples;
    const double MIN_DURATION_THRESHOLD = 3.0; // seconds
    bool should_double = false;

    if (data_to_use->duration < MIN_DURATION_THRESHOLD) {
        if (config && config->disable_doubling_after_trim) {
            // Check if audio was significantly trimmed
            double trimming_ratio = data_to_use->duration / data_to_use->original_duration;

            // If audio was significantly trimmed, be more conservative about doubling
            if (trimming_ratio < config->doubling_threshold_ratio) {
                // Only double if the original audio was long enough
                should_double = data_to_use->original_duration >= config->min_duration_for_doubling;
            } else {
                // Audio wasn't trimmed much, safe to double
                should_double = true;
            }
        } else {
            // Default behavior: always double short audio
            should_double = true;
        }

        if (should_double) {
            // Double the audio by concatenating it with itself
            samples_to_process.reserve(data_to_use->samples.size() * 2);
            samples_to_process.insert(samples_to_process.end(),
                                    data_to_use->samples.begin(),
                                    data_to_use->samples.end());
        }
    }

    // Convert float samples to 16-bit integers for Chromaprint
    std::vector<int16_t> int_samples(samples_to_process.size());
    std::transform(samples_to_process.begin(), samples_to_process.end(), int_samples.begin(),
                   [](float sample) {
                       // Clamp and convert to 16-bit
                       float clamped = std::max(-1.0f, std::min(1.0f, sample));
                       return static_cast<int16_t>(clamped * 32767.0f);
                   });

    // Start Chromaprint processing
    if (!chromaprint_start(context_, CHROMAPRINT_SAMPLE_RATE, 1)) {
        throw std::runtime_error("Failed to start Chromaprint processing");
    }

    // Feed audio data to Chromaprint
    if (!chromaprint_feed(context_, int_samples.data(), int_samples.size())) {
        throw std::runtime_error("Failed to feed audio data to Chromaprint");
    }

    // Finish processing and get fingerprint
    if (!chromaprint_finish(context_)) {
        throw std::runtime_error("Failed to finish Chromaprint processing");
    }

    // Get raw fingerprint data
    uint32_t* fp_data = nullptr;
    int fp_size = 0;

    if (!chromaprint_get_raw_fingerprint(context_, &fp_data, &fp_size)) {
        throw std::runtime_error("Failed to get raw fingerprint from Chromaprint");
    }

    // Create fingerprint object
    auto fingerprint = std::make_unique<Fingerprint>();
    fingerprint->data.assign(fp_data, fp_data + fp_size);
    fingerprint->sample_rate = CHROMAPRINT_SAMPLE_RATE;
    fingerprint->duration = data_to_use->duration;
    fingerprint->file_path = file_path;

    // Free Chromaprint-allocated memory
    chromaprint_dealloc(fp_data);

    return fingerprint;
}

void ChromaprintWrapper::set_algorithm(int algorithm) {
    algorithm_ = algorithm;
    cleanup_context();
    if (!initialize_context()) {
        throw std::runtime_error("Failed to reinitialize Chromaprint context with new algorithm");
    }
}

std::string ChromaprintWrapper::get_algorithm_name(int algorithm) {
    switch (algorithm) {
        case CHROMAPRINT_ALGORITHM_TEST1: return "TEST1";
        case CHROMAPRINT_ALGORITHM_TEST2: return "TEST2"; // Also DEFAULT
        case CHROMAPRINT_ALGORITHM_TEST3: return "TEST3";
        case CHROMAPRINT_ALGORITHM_TEST4: return "TEST4";
        case CHROMAPRINT_ALGORITHM_TEST5: return "TEST5";
        default: return "UNKNOWN";
    }
}

std::vector<int> ChromaprintWrapper::get_available_algorithms() {
    return {
        CHROMAPRINT_ALGORITHM_TEST1,
        CHROMAPRINT_ALGORITHM_TEST2,
        CHROMAPRINT_ALGORITHM_TEST3,
        CHROMAPRINT_ALGORITHM_TEST4,
        CHROMAPRINT_ALGORITHM_DEFAULT
    };
}

bool ChromaprintWrapper::is_valid_fingerprint(const Fingerprint& fp) {
    return !fp.data.empty() &&
           fp.sample_rate > 0 &&
           fp.duration > 0.0 &&
           fp.data.size() < 100000; // Reasonable upper limit
}

bool ChromaprintWrapper::initialize_context() {
    cleanup_context();
    context_ = chromaprint_new(algorithm_);
    return context_ != nullptr;
}

void ChromaprintWrapper::cleanup_context() {
    if (context_) {
        chromaprint_free(context_);
        context_ = nullptr;
    }
}

}