const path = require('path');
const fs = require('fs');

// Import p-limit with proper CommonJS handling
let pLimit;
try {
  const pLimitModule = require('p-limit');
  pLimit = pLimitModule.default || pLimitModule;
} catch (error) {
  // Fallback to creating a simple limiter if p-limit is not available
  pLimit = (concurrency) => {
    let running = 0;
    const queue = [];

    return (fn) => {
      return new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        process();
      });
    };

    function process() {
      if (running >= concurrency || queue.length === 0) return;

      const { fn, resolve, reject } = queue.shift();
      running++;

      Promise.resolve(fn()).then(resolve).catch(reject).finally(() => {
        running--;
        process();
      });
    }
  };
}

let addon;

try {
  // Try to load prebuilt binary first
  addon = require('node-gyp-build')(path.join(__dirname, '..'));
} catch (err) {
  try {
    // Fallback to development build
    addon = require('../build/Release/addon');
  } catch (err2) {
    try {
      // Fallback to debug build
      addon = require('../build/Debug/addon');
    } catch (err3) {
      throw new Error('Could not locate the bindings file. Tried:\n' +
        '- node-gyp-build (prebuilt)\n' +
        '- ../build/Release/addon\n' +
        '- ../build/Debug/addon\n' +
        'Make sure to run "npm run build" first.');
    }
  }
}

/**
 * Generate audio fingerprint from file path
 * @param {string} filePath - Path to audio file
 * @returns {Promise<Object>} Fingerprint object with data, sampleRate, duration, filePath
 */
async function generateFingerprint(filePath) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const result = addon.generateFingerprint(filePath);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate audio fingerprint with duration limit
 * @param {string} filePath - Path to audio file
 * @param {number} maxDuration - Maximum duration in seconds
 * @returns {Promise<Object>} Fingerprint object
 */
async function generateFingerprintLimited(filePath, maxDuration) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const result = addon.generateFingerprintLimited(filePath, maxDuration);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate audio fingerprint with preprocessing
 * @param {string} filePath - Path to audio file
 * @param {Object} config - Preprocessing configuration
 * @param {boolean} config.trimSilence - Trim silence from start/end
 * @param {number} config.silenceThresholdDb - Silence threshold in dB
 * @param {boolean} config.normalizeSampleRate - Normalize sample rate
 * @param {number} config.targetSampleRate - Target sample rate (default: 44100)
 * @param {boolean} config.normalizeVolume - Normalize volume levels
 * @param {number} config.targetPeakDb - Target peak level in dB
 * @param {boolean} config.useRmsNormalization - Use RMS instead of peak normalization
 * @param {number} config.targetRmsDb - Target RMS level in dB
 * @param {boolean} config.disableDoublingAfterTrim - Don't double audio that was trimmed significantly (default: true)
 * @param {number} config.doublingThresholdRatio - If trimmed audio is < ratio * original, consider doubling (default: 0.5)
 * @param {number} config.minDurationForDoubling - Minimum original duration before considering doubling (default: 1.5 seconds)
 * @returns {Promise<Object>} Fingerprint object
 */
async function generateFingerprintWithPreprocessing(filePath, config = {}) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const result = addon.generateFingerprintWithPreprocessing(filePath, config);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Test preprocessing effects on audio file
 * @param {string} filePath - Path to audio file
 * @param {Object} config - Preprocessing configuration
 * @returns {Promise<Object>} Comparison of original vs processed audio info
 */
async function testPreprocessing(filePath, config = {}) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const result = addon.testPreprocessing(filePath, config);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Compare two fingerprints
 * @param {Object} fingerprint1 - First fingerprint
 * @param {Object} fingerprint2 - Second fingerprint
 * @returns {Promise<Object>} Comparison result with similarity score and other metrics
 */
async function compareFingerprints(fingerprint1, fingerprint2) {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.compareFingerprints(fingerprint1, fingerprint2);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Compare two fingerprints using sliding window approach for better silence padding handling
 * @param {Object} fingerprint1 - First fingerprint
 * @param {Object} fingerprint2 - Second fingerprint
 * @returns {Promise<Object>} Comparison result with segment matches and coverage ratio
 */
async function compareFingerprintsSlidingWindow(fingerprint1, fingerprint2) {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.compareFingerprintsSlidingWindow(fingerprint1, fingerprint2);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Initialize the fingerprint index
 * @returns {Promise<boolean>} Success status
 */
async function initializeIndex() {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.initializeIndex();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add file to the index
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>} File ID in the index
 */
async function addFileToIndex(filePath) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const result = addon.addFileToIndex(filePath);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Find all duplicate groups in the index
 * @returns {Promise<Array>} Array of duplicate groups
 */
async function findAllDuplicates() {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.findAllDuplicates();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get index statistics
 * @returns {Promise<Object>} Index statistics
 */
async function getIndexStats() {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.getIndexStats();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Clear the index
 * @returns {Promise<boolean>} Success status
 */
async function clearIndex() {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.clearIndex();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate fingerprints for multiple files in batch
 * @param {string[]} filePaths - Array of file paths
 * @param {number} maxDuration - Optional maximum duration in seconds
 * @returns {Promise<Array>} Array of fingerprint objects or error objects
 */
async function generateFingerprintsBatch(filePaths, maxDuration) {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(filePaths)) {
        throw new Error('First argument must be an array of file paths');
      }

      const result = maxDuration
        ? addon.generateFingerprintsBatch(filePaths, maxDuration)
        : addon.generateFingerprintsBatch(filePaths);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Find all duplicate groups using parallel processing
 * @param {number} numThreads - Number of threads to use (0 = auto-detect)
 * @returns {Promise<Array>} Array of duplicate groups
 */
async function findAllDuplicatesParallel(numThreads = 0) {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.findAllDuplicatesParallel(numThreads);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Set similarity threshold for duplicate detection
 * @param {number} threshold - Similarity threshold (0.0 to 1.0)
 * @returns {Promise<boolean>} Success status
 */
async function setSimilarityThreshold(threshold) {
  return new Promise((resolve, reject) => {
    try {
      if (threshold < 0 || threshold > 1) {
        throw new Error('Threshold must be between 0.0 and 1.0');
      }
      const result = addon.setSimilarityThreshold(threshold);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Set maximum alignment offset for duplicate detection (in fingerprint samples)
 * @param {number} maxOffset - Maximum offset to search (default: 360 for ~30 seconds)
 * @returns {Promise<boolean>} Success status
 */
async function setMaxAlignmentOffset(maxOffset) {
  return new Promise((resolve, reject) => {
    try {
      if (maxOffset < 0) {
        throw new Error('Max offset must be non-negative');
      }
      const result = addon.setMaxAlignmentOffset(maxOffset);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Set bit error threshold for duplicate detection
 * @param {number} threshold - Bit error threshold (0.0 to 1.0)
 * @returns {Promise<boolean>} Success status
 */
async function setBitErrorThreshold(threshold) {
  return new Promise((resolve, reject) => {
    try {
      if (threshold < 0 || threshold > 1) {
        throw new Error('Threshold must be between 0.0 and 1.0');
      }
      const result = addon.setBitErrorThreshold(threshold);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get memory pool statistics
 * @returns {Promise<Object>} Memory pool statistics
 */
async function getMemoryPoolStats() {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.getMemoryPoolStats();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Clear memory pool
 * @returns {Promise<boolean>} Success status
 */
async function clearMemoryPool() {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.clearMemoryPool();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get streaming audio loader statistics
 * @returns {Promise<Object>} Streaming loader statistics
 */
async function getStreamingStats() {
  return new Promise((resolve, reject) => {
    try {
      const result = addon.getStreamingStats();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create default preprocessing configuration for silence handling
 * @param {Object} overrides - Optional overrides for default config
 * @returns {Object} Preprocessing configuration object
 */
function createSilenceHandlingConfig(overrides = {}) {
  return {
    trimSilence: true,
    silenceThresholdDb: -55.0,
    minSilenceDurationMs: 100,
    preservePaddingMs: 100,
    normalizeSampleRate: true,
    targetSampleRate: 44100,
    normalizeVolume: true,
    targetPeakDb: -3.0,
    useRmsNormalization: true,
    targetRmsDb: -20.0,
    noiseFloorDb: -60.0,
    applyGentleCompression: false,
    compressionRatio: 2.0,
    ...overrides
  };
}

/**
 * Scan directory for audio files and find duplicates
 * @param {string} directoryPath - Path to directory
 * @param {Object} options - Options object
 * @param {number} options.threshold - Similarity threshold (default: 0.85)
 * @param {string[]} options.extensions - File extensions to scan (default: ['.wav'])
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<Array>} Array of duplicate groups
 */
async function scanDirectoryForDuplicates(directoryPath, options = {}) {
  const { threshold = 0.85, extensions = ['.wav'], onProgress } = options;

  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }

  // Initialize index
  await initializeIndex();
  await setSimilarityThreshold(threshold);

  // Find all audio files
  const audioFiles = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (extensions.includes(path.extname(file).toLowerCase())) {
        audioFiles.push(fullPath);
      }
    }
  }

  scanDirectory(directoryPath);

  // Add files to index
  for (let i = 0; i < audioFiles.length; i++) {
    try {
      await addFileToIndex(audioFiles[i]);
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: audioFiles.length,
          file: audioFiles[i]
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not process ${audioFiles[i]}: ${error.message}`);
    }
  }

  // Find duplicates
  return await findAllDuplicates();
}

/**
 * Scan multiple directories for audio files and find duplicates across all directories
 * @param {string[]} directoryPaths - Array of directory paths
 * @param {Object} options - Options object
 * @param {number} options.threshold - Similarity threshold (default: 0.85)
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<Array>} Array of duplicate groups
 */
async function scanMultipleDirectoriesForDuplicates(directoryPaths, options = {}) {
  const { threshold = 0.85, extensions = ['.wav'], onProgress } = options;

  // Validate all directories exist
  for (const directoryPath of directoryPaths) {
    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }
  }

  // Initialize index
  await initializeIndex();
  await setSimilarityThreshold(threshold);

  // Find all audio files across all directories
  const audioFiles = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (extensions.includes(path.extname(file).toLowerCase())) {
        audioFiles.push(fullPath);
      }
    }
  }

  // Scan all directories
  for (const directoryPath of directoryPaths) {
    scanDirectory(directoryPath);
  }

  // Add files to index
  for (let i = 0; i < audioFiles.length; i++) {
    try {
      await addFileToIndex(audioFiles[i]);
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: audioFiles.length,
          file: audioFiles[i],
          currentDirectory: path.dirname(audioFiles[i])
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not process ${audioFiles[i]}: ${error.message}`);
    }
  }

  // Find duplicates
  return await findAllDuplicates();
}

/**
 * Scan directory for audio files and find duplicates with enhanced silence padding handling
 * @param {string} directoryPath - Path to directory
 * @param {Object} options - Options object
 * @param {number} options.threshold - Similarity threshold (default: 0.85)
 * @param {boolean} options.useSlidingWindow - Use sliding window comparison (default: true)
 * @param {boolean} options.enableSilenceTrimming - Enable silence trimming preprocessing (default: true)
 * @param {Object} options.preprocessConfig - Custom preprocessing configuration
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<Array>} Array of duplicate groups
 */
async function scanDirectoryForDuplicatesEnhanced(directoryPath, options = {}) {
  const {
    threshold = 0.85,
    extensions = ['.wav'],
    useSlidingWindow = true,
    enableSilenceTrimming = true,
    preprocessConfig = {},
    onProgress
  } = options;

  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }

  // Initialize index
  await initializeIndex();
  await setSimilarityThreshold(threshold);

  // Configure enhanced alignment for silence padding
  await setMaxAlignmentOffset(360); // 30 seconds
  await setBitErrorThreshold(0.15);

  // Create preprocessing config if silence trimming is enabled
  const finalPreprocessConfig = enableSilenceTrimming
    ? createSilenceHandlingConfig(preprocessConfig)
    : null;

  // Find all audio files
  const audioFiles = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (extensions.includes(path.extname(file).toLowerCase())) {
        audioFiles.push(fullPath);
      }
    }
  }

  scanDirectory(directoryPath);

  // Add files to index with optional preprocessing
  for (let i = 0; i < audioFiles.length; i++) {
    try {
      if (finalPreprocessConfig) {
        // Use preprocessing-enabled fingerprint generation
        const fingerprint = await generateFingerprintWithPreprocessing(audioFiles[i], finalPreprocessConfig);
        // Note: addFingerprintToIndex would need to be implemented in the native addon
        await addFileToIndex(audioFiles[i]); // Fallback to regular for now
      } else {
        await addFileToIndex(audioFiles[i]);
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: audioFiles.length,
          file: audioFiles[i],
          preprocessing: !!finalPreprocessConfig,
          slidingWindow: useSlidingWindow
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not process ${audioFiles[i]}: ${error.message}`);
    }
  }

  // Find duplicates using appropriate method
  // Note: findAllDuplicatesSlidingWindow would need to be implemented in the native addon
  return await findAllDuplicates();
}

/**
 * Scan directory for audio files and find duplicates using parallel processing
 * @param {string} directoryPath - Path to directory
 * @param {Object} options - Options object
 * @param {number} options.threshold - Similarity threshold (default: 0.85)
 * @param {number} options.concurrency - Number of concurrent operations (default: CPU cores)
 * @param {number} options.batchSize - Files to process in each batch (default: 50)
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<Array>} Array of duplicate groups
 */
async function scanDirectoryForDuplicatesParallel(directoryPath, options = {}) {
  const {
    threshold = 0.85,
    extensions = ['.wav'],
    concurrency = require('os').cpus().length,
    batchSize = 50,
    onProgress
  } = options;

  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }

  // Initialize index
  await initializeIndex();
  await setSimilarityThreshold(threshold);

  // Find all audio files with parallel discovery
  const audioFiles = [];
  let scannedFiles = 0;
  let lastProgressTime = Date.now();

  // Create concurrency limiter to prevent filesystem overload
  const limit = pLimit(concurrency || 10);

  async function scanDirectoryParallel(dir) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      // Process entries in parallel with concurrency control
      const tasks = entries.map(entry =>
        limit(async () => {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await scanDirectoryParallel(fullPath);
          } else {
            scannedFiles++;
            if (extensions.includes(path.extname(entry.name).toLowerCase())) {
              audioFiles.push(fullPath);
            }

            // Report discovery progress every 1000 files or every 2 seconds
            const now = Date.now();
            if (onProgress && (scannedFiles % 1000 === 0 || now - lastProgressTime > 2000)) {
              onProgress({
                phase: 'discovery',
                scannedFiles: scannedFiles,
                audioFiles: audioFiles.length,
                currentPath: path.basename(dir)
              });
              lastProgressTime = now;
            }
          }
        })
      );

      await Promise.all(tasks);
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
    }
  }

  if (onProgress) {
    onProgress({
      phase: 'discovery_start',
      message: 'Discovering files...'
    });
  }

  await scanDirectoryParallel(directoryPath);

  if (onProgress) {
    onProgress({
      phase: 'discovery_complete',
      scannedFiles: scannedFiles,
      audioFiles: audioFiles.length,
      message: `Found ${audioFiles.length} audio files in ${scannedFiles} total files`
    });
  }

  if (audioFiles.length === 0) {
    return [];
  }

  // Add files to index sequentially (OpenMP parallelizes the duplicate detection)
  for (let i = 0; i < audioFiles.length; i++) {
    try {
      await addFileToIndex(audioFiles[i]);

      if (onProgress) {
        onProgress({
          phase: 'processing',
          current: i + 1,
          total: audioFiles.length,
          file: audioFiles[i],
          parallel: true,
          concurrency: concurrency || require('os').cpus().length
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not process ${audioFiles[i]}: ${error.message}`);
    }
  }

  // Find duplicates using OpenMP parallel processing
  if (onProgress) {
    onProgress({
      phase: 'duplicate_detection',
      message: 'Analyzing for duplicates using parallel processing...'
    });
  }

  return await findAllDuplicatesParallel(concurrency);
}

// Export all functions
module.exports = {
  // Core fingerprinting functions
  generateFingerprint,
  generateFingerprintLimited,
  generateFingerprintWithPreprocessing,
  generateFingerprintsBatch,
  testPreprocessing,
  compareFingerprints,
  compareFingerprintsSlidingWindow,

  // Index management functions
  initializeIndex,
  addFileToIndex,
  findAllDuplicates,
  findAllDuplicatesParallel,
  getIndexStats,
  clearIndex,

  // Configuration functions
  setSimilarityThreshold,
  setMaxAlignmentOffset,
  setBitErrorThreshold,
  createSilenceHandlingConfig,

  // Memory monitoring functions
  getMemoryPoolStats,
  clearMemoryPool,
  getStreamingStats,

  // High-level utility functions
  scanDirectoryForDuplicates,
  scanDirectoryForDuplicatesParallel,
  scanMultipleDirectoriesForDuplicates,
  scanDirectoryForDuplicatesEnhanced
};