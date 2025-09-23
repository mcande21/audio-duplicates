#pragma once

#include <vector>
#include <cstdint>
#include "chromaprint_wrapper.h"

namespace AudioDuplicates {

struct MatchResult {
    double similarity_score;
    int best_offset;
    size_t matched_segments;
    double bit_error_rate;
    bool is_duplicate;

    // Additional fields for sliding window results
    std::vector<std::pair<int, double>> segment_matches; // (offset, similarity) pairs
    double coverage_ratio; // Percentage of audio covered by matching segments
};

class FingerprintComparator {
public:
    FingerprintComparator();
    ~FingerprintComparator();

    // Compare two fingerprints and return similarity score
    MatchResult compare(const Fingerprint& fp1, const Fingerprint& fp2) const;

    // Sliding window comparison for robust silence padding handling
    MatchResult compare_sliding_window(const Fingerprint& fp1, const Fingerprint& fp2) const;

    // Fast pre-filter comparison using subset of fingerprint data
    bool quick_filter(const Fingerprint& fp1, const Fingerprint& fp2) const;

    // Configure similarity thresholds
    void set_similarity_threshold(double threshold);
    void set_bit_error_threshold(double threshold);
    void set_minimum_overlap(size_t min_overlap);

    // Configure alignment parameters
    void set_max_alignment_offset(int max_offset);
    void set_alignment_step(int step);

    // Get current configuration
    double get_similarity_threshold() const { return similarity_threshold_; }
    double get_bit_error_threshold() const { return bit_error_threshold_; }
    size_t get_minimum_overlap() const { return minimum_overlap_; }

private:
    double similarity_threshold_;
    double bit_error_threshold_;
    size_t minimum_overlap_;
    int max_alignment_offset_;
    int alignment_step_;

    // Default thresholds
    static constexpr double DEFAULT_SIMILARITY_THRESHOLD = 0.85;
    static constexpr double DEFAULT_BIT_ERROR_THRESHOLD = 0.15;
    static constexpr size_t DEFAULT_MINIMUM_OVERLAP = 10;
    static constexpr int DEFAULT_MAX_ALIGNMENT_OFFSET = 360; // ~30 seconds at default sample rate
    static constexpr int DEFAULT_ALIGNMENT_STEP = 6; // ~0.5 second steps

    // Core comparison functions
    double calculate_similarity_at_offset(const std::vector<uint32_t>& fp1,
                                         const std::vector<uint32_t>& fp2,
                                         int offset) const;

    int count_matching_bits(uint32_t a, uint32_t b) const;
    double calculate_bit_error_rate(const std::vector<uint32_t>& fp1,
                                   const std::vector<uint32_t>& fp2,
                                   int offset) const;

    // Alignment optimization
    int find_best_alignment(const std::vector<uint32_t>& fp1,
                           const std::vector<uint32_t>& fp2) const;

    // Histogram-based offset detection for better silence padding handling
    int find_best_alignment_histogram(const std::vector<uint32_t>& fp1,
                                     const std::vector<uint32_t>& fp2) const;

    // Cross-correlation alignment for precise offset detection
    int find_best_alignment_correlation(const std::vector<uint32_t>& fp1,
                                       const std::vector<uint32_t>& fp2) const;

    // Quick filter helpers
    std::vector<uint16_t> extract_hash_subset(const std::vector<uint32_t>& fingerprint) const;
    double calculate_hash_overlap(const std::vector<uint16_t>& hashes1,
                                 const std::vector<uint16_t>& hashes2) const;

    // Histogram-based alignment helpers
    std::vector<int> build_offset_histogram(const std::vector<uint32_t>& fp1,
                                           const std::vector<uint32_t>& fp2) const;
    std::vector<double> apply_gaussian_filter(const std::vector<int>& histogram, double sigma) const;
    std::vector<int> find_histogram_peaks(const std::vector<double>& filtered_histogram) const;

    // Sliding window helpers
    std::vector<std::pair<int, double>> find_segment_matches(const std::vector<uint32_t>& fp1,
                                                            const std::vector<uint32_t>& fp2,
                                                            int window_size) const;
    double calculate_coverage_ratio(const std::vector<std::pair<int, double>>& segment_matches,
                                   size_t total_length) const;
};

}