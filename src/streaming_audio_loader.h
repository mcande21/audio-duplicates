#pragma once

#include <string>
#include <memory>
#include <functional>
#include "chromaprint_wrapper.h"
#include "compressed_fingerprint.h"
#include "audio_memory_pool.h"
#include "audio_loader.h"

namespace AudioDuplicates {

/**
 * Streaming audio loader that processes files in chunks without loading entire file into memory
 * Uses memory pool for efficient buffer management and produces compressed fingerprints
 */
class StreamingAudioLoader {
public:
    StreamingAudioLoader();
    ~StreamingAudioLoader();

    // Callback for progress reporting during streaming
    using ProgressCallback = std::function<void(size_t bytes_processed, size_t total_bytes, double progress)>;

    // Generate compressed fingerprint from file using streaming approach
    std::unique_ptr<CompressedFingerprint> generateStreamingFingerprint(
        const std::string& file_path,
        ProgressCallback progress_callback = nullptr
    );

    // Generate compressed fingerprint with duration limit
    std::unique_ptr<CompressedFingerprint> generateStreamingFingerprintLimited(
        const std::string& file_path,
        int max_duration_seconds,
        ProgressCallback progress_callback = nullptr
    );

    // Configuration
    void setChunkSize(size_t chunk_size) { chunk_size_ = chunk_size; }
    size_t getChunkSize() const { return chunk_size_; }

    void setAlgorithm(int algorithm) { algorithm_ = algorithm; }
    int getAlgorithm() const { return algorithm_; }

    // Memory usage statistics
    struct StreamingStats {
        size_t total_bytes_processed;
        size_t peak_memory_usage;
        double compression_ratio;
        double processing_time_seconds;
    };
    StreamingStats getLastStats() const { return last_stats_; }

private:
    AudioLoader audio_loader_;
    size_t chunk_size_;
    int algorithm_;
    mutable StreamingStats last_stats_;

    static constexpr size_t DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
    static constexpr size_t MAX_CHUNK_SIZE = 16 * 1024 * 1024; // 16MB
    static constexpr int CHROMAPRINT_SAMPLE_RATE = 11025;

    // Internal streaming implementation
    std::unique_ptr<CompressedFingerprint> processFileStream(
        const std::string& file_path,
        int max_duration_seconds,
        ProgressCallback progress_callback
    );

    // Validate chunk size
    void validateChunkSize();
};

} // namespace AudioDuplicates