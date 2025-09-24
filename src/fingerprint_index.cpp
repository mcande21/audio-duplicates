#include "fingerprint_index.h"
#include <algorithm>
#include <unordered_map>
#include <shared_mutex>

namespace AudioDuplicates {

FingerprintIndex::FingerprintIndex()
    : comparator_(std::make_unique<FingerprintComparator>())
    , hash_threshold_(DEFAULT_HASH_THRESHOLD) {
}

FingerprintIndex::~FingerprintIndex() {
}

size_t FingerprintIndex::add_file(const std::string& file_path, std::unique_ptr<Fingerprint> fingerprint) {
    if (!fingerprint || fingerprint->data.empty()) {
        throw std::invalid_argument("Invalid fingerprint provided");
    }

    std::unique_lock<std::mutex> files_lock(files_mutex_);
    std::unique_lock<std::shared_mutex> index_lock(index_mutex_);

    // Create file entry
    auto file_entry = std::make_unique<FileEntry>(file_path, std::move(fingerprint));
    size_t file_id = files_.size();

    // Build hash index for this file
    build_hash_index(file_id, *file_entry->fingerprint);

    // Store file entry
    files_.push_back(std::move(file_entry));

    return file_id;
}

std::vector<size_t> FingerprintIndex::add_files_batch(std::vector<std::pair<std::string, std::unique_ptr<Fingerprint>>>& files) {
    std::vector<size_t> file_ids;
    file_ids.reserve(files.size());

    std::unique_lock<std::mutex> files_lock(files_mutex_);
    std::unique_lock<std::shared_mutex> index_lock(index_mutex_);

    for (auto& file_data : files) {
        if (!file_data.second || file_data.second->data.empty()) {
            throw std::invalid_argument("Invalid fingerprint provided");
        }

        // Create file entry
        auto file_entry = std::make_unique<FileEntry>(file_data.first, std::move(file_data.second));
        size_t file_id = files_.size();

        // Build hash index for this file
        build_hash_index(file_id, *file_entry->fingerprint);

        // Store file entry
        files_.push_back(std::move(file_entry));
        file_ids.push_back(file_id);
    }

    return file_ids;
}

std::vector<size_t> FingerprintIndex::find_candidates(size_t file_id) const {
    std::shared_lock<std::shared_mutex> index_lock(index_mutex_);
    std::unique_lock<std::mutex> files_lock(files_mutex_);

    if (file_id >= files_.size()) {
        return {};
    }

    const auto& file_entry = files_[file_id];
    if (!file_entry || !file_entry->fingerprint) {
        return {};
    }

    return find_candidates(*file_entry->fingerprint);
}

std::vector<size_t> FingerprintIndex::find_candidates(const Fingerprint& fingerprint) const {
    std::shared_lock<std::shared_mutex> index_lock(index_mutex_);

    std::unordered_map<size_t, size_t> candidate_counts;

    // Extract hashes from query fingerprint
    auto query_hashes = extract_hashes(fingerprint);

    // Find matching files for each hash
    for (uint16_t hash : query_hashes) {
        auto it = hash_index_.find(hash);
        if (it != hash_index_.end()) {
            for (const auto& entry : it->second) {
                candidate_counts[entry.file_id]++;
            }
        }
    }

    // Filter candidates based on minimum hash threshold
    std::vector<size_t> candidates;
    for (const auto& pair : candidate_counts) {
        if (pair.second >= hash_threshold_) {
            candidates.push_back(pair.first);
        }
    }

    // Sort by match count (highest first)
    std::sort(candidates.begin(), candidates.end(),
              [&candidate_counts](size_t a, size_t b) {
                  return candidate_counts[a] > candidate_counts[b];
              });

    return candidates;
}

std::vector<DuplicateGroup> FingerprintIndex::find_all_duplicates() {
    std::vector<std::unordered_set<size_t>> raw_groups;
    std::vector<bool> processed(files_.size(), false);

    // Find duplicates for each file
    for (size_t file_id = 0; file_id < files_.size(); ++file_id) {
        if (!processed[file_id] && files_[file_id]) {
            find_duplicates_for_file(file_id, raw_groups, processed);
        }
    }

    // Merge overlapping groups and convert to final format
    return merge_duplicate_groups(raw_groups);
}

const FileEntry* FingerprintIndex::get_file(size_t file_id) const {
    if (file_id >= files_.size()) {
        return nullptr;
    }
    return files_[file_id].get();
}

size_t FingerprintIndex::get_file_count() const {
    return files_.size();
}

size_t FingerprintIndex::get_index_size() const {
    return hash_index_.size();
}

double FingerprintIndex::get_load_factor() const {
    return hash_index_.load_factor();
}

void FingerprintIndex::set_hash_threshold(size_t threshold) {
    hash_threshold_ = threshold;
}

void FingerprintIndex::set_comparator(std::unique_ptr<FingerprintComparator> comparator) {
    if (comparator) {
        comparator_ = std::move(comparator);
    }
}

void FingerprintIndex::set_similarity_threshold(double threshold) {
    if (comparator_) {
        comparator_->set_similarity_threshold(threshold);
    }
}

void FingerprintIndex::set_max_alignment_offset(int max_offset) {
    if (comparator_) {
        comparator_->set_max_alignment_offset(max_offset);
    }
}

void FingerprintIndex::set_bit_error_threshold(double threshold) {
    if (comparator_) {
        comparator_->set_bit_error_threshold(threshold);
    }
}

void FingerprintIndex::clear() {
    hash_index_.clear();
    files_.clear();
}

void FingerprintIndex::build_hash_index(size_t file_id, const Fingerprint& fingerprint) {
    auto hashes = extract_hashes(fingerprint);

    for (size_t pos = 0; pos < hashes.size(); ++pos) {
        uint16_t hash = hashes[pos];
        hash_index_[hash].emplace_back(file_id, pos);
    }
}

std::vector<uint16_t> FingerprintIndex::extract_hashes(const Fingerprint& fingerprint) const {
    std::vector<uint16_t> hashes;
    hashes.reserve(fingerprint.data.size());

    for (uint32_t value : fingerprint.data) {
        // Extract 16-bit hash from the lower bits of the 32-bit fingerprint value
        hashes.push_back(static_cast<uint16_t>(value & 0xFFFF));
    }

    return hashes;
}

std::vector<size_t> FingerprintIndex::filter_candidates(const std::vector<size_t>& candidates,
                                                       const Fingerprint& query_fingerprint) const {
    std::vector<size_t> filtered;

    for (size_t candidate_id : candidates) {
        if (candidate_id < files_.size() && files_[candidate_id]) {
            // Use quick filter from comparator
            if (comparator_->quick_filter(query_fingerprint, *files_[candidate_id]->fingerprint)) {
                filtered.push_back(candidate_id);
            }
        }
    }

    return filtered;
}

void FingerprintIndex::find_duplicates_for_file(size_t file_id,
                                               std::vector<std::unordered_set<size_t>>& groups,
                                               std::vector<bool>& processed) const {
    if (processed[file_id] || !files_[file_id]) {
        return;
    }

    const auto& query_fingerprint = *files_[file_id]->fingerprint;
    auto candidates = find_candidates(query_fingerprint);

    std::unordered_set<size_t> duplicate_group;
    duplicate_group.insert(file_id);

    // Compare with each candidate
    for (size_t candidate_id : candidates) {
        if (candidate_id != file_id && !processed[candidate_id] && files_[candidate_id]) {
            auto match_result = comparator_->compare(query_fingerprint, *files_[candidate_id]->fingerprint);

            if (match_result.is_duplicate) {
                duplicate_group.insert(candidate_id);
            }
        }
    }

    // Only create group if we found duplicates
    if (duplicate_group.size() > 1) {
        groups.push_back(duplicate_group);

        // Mark all files in this group as processed
        for (size_t id : duplicate_group) {
            processed[id] = true;
        }
    } else {
        processed[file_id] = true;
    }
}

std::vector<DuplicateGroup> FingerprintIndex::merge_duplicate_groups(const std::vector<std::unordered_set<size_t>>& raw_groups) const {
    std::vector<DuplicateGroup> final_groups;

    for (const auto& group_set : raw_groups) {
        if (group_set.size() > 1) {
            DuplicateGroup group;
            group.file_ids.assign(group_set.begin(), group_set.end());

            // Sort file IDs for consistent output
            std::sort(group.file_ids.begin(), group.file_ids.end());

            // Calculate average similarity within the group
            double total_similarity = 0.0;
            size_t comparison_count = 0;

            for (size_t i = 0; i < group.file_ids.size(); ++i) {
                for (size_t j = i + 1; j < group.file_ids.size(); ++j) {
                    size_t id1 = group.file_ids[i];
                    size_t id2 = group.file_ids[j];

                    if (id1 < files_.size() && id2 < files_.size() &&
                        files_[id1] && files_[id2]) {
                        auto result = comparator_->compare(*files_[id1]->fingerprint,
                                                         *files_[id2]->fingerprint);
                        total_similarity += result.similarity_score;
                        comparison_count++;
                    }
                }
            }

            group.avg_similarity = comparison_count > 0 ? total_similarity / comparison_count : 0.0;
            final_groups.push_back(std::move(group));
        }
    }

    // Sort groups by average similarity (highest first)
    std::sort(final_groups.begin(), final_groups.end(),
              [](const DuplicateGroup& a, const DuplicateGroup& b) {
                  return a.avg_similarity > b.avg_similarity;
              });

    return final_groups;
}

std::vector<DuplicateGroup> FingerprintIndex::find_all_duplicates_parallel(size_t num_threads) {
    if (num_threads > 0) {
        omp_set_num_threads(static_cast<int>(num_threads));
    }

    if (files_.empty()) {
        return {};
    }

    std::vector<std::unordered_set<size_t>> raw_groups;
    std::vector<bool> processed(files_.size(), false);
    std::mutex groups_mutex;
    std::mutex processed_mutex;

    // Process files in parallel using OpenMP
    #pragma omp parallel
    {
        std::vector<std::unordered_set<size_t>> thread_groups;

        #pragma omp for schedule(dynamic)
        for (size_t file_id = 0; file_id < files_.size(); ++file_id) {
            bool skip = false;

            // Check if already processed
            {
                std::lock_guard<std::mutex> lock(processed_mutex);
                if (processed[file_id] || !files_[file_id]) {
                    skip = true;
                }
            }

            if (skip) continue;

            const auto& query_fingerprint = *files_[file_id]->fingerprint;
            auto candidates = find_candidates(query_fingerprint);

            std::unordered_set<size_t> duplicate_group;
            duplicate_group.insert(file_id);

            // Compare with each candidate
            for (size_t candidate_id : candidates) {
                if (candidate_id != file_id && candidate_id < files_.size() && files_[candidate_id]) {
                    bool candidate_processed = false;
                    {
                        std::lock_guard<std::mutex> lock(processed_mutex);
                        candidate_processed = processed[candidate_id];
                    }

                    if (!candidate_processed) {
                        auto match_result = comparator_->compare(query_fingerprint, *files_[candidate_id]->fingerprint);

                        if (match_result.is_duplicate) {
                            duplicate_group.insert(candidate_id);
                        }
                    }
                }
            }

            // Only create group if we found duplicates
            if (duplicate_group.size() > 1) {
                thread_groups.push_back(duplicate_group);

                // Mark all files in this group as processed
                std::lock_guard<std::mutex> lock(processed_mutex);
                for (size_t id : duplicate_group) {
                    processed[id] = true;
                }
            } else {
                std::lock_guard<std::mutex> lock(processed_mutex);
                processed[file_id] = true;
            }
        }

        // Merge thread-local groups into global groups
        if (!thread_groups.empty()) {
            std::lock_guard<std::mutex> lock(groups_mutex);
            raw_groups.insert(raw_groups.end(), thread_groups.begin(), thread_groups.end());
        }
    }

    // Merge overlapping groups and convert to final format
    return merge_duplicate_groups(raw_groups);
}

}