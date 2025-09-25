#include "audio_memory_pool.h"
#include <algorithm>
#include <stdexcept>

namespace AudioDuplicates {

AudioMemoryPool& AudioMemoryPool::getInstance() {
    static AudioMemoryPool instance;
    return instance;
}

AudioMemoryPool::AudioMemoryPool()
    : enabled_(true), total_allocated_(0), total_deallocated_(0), peak_usage_(0) {
    // Initialize pools with initial blocks
    expandPool(small_blocks_, static_cast<size_t>(PoolSize::SMALL));
    expandPool(medium_blocks_, static_cast<size_t>(PoolSize::MEDIUM));
    expandPool(large_blocks_, static_cast<size_t>(PoolSize::LARGE));
}

AudioMemoryPool::~AudioMemoryPool() {
    clear();
}

void* AudioMemoryPool::allocate(size_t size) {
    if (!enabled_ || size == 0) {
        // Fallback to mimalloc directly
        void* ptr = mi_malloc(size);
        if (ptr) {
            std::lock_guard<std::mutex> lock(pool_mutex_);
            total_allocated_ += size;
            peak_usage_ = std::max(peak_usage_, total_allocated_ - total_deallocated_);
        }
        return ptr;
    }

    std::lock_guard<std::mutex> lock(pool_mutex_);

    PoolSize category = categorizeSize(size);
    void* ptr = nullptr;

    switch (category) {
        case PoolSize::SMALL:
            ptr = allocateFromPool(small_blocks_, static_cast<size_t>(PoolSize::SMALL), size);
            break;
        case PoolSize::MEDIUM:
            ptr = allocateFromPool(medium_blocks_, static_cast<size_t>(PoolSize::MEDIUM), size);
            break;
        case PoolSize::LARGE:
            ptr = allocateFromPool(large_blocks_, static_cast<size_t>(PoolSize::LARGE), size);
            break;
    }

    if (!ptr) {
        // Pool exhausted, fallback to direct allocation
        ptr = mi_malloc(size);
    }

    if (ptr) {
        total_allocated_ += size;
        peak_usage_ = std::max(peak_usage_, total_allocated_ - total_deallocated_);
    }

    return ptr;
}

void AudioMemoryPool::deallocate(void* ptr, size_t size) {
    if (!ptr) return;

    if (!enabled_) {
        mi_free(ptr);
        std::lock_guard<std::mutex> lock(pool_mutex_);
        total_deallocated_ += size;
        return;
    }

    std::lock_guard<std::mutex> lock(pool_mutex_);

    // Try to return to appropriate pool
    bool returned_to_pool = false;
    PoolSize category = categorizeSize(size);

    switch (category) {
        case PoolSize::SMALL:
            returned_to_pool = deallocateFromPool(small_blocks_, ptr);
            break;
        case PoolSize::MEDIUM:
            returned_to_pool = deallocateFromPool(medium_blocks_, ptr);
            break;
        case PoolSize::LARGE:
            returned_to_pool = deallocateFromPool(large_blocks_, ptr);
            break;
    }

    if (!returned_to_pool) {
        // Not from pool, free directly
        mi_free(ptr);
    }

    total_deallocated_ += size;
}

void* AudioMemoryPool::allocateFromPool(std::vector<PoolBlock>& pool, size_t pool_size, size_t requested_size) {
    // Find available block
    for (auto& block : pool) {
        if (!block.in_use) {
            block.in_use = true;
            return block.ptr;
        }
    }

    // No available blocks, expand pool if possible
    if (pool.size() < MAX_POOL_BLOCKS) {
        size_t old_size = pool.size();
        expandPool(pool, pool_size);

        // Use the first new block
        if (pool.size() > old_size) {
            pool[old_size].in_use = true;
            return pool[old_size].ptr;
        }
    }

    return nullptr; // Pool exhausted
}

bool AudioMemoryPool::deallocateFromPool(std::vector<PoolBlock>& pool, void* ptr) {
    for (auto& block : pool) {
        if (block.ptr == ptr) {
            block.in_use = false;
            return true;
        }
    }
    return false; // Not from this pool
}

void AudioMemoryPool::expandPool(std::vector<PoolBlock>& pool, size_t pool_size) {
    size_t blocks_to_add = std::min(INITIAL_POOL_BLOCKS, MAX_POOL_BLOCKS - pool.size());

    for (size_t i = 0; i < blocks_to_add; ++i) {
        void* ptr = mi_malloc(pool_size);
        if (ptr) {
            pool.emplace_back(ptr, pool_size);
        } else {
            break; // Out of memory
        }
    }
}

AudioMemoryPool::PoolSize AudioMemoryPool::categorizeSize(size_t size) const {
    if (size <= static_cast<size_t>(PoolSize::SMALL)) {
        return PoolSize::SMALL;
    } else if (size <= static_cast<size_t>(PoolSize::MEDIUM)) {
        return PoolSize::MEDIUM;
    } else {
        return PoolSize::LARGE;
    }
}

AudioMemoryPool::PoolStats AudioMemoryPool::getStats() const {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    return {
        total_allocated_,
        total_deallocated_,
        total_allocated_ - total_deallocated_,
        peak_usage_
    };
}

void AudioMemoryPool::clear() {
    std::lock_guard<std::mutex> lock(pool_mutex_);

    // Free all pool blocks
    for (auto& block : small_blocks_) {
        mi_free(block.ptr);
    }
    for (auto& block : medium_blocks_) {
        mi_free(block.ptr);
    }
    for (auto& block : large_blocks_) {
        mi_free(block.ptr);
    }

    small_blocks_.clear();
    medium_blocks_.clear();
    large_blocks_.clear();

    total_allocated_ = 0;
    total_deallocated_ = 0;
    peak_usage_ = 0;
}

// AudioBuffer implementation
AudioBuffer::AudioBuffer(size_t size) : size_(size) {
    data_ = AudioMemoryPool::getInstance().allocate(size);
    if (!data_) {
        throw std::bad_alloc();
    }
}

AudioBuffer::~AudioBuffer() {
    if (data_) {
        AudioMemoryPool::getInstance().deallocate(data_, size_);
    }
}

} // namespace AudioDuplicates