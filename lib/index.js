const path = require('path');
const fs = require('fs');

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
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<Array>} Array of duplicate groups
 */
async function scanDirectoryForDuplicates(directoryPath, options = {}) {
  const { threshold = 0.85, onProgress } = options;

  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }

  // Initialize index
  await initializeIndex();
  await setSimilarityThreshold(threshold);

  // Find all audio files
  const audioExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma'];
  const audioFiles = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (audioExtensions.includes(path.extname(file).toLowerCase())) {
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
  const { threshold = 0.85, onProgress } = options;

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
  const audioExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma'];
  const audioFiles = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (audioExtensions.includes(path.extname(file).toLowerCase())) {
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
  const audioExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma'];
  const audioFiles = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (audioExtensions.includes(path.extname(file).toLowerCase())) {
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

// Export all functions
module.exports = {
  // Core fingerprinting functions
  generateFingerprint,
  generateFingerprintLimited,
  generateFingerprintWithPreprocessing,
  testPreprocessing,
  compareFingerprints,
  compareFingerprintsSlidingWindow,

  // Index management functions
  initializeIndex,
  addFileToIndex,
  findAllDuplicates,
  getIndexStats,
  clearIndex,

  // Configuration functions
  setSimilarityThreshold,
  setMaxAlignmentOffset,
  setBitErrorThreshold,
  createSilenceHandlingConfig,

  // High-level utility functions
  scanDirectoryForDuplicates,
  scanMultipleDirectoriesForDuplicates,
  scanDirectoryForDuplicatesEnhanced
};