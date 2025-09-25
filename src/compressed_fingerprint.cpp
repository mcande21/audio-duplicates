#include "compressed_fingerprint.h"
#include <stdexcept>
#include <cstring>

namespace AudioDuplicates {

CompressedFingerprint::CompressedFingerprint()
    : original_size_(0), sample_rate_(0), duration_(0.0) {
}

CompressedFingerprint::~CompressedFingerprint() {
    // Vector automatically cleans up
}

CompressedFingerprint::CompressedFingerprint(std::vector<uint8_t>&& data, size_t original_size,
                                           int sample_rate, double duration, const std::string& file_path)
    : compressed_data_(std::move(data)), original_size_(original_size),
      sample_rate_(sample_rate), duration_(duration), file_path_(file_path) {
}

std::unique_ptr<CompressedFingerprint> CompressedFingerprint::compress(const Fingerprint& fingerprint) {
    if (fingerprint.data.empty()) {
        throw std::invalid_argument("Cannot compress empty fingerprint");
    }

    // Calculate sizes
    const size_t original_size = fingerprint.data.size() * sizeof(uint32_t);
    const int max_compressed_size = LZ4_compressBound(static_cast<int>(original_size));

    if (max_compressed_size <= 0) {
        throw std::runtime_error("Failed to calculate compression bound");
    }

    // Prepare compression buffer
    std::vector<uint8_t> compressed_buffer(max_compressed_size);

    // Compress fingerprint data using LZ4
    const int compressed_size = LZ4_compress_default(
        reinterpret_cast<const char*>(fingerprint.data.data()),
        reinterpret_cast<char*>(compressed_buffer.data()),
        static_cast<int>(original_size),
        max_compressed_size
    );

    if (compressed_size <= 0) {
        throw std::runtime_error("LZ4 compression failed");
    }

    // Resize buffer to actual compressed size
    compressed_buffer.resize(compressed_size);

    // Create compressed fingerprint
    return std::unique_ptr<CompressedFingerprint>(
        new CompressedFingerprint(
            std::move(compressed_buffer),
            original_size,
            fingerprint.sample_rate,
            fingerprint.duration,
            fingerprint.file_path
        )
    );
}

std::unique_ptr<Fingerprint> CompressedFingerprint::decompress() const {
    if (!isValid()) {
        throw std::invalid_argument("Cannot decompress invalid fingerprint");
    }

    // Create decompression buffer
    const size_t data_count = original_size_ / sizeof(uint32_t);
    std::vector<uint32_t> decompressed_data(data_count);

    // Decompress using LZ4
    const int decompressed_size = LZ4_decompress_safe(
        reinterpret_cast<const char*>(compressed_data_.data()),
        reinterpret_cast<char*>(decompressed_data.data()),
        static_cast<int>(compressed_data_.size()),
        static_cast<int>(original_size_)
    );

    if (decompressed_size < 0) {
        throw std::runtime_error("LZ4 decompression failed");
    }

    if (static_cast<size_t>(decompressed_size) != original_size_) {
        throw std::runtime_error("Decompressed size mismatch");
    }

    // Create fingerprint
    auto fingerprint = std::make_unique<Fingerprint>();
    fingerprint->data = std::move(decompressed_data);
    fingerprint->sample_rate = sample_rate_;
    fingerprint->duration = duration_;
    fingerprint->file_path = file_path_;

    return fingerprint;
}

} // namespace AudioDuplicates