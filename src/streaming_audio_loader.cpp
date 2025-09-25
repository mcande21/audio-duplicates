#include "streaming_audio_loader.h"
#include <chrono>
#include <stdexcept>
#include <cstring>
#include <algorithm>
#include <sndfile.h>
#include <chromaprint.h>

namespace AudioDuplicates {

StreamingAudioLoader::StreamingAudioLoader()
    : chunk_size_(DEFAULT_CHUNK_SIZE), algorithm_(CHROMAPRINT_ALGORITHM_DEFAULT) {
    validateChunkSize();
    std::memset(&last_stats_, 0, sizeof(last_stats_));
}

StreamingAudioLoader::~StreamingAudioLoader() {
    // Memory pool cleanup is handled by singleton
}

std::unique_ptr<CompressedFingerprint> StreamingAudioLoader::generateStreamingFingerprint(
    const std::string& file_path,
    ProgressCallback progress_callback) {

    return processFileStream(file_path, -1, progress_callback);
}

std::unique_ptr<CompressedFingerprint> StreamingAudioLoader::generateStreamingFingerprintLimited(
    const std::string& file_path,
    int max_duration_seconds,
    ProgressCallback progress_callback) {

    if (max_duration_seconds <= 0) {
        throw std::invalid_argument("Max duration must be positive");
    }

    return processFileStream(file_path, max_duration_seconds, progress_callback);
}

std::unique_ptr<CompressedFingerprint> StreamingAudioLoader::processFileStream(
    const std::string& file_path,
    int max_duration_seconds,
    ProgressCallback progress_callback) {

    auto start_time = std::chrono::high_resolution_clock::now();

    // Reset stats
    last_stats_ = {};

    // Open audio file
    SF_INFO sf_info;
    std::memset(&sf_info, 0, sizeof(sf_info));

    SNDFILE* file = sf_open(file_path.c_str(), SFM_READ, &sf_info);
    if (!file) {
        throw std::runtime_error("Failed to open audio file: " + file_path);
    }

    // Calculate processing parameters
    const int channels = sf_info.channels;
    const int original_sample_rate = sf_info.samplerate;
    const sf_count_t total_frames = sf_info.frames;
    const double total_duration = static_cast<double>(total_frames) / original_sample_rate;

    // Calculate frames to process
    sf_count_t max_frames_to_process = total_frames;
    if (max_duration_seconds > 0) {
        max_frames_to_process = std::min(
            total_frames,
            static_cast<sf_count_t>(max_duration_seconds * original_sample_rate)
        );
    }

    // Initialize Chromaprint
    ChromaprintContext* ctx = chromaprint_new(algorithm_);
    if (!ctx) {
        sf_close(file);
        throw std::runtime_error("Failed to create Chromaprint context");
    }

    if (!chromaprint_start(ctx, CHROMAPRINT_SAMPLE_RATE, 1)) {  // Always mono
        chromaprint_free(ctx);
        sf_close(file);
        throw std::runtime_error("Failed to start Chromaprint");
    }

    try {
        // Calculate chunk size in frames
        const size_t chunk_frames = chunk_size_ / (channels * sizeof(float));

        // Allocate buffer from memory pool
        AudioBuffer audio_buffer(chunk_size_);
        float* buffer = audio_buffer.as<float>();

        sf_count_t frames_processed = 0;
        size_t peak_memory = AudioMemoryPool::getInstance().getStats().current_usage;

        // Process file in chunks
        while (frames_processed < max_frames_to_process) {
            // Calculate frames to read this iteration
            sf_count_t frames_to_read = std::min(
                static_cast<sf_count_t>(chunk_frames),
                max_frames_to_process - frames_processed
            );

            // Read audio chunk
            sf_count_t frames_read = sf_read_float(file, buffer, frames_to_read * channels);
            if (frames_read <= 0) {
                break; // End of file or error
            }

            // Convert to mono if needed
            std::vector<float> mono_samples;
            if (channels > 1) {
                mono_samples.reserve(frames_read);
                for (sf_count_t i = 0; i < frames_read; ++i) {
                    float sum = 0.0f;
                    for (int ch = 0; ch < channels; ++ch) {
                        sum += buffer[i * channels + ch];
                    }
                    mono_samples.push_back(sum / channels);
                }
            } else {
                mono_samples.assign(buffer, buffer + frames_read);
            }

            // Resample to Chromaprint sample rate if needed
            if (original_sample_rate != CHROMAPRINT_SAMPLE_RATE) {
                // Simple linear resampling
                const double ratio = static_cast<double>(CHROMAPRINT_SAMPLE_RATE) / original_sample_rate;
                const size_t resampled_size = static_cast<size_t>(mono_samples.size() * ratio);

                std::vector<float> resampled_samples;
                resampled_samples.reserve(resampled_size);

                for (size_t i = 0; i < resampled_size; ++i) {
                    const double src_index = i / ratio;
                    const size_t src_i = static_cast<size_t>(src_index);

                    if (src_i < mono_samples.size() - 1) {
                        const float frac = src_index - src_i;
                        const float sample = mono_samples[src_i] * (1.0f - frac) +
                                           mono_samples[src_i + 1] * frac;
                        resampled_samples.push_back(sample);
                    } else if (src_i < mono_samples.size()) {
                        resampled_samples.push_back(mono_samples[src_i]);
                    }
                }

                mono_samples = std::move(resampled_samples);
            }

            // Convert float samples to int16_t for Chromaprint
            std::vector<int16_t> int16_samples;
            int16_samples.reserve(mono_samples.size());

            for (float sample : mono_samples) {
                // Clamp and convert to int16_t
                sample = std::max(-1.0f, std::min(1.0f, sample));
                int16_samples.push_back(static_cast<int16_t>(sample * 32767.0f));
            }

            // Feed to Chromaprint
            if (!chromaprint_feed(ctx, int16_samples.data(), static_cast<int>(int16_samples.size()))) {
                throw std::runtime_error("Failed to feed audio data to Chromaprint");
            }

            frames_processed += frames_read / channels;
            last_stats_.total_bytes_processed += frames_read * channels * sizeof(float);

            // Update peak memory usage
            size_t current_memory = AudioMemoryPool::getInstance().getStats().current_usage;
            peak_memory = std::max(peak_memory, current_memory);

            // Progress callback
            if (progress_callback) {
                const double progress = static_cast<double>(frames_processed) / max_frames_to_process;
                progress_callback(
                    last_stats_.total_bytes_processed,
                    max_frames_to_process * channels * sizeof(float),
                    progress
                );
            }
        }

        // Finish fingerprinting
        if (!chromaprint_finish(ctx)) {
            throw std::runtime_error("Failed to finish Chromaprint processing");
        }

        // Get raw fingerprint
        uint32_t* raw_fp_data = nullptr;
        int fp_size = 0;

        if (!chromaprint_get_raw_fingerprint(ctx, &raw_fp_data, &fp_size)) {
            throw std::runtime_error("Failed to get fingerprint");
        }

        // Create regular fingerprint for compression
        Fingerprint temp_fingerprint;
        temp_fingerprint.data.assign(raw_fp_data, raw_fp_data + fp_size);
        temp_fingerprint.sample_rate = CHROMAPRINT_SAMPLE_RATE;
        temp_fingerprint.duration = static_cast<double>(frames_processed) / original_sample_rate;
        temp_fingerprint.file_path = file_path;

        // Free Chromaprint data
        chromaprint_dealloc(raw_fp_data);

        // Compress fingerprint
        auto compressed_fp = CompressedFingerprint::compress(temp_fingerprint);

        // Update stats
        auto end_time = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);

        last_stats_.peak_memory_usage = peak_memory;
        last_stats_.compression_ratio = compressed_fp->getCompressionRatio();
        last_stats_.processing_time_seconds = duration.count() / 1000.0;

        // Cleanup
        chromaprint_free(ctx);
        sf_close(file);

        return compressed_fp;

    } catch (...) {
        // Cleanup on error
        chromaprint_free(ctx);
        sf_close(file);
        throw;
    }
}

void StreamingAudioLoader::validateChunkSize() {
    if (chunk_size_ < 4096) {
        chunk_size_ = 4096;
    } else if (chunk_size_ > MAX_CHUNK_SIZE) {
        chunk_size_ = MAX_CHUNK_SIZE;
    }

    // Ensure chunk size is multiple of 4096 for alignment
    chunk_size_ = (chunk_size_ + 4095) & ~4095;
}

} // namespace AudioDuplicates