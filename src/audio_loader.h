#pragma once

#include <vector>
#include <string>
#include <memory>
#include <sndfile.h>

namespace AudioDuplicates {

// Forward declaration
struct PreprocessConfig;

struct AudioData {
    std::vector<float> samples;
    int sample_rate;
    int channels;
    sf_count_t frames;
    double duration;
    double original_duration; // Duration before any preprocessing (trimming, etc.)
};

class AudioLoader {
public:
    AudioLoader();
    ~AudioLoader();

    // Load audio file and convert to mono float samples
    std::unique_ptr<AudioData> load(const std::string& file_path);

    // Load audio file with optional preprocessing
    std::unique_ptr<AudioData> load_with_preprocessing(const std::string& file_path,
                                                      const PreprocessConfig* config = nullptr);

    // Resample audio to target sample rate (for Chromaprint compatibility)
    std::unique_ptr<AudioData> resample(const AudioData& input, int target_sample_rate);

    // Get file metadata without loading full audio
    bool get_metadata(const std::string& file_path, int& sample_rate, int& channels, sf_count_t& frames, double& duration);

    // Check if file format is supported
    static bool is_supported_format(const std::string& file_path);

private:
    // Convert multi-channel audio to mono
    void convert_to_mono(std::vector<float>& samples, int channels);

    // Simple linear resampling (for basic sample rate conversion)
    std::vector<float> linear_resample(const std::vector<float>& input, int input_rate, int output_rate);
};

}