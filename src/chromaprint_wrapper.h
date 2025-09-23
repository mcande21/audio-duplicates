#pragma once

#include <vector>
#include <string>
#include <memory>
#include <chromaprint.h>
#include "audio_loader.h"

namespace AudioDuplicates {

// Forward declaration
struct PreprocessConfig;

struct Fingerprint {
    std::vector<uint32_t> data;
    int sample_rate;
    double duration;
    std::string file_path;
};

class ChromaprintWrapper {
public:
    ChromaprintWrapper();
    ~ChromaprintWrapper();

    // Generate fingerprint from file path
    std::unique_ptr<Fingerprint> generate_fingerprint(const std::string& file_path);

    // Generate fingerprint from audio data
    std::unique_ptr<Fingerprint> generate_fingerprint(const AudioData& audio_data, const std::string& file_path = "");

    // Generate fingerprint with specific duration limit (in seconds)
    std::unique_ptr<Fingerprint> generate_fingerprint_limited(const std::string& file_path, int max_duration);

    // Generate fingerprint with preprocessing
    std::unique_ptr<Fingerprint> generate_fingerprint_with_preprocessing(const std::string& file_path, const PreprocessConfig& config);

    // Generate fingerprint from audio data with smart doubling logic
    std::unique_ptr<Fingerprint> generate_fingerprint_with_smart_doubling(const AudioData& audio_data, const std::string& file_path, const PreprocessConfig* config = nullptr);

    // Configure Chromaprint algorithm (default is CHROMAPRINT_ALGORITHM_DEFAULT)
    void set_algorithm(int algorithm);

    // Get algorithm information
    static std::string get_algorithm_name(int algorithm);
    static std::vector<int> get_available_algorithms();

    // Validate fingerprint data
    static bool is_valid_fingerprint(const Fingerprint& fp);

private:
    ChromaprintContext* context_;
    AudioLoader audio_loader_;
    int algorithm_;

    static const int CHROMAPRINT_SAMPLE_RATE = 11025;
    static const int DEFAULT_MAX_DURATION = 120; // seconds

    // Initialize Chromaprint context
    bool initialize_context();

    // Free Chromaprint context
    void cleanup_context();
};

}