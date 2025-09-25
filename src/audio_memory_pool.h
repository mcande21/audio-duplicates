#pragma once

#include <vector>
#include <mutex>
#include <memory>
#include <cstdlib>
#include <mimalloc.h>

namespace AudioDuplicates {

/**
 * High-performance memory pool for audio buffers using mimalloc
 * Provides O(1) allocation/deallocation with zero fragmentation
 */
class AudioMemoryPool {
public:
    // Singleton pattern for global access
    static AudioMemoryPool& getInstance();

    // Pool size categories for different audio buffer sizes
    enum class PoolSize {
        SMALL = 1024 * 1024,      // 1MB - for short audio clips
        MEDIUM = 4 * 1024 * 1024, // 4MB - for typical songs
        LARGE = 16 * 1024 * 1024  // 16MB - for long tracks or high quality
    };

    // Allocate memory from appropriate pool
    void* allocate(size_t size);

    // Deallocate memory back to pool
    void deallocate(void* ptr, size_t size);

    // Get pool statistics
    struct PoolStats {
        size_t total_allocated;
        size_t total_deallocated;
        size_t current_usage;
        size_t peak_usage;
    };
    PoolStats getStats() const;

    // Clear all pools (for cleanup)
    void clear();

    // Enable/disable pool usage (fallback to mimalloc directly)
    void setEnabled(bool enabled) { enabled_ = enabled; }
    bool isEnabled() const { return enabled_; }

private:
    AudioMemoryPool();
    ~AudioMemoryPool();

    // Prevent copy/move
    AudioMemoryPool(const AudioMemoryPool&) = delete;
    AudioMemoryPool& operator=(const AudioMemoryPool&) = delete;

    struct PoolBlock {
        void* ptr;
        size_t size;
        bool in_use;

        PoolBlock(void* p, size_t s) : ptr(p), size(s), in_use(false) {}
    };

    // Pool management
    std::vector<PoolBlock> small_blocks_;
    std::vector<PoolBlock> medium_blocks_;
    std::vector<PoolBlock> large_blocks_;

    mutable std::mutex pool_mutex_;
    bool enabled_;

    // Statistics
    mutable size_t total_allocated_;
    mutable size_t total_deallocated_;
    mutable size_t peak_usage_;

    // Helper methods
    void* allocateFromPool(std::vector<PoolBlock>& pool, size_t pool_size, size_t requested_size);
    bool deallocateFromPool(std::vector<PoolBlock>& pool, void* ptr);
    void expandPool(std::vector<PoolBlock>& pool, size_t pool_size);
    PoolSize categorizeSize(size_t size) const;

    static constexpr size_t INITIAL_POOL_BLOCKS = 8;
    static constexpr size_t MAX_POOL_BLOCKS = 64;
};

/**
 * RAII wrapper for automatic memory management
 */
class AudioBuffer {
public:
    AudioBuffer(size_t size);
    ~AudioBuffer();

    // Get buffer pointer
    void* data() { return data_; }
    const void* data() const { return data_; }

    // Get buffer size
    size_t size() const { return size_; }

    // Convert to specific types
    template<typename T>
    T* as() { return static_cast<T*>(data_); }

    template<typename T>
    const T* as() const { return static_cast<const T*>(data_); }

private:
    void* data_;
    size_t size_;

    // Prevent copy/move for safety
    AudioBuffer(const AudioBuffer&) = delete;
    AudioBuffer& operator=(const AudioBuffer&) = delete;
};

} // namespace AudioDuplicates