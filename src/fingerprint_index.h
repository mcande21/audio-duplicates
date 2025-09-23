#pragma once

#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <string>
#include <memory>
#include "chromaprint_wrapper.h"
#include "fingerprint_comparator.h"

namespace AudioDuplicates {

struct IndexEntry {
    size_t file_id;
    size_t position;

    IndexEntry(size_t fid, size_t pos) : file_id(fid), position(pos) {}
};

struct FileEntry {
    std::string file_path;
    std::unique_ptr<Fingerprint> fingerprint;

    FileEntry(const std::string& path, std::unique_ptr<Fingerprint> fp)
        : file_path(path), fingerprint(std::move(fp)) {}
};

struct DuplicateGroup {
    std::vector<size_t> file_ids;
    double avg_similarity;

    DuplicateGroup() : avg_similarity(0.0) {}
};

class FingerprintIndex {
public:
    FingerprintIndex();
    ~FingerprintIndex();

    // Add a file and its fingerprint to the index
    size_t add_file(const std::string& file_path, std::unique_ptr<Fingerprint> fingerprint);

    // Find potential duplicates for a given file ID
    std::vector<size_t> find_candidates(size_t file_id) const;

    // Find potential duplicates for a given fingerprint
    std::vector<size_t> find_candidates(const Fingerprint& fingerprint) const;

    // Get all duplicate groups
    std::vector<DuplicateGroup> find_all_duplicates();

    // Get file information
    const FileEntry* get_file(size_t file_id) const;
    size_t get_file_count() const;

    // Index statistics
    size_t get_index_size() const;
    double get_load_factor() const;

    // Configuration
    void set_hash_threshold(size_t threshold);
    void set_comparator(std::unique_ptr<FingerprintComparator> comparator);

    // Configuration methods for the internal comparator
    void set_similarity_threshold(double threshold);
    void set_max_alignment_offset(int max_offset);
    void set_bit_error_threshold(double threshold);

    // Clear the index
    void clear();

private:
    // Inverted index: hash -> list of (file_id, position)
    std::unordered_map<uint16_t, std::vector<IndexEntry>> hash_index_;

    // File storage
    std::vector<std::unique_ptr<FileEntry>> files_;

    // Fingerprint comparator
    std::unique_ptr<FingerprintComparator> comparator_;

    // Configuration
    size_t hash_threshold_;

    static constexpr size_t DEFAULT_HASH_THRESHOLD = 5; // Minimum hash matches to consider as candidate

    // Index building helpers
    void build_hash_index(size_t file_id, const Fingerprint& fingerprint);
    std::vector<uint16_t> extract_hashes(const Fingerprint& fingerprint) const;

    // Candidate filtering
    std::vector<size_t> filter_candidates(const std::vector<size_t>& candidates,
                                         const Fingerprint& query_fingerprint) const;

    // Duplicate detection helpers
    void find_duplicates_for_file(size_t file_id,
                                 std::vector<std::unordered_set<size_t>>& groups,
                                 std::vector<bool>& processed) const;

    // Merge overlapping duplicate groups
    std::vector<DuplicateGroup> merge_duplicate_groups(const std::vector<std::unordered_set<size_t>>& raw_groups) const;
};

}