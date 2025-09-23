#include "audio_preprocessor.h"
#include <algorithm>
#include <cmath>
#include <iostream>
#include <stdexcept>

namespace AudioDuplicates {

AudioPreprocessor::AudioPreprocessor() {
    // Default configuration is set in the struct initialization
}

AudioPreprocessor::~AudioPreprocessor() {
}

void AudioPreprocessor::set_config(const PreprocessConfig& config) {
    config_ = config;
}

const PreprocessConfig& AudioPreprocessor::get_config() const {
    return config_;
}

std::unique_ptr<AudioData> AudioPreprocessor::process(const AudioData& input) {
    auto processed = std::make_unique<AudioData>(input);

    try {
        // Step 1: Trim silence if enabled
        if (config_.trim_silence) {
            auto trimmed = trim_silence(*processed);
            if (trimmed) {
                processed = std::move(trimmed);
            }
        }

        // Step 2: Normalize sample rate if enabled
        if (config_.normalize_sample_rate && processed->sample_rate != config_.target_sample_rate) {
            auto resampled = normalize_sample_rate(*processed);
            if (resampled) {
                processed = std::move(resampled);
            }
        }

        // Step 3: Normalize volume if enabled
        if (config_.normalize_volume) {
            auto normalized = normalize_volume(*processed);
            if (normalized) {
                processed = std::move(normalized);
            }
        }

        return processed;

    } catch (const std::exception& e) {
        std::cerr << "Audio preprocessing failed: " << e.what() << std::endl;
        // Return original data if preprocessing fails
        return std::make_unique<AudioData>(input);
    }
}

std::unique_ptr<AudioData> AudioPreprocessor::trim_silence(const AudioData& input) {
    if (input.samples.empty()) {
        return std::make_unique<AudioData>(input);
    }

    // Find first and last non-silent samples
    int first_non_silent = find_first_non_silent_sample(input.samples, input.sample_rate);
    int last_non_silent = find_last_non_silent_sample(input.samples, input.sample_rate);

    // If entire audio is silent, return minimal audio with padding
    if (first_non_silent == -1 || last_non_silent == -1) {
        int padding_samples = (config_.preserve_padding_ms * input.sample_rate) / 1000;
        padding_samples = std::min(padding_samples, static_cast<int>(input.samples.size()));

        auto result = std::make_unique<AudioData>();
        result->sample_rate = input.sample_rate;
        result->channels = input.channels;
        result->samples.resize(padding_samples, 0.0f);
        result->frames = padding_samples;
        result->duration = static_cast<double>(padding_samples) / input.sample_rate;
        result->original_duration = input.original_duration;

        return result;
    }

    // Calculate padding in samples
    int padding_samples = (config_.preserve_padding_ms * input.sample_rate) / 1000;

    // Adjust boundaries to include padding
    int start_sample = std::max(0, first_non_silent - padding_samples);
    int end_sample = std::min(static_cast<int>(input.samples.size()) - 1,
                             last_non_silent + padding_samples);

    // Create trimmed audio data
    auto result = std::make_unique<AudioData>();
    result->sample_rate = input.sample_rate;
    result->channels = input.channels;

    int trimmed_length = end_sample - start_sample + 1;
    result->samples.resize(trimmed_length);

    std::copy(input.samples.begin() + start_sample,
              input.samples.begin() + start_sample + trimmed_length,
              result->samples.begin());

    result->frames = trimmed_length;
    result->duration = static_cast<double>(trimmed_length) / input.sample_rate;
    result->original_duration = input.original_duration;

    return result;
}

std::unique_ptr<AudioData> AudioPreprocessor::normalize_sample_rate(const AudioData& input) {
    if (input.sample_rate == config_.target_sample_rate) {
        return std::make_unique<AudioData>(input);
    }

    // Use higher quality sinc resampling
    std::vector<float> resampled = resample_sinc(input.samples,
                                               input.sample_rate,
                                               config_.target_sample_rate);

    auto result = std::make_unique<AudioData>();
    result->sample_rate = config_.target_sample_rate;
    result->channels = input.channels;
    result->samples = std::move(resampled);
    result->frames = result->samples.size();
    result->duration = static_cast<double>(result->frames) / result->sample_rate;
    result->original_duration = input.original_duration;

    return result;
}

std::unique_ptr<AudioData> AudioPreprocessor::normalize_volume(const AudioData& input) {
    if (input.samples.empty()) {
        return std::make_unique<AudioData>(input);
    }

    auto result = std::make_unique<AudioData>(input);

    float current_level, target_level, gain;

    if (config_.use_rms_normalization) {
        // RMS normalization for perceptual consistency
        current_level = calculate_rms(input.samples);
        target_level = db_to_linear(config_.target_rms_db);
    } else {
        // Peak normalization
        current_level = calculate_peak(input.samples);
        target_level = db_to_linear(config_.target_peak_db);
    }

    // Avoid division by zero and extreme gain values
    if (current_level < db_to_linear(config_.noise_floor_db)) {
        // Signal is too quiet, apply minimal gain
        gain = db_to_linear(-20.0f);
    } else {
        gain = target_level / current_level;
        // Limit gain to reasonable range
        gain = std::clamp(gain, 0.1f, 10.0f);
    }

    // Apply gain to all samples
    for (float& sample : result->samples) {
        sample *= gain;
        // Prevent clipping
        sample = std::clamp(sample, -1.0f, 1.0f);
    }

    return result;
}

bool AudioPreprocessor::detect_silence_segment(const std::vector<float>& samples,
                                             int start_sample, int sample_count,
                                             float threshold_db) {
    if (start_sample < 0 || start_sample >= static_cast<int>(samples.size())) {
        return true; // Out of bounds is considered silence
    }

    int end_sample = std::min(start_sample + sample_count,
                             static_cast<int>(samples.size()));

    float energy = calculate_energy(samples, start_sample, end_sample - start_sample);
    float energy_db = linear_to_db(energy);

    return energy_db < threshold_db;
}

float AudioPreprocessor::calculate_rms(const std::vector<float>& samples,
                                     int start_sample, int count) {
    if (samples.empty()) return 0.0f;

    int start = std::max(0, start_sample);
    int end = (count < 0) ? static_cast<int>(samples.size()) :
              std::min(start + count, static_cast<int>(samples.size()));

    if (start >= end) return 0.0f;

    float sum_squares = 0.0f;
    for (int i = start; i < end; ++i) {
        sum_squares += samples[i] * samples[i];
    }

    return std::sqrt(sum_squares / (end - start));
}

float AudioPreprocessor::calculate_peak(const std::vector<float>& samples,
                                      int start_sample, int count) {
    if (samples.empty()) return 0.0f;

    int start = std::max(0, start_sample);
    int end = (count < 0) ? static_cast<int>(samples.size()) :
              std::min(start + count, static_cast<int>(samples.size()));

    if (start >= end) return 0.0f;

    float peak = 0.0f;
    for (int i = start; i < end; ++i) {
        peak = std::max(peak, std::abs(samples[i]));
    }

    return peak;
}

float AudioPreprocessor::db_to_linear(float db) {
    return std::pow(10.0f, db / 20.0f);
}

float AudioPreprocessor::linear_to_db(float linear) {
    if (linear <= 0.0f) return -100.0f; // Very quiet
    return 20.0f * std::log10(linear);
}

int AudioPreprocessor::find_first_non_silent_sample(const std::vector<float>& samples,
                                                   int sample_rate) {
    if (samples.empty()) return -1;

    int chunk_size = sample_rate / 100; // 10ms chunks
    chunk_size = std::max(1, chunk_size);

    for (int i = 0; i < static_cast<int>(samples.size()); i += chunk_size) {
        int count = std::min(chunk_size, static_cast<int>(samples.size()) - i);

        if (!detect_silence_segment(samples, i, count, config_.silence_threshold_db)) {
            return i;
        }
    }

    return -1; // All silent
}

int AudioPreprocessor::find_last_non_silent_sample(const std::vector<float>& samples,
                                                  int sample_rate) {
    if (samples.empty()) return -1;

    int chunk_size = sample_rate / 100; // 10ms chunks
    chunk_size = std::max(1, chunk_size);

    for (int i = static_cast<int>(samples.size()) - chunk_size; i >= 0; i -= chunk_size) {
        int count = std::min(chunk_size, static_cast<int>(samples.size()) - i);

        if (!detect_silence_segment(samples, i, count, config_.silence_threshold_db)) {
            return i + count - 1;
        }
    }

    return -1; // All silent
}

std::vector<float> AudioPreprocessor::resample_sinc(const std::vector<float>& input,
                                                   int input_rate, int output_rate) {
    if (input.empty() || input_rate == output_rate) {
        return input;
    }

    // Simple linear interpolation for now - can be replaced with libsamplerate later
    double ratio = static_cast<double>(output_rate) / input_rate;
    size_t output_size = static_cast<size_t>(input.size() * ratio);

    std::vector<float> output(output_size);

    for (size_t i = 0; i < output_size; ++i) {
        double src_index = i / ratio;
        size_t src_index_floor = static_cast<size_t>(src_index);

        if (src_index_floor >= input.size() - 1) {
            output[i] = input.back();
        } else {
            double fraction = src_index - src_index_floor;
            output[i] = input[src_index_floor] * (1.0 - fraction) +
                       input[src_index_floor + 1] * fraction;
        }
    }

    return output;
}

float AudioPreprocessor::calculate_energy(const std::vector<float>& samples,
                                         int start, int count) {
    if (start < 0 || start >= static_cast<int>(samples.size()) || count <= 0) {
        return 0.0f;
    }

    int end = std::min(start + count, static_cast<int>(samples.size()));
    float sum = 0.0f;

    for (int i = start; i < end; ++i) {
        sum += samples[i] * samples[i];
    }

    return sum / (end - start);
}

// Convenience function implementation
std::unique_ptr<AudioData> preprocess_audio(const AudioData& input,
                                           const PreprocessConfig& config) {
    AudioPreprocessor preprocessor;
    preprocessor.set_config(config);
    return preprocessor.process(input);
}

}  // namespace AudioDuplicates