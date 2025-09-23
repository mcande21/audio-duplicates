/**
 * Audio Duplicate Detection TypeScript Definitions
 * Fast audio duplicate detection using Chromaprint fingerprinting
 */

/**
 * Audio fingerprint data structure
 */
export interface Fingerprint {
  data: number[];
  sampleRate: number;
  duration: number;
  filePath: string;
}

/**
 * Result of fingerprint comparison
 */
export interface MatchResult {
  similarityScore: number;
  bestOffset: number;
  matchedSegments: number;
  bitErrorRate: number;
  isDuplicate: boolean;

  // Additional fields for sliding window results
  segmentMatches?: Array<{offset: number, similarity: number}>;
  coverageRatio?: number;
}

/**
 * Audio preprocessing configuration
 */
export interface PreprocessConfig {
  // Silence trimming options
  trimSilence?: boolean;
  silenceThresholdDb?: number;
  minSilenceDurationMs?: number;
  preservePaddingMs?: number;

  // Sample rate normalization
  normalizeSampleRate?: boolean;
  targetSampleRate?: number;

  // Volume normalization
  normalizeVolume?: boolean;
  targetPeakDb?: number;
  useRmsNormalization?: boolean;
  targetRmsDb?: number;

  // Advanced options
  noiseFloorDb?: number;
  applyGentleCompression?: boolean;
  compressionRatio?: number;

  // Doubling behavior control
  disableDoublingAfterTrim?: boolean;    // Don't double if audio was trimmed significantly (default: true)
  doublingThresholdRatio?: number;       // If trimmed audio is < ratio * original, consider doubling (default: 0.5)
  minDurationForDoubling?: number;       // Minimum original duration before considering doubling (default: 1.5 seconds)
}

/**
 * Audio preprocessing test result
 */
export interface PreprocessingTestResult {
  original: {
    sampleRate: number;
    duration: number;
    samples: number;
  };
  processed: {
    sampleRate: number;
    duration: number;
    samples: number;
  };
}

/**
 * Group of duplicate files
 */
export interface DuplicateGroup {
  fileIds: number[];
  filePaths: string[];
  avgSimilarity: number;
}

/**
 * Index statistics
 */
export interface IndexStats {
  fileCount: number;
  indexSize: number;
  loadFactor: number;
}

/**
 * Progress information for directory scanning
 */
export interface ScanProgress {
  current: number;
  total: number;
  file: string;
}

/**
 * Options for directory scanning
 */
export interface ScanOptions {
  threshold?: number;
  onProgress?: (progress: ScanProgress) => void;
}

/**
 * Enhanced options for directory scanning with silence padding handling
 */
export interface EnhancedScanOptions extends ScanOptions {
  useSlidingWindow?: boolean;
  enableSilenceTrimming?: boolean;
  preprocessConfig?: PreprocessConfig;
  onProgress?: (progress: ScanProgress & {
    preprocessing?: boolean;
    slidingWindow?: boolean;
  }) => void;
}

// Core fingerprinting functions

/**
 * Generate audio fingerprint from file path
 * @param filePath Path to audio file
 * @returns Promise resolving to fingerprint object
 * @throws Error if file not found or cannot be processed
 */
export function generateFingerprint(filePath: string): Promise<Fingerprint>;

/**
 * Generate audio fingerprint with duration limit
 * @param filePath Path to audio file
 * @param maxDuration Maximum duration in seconds
 * @returns Promise resolving to fingerprint object
 * @throws Error if file not found or cannot be processed
 */
export function generateFingerprintLimited(filePath: string, maxDuration: number): Promise<Fingerprint>;

/**
 * Generate audio fingerprint with preprocessing
 * @param filePath Path to audio file
 * @param config Preprocessing configuration
 * @returns Promise resolving to fingerprint object
 * @throws Error if file not found or cannot be processed
 */
export function generateFingerprintWithPreprocessing(filePath: string, config?: PreprocessConfig): Promise<Fingerprint>;

/**
 * Test preprocessing effects on audio file
 * @param filePath Path to audio file
 * @param config Preprocessing configuration
 * @returns Promise resolving to preprocessing test results
 * @throws Error if file not found or cannot be processed
 */
export function testPreprocessing(filePath: string, config?: PreprocessConfig): Promise<PreprocessingTestResult>;

/**
 * Compare two fingerprints
 * @param fingerprint1 First fingerprint
 * @param fingerprint2 Second fingerprint
 * @returns Promise resolving to comparison result
 */
export function compareFingerprints(fingerprint1: Fingerprint, fingerprint2: Fingerprint): Promise<MatchResult>;

/**
 * Compare two fingerprints using sliding window approach for better silence padding handling
 * @param fingerprint1 First fingerprint
 * @param fingerprint2 Second fingerprint
 * @returns Promise resolving to comparison result with segment matches and coverage ratio
 */
export function compareFingerprintsSlidingWindow(fingerprint1: Fingerprint, fingerprint2: Fingerprint): Promise<MatchResult>;

// Index management functions

/**
 * Initialize the fingerprint index
 * @returns Promise resolving to success status
 */
export function initializeIndex(): Promise<boolean>;

/**
 * Add file to the index
 * @param filePath Path to audio file
 * @returns Promise resolving to file ID in the index
 * @throws Error if file not found or cannot be processed
 */
export function addFileToIndex(filePath: string): Promise<number>;

/**
 * Find all duplicate groups in the index
 * @returns Promise resolving to array of duplicate groups
 */
export function findAllDuplicates(): Promise<DuplicateGroup[]>;

/**
 * Get index statistics
 * @returns Promise resolving to index statistics
 */
export function getIndexStats(): Promise<IndexStats>;

/**
 * Clear the index
 * @returns Promise resolving to success status
 */
export function clearIndex(): Promise<boolean>;

// Configuration functions

/**
 * Set similarity threshold for duplicate detection
 * @param threshold Similarity threshold (0.0 to 1.0)
 * @returns Promise resolving to success status
 * @throws Error if threshold is out of range
 */
export function setSimilarityThreshold(threshold: number): Promise<boolean>;

/**
 * Set maximum alignment offset for duplicate detection
 * @param maxOffset Maximum offset to search (default: 360 for ~30 seconds)
 * @returns Promise resolving to success status
 * @throws Error if offset is negative
 */
export function setMaxAlignmentOffset(maxOffset: number): Promise<boolean>;

/**
 * Set bit error threshold for duplicate detection
 * @param threshold Bit error threshold (0.0 to 1.0)
 * @returns Promise resolving to success status
 * @throws Error if threshold is out of range
 */
export function setBitErrorThreshold(threshold: number): Promise<boolean>;

/**
 * Create default preprocessing configuration for silence handling
 * @param overrides Optional overrides for default config
 * @returns Preprocessing configuration object
 */
export function createSilenceHandlingConfig(overrides?: Partial<PreprocessConfig>): PreprocessConfig;

// High-level utility functions

/**
 * Scan directory for audio files and find duplicates
 * @param directoryPath Path to directory
 * @param options Scan options
 * @returns Promise resolving to array of duplicate groups
 * @throws Error if directory not found
 */
export function scanDirectoryForDuplicates(directoryPath: string, options?: ScanOptions): Promise<DuplicateGroup[]>;

/**
 * Scan multiple directories for audio files and find duplicates across all directories
 * @param directoryPaths Array of directory paths
 * @param options Scan options
 * @returns Promise resolving to array of duplicate groups
 * @throws Error if any directory not found
 */
export function scanMultipleDirectoriesForDuplicates(directoryPaths: string[], options?: ScanOptions): Promise<DuplicateGroup[]>;

/**
 * Scan directory for audio files and find duplicates with enhanced silence padding handling
 * @param directoryPath Path to directory
 * @param options Enhanced scan options
 * @returns Promise resolving to array of duplicate groups
 * @throws Error if directory not found
 */
export function scanDirectoryForDuplicatesEnhanced(directoryPath: string, options?: EnhancedScanOptions): Promise<DuplicateGroup[]>;