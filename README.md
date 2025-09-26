# Audio Duplicates

[![npm version](https://badge.fury.io/js/audio-duplicates.svg)](https://badge.fury.io/js/audio-duplicates)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/mcande21/audio-duplicates/workflows/CI/badge.svg)](https://github.com/mcande21/audio-duplicates/actions)
[![npm downloads](https://img.shields.io/npm/dm/audio-duplicates.svg)](https://www.npmjs.com/package/audio-duplicates)

A high-performance audio duplicate detection library built with native C++ and Chromaprint fingerprinting technology. Quickly find duplicate audio files across large collections with robust detection that handles different encodings, bitrates, and formats.

## ✨ Features

- **🚀 High Performance**: Native C++ implementation ~200x faster than JavaScript
- **🧠 Memory Optimized**: 80-90% memory usage reduction with advanced pool management
- **⚡ Parallel Processing**: Multi-threaded scanning with configurable concurrency
- **🎵 Format Support**: MP3, WAV, FLAC, OGG, M4A, AAC, WMA, and more
- **⚡ Fast Matching**: Optimized inverted index for O(1) duplicate lookups
- **🔧 Robust Detection**: Handles different bitrates, sample rates, and encodings
- **💻 CLI Tool**: Full-featured command-line interface with memory monitoring
- **📝 TypeScript Support**: Complete TypeScript definitions included
- **🌍 Cross-Platform**: Windows, macOS, and Linux support
- **📊 Progress Reporting**: Real-time progress bars and detailed statistics
- **🔍 Memory Monitoring**: Live memory usage tracking and automatic cleanup

## 📦 Installation

### Prerequisites

Install the required system libraries first:

#### macOS
```bash
brew install chromaprint libsndfile
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install libchromaprint-dev libsndfile1-dev
```

#### Windows
Download and install:
- [Chromaprint](https://github.com/acoustid/chromaprint/releases)
- [libsndfile](http://www.mega-nerd.com/libsndfile/#Download)

### Install the Package

#### Global Installation (Recommended for CLI)
```bash
npm install -g audio-duplicates
```

#### Local Installation (for API usage)
```bash
npm install audio-duplicates
```

The package automatically uses prebuilt binaries when available, falling back to source compilation if needed.

### Dependencies

#### Production Dependencies
- **chalk** (^4.1.2) - Terminal string styling for colorized CLI output
- **cli-progress** (^3.12.0) - Real-time progress bars for CLI operations
- **commander** (^11.0.0) - Command-line interface framework
- **node-addon-api** (^7.0.0) - Native addon development API
- **node-gyp-build** (^4.8.0) - Prebuilt binary loading and fallback
- **p-limit** (^7.1.1) - Concurrency control for parallel processing
- **prebuild-install** (^7.1.1) - Prebuilt binary installation

#### Development Dependencies
- **chai** (^4.3.7) - Assertion library for testing
- **mocha** (^10.2.0) - JavaScript test framework
- **node-gyp** (^10.0.0) - Native addon build tool
- **prebuildify** (^6.0.0) - Prebuilt binary generation

#### System Requirements
- **Node.js**: >=18.0.0
- **System Libraries**: Chromaprint, libsndfile

## 🚀 Quick Start

### CLI Usage

#### Scan for Duplicates
```bash
# Basic scan
audio-duplicates scan /path/to/music

# Scan multiple directories
audio-duplicates scan /music/collection1 /music/collection2

# High-performance parallel scanning with memory management
audio-duplicates scan /path/to/music --parallel --threads 8 --memory-limit 512 --memory-stats

# Custom file types and threshold
audio-duplicates scan /path/to/music --extensions "mp3,flac,wav" --threshold 0.9

# Save results with progress tracking
audio-duplicates scan /path/to/music --output duplicates.json --format json --verbose

# Limit fingerprint duration for large files
audio-duplicates scan /path/to/music --max-duration 180
```

#### Compare Two Files
```bash
# Basic comparison
audio-duplicates compare song1.mp3 song2.mp3

# Compare with duration limit
audio-duplicates compare song1.mp3 song2.mp3 --max-duration 60

# Verbose comparison with detailed output
audio-duplicates compare song1.mp3 song2.mp3 --verbose
```

#### Generate Fingerprint
```bash
# Generate and display fingerprint
audio-duplicates fingerprint song.mp3

# Save fingerprint to file
audio-duplicates fingerprint song.mp3 --output fingerprint.json

# Limit fingerprint to first 30 seconds
audio-duplicates fingerprint song.mp3 --max-duration 30
```

### API Usage

#### Basic Duplicate Detection
```javascript
const audioDuplicates = require('audio-duplicates');

async function findDuplicates() {
  // Scan directory for duplicates
  const duplicates = await audioDuplicates.scanDirectoryForDuplicates('/path/to/music', {
    threshold: 0.85,
    onProgress: (progress) => {
      console.log(`Processing: ${progress.current}/${progress.total} - ${progress.file}`);
    }
  });

  // Display results
  duplicates.forEach((group, index) => {
    console.log(`\nDuplicate Group ${index + 1}:`);
    group.files.forEach(file => {
      console.log(`  ${file.path} (similarity: ${file.similarity})`);
    });
  });
}

findDuplicates().catch(console.error);
```

#### Manual Fingerprint Comparison
```javascript
const audioDuplicates = require('audio-duplicates');

async function compareFiles() {
  // Generate fingerprints
  const fp1 = await audioDuplicates.generateFingerprint('file1.mp3');
  const fp2 = await audioDuplicates.generateFingerprint('file2.mp3');

  // Compare fingerprints
  const result = await audioDuplicates.compareFingerprints(fp1, fp2);

  console.log('Similarity Score:', result.similarityScore);
  console.log('Are Duplicates:', result.isDuplicate);
  console.log('Confidence:', result.confidence);
}

compareFiles().catch(console.error);
```

#### Batch Processing with Index
```javascript
const audioDuplicates = require('audio-duplicates');

async function batchProcess() {
  // Initialize index for batch processing
  await audioDuplicates.initializeIndex();

  // Add files to index
  const files = ['song1.mp3', 'song2.mp3', 'song3.mp3'];
  for (const file of files) {
    const fileId = await audioDuplicates.addFileToIndex(file);
    console.log(`Added ${file} with ID: ${fileId}`);
  }

  // Find all duplicates in the index
  const duplicateGroups = await audioDuplicates.findAllDuplicates();
  console.log('Found', duplicateGroups.length, 'duplicate groups');

  // Get index statistics
  const stats = await audioDuplicates.getIndexStats();
  console.log('Index Stats:', stats);

  // Clear index when done
  await audioDuplicates.clearIndex();
}

batchProcess().catch(console.error);
```

### TypeScript Usage

```typescript
import * as audioDuplicates from 'audio-duplicates';
import { DuplicateGroup, ScanOptions, Fingerprint } from 'audio-duplicates';

async function findDuplicatesTyped(): Promise<DuplicateGroup[]> {
  const options: ScanOptions = {
    threshold: 0.85,
    maxDuration: 300, // 5 minutes max
    onProgress: (progress: { current: number; total: number; file: string }) => {
      console.log(`${progress.current}/${progress.total}: ${progress.file}`);
    }
  };

  return await audioDuplicates.scanDirectoryForDuplicates('/path/to/music', options);
}

async function generateTypedFingerprint(filePath: string): Promise<Fingerprint> {
  return await audioDuplicates.generateFingerprint(filePath);
}
```

## 📖 API Reference

### Core Functions

#### `generateFingerprint(filePath: string): Promise<Fingerprint>`
Generate an audio fingerprint from a file.

```javascript
const fingerprint = await audioDuplicates.generateFingerprint('song.mp3');
console.log('Duration:', fingerprint.duration);
console.log('Sample Rate:', fingerprint.sampleRate);
```

#### `generateFingerprintLimited(filePath: string, maxDuration: number): Promise<Fingerprint>`
Generate fingerprint with duration limit (in seconds).

```javascript
// Only fingerprint first 30 seconds
const fingerprint = await audioDuplicates.generateFingerprintLimited('song.mp3', 30);
```

#### `compareFingerprints(fp1: Fingerprint, fp2: Fingerprint): Promise<MatchResult>`
Compare two fingerprints and return similarity metrics.

```javascript
const result = await audioDuplicates.compareFingerprints(fp1, fp2);
console.log('Similarity:', result.similarityScore); // 0.0 to 1.0
console.log('Is Duplicate:', result.isDuplicate);   // boolean
console.log('Confidence:', result.confidence);      // 0.0 to 1.0
```

### Index Management

#### `initializeIndex(): Promise<boolean>`
Initialize the fingerprint index for batch processing.

#### `addFileToIndex(filePath: string): Promise<number>`
Add a file to the index and return its unique ID.

#### `findAllDuplicates(): Promise<DuplicateGroup[]>`
Find all duplicate groups in the current index.

#### `getIndexStats(): Promise<IndexStats>`
Get statistics about the current index.

```javascript
const stats = await audioDuplicates.getIndexStats();
console.log('Files:', stats.fileCount);
console.log('Index Size:', stats.indexSize);
console.log('Load Factor:', stats.loadFactor);
```

#### `clearIndex(): Promise<boolean>`
Clear the current index and free memory.

### Memory Management (v1.1.2)

#### `getMemoryPoolStats(): Promise<MemoryPoolStats>`
Get detailed statistics about native memory pool usage.

```javascript
const stats = await audioDuplicates.getMemoryPoolStats();
console.log('Peak Usage:', (stats.peakUsage / 1024 / 1024).toFixed(1) + 'MB');
console.log('Total Allocated:', (stats.totalAllocated / 1024 / 1024).toFixed(1) + 'MB');
console.log('Active Allocations:', stats.activeAllocations);
```

#### `getStreamingStats(): Promise<StreamingStats>`
Get statistics about streaming audio processing.

```javascript
const stats = await audioDuplicates.getStreamingStats();
console.log('Files Processed:', stats.filesProcessed);
console.log('Total Duration:', stats.totalDuration + 's');
console.log('Average Processing Speed:', stats.avgProcessingSpeed + 'x realtime');
```

#### `clearMemoryPool(): Promise<boolean>`
Force cleanup of the native memory pool.

```javascript
// Clean up memory after processing
await audioDuplicates.clearMemoryPool();
```

### Configuration

#### `setSimilarityThreshold(threshold: number): Promise<boolean>`
Set the similarity threshold (0.0 to 1.0) for duplicate detection.

```javascript
await audioDuplicates.setSimilarityThreshold(0.9); // Stricter matching
```

### High-Level Utilities

#### `scanDirectoryForDuplicates(directory: string, options?: ScanOptions): Promise<DuplicateGroup[]>`
Scan a directory for duplicates with progress reporting (sequential processing).

#### `scanDirectoryForDuplicatesParallel(directory: string, options?: ScanOptions): Promise<DuplicateGroup[]>`
Scan a directory for duplicates using parallel processing for improved performance.

#### `scanMultipleDirectoriesForDuplicates(directories: string[], options?: ScanOptions): Promise<DuplicateGroup[]>`
Scan multiple directories for duplicates across all directories.

**ScanOptions:**
- `threshold?: number` - Similarity threshold (default: 0.85)
- `maxDuration?: number` - Max duration to fingerprint in seconds
- `extensions?: string[]` - File extensions to scan (default: ['.wav'])
- `concurrency?: number` - Number of concurrent operations for parallel processing
- `onProgress?: (progress) => void` - Progress callback with detailed information
- `recursive?: boolean` - Scan subdirectories (default: true)

**Progress Callback Details:**
The `onProgress` callback receives detailed progress information:

```javascript
const options = {
  onProgress: (progress) => {
    switch (progress.phase) {
      case 'discovery':
        console.log(`Found ${progress.audioFiles} audio files`);
        break;
      case 'processing':
        console.log(`Processing: ${progress.current}/${progress.total} - ${progress.file}`);
        if (progress.parallel) {
          console.log(`Running ${progress.concurrency} threads`);
        }
        break;
      case 'duplicate_detection':
        console.log('Analyzing fingerprints for duplicates...');
        break;
    }
  }
};
```

## 🖥️ CLI Reference

### Commands

#### `scan <directories...>`
Scan directories for duplicate audio files with advanced performance features.

```bash
# Basic scan
audio-duplicates scan /music

# High-performance scan with all features
audio-duplicates scan /music \
  --parallel \
  --threads 8 \
  --memory-limit 512 \
  --memory-stats \
  --threshold 0.9 \
  --extensions "mp3,flac,wav,m4a" \
  --format json \
  --output results.json \
  --max-duration 180 \
  --verbose
```

**Performance Options:**
- `--parallel` - Enable parallel processing for faster scanning
- `-j, --threads <number>` - Number of threads for parallel processing (0=auto, default: CPU count)
- `--memory-limit <mb>` - Memory limit in MB (default: 256)
- `--memory-stats` - Show detailed memory statistics during processing

**Detection Options:**
- `--threshold <number>` - Similarity threshold (0.0-1.0, default: 0.85)
- `--extensions <extensions>` - File extensions to scan (comma-separated, default: wav)
- `--max-duration <seconds>` - Maximum duration to fingerprint per file

**Output Options:**
- `--format <format>` - Output format: `json`, `csv`, or `text` (default: text)
- `--output <file>` - Output file path
- `--no-progress` - Disable progress bar
- `--recursive` - Scan subdirectories (default: true)

#### `compare <file1> <file2>`
Compare two audio files directly.

```bash
# Basic comparison
audio-duplicates compare song1.mp3 song2.wav

# Advanced comparison
audio-duplicates compare song1.mp3 song2.wav --max-duration 60 --verbose
```

**Options:**
- `--max-duration <seconds>` - Maximum duration to fingerprint

#### `fingerprint <file>`
Generate and display fingerprint for an audio file.

```bash
# Generate fingerprint
audio-duplicates fingerprint song.mp3

# Save to file with duration limit
audio-duplicates fingerprint song.mp3 --output fingerprint.json --max-duration 30
```

**Options:**
- `--output <file>` - Output file path
- `--max-duration <seconds>` - Maximum duration to fingerprint

### Global Options
These options apply to all commands:
- `-v, --verbose` - Verbose output with detailed information and memory stats
- `--threshold <number>` - Global similarity threshold (0.0-1.0)
- `--format <format>` - Global output format (json|csv|text)
- `-j, --threads <number>` - Global thread count for parallel operations

## 📊 Performance

### Benchmarks

On a modern CPU (Apple M1):
- **Fingerprint Generation**: 2-5x real-time (faster than playback)
- **Index Lookup**: ~1ms per query
- **Full Comparison**: 10-50ms depending on file length
- **Memory Usage**: ~4KB per minute of audio
- **Scalability**: Efficiently handles 10,000+ files

### Memory Optimization Features (v1.1.2)

**Advanced Memory Management:**
- **Memory Pool**: Efficient native memory allocation with automatic cleanup
- **Streaming Processing**: Large files processed in chunks to minimize memory footprint
- **Garbage Collection**: Automatic memory cleanup with configurable limits
- **Memory Monitoring**: Real-time tracking of both Node.js and native memory usage

**Performance Monitoring:**
```bash
# Enable memory statistics during scanning
audio-duplicates scan /music --memory-stats --memory-limit 256
```

**Example Memory Statistics Output:**
```
🧠 Memory Statistics:
  Peak Node.js memory: 89.2MB heap + 156.4MB external
  Native memory pool: 45.7MB peak usage
  Total allocated: 892.3MB
  Memory warnings: 0
  Memory pool cleared
```

### Example Performance
```
Collection Size: 10,000 files (50GB)
Scan Time: ~6 minutes (parallel) / ~8 minutes (sequential)
Memory Usage: ~80MB (with optimization) / ~200MB (without)
Duplicates Found: 847 groups (2,341 files)
Memory Reduction: 80-90% vs previous versions
```

## 🔧 Advanced Usage

### Custom Similarity Thresholds

```javascript
// Exact duplicates only (very strict)
await audioDuplicates.setSimilarityThreshold(0.95);

// Similar versions (more permissive)
await audioDuplicates.setSimilarityThreshold(0.75);

// Near-identical files (default)
await audioDuplicates.setSimilarityThreshold(0.85);
```

### Handling Large Collections

```javascript
const MemoryMonitor = require('audio-duplicates/lib/memory_monitor');

async function processLargeCollection(directories) {
  // Set up memory monitoring
  const memoryMonitor = new MemoryMonitor({
    memoryLimitMB: 512,
    enabled: true
  });

  memoryMonitor.start();
  memoryMonitor.onMemoryWarning((totalMB, ratio) => {
    console.log(`⚠️ Memory warning: ${totalMB.toFixed(1)}MB (${(ratio * 100).toFixed(1)}%)`);
  });

  await audioDuplicates.initializeIndex();

  for (const dir of directories) {
    console.log(`Processing directory: ${dir}`);

    // Use parallel processing for large collections
    const duplicates = await audioDuplicates.scanDirectoryForDuplicatesParallel(dir, {
      threshold: 0.85,
      maxDuration: 300, // Limit to 5 minutes per file
      concurrency: 8,   // Use 8 threads
      extensions: ['.mp3', '.flac', '.wav', '.m4a'],
      onProgress: (progress) => {
        if (progress.phase === 'processing' && progress.current % 100 === 0) {
          console.log(`Processed ${progress.current}/${progress.total} files [${progress.concurrency} threads]`);
        }
      }
    });

    console.log(`Found ${duplicates.length} duplicate groups in ${dir}`);

    // Get memory statistics
    const poolStats = await audioDuplicates.getMemoryPoolStats();
    console.log(`Memory usage: ${(poolStats.peakUsage / 1024 / 1024).toFixed(1)}MB`);
  }

  // Get final results
  const allDuplicates = await audioDuplicates.findAllDuplicates();
  console.log(`Total duplicate groups: ${allDuplicates.length}`);

  // Cleanup
  await audioDuplicates.clearMemoryPool();
  await audioDuplicates.clearIndex();
  memoryMonitor.stop();
}
```

### Output Formats

#### JSON Output
```bash
audio-duplicates scan /music --format json --output results.json
```

```json
{
  "summary": {
    "totalFiles": 1500,
    "duplicateGroups": 23,
    "duplicateFiles": 67,
    "spaceWasted": "1.2GB"
  },
  "duplicateGroups": [
    {
      "groupId": 1,
      "avgSimilarity": 0.94,
      "files": [
        {
          "path": "/music/song1.mp3",
          "size": 5242880,
          "similarity": 1.0
        },
        {
          "path": "/music/copy/song1.mp3",
          "size": 5242880,
          "similarity": 0.94
        }
      ]
    }
  ]
}
```

#### CSV Output
```bash
audio-duplicates scan /music --format csv --output results.csv
```

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
```bash
# macOS: Install dependencies
brew install chromaprint libsndfile

# Ubuntu: Install dependencies
sudo apt-get install libchromaprint-dev libsndfile1-dev

# Clear npm cache and rebuild
npm cache clean --force
npm rebuild
```

#### Runtime Errors

**"Could not locate bindings file"**
```bash
npm run build
```

**"Failed to open audio file"**
- Check file format is supported
- Verify file permissions
- Ensure file is not corrupted

**"Index not initialized"**
```javascript
// Always initialize before using index functions
await audioDuplicates.initializeIndex();
```

### Performance Optimization

For large collections:
- **Enable parallel processing**: Use `--parallel` flag for multi-threaded scanning
- **Configure memory limits**: Set `--memory-limit` to prevent excessive memory usage
- **Optimize thread count**: Use `--threads` to match your CPU cores
- **Limit fingerprint duration**: Use `--max-duration` to process only file segments
- **Monitor memory usage**: Enable `--memory-stats` for detailed memory tracking
- **Process in batches**: Scan directories separately for very large collections
- **Increase similarity threshold**: Higher thresholds (0.9+) reduce processing time
- **Use SSD storage**: Faster I/O significantly improves performance
- **Specify file types**: Use `--extensions` to scan only needed formats

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Submit a pull request

### Development Setup

```bash
git clone https://github.com/mcande21/audio-duplicates.git
cd audio-duplicates
npm install
npm run build
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Chromaprint](https://github.com/acoustid/chromaprint) - Audio fingerprinting library
- [libsndfile](http://www.mega-nerd.com/libsndfile/) - Audio file I/O library
- [Node-API](https://nodejs.org/api/n-api.html) - Native addon interface

## 🔗 Related Projects

- [AcoustID](https://acoustid.org/) - Audio identification service
- [fpcalc](https://github.com/acoustid/chromaprint) - Command-line fingerprinting tool
- [MusicBrainz](https://musicbrainz.org/) - Music metadata database

---

**Happy duplicate hunting! 🎵**