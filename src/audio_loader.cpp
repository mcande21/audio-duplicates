#include "audio_loader.h"
#include "audio_preprocessor.h"
#include <algorithm>
#include <cmath>
#include <iostream>
#include <stdexcept>

namespace AudioDuplicates {

AudioLoader::AudioLoader() {
}

AudioLoader::~AudioLoader() {
}

std::unique_ptr<AudioData> AudioLoader::load(const std::string& file_path) {
    SF_INFO sf_info;
    sf_info.format = 0;

    SNDFILE* file = sf_open(file_path.c_str(), SFM_READ, &sf_info);
    if (!file) {
        throw std::runtime_error("Failed to open audio file: " + file_path + " - " + sf_strerror(nullptr));
    }

    auto audio_data = std::make_unique<AudioData>();
    audio_data->sample_rate = sf_info.samplerate;
    audio_data->channels = sf_info.channels;
    audio_data->frames = sf_info.frames;
    audio_data->duration = static_cast<double>(sf_info.frames) / sf_info.samplerate;
    audio_data->original_duration = audio_data->duration; // Initialize original duration

    // Read all samples
    audio_data->samples.resize(sf_info.frames * sf_info.channels);
    sf_count_t read_count = sf_readf_float(file, audio_data->samples.data(), sf_info.frames);

    sf_close(file);

    if (read_count != sf_info.frames) {
        throw std::runtime_error("Failed to read complete audio file: " + file_path);
    }

    // Convert to mono if necessary
    if (sf_info.channels > 1) {
        convert_to_mono(audio_data->samples, sf_info.channels);
        audio_data->channels = 1;
    }

    return audio_data;
}

std::unique_ptr<AudioData> AudioLoader::load_with_preprocessing(const std::string& file_path,
                                                               const PreprocessConfig* config) {
    // First load the audio normally
    auto audio_data = load(file_path);
    if (!audio_data) {
        return nullptr;
    }

    // Apply preprocessing if config is provided
    if (config) {
        AudioPreprocessor preprocessor;
        preprocessor.set_config(*config);
        return preprocessor.process(*audio_data);
    }

    return audio_data;
}

std::unique_ptr<AudioData> AudioLoader::resample(const AudioData& input, int target_sample_rate) {
    if (input.sample_rate == target_sample_rate) {
        // No resampling needed, create a copy
        auto resampled = std::make_unique<AudioData>();
        resampled->samples = input.samples;
        resampled->sample_rate = input.sample_rate;
        resampled->channels = input.channels;
        resampled->frames = input.frames;
        resampled->duration = input.duration;
        resampled->original_duration = input.original_duration;
        return resampled;
    }

    auto resampled = std::make_unique<AudioData>();
    resampled->samples = linear_resample(input.samples, input.sample_rate, target_sample_rate);
    resampled->sample_rate = target_sample_rate;
    resampled->channels = input.channels;
    resampled->frames = resampled->samples.size();
    resampled->duration = static_cast<double>(resampled->frames) / target_sample_rate;
    resampled->original_duration = input.original_duration;

    return resampled;
}

bool AudioLoader::get_metadata(const std::string& file_path, int& sample_rate, int& channels, sf_count_t& frames, double& duration) {
    SF_INFO sf_info;
    sf_info.format = 0;

    SNDFILE* file = sf_open(file_path.c_str(), SFM_READ, &sf_info);
    if (!file) {
        return false;
    }

    sample_rate = sf_info.samplerate;
    channels = sf_info.channels;
    frames = sf_info.frames;
    duration = static_cast<double>(sf_info.frames) / sf_info.samplerate;

    sf_close(file);
    return true;
}

bool AudioLoader::is_supported_format(const std::string& file_path) {
    SF_INFO sf_info;
    sf_info.format = 0;

    SNDFILE* file = sf_open(file_path.c_str(), SFM_READ, &sf_info);
    if (!file) {
        return false;
    }

    sf_close(file);
    return true;
}

void AudioLoader::convert_to_mono(std::vector<float>& samples, int channels) {
    if (channels <= 1) return;

    size_t mono_size = samples.size() / channels;
    std::vector<float> mono_samples(mono_size);

    for (size_t i = 0; i < mono_size; ++i) {
        float sum = 0.0f;
        for (int ch = 0; ch < channels; ++ch) {
            sum += samples[i * channels + ch];
        }
        mono_samples[i] = sum / channels;
    }

    samples = std::move(mono_samples);
}

std::vector<float> AudioLoader::linear_resample(const std::vector<float>& input, int input_rate, int output_rate) {
    if (input_rate == output_rate) {
        return input;
    }

    double ratio = static_cast<double>(output_rate) / input_rate;
    size_t output_size = static_cast<size_t>(input.size() * ratio);
    std::vector<float> output(output_size);

    for (size_t i = 0; i < output_size; ++i) {
        double input_index = i / ratio;
        size_t index = static_cast<size_t>(input_index);
        double frac = input_index - index;

        if (index + 1 < input.size()) {
            // Linear interpolation
            output[i] = input[index] * (1.0 - frac) + input[index + 1] * frac;
        } else if (index < input.size()) {
            output[i] = input[index];
        } else {
            output[i] = 0.0f;
        }
    }

    return output;
}

}