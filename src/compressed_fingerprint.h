#pragma once

#include <vector>
#include <string>
#include <memory>
#include <cstdint>
#include <lz4.h>
#include "chromaprint_wrapper.h"

namespace AudioDuplicates {

/**
 * Compressed fingerprint with LZ4 compression for memory optimization
 * Reduces fingerprint memory usage by 60-70% while maintaining fast decompression
 */
class CompressedFingerprint {
public:
    CompressedFingerprint();
    ~CompressedFingerprint();

    // Create compressed fingerprint from regular fingerprint
    static std::unique_ptr<CompressedFingerprint> compress(const Fingerprint& fingerprint);

    // Decompress back to regular fingerprint
    std::unique_ptr<Fingerprint> decompress() const;

    // Get compressed size in bytes
    size_t getCompressedSize() const { return compressed_data_.size(); }

    // Get original size in bytes
    size_t getOriginalSize() const { return original_size_; }

    // Get compression ratio (0.0-1.0, lower is better compression)
    double getCompressionRatio() const {
        return static_cast<double>(compressed_data_.size()) / original_size_;
    }

    // Check if compression was successful
    bool isValid() const { return !compressed_data_.empty() && original_size_ > 0; }

    // Get metadata
    int getSampleRate() const { return sample_rate_; }
    double getDuration() const { return duration_; }
    const std::string& getFilePath() const { return file_path_; }

private:
    std::vector<uint8_t> compressed_data_;
    size_t original_size_;
    int sample_rate_;
    double duration_;
    std::string file_path_;

    // Private constructor for internal use
    CompressedFingerprint(std::vector<uint8_t>&& data, size_t original_size,
                         int sample_rate, double duration, const std::string& file_path);
};

} // namespace AudioDuplicates