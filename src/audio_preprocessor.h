#pragma once

#include "audio_loader.h"
#include <vector>
#include <memory>

namespace AudioDuplicates {

// Configuration for audio preprocessing
struct PreprocessConfig {
    // Silence trimming options
    bool trim_silence = true;
    float silence_threshold_db = -55.0f;  // dB threshold for silence detection
    int min_silence_duration_ms = 100;    // Minimum silence duration to trim (ms)
    int preserve_padding_ms = 100;        // Amount of silence to preserve at edges (ms)

    // Sample rate normalization
    bool normalize_sample_rate = true;
    int target_sample_rate = 44100;       // Target sample rate for normalization

    // Volume normalization
    bool normalize_volume = true;
    float target_peak_db = -3.0f;         // Target peak level in dB
    bool use_rms_normalization = true;    // Use RMS instead of peak normalization
    float target_rms_db = -20.0f;         // Target RMS level in dB

    // Advanced options
    float noise_floor_db = -60.0f;        // Noise floor for silence detection
    bool apply_gentle_compression = false; // Apply dynamic range compression
    float compression_ratio = 2.0f;       // Compression ratio (if enabled)

    // Doubling behavior control
    bool disable_doubling_after_trim = true;  // Don't double if audio was trimmed significantly
    double doubling_threshold_ratio = 0.5;    // If trimmed audio is < ratio * original, consider doubling
    double min_duration_for_doubling = 1.5;   // Minimum duration (sec) before considering doubling
};

class AudioPreprocessor {
public:
    AudioPreprocessor();
    ~AudioPreprocessor();

    // Set preprocessing configuration
    void set_config(const PreprocessConfig& config);
    const PreprocessConfig& get_config() const;

    // Main preprocessing function
    std::unique_ptr<AudioData> process(const AudioData& input);

    // Individual preprocessing steps (can be called separately)
    std::unique_ptr<AudioData> trim_silence(const AudioData& input);
    std::unique_ptr<AudioData> normalize_sample_rate(const AudioData& input);
    std::unique_ptr<AudioData> normalize_volume(const AudioData& input);

    // Utility functions
    bool detect_silence_segment(const std::vector<float>& samples, int start_sample,
                               int sample_count, float threshold_db);
    float calculate_rms(const std::vector<float>& samples, int start_sample = 0, int count = -1);
    float calculate_peak(const std::vector<float>& samples, int start_sample = 0, int count = -1);
    float db_to_linear(float db);
    float linear_to_db(float linear);

    // Silence detection helpers
    int find_first_non_silent_sample(const std::vector<float>& samples, int sample_rate);
    int find_last_non_silent_sample(const std::vector<float>& samples, int sample_rate);

private:
    PreprocessConfig config_;

    // Internal resampling using higher quality algorithm
    std::vector<float> resample_sinc(const std::vector<float>& input,
                                   int input_rate, int output_rate);

    // Dynamic range compression
    std::vector<float> apply_compression(const std::vector<float>& input,
                                       float ratio, float threshold_db);

    // Moving average filter for noise reduction
    std::vector<float> apply_moving_average(const std::vector<float>& input, int window_size);

    // Energy calculation for silence detection
    float calculate_energy(const std::vector<float>& samples, int start, int count);
};

// Convenience function for one-shot preprocessing
std::unique_ptr<AudioData> preprocess_audio(const AudioData& input,
                                           const PreprocessConfig& config = PreprocessConfig{});

}  // namespace AudioDuplicates