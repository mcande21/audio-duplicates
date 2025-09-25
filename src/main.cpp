#include <napi.h>
#include <memory>
#include <vector>
#include <string>
#include "chromaprint_wrapper.h"
#include "fingerprint_comparator.h"
#include "fingerprint_index.h"
#include "audio_preprocessor.h"
#include "compressed_fingerprint.h"
#include "audio_memory_pool.h"
#include "streaming_audio_loader.h"

using namespace Napi;
using namespace AudioDuplicates;

// Global index instance
static std::unique_ptr<FingerprintIndex> g_index;

// Global streaming audio loader
static std::unique_ptr<StreamingAudioLoader> g_streaming_loader;

// Helper function to convert C++ fingerprint to JS object
Object FingerprintToJS(Env env, const Fingerprint& fp) {
    Object jsFingerprint = Object::New(env);

    // Convert data vector to JS array
    Array jsData = Array::New(env, fp.data.size());
    for (size_t i = 0; i < fp.data.size(); ++i) {
        jsData[i] = Number::New(env, fp.data[i]);
    }

    jsFingerprint.Set("data", jsData);
    jsFingerprint.Set("sampleRate", Number::New(env, fp.sample_rate));
    jsFingerprint.Set("duration", Number::New(env, fp.duration));
    jsFingerprint.Set("filePath", String::New(env, fp.file_path));

    return jsFingerprint;
}

// Helper function to convert JS fingerprint object to C++
std::unique_ptr<Fingerprint> JSToFingerprint(const Object& jsFingerprint) {
    auto fp = std::make_unique<Fingerprint>();

    Array jsData = jsFingerprint.Get("data").As<Array>();
    fp->data.reserve(jsData.Length());

    for (uint32_t i = 0; i < jsData.Length(); ++i) {
        fp->data.push_back(jsData.Get(i).As<Number>().Uint32Value());
    }

    fp->sample_rate = jsFingerprint.Get("sampleRate").As<Number>().Int32Value();
    fp->duration = jsFingerprint.Get("duration").As<Number>().DoubleValue();
    fp->file_path = jsFingerprint.Get("filePath").As<String>().Utf8Value();

    return fp;
}

// Helper function to convert compressed fingerprint to JS object
Object CompressedFingerprintToJS(Env env, const CompressedFingerprint& cfp) {
    Object jsFingerprint = Object::New(env);

    // Add compression info
    jsFingerprint.Set("compressedSize", Number::New(env, cfp.getCompressedSize()));
    jsFingerprint.Set("originalSize", Number::New(env, cfp.getOriginalSize()));
    jsFingerprint.Set("compressionRatio", Number::New(env, cfp.getCompressionRatio()));
    jsFingerprint.Set("sampleRate", Number::New(env, cfp.getSampleRate()));
    jsFingerprint.Set("duration", Number::New(env, cfp.getDuration()));
    jsFingerprint.Set("filePath", String::New(env, cfp.getFilePath()));
    jsFingerprint.Set("isCompressed", Boolean::New(env, true));

    return jsFingerprint;
}

// Helper function to get fingerprint from JS object (handles both regular and compressed)
std::unique_ptr<Fingerprint> JSToFingerprintAny(const Object& jsFingerprint) {
    // Check if this is a compressed fingerprint
    if (jsFingerprint.Has("isCompressed") && jsFingerprint.Get("isCompressed").As<Boolean>().Value()) {
        // This is a compressed fingerprint - we need to decompress it
        // For now, we'll create a regular fingerprint from the metadata
        // In a full implementation, we'd need to store the compressed data in JS
        // and decompress it here. For simplicity, we'll throw an error for now.
        throw std::runtime_error("Compressed fingerprint comparison not yet implemented");
    } else {
        // Regular fingerprint
        return JSToFingerprint(jsFingerprint);
    }
}

// Helper function to convert JS config object to C++ PreprocessConfig
PreprocessConfig JSToPreprocessConfig(const Object& jsConfig) {
    PreprocessConfig config;

    if (jsConfig.Has("trimSilence")) {
        config.trim_silence = jsConfig.Get("trimSilence").As<Boolean>().Value();
    }
    if (jsConfig.Has("silenceThresholdDb")) {
        config.silence_threshold_db = jsConfig.Get("silenceThresholdDb").As<Number>().FloatValue();
    }
    if (jsConfig.Has("minSilenceDurationMs")) {
        config.min_silence_duration_ms = jsConfig.Get("minSilenceDurationMs").As<Number>().Int32Value();
    }
    if (jsConfig.Has("preservePaddingMs")) {
        config.preserve_padding_ms = jsConfig.Get("preservePaddingMs").As<Number>().Int32Value();
    }

    if (jsConfig.Has("normalizeSampleRate")) {
        config.normalize_sample_rate = jsConfig.Get("normalizeSampleRate").As<Boolean>().Value();
    }
    if (jsConfig.Has("targetSampleRate")) {
        config.target_sample_rate = jsConfig.Get("targetSampleRate").As<Number>().Int32Value();
    }

    if (jsConfig.Has("normalizeVolume")) {
        config.normalize_volume = jsConfig.Get("normalizeVolume").As<Boolean>().Value();
    }
    if (jsConfig.Has("targetPeakDb")) {
        config.target_peak_db = jsConfig.Get("targetPeakDb").As<Number>().FloatValue();
    }
    if (jsConfig.Has("useRmsNormalization")) {
        config.use_rms_normalization = jsConfig.Get("useRmsNormalization").As<Boolean>().Value();
    }
    if (jsConfig.Has("targetRmsDb")) {
        config.target_rms_db = jsConfig.Get("targetRmsDb").As<Number>().FloatValue();
    }

    if (jsConfig.Has("noiseFloorDb")) {
        config.noise_floor_db = jsConfig.Get("noiseFloorDb").As<Number>().FloatValue();
    }

    // Doubling behavior control
    if (jsConfig.Has("disableDoublingAfterTrim")) {
        config.disable_doubling_after_trim = jsConfig.Get("disableDoublingAfterTrim").As<Boolean>().Value();
    }
    if (jsConfig.Has("doublingThresholdRatio")) {
        config.doubling_threshold_ratio = jsConfig.Get("doublingThresholdRatio").As<Number>().DoubleValue();
    }
    if (jsConfig.Has("minDurationForDoubling")) {
        config.min_duration_for_doubling = jsConfig.Get("minDurationForDoubling").As<Number>().DoubleValue();
    }

    return config;
}

// Generate fingerprint from file path
Value GenerateFingerprint(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        TypeError::New(env, "Expected string file path").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<String>().Utf8Value();

    try {
        // Use streaming loader but decompress for backward compatibility
        if (!g_streaming_loader) {
            g_streaming_loader = std::make_unique<StreamingAudioLoader>();
        }

        auto compressed_fp = g_streaming_loader->generateStreamingFingerprint(filePath);
        if (!compressed_fp || !compressed_fp->isValid()) {
            Error::New(env, "Failed to generate fingerprint for " + filePath).ThrowAsJavaScriptException();
            return env.Null();
        }

        // Decompress for backward compatibility
        auto regular_fp = compressed_fp->decompress();
        return FingerprintToJS(env, *regular_fp);
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Generate fingerprint with duration limit
Value GenerateFingerprintLimited(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
        TypeError::New(env, "Expected string file path and number duration").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<String>().Utf8Value();
    int maxDuration = info[1].As<Number>().Int32Value();

    try {
        // Use streaming loader with duration limit but decompress for compatibility
        if (!g_streaming_loader) {
            g_streaming_loader = std::make_unique<StreamingAudioLoader>();
        }

        auto compressed_fp = g_streaming_loader->generateStreamingFingerprintLimited(filePath, maxDuration);
        if (!compressed_fp || !compressed_fp->isValid()) {
            Error::New(env, "Failed to generate fingerprint for " + filePath).ThrowAsJavaScriptException();
            return env.Null();
        }

        // Decompress for backward compatibility
        auto regular_fp = compressed_fp->decompress();
        return FingerprintToJS(env, *regular_fp);
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Generate fingerprint with preprocessing
Value GenerateFingerprintWithPreprocessing(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        TypeError::New(env, "Expected string file path").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<String>().Utf8Value();
    PreprocessConfig config; // Use default config

    // Check if preprocessing config is provided
    if (info.Length() >= 2 && info[1].IsObject()) {
        config = JSToPreprocessConfig(info[1].As<Object>());
    }

    try {
        ChromaprintWrapper wrapper;
        auto fingerprint = wrapper.generate_fingerprint_with_preprocessing(filePath, config);
        return FingerprintToJS(env, *fingerprint);
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Test preprocessing on audio file
Value TestPreprocessing(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        TypeError::New(env, "Expected string file path").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<String>().Utf8Value();
    PreprocessConfig config; // Use default config

    // Check if preprocessing config is provided
    if (info.Length() >= 2 && info[1].IsObject()) {
        config = JSToPreprocessConfig(info[1].As<Object>());
    }

    try {
        AudioLoader loader;
        auto original = loader.load(filePath);
        auto processed = loader.load_with_preprocessing(filePath, &config);

        Object result = Object::New(env);

        // Original audio info
        Object originalInfo = Object::New(env);
        originalInfo.Set("sampleRate", Number::New(env, original->sample_rate));
        originalInfo.Set("duration", Number::New(env, original->duration));
        originalInfo.Set("samples", Number::New(env, original->samples.size()));

        // Processed audio info
        Object processedInfo = Object::New(env);
        processedInfo.Set("sampleRate", Number::New(env, processed->sample_rate));
        processedInfo.Set("duration", Number::New(env, processed->duration));
        processedInfo.Set("samples", Number::New(env, processed->samples.size()));

        result.Set("original", originalInfo);
        result.Set("processed", processedInfo);

        return result;
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Compare two fingerprints
Value CompareFingerprints(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsObject()) {
        TypeError::New(env, "Expected two fingerprint objects").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        auto fp1 = JSToFingerprintAny(info[0].As<Object>());
        auto fp2 = JSToFingerprintAny(info[1].As<Object>());

        FingerprintComparator comparator;
        auto result = comparator.compare(*fp1, *fp2);

        Object jsResult = Object::New(env);
        jsResult.Set("similarityScore", Number::New(env, result.similarity_score));
        jsResult.Set("bestOffset", Number::New(env, result.best_offset));
        jsResult.Set("matchedSegments", Number::New(env, result.matched_segments));
        jsResult.Set("bitErrorRate", Number::New(env, result.bit_error_rate));
        jsResult.Set("isDuplicate", Boolean::New(env, result.is_duplicate));
        jsResult.Set("coverageRatio", Number::New(env, result.coverage_ratio));

        return jsResult;
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Initialize index
Value InitializeIndex(const CallbackInfo& info) {
    Env env = info.Env();

    try {
        g_index = std::make_unique<FingerprintIndex>();
        return Boolean::New(env, true);
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return Boolean::New(env, false);
    }
}

// Add file to index
Value AddFileToIndex(const CallbackInfo& info) {
    Env env = info.Env();

    if (!g_index) {
        Error::New(env, "Index not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (info.Length() < 1 || !info[0].IsString()) {
        TypeError::New(env, "Expected string file path").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filePath = info[0].As<String>().Utf8Value();

    try {
        // Use streaming loader to generate compressed fingerprint
        if (!g_streaming_loader) {
            g_streaming_loader = std::make_unique<StreamingAudioLoader>();
        }

        auto compressed_fp = g_streaming_loader->generateStreamingFingerprint(filePath);
        if (!compressed_fp || !compressed_fp->isValid()) {
            Error::New(env, "Failed to generate fingerprint for " + filePath).ThrowAsJavaScriptException();
            return env.Null();
        }

        size_t fileId = g_index->add_file(filePath, std::move(compressed_fp));
        return Number::New(env, fileId);
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Find all duplicates
Value FindAllDuplicates(const CallbackInfo& info) {
    Env env = info.Env();

    if (!g_index) {
        Error::New(env, "Index not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        auto duplicateGroups = g_index->find_all_duplicates();
        Array jsGroups = Array::New(env, duplicateGroups.size());

        for (size_t i = 0; i < duplicateGroups.size(); ++i) {
            const auto& group = duplicateGroups[i];
            Object jsGroup = Object::New(env);

            Array jsFileIds = Array::New(env, group.file_ids.size());
            for (size_t j = 0; j < group.file_ids.size(); ++j) {
                jsFileIds[j] = Number::New(env, group.file_ids[j]);
            }

            Array jsFilePaths = Array::New(env, group.file_ids.size());
            for (size_t j = 0; j < group.file_ids.size(); ++j) {
                const auto* fileEntry = g_index->get_file(group.file_ids[j]);
                if (fileEntry) {
                    jsFilePaths[j] = String::New(env, fileEntry->file_path);
                } else {
                    jsFilePaths[j] = env.Null();
                }
            }

            jsGroup.Set("fileIds", jsFileIds);
            jsGroup.Set("filePaths", jsFilePaths);
            jsGroup.Set("avgSimilarity", Number::New(env, group.avg_similarity));

            jsGroups[i] = jsGroup;
        }

        return jsGroups;
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Get index statistics
Value GetIndexStats(const CallbackInfo& info) {
    Env env = info.Env();

    if (!g_index) {
        Error::New(env, "Index not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }

    Object stats = Object::New(env);
    stats.Set("fileCount", Number::New(env, g_index->get_file_count()));
    stats.Set("indexSize", Number::New(env, g_index->get_index_size()));
    stats.Set("loadFactor", Number::New(env, g_index->get_load_factor()));

    return stats;
}

// Configure similarity threshold
Value SetSimilarityThreshold(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber()) {
        TypeError::New(env, "Expected number threshold").ThrowAsJavaScriptException();
        return Boolean::New(env, false);
    }

    double threshold = info[0].As<Number>().DoubleValue();

    // Apply to the index's comparator if available
    if (g_index) {
        g_index->set_similarity_threshold(threshold);
    }
    return Boolean::New(env, true);
}

// Set maximum alignment offset
Value SetMaxAlignmentOffset(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber()) {
        TypeError::New(env, "Expected number maxOffset").ThrowAsJavaScriptException();
        return Boolean::New(env, false);
    }

    int maxOffset = info[0].As<Number>().Int32Value();

    // Apply to the index's comparator if available
    if (g_index) {
        g_index->set_max_alignment_offset(maxOffset);
    }
    return Boolean::New(env, true);
}

// Set bit error threshold
Value SetBitErrorThreshold(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber()) {
        TypeError::New(env, "Expected number threshold").ThrowAsJavaScriptException();
        return Boolean::New(env, false);
    }

    double threshold = info[0].As<Number>().DoubleValue();

    // Apply to the index's comparator if available
    if (g_index) {
        g_index->set_bit_error_threshold(threshold);
    }
    return Boolean::New(env, true);
}

// Compare fingerprints using sliding window approach
Value CompareFingerprintsSlidingWindow(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsObject()) {
        TypeError::New(env, "Expected two fingerprint objects").ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        auto fp1 = JSToFingerprint(info[0].As<Object>());
        auto fp2 = JSToFingerprint(info[1].As<Object>());

        FingerprintComparator comparator;
        MatchResult result = comparator.compare_sliding_window(*fp1, *fp2);

        Object jsResult = Object::New(env);
        jsResult.Set("similarityScore", Number::New(env, result.similarity_score));
        jsResult.Set("bestOffset", Number::New(env, result.best_offset));
        jsResult.Set("matchedSegments", Number::New(env, result.matched_segments));
        jsResult.Set("bitErrorRate", Number::New(env, result.bit_error_rate));
        jsResult.Set("isDuplicate", Boolean::New(env, result.is_duplicate));
        jsResult.Set("coverageRatio", Number::New(env, result.coverage_ratio));

        // Convert segment matches to JS array
        Array segmentMatches = Array::New(env, result.segment_matches.size());
        for (size_t i = 0; i < result.segment_matches.size(); ++i) {
            Object match = Object::New(env);
            match.Set("offset", Number::New(env, result.segment_matches[i].first));
            match.Set("similarity", Number::New(env, result.segment_matches[i].second));
            segmentMatches[i] = match;
        }
        jsResult.Set("segmentMatches", segmentMatches);

        return jsResult;

    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Clear index
Value ClearIndex(const CallbackInfo& info) {
    Env env = info.Env();

    if (g_index) {
        g_index->clear();
    }

    return Boolean::New(env, true);
}

// Generate fingerprints for multiple files in parallel using OpenMP
Value GenerateFingerprintsBatch(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsArray()) {
        TypeError::New(env, "First argument must be an array of file paths").ThrowAsJavaScriptException();
        return env.Null();
    }

    Array filePaths = info[0].As<Array>();
    uint32_t maxDuration = 0;

    if (info.Length() > 1 && info[1].IsNumber()) {
        maxDuration = info[1].As<Number>().Uint32Value();
    }

    try {
        Array results = Array::New(env, filePaths.Length());

        // Convert JS array to vector for OpenMP processing
        std::vector<std::string> paths;
        paths.reserve(filePaths.Length());
        for (uint32_t i = 0; i < filePaths.Length(); ++i) {
            paths.push_back(filePaths.Get(i).As<String>().Utf8Value());
        }

        // Process files in parallel using OpenMP
        #pragma omp parallel for
        for (int i = 0; i < static_cast<int>(paths.size()); ++i) {
            try {
                ChromaprintWrapper wrapper;
                auto fingerprint = maxDuration > 0
                    ? wrapper.generate_fingerprint_limited(paths[i], maxDuration)
                    : wrapper.generate_fingerprint(paths[i]);

                #pragma omp critical
                {
                    results[i] = FingerprintToJS(env, *fingerprint);
                }
            } catch (const std::exception& e) {
                #pragma omp critical
                {
                    Object errorObj = Object::New(env);
                    errorObj.Set("error", String::New(env, e.what()));
                    errorObj.Set("filePath", String::New(env, paths[i]));
                    results[i] = errorObj;
                }
            }
        }

        return results;
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Find all duplicates using parallel processing
Value FindAllDuplicatesParallel(const CallbackInfo& info) {
    Env env = info.Env();

    if (!g_index) {
        Error::New(env, "Index not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }

    size_t numThreads = 0;
    if (info.Length() > 0 && info[0].IsNumber()) {
        numThreads = info[0].As<Number>().Uint32Value();
    }

    try {
        auto duplicateGroups = g_index->find_all_duplicates_parallel(numThreads);

        Array jsDuplicateGroups = Array::New(env, duplicateGroups.size());

        for (size_t i = 0; i < duplicateGroups.size(); ++i) {
            const auto& group = duplicateGroups[i];

            Object jsGroup = Object::New(env);
            Array jsFileIds = Array::New(env, group.file_ids.size());
            Array jsFilePaths = Array::New(env, group.file_ids.size());

            for (size_t j = 0; j < group.file_ids.size(); ++j) {
                jsFileIds[j] = Number::New(env, group.file_ids[j]);

                const auto* file_entry = g_index->get_file(group.file_ids[j]);
                if (file_entry) {
                    jsFilePaths[j] = String::New(env, file_entry->file_path);
                }
            }

            jsGroup.Set("fileIds", jsFileIds);
            jsGroup.Set("filePaths", jsFilePaths);
            jsGroup.Set("avgSimilarity", Number::New(env, group.avg_similarity));

            jsDuplicateGroups[i] = jsGroup;
        }

        return jsDuplicateGroups;
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Get memory pool statistics
Value GetMemoryPoolStats(const CallbackInfo& info) {
    Env env = info.Env();

    try {
        auto stats = AudioMemoryPool::getInstance().getStats();

        Object jsStats = Object::New(env);
        jsStats.Set("totalAllocated", Number::New(env, stats.total_allocated));
        jsStats.Set("totalDeallocated", Number::New(env, stats.total_deallocated));
        jsStats.Set("currentUsage", Number::New(env, stats.current_usage));
        jsStats.Set("peakUsage", Number::New(env, stats.peak_usage));

        return jsStats;
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Clear memory pool
Value ClearMemoryPool(const CallbackInfo& info) {
    Env env = info.Env();

    try {
        AudioMemoryPool::getInstance().clear();
        return Boolean::New(env, true);
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Get streaming loader statistics
Value GetStreamingStats(const CallbackInfo& info) {
    Env env = info.Env();

    try {
        if (!g_streaming_loader) {
            g_streaming_loader = std::make_unique<StreamingAudioLoader>();
        }

        auto stats = g_streaming_loader->getLastStats();

        Object jsStats = Object::New(env);
        jsStats.Set("totalBytesProcessed", Number::New(env, stats.total_bytes_processed));
        jsStats.Set("peakMemoryUsage", Number::New(env, stats.peak_memory_usage));
        jsStats.Set("compressionRatio", Number::New(env, stats.compression_ratio));
        jsStats.Set("processingTimeSeconds", Number::New(env, stats.processing_time_seconds));

        return jsStats;
    } catch (const std::exception& e) {
        Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Initialize the module and export functions
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Initialize memory pool
    AudioMemoryPool::getInstance().setEnabled(true);

    // Initialize streaming loader
    if (!g_streaming_loader) {
        g_streaming_loader = std::make_unique<StreamingAudioLoader>();
    }

    // Core fingerprinting functions
    exports.Set("generateFingerprint", Function::New(env, GenerateFingerprint));
    exports.Set("generateFingerprintLimited", Function::New(env, GenerateFingerprintLimited));
    exports.Set("generateFingerprintWithPreprocessing", Function::New(env, GenerateFingerprintWithPreprocessing));
    exports.Set("testPreprocessing", Function::New(env, TestPreprocessing));
    exports.Set("compareFingerprints", Function::New(env, CompareFingerprints));

    // Index management functions
    exports.Set("initializeIndex", Function::New(env, InitializeIndex));
    exports.Set("addFileToIndex", Function::New(env, AddFileToIndex));
    exports.Set("findAllDuplicates", Function::New(env, FindAllDuplicates));
    exports.Set("getIndexStats", Function::New(env, GetIndexStats));
    exports.Set("clearIndex", Function::New(env, ClearIndex));

    // Parallel processing functions
    exports.Set("generateFingerprintsBatch", Function::New(env, GenerateFingerprintsBatch));
    exports.Set("findAllDuplicatesParallel", Function::New(env, FindAllDuplicatesParallel));

    // Configuration functions
    exports.Set("setSimilarityThreshold", Function::New(env, SetSimilarityThreshold));
    exports.Set("setMaxAlignmentOffset", Function::New(env, SetMaxAlignmentOffset));
    exports.Set("setBitErrorThreshold", Function::New(env, SetBitErrorThreshold));

    // Enhanced comparison functions
    exports.Set("compareFingerprintsSlidingWindow", Function::New(env, CompareFingerprintsSlidingWindow));

    // Memory monitoring functions
    exports.Set("getMemoryPoolStats", Function::New(env, GetMemoryPoolStats));
    exports.Set("clearMemoryPool", Function::New(env, ClearMemoryPool));
    exports.Set("getStreamingStats", Function::New(env, GetStreamingStats));

    return exports;
}

// Register the module
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)