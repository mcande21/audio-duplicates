#include "fingerprint_comparator.h"
#include <algorithm>
#include <cmath>
#include <unordered_set>

#if defined(__GNUC__) || defined(__clang__)
    #define POPCOUNT __builtin_popcountll
#elif defined(_MSC_VER)
    #include <intrin.h>
    #define POPCOUNT __popcnt64
#else
    // Fallback popcount implementation
    inline int popcount_fallback(uint64_t x) {
        int count = 0;
        while (x) {
            count += x & 1;
            x >>= 1;
        }
        return count;
    }
    #define POPCOUNT popcount_fallback
#endif

namespace AudioDuplicates {

FingerprintComparator::FingerprintComparator()
    : similarity_threshold_(DEFAULT_SIMILARITY_THRESHOLD)
    , bit_error_threshold_(DEFAULT_BIT_ERROR_THRESHOLD)
    , minimum_overlap_(DEFAULT_MINIMUM_OVERLAP)
    , max_alignment_offset_(DEFAULT_MAX_ALIGNMENT_OFFSET)
    , alignment_step_(DEFAULT_ALIGNMENT_STEP) {
}

FingerprintComparator::~FingerprintComparator() {
}

MatchResult FingerprintComparator::compare(const Fingerprint& fp1, const Fingerprint& fp2) const {
    MatchResult result;
    result.similarity_score = 0.0;
    result.best_offset = 0;
    result.matched_segments = 0;
    result.bit_error_rate = 1.0;
    result.is_duplicate = false;
    result.coverage_ratio = 0.0;

    // Check minimum overlap requirement
    if (fp1.data.size() < minimum_overlap_ || fp2.data.size() < minimum_overlap_) {
        return result;
    }

    // Quick filter check
    if (!quick_filter(fp1, fp2)) {
        return result;
    }

    // Find best alignment offset
    int best_offset = find_best_alignment(fp1.data, fp2.data);
    result.best_offset = best_offset;

    // Calculate similarity at best offset
    result.similarity_score = calculate_similarity_at_offset(fp1.data, fp2.data, best_offset);
    result.bit_error_rate = calculate_bit_error_rate(fp1.data, fp2.data, best_offset);

    // Calculate matched segments
    size_t overlap_start = std::max(0, -best_offset);
    size_t overlap_end = std::min(static_cast<int>(fp1.data.size()), static_cast<int>(fp2.data.size()) - best_offset);
    result.matched_segments = overlap_end > overlap_start ? overlap_end - overlap_start : 0;

    // Determine if it's a duplicate based on thresholds
    result.is_duplicate = (result.similarity_score >= similarity_threshold_) &&
                         (result.bit_error_rate <= bit_error_threshold_) &&
                         (result.matched_segments >= minimum_overlap_);

    return result;
}

MatchResult FingerprintComparator::compare_sliding_window(const Fingerprint& fp1, const Fingerprint& fp2) const {
    MatchResult result;
    result.similarity_score = 0.0;
    result.best_offset = 0;
    result.matched_segments = 0;
    result.bit_error_rate = 1.0;
    result.is_duplicate = false;
    result.coverage_ratio = 0.0;

    // Check minimum overlap requirement
    if (fp1.data.size() < minimum_overlap_ || fp2.data.size() < minimum_overlap_) {
        return result;
    }

    // Quick filter check
    if (!quick_filter(fp1, fp2)) {
        return result;
    }

    // Find matching segments using sliding window approach
    int window_size = 60; // ~5 seconds window at default rate
    result.segment_matches = find_segment_matches(fp1.data, fp2.data, window_size);

    if (result.segment_matches.empty()) {
        return result;
    }

    // Calculate overall similarity from best matching segments
    double total_similarity = 0.0;
    double total_weight = 0.0;

    for (const auto& match : result.segment_matches) {
        double weight = match.second; // Use similarity as weight
        total_similarity += match.second * weight;
        total_weight += weight;
    }

    result.similarity_score = total_weight > 0 ? total_similarity / total_weight : 0.0;

    // Use the offset from the best matching segment
    if (!result.segment_matches.empty()) {
        result.best_offset = result.segment_matches[0].first;
    }

    // Calculate coverage ratio
    size_t max_length = std::max(fp1.data.size(), fp2.data.size());
    result.coverage_ratio = calculate_coverage_ratio(result.segment_matches, max_length);

    // Calculate bit error rate at best offset
    result.bit_error_rate = calculate_bit_error_rate(fp1.data, fp2.data, result.best_offset);

    // Count matched segments
    result.matched_segments = result.segment_matches.size();

    // Determine if it's a duplicate based on thresholds and coverage
    result.is_duplicate = (result.similarity_score >= similarity_threshold_) &&
                         (result.bit_error_rate <= bit_error_threshold_) &&
                         (result.coverage_ratio >= 0.5) && // At least 50% coverage
                         (result.matched_segments >= 3); // At least 3 matching segments

    return result;
}

bool FingerprintComparator::quick_filter(const Fingerprint& fp1, const Fingerprint& fp2) const {
    // Extract 16-bit hash subsets for quick comparison
    auto hashes1 = extract_hash_subset(fp1.data);
    auto hashes2 = extract_hash_subset(fp2.data);

    // Calculate hash overlap
    double overlap = calculate_hash_overlap(hashes1, hashes2);

    // Quick filter threshold (more permissive than final threshold)
    return overlap >= (similarity_threshold_ * 0.6);
}

void FingerprintComparator::set_similarity_threshold(double threshold) {
    similarity_threshold_ = std::max(0.0, std::min(1.0, threshold));
}

void FingerprintComparator::set_bit_error_threshold(double threshold) {
    bit_error_threshold_ = std::max(0.0, std::min(1.0, threshold));
}

void FingerprintComparator::set_minimum_overlap(size_t min_overlap) {
    minimum_overlap_ = min_overlap;
}

void FingerprintComparator::set_max_alignment_offset(int max_offset) {
    max_alignment_offset_ = std::max(0, max_offset);
}

void FingerprintComparator::set_alignment_step(int step) {
    alignment_step_ = std::max(1, step);
}

double FingerprintComparator::calculate_similarity_at_offset(const std::vector<uint32_t>& fp1,
                                                           const std::vector<uint32_t>& fp2,
                                                           int offset) const {
    size_t total_comparisons = 0;
    size_t matching_bits = 0;

    int start1 = std::max(0, -offset);
    int start2 = std::max(0, offset);
    int end1 = std::min(static_cast<int>(fp1.size()), static_cast<int>(fp2.size()) - offset);
    int end2 = std::min(static_cast<int>(fp2.size()), static_cast<int>(fp1.size()) + offset);

    for (int i = start1, j = start2; i < end1 && j < end2; ++i, ++j) {
        matching_bits += count_matching_bits(fp1[i], fp2[j]);
        total_comparisons += 32; // 32 bits per uint32_t
    }

    return total_comparisons > 0 ? static_cast<double>(matching_bits) / total_comparisons : 0.0;
}

int FingerprintComparator::count_matching_bits(uint32_t a, uint32_t b) const {
    // Count bits that are the same (inverse of XOR popcount)
    return 32 - POPCOUNT(a ^ b);
}

double FingerprintComparator::calculate_bit_error_rate(const std::vector<uint32_t>& fp1,
                                                      const std::vector<uint32_t>& fp2,
                                                      int offset) const {
    size_t total_comparisons = 0;
    size_t error_bits = 0;

    int start1 = std::max(0, -offset);
    int start2 = std::max(0, offset);
    int end1 = std::min(static_cast<int>(fp1.size()), static_cast<int>(fp2.size()) - offset);
    int end2 = std::min(static_cast<int>(fp2.size()), static_cast<int>(fp1.size()) + offset);

    for (int i = start1, j = start2; i < end1 && j < end2; ++i, ++j) {
        error_bits += POPCOUNT(fp1[i] ^ fp2[j]);
        total_comparisons += 32;
    }

    return total_comparisons > 0 ? static_cast<double>(error_bits) / total_comparisons : 1.0;
}

int FingerprintComparator::find_best_alignment(const std::vector<uint32_t>& fp1,
                                              const std::vector<uint32_t>& fp2) const {
    // Try histogram-based approach first for better handling of silence padding
    int histogram_offset = find_best_alignment_histogram(fp1, fp2);

    // Verify with correlation-based approach
    int correlation_offset = find_best_alignment_correlation(fp1, fp2);

    // Choose the offset with better similarity score
    double histogram_similarity = calculate_similarity_at_offset(fp1, fp2, histogram_offset);
    double correlation_similarity = calculate_similarity_at_offset(fp1, fp2, correlation_offset);

    int best_offset = (histogram_similarity >= correlation_similarity) ? histogram_offset : correlation_offset;
    double best_similarity = std::max(histogram_similarity, correlation_similarity);

    // Fine-tune around the best offset
    for (int fine_offset = best_offset - 2; fine_offset <= best_offset + 2; ++fine_offset) {
        if (std::abs(fine_offset) <= max_alignment_offset_ && fine_offset != best_offset) {
            double similarity = calculate_similarity_at_offset(fp1, fp2, fine_offset);
            if (similarity > best_similarity) {
                best_similarity = similarity;
                best_offset = fine_offset;
            }
        }
    }

    return best_offset;
}

std::vector<uint16_t> FingerprintComparator::extract_hash_subset(const std::vector<uint32_t>& fingerprint) const {
    std::vector<uint16_t> hashes;
    hashes.reserve(fingerprint.size());

    for (uint32_t value : fingerprint) {
        // Extract 16-bit hash from the 32-bit fingerprint value
        hashes.push_back(static_cast<uint16_t>(value & 0xFFFF));
    }

    return hashes;
}

double FingerprintComparator::calculate_hash_overlap(const std::vector<uint16_t>& hashes1,
                                                    const std::vector<uint16_t>& hashes2) const {
    if (hashes1.empty() || hashes2.empty()) {
        return 0.0;
    }

    // Create sets for efficient intersection calculation
    std::unordered_set<uint16_t> set1(hashes1.begin(), hashes1.end());
    std::unordered_set<uint16_t> set2(hashes2.begin(), hashes2.end());

    // Count intersection
    size_t intersection = 0;
    for (uint16_t hash : set1) {
        if (set2.count(hash)) {
            intersection++;
        }
    }

    // Calculate Jaccard similarity (intersection / union)
    size_t union_size = set1.size() + set2.size() - intersection;
    return union_size > 0 ? static_cast<double>(intersection) / union_size : 0.0;
}

int FingerprintComparator::find_best_alignment_histogram(const std::vector<uint32_t>& fp1,
                                                        const std::vector<uint32_t>& fp2) const {
    // Build histogram of offset differences
    auto histogram = build_offset_histogram(fp1, fp2);

    if (histogram.empty()) {
        return 0;
    }

    // Apply Gaussian filtering to smooth the histogram
    auto filtered = apply_gaussian_filter(histogram, 2.0);

    // Find peaks in the filtered histogram
    auto peaks = find_histogram_peaks(filtered);

    if (peaks.empty()) {
        return 0;
    }

    // Convert histogram index back to actual offset
    int histogram_center = max_alignment_offset_;
    int best_peak_index = peaks[0];
    return best_peak_index - histogram_center;
}

int FingerprintComparator::find_best_alignment_correlation(const std::vector<uint32_t>& fp1,
                                                          const std::vector<uint32_t>& fp2) const {
    double best_similarity = 0.0;
    int best_offset = 0;

    // Coarse search with larger steps
    for (int offset = -max_alignment_offset_; offset <= max_alignment_offset_; offset += alignment_step_) {
        double similarity = calculate_similarity_at_offset(fp1, fp2, offset);
        if (similarity > best_similarity) {
            best_similarity = similarity;
            best_offset = offset;
        }
    }

    return best_offset;
}

std::vector<int> FingerprintComparator::build_offset_histogram(const std::vector<uint32_t>& fp1,
                                                              const std::vector<uint32_t>& fp2) const {
    // Create histogram covering -max_alignment_offset_ to +max_alignment_offset_
    int histogram_size = 2 * max_alignment_offset_ + 1;
    std::vector<int> histogram(histogram_size, 0);
    int histogram_center = max_alignment_offset_;

    // Extract 16-bit hashes from both fingerprints
    auto hashes1 = extract_hash_subset(fp1);
    auto hashes2 = extract_hash_subset(fp2);

    // For each hash in fp1, find matches in fp2 and record offset differences
    for (size_t i = 0; i < hashes1.size(); ++i) {
        uint16_t hash1 = hashes1[i];

        for (size_t j = 0; j < hashes2.size(); ++j) {
            uint16_t hash2 = hashes2[j];

            // Check for exact hash match (can be made more flexible)
            if (hash1 == hash2) {
                int offset_diff = static_cast<int>(j) - static_cast<int>(i);

                // Only record offsets within our search range
                if (std::abs(offset_diff) <= max_alignment_offset_) {
                    int histogram_index = offset_diff + histogram_center;
                    if (histogram_index >= 0 && histogram_index < histogram_size) {
                        histogram[histogram_index]++;
                    }
                }
            }
        }
    }

    return histogram;
}

std::vector<double> FingerprintComparator::apply_gaussian_filter(const std::vector<int>& histogram,
                                                                double sigma) const {
    std::vector<double> filtered(histogram.size(), 0.0);

    // Calculate kernel size (3 sigma on each side)
    int kernel_size = static_cast<int>(3 * sigma);

    for (size_t i = 0; i < histogram.size(); ++i) {
        double sum = 0.0;
        double weight_sum = 0.0;

        for (int j = -kernel_size; j <= kernel_size; ++j) {
            int index = static_cast<int>(i) + j;
            if (index >= 0 && index < static_cast<int>(histogram.size())) {
                double weight = std::exp(-(j * j) / (2 * sigma * sigma));
                sum += histogram[index] * weight;
                weight_sum += weight;
            }
        }

        filtered[i] = weight_sum > 0 ? sum / weight_sum : 0.0;
    }

    return filtered;
}

std::vector<int> FingerprintComparator::find_histogram_peaks(const std::vector<double>& filtered_histogram) const {
    std::vector<int> peaks;

    if (filtered_histogram.size() < 3) {
        return peaks;
    }

    // Find local maxima
    for (size_t i = 1; i < filtered_histogram.size() - 1; ++i) {
        if (filtered_histogram[i] > filtered_histogram[i-1] &&
            filtered_histogram[i] > filtered_histogram[i+1] &&
            filtered_histogram[i] > 0.1) { // Minimum threshold for peaks
            peaks.push_back(static_cast<int>(i));
        }
    }

    // Sort peaks by magnitude (highest first)
    std::sort(peaks.begin(), peaks.end(),
              [&filtered_histogram](int a, int b) {
                  return filtered_histogram[a] > filtered_histogram[b];
              });

    return peaks;
}

std::vector<std::pair<int, double>> FingerprintComparator::find_segment_matches(const std::vector<uint32_t>& fp1,
                                                                               const std::vector<uint32_t>& fp2,
                                                                               int window_size) const {
    std::vector<std::pair<int, double>> segment_matches;

    if (static_cast<int>(fp1.size()) < window_size || static_cast<int>(fp2.size()) < window_size) {
        return segment_matches;
    }

    // Slide window across fp1
    for (int i = 0; i <= static_cast<int>(fp1.size()) - window_size; i += window_size / 2) {
        double best_similarity = 0.0;
        int best_offset = 0;

        // Extract window from fp1
        std::vector<uint32_t> window1(fp1.begin() + i, fp1.begin() + i + window_size);

        // Try different positions in fp2 for this window
        for (int j = 0; j <= static_cast<int>(fp2.size()) - window_size; j += 6) { // 6 = alignment_step
            std::vector<uint32_t> window2(fp2.begin() + j, fp2.begin() + j + window_size);

            // Calculate similarity between windows
            double similarity = calculate_similarity_at_offset(window1, window2, 0);

            if (similarity > best_similarity && similarity >= similarity_threshold_ * 0.8) {
                best_similarity = similarity;
                best_offset = j - i; // Relative offset
            }
        }

        // If we found a good match, record it
        if (best_similarity >= similarity_threshold_ * 0.8) {
            segment_matches.emplace_back(best_offset, best_similarity);
        }
    }

    // Sort by similarity (best matches first)
    std::sort(segment_matches.begin(), segment_matches.end(),
              [](const std::pair<int, double>& a, const std::pair<int, double>& b) {
                  return a.second > b.second;
              });

    // Remove overlapping segments, keep only the best ones
    std::vector<std::pair<int, double>> filtered_matches;
    for (const auto& match : segment_matches) {
        bool overlaps = false;
        for (const auto& existing : filtered_matches) {
            if (std::abs(match.first - existing.first) < window_size / 2) {
                overlaps = true;
                break;
            }
        }
        if (!overlaps) {
            filtered_matches.push_back(match);
        }
    }

    return filtered_matches;
}

double FingerprintComparator::calculate_coverage_ratio(const std::vector<std::pair<int, double>>& segment_matches,
                                                      size_t total_length) const {
    if (segment_matches.empty() || total_length == 0) {
        return 0.0;
    }

    // Estimate covered length based on number of segments and typical window size
    int window_size = 60; // Should match the window size used in find_segment_matches
    size_t covered_length = segment_matches.size() * window_size;

    // Don't exceed total length
    covered_length = std::min(covered_length, total_length);

    return static_cast<double>(covered_length) / total_length;
}

}