# Audio Duplicates

[![npm version](https://badge.fury.io/js/audio-duplicates.svg)](https://badge.fury.io/js/audio-duplicates)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/mcande21/audio-duplicates/workflows/CI/badge.svg)](https://github.com/mcande21/audio-duplicates/actions)
[![npm downloads](https://img.shields.io/npm/dm/audio-duplicates.svg)](https://www.npmjs.com/package/audio-duplicates)

A high-performance audio duplicate detection library built with native C++ and Chromaprint fingerprinting technology. Quickly find duplicate audio files across large collections with robust detection that handles different encodings, bitrates, and formats.

## ✨ Features

- **🚀 High Performance**: Native C++ implementation ~200x faster than JavaScript
- **🎵 Format Support**: MP3, WAV, FLAC, OGG, M4A, AAC, WMA, and more
- **⚡ Fast Matching**: Optimized inverted index for O(1) duplicate lookups
- **🔧 Robust Detection**: Handles different bitrates, sample rates, and encodings
- **💻 CLI Tool**: Full-featured command-line interface for batch processing
- **📝 TypeScript Support**: Complete TypeScript definitions included
- **🌍 Cross-Platform**: Windows, macOS, and Linux support
- **📊 Progress Reporting**: Real-time progress bars and statistics

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

## 🚀 Quick Start

### CLI Usage

#### Scan for Duplicates
```bash
# Scan a single directory
audio-duplicates scan /path/to/music

# Scan multiple directories
audio-duplicates scan /music/collection1 /music/collection2

# Scan with custom threshold
audio-duplicates scan /path/to/music --threshold 0.9

# Save results to file
audio-duplicates scan /path/to/music --output duplicates.json --format json
```

#### Compare Two Files
```bash
audio-duplicates compare song1.mp3 song2.mp3
```

#### Generate Fingerprint
```bash
# Generate and display fingerprint
audio-duplicates fingerprint song.mp3

# Save fingerprint to file
audio-duplicates fingerprint song.mp3 --output fingerprint.json
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

### Configuration

#### `setSimilarityThreshold(threshold: number): Promise<boolean>`
Set the similarity threshold (0.0 to 1.0) for duplicate detection.

```javascript
await audioDuplicates.setSimilarityThreshold(0.9); // Stricter matching
```

### High-Level Utilities

#### `scanDirectoryForDuplicates(directory: string, options?: ScanOptions): Promise<DuplicateGroup[]>`
Scan a directory for duplicates with progress reporting.

**Options:**
- `threshold?: number` - Similarity threshold (default: 0.85)
- `maxDuration?: number` - Max duration to fingerprint in seconds
- `onProgress?: (progress) => void` - Progress callback
- `recursive?: boolean` - Scan subdirectories (default: true)

## 🖥️ CLI Reference

### Commands

#### `scan <directories...>`
Scan directories for duplicate audio files.

```bash
# Basic scan
audio-duplicates scan /music

# Advanced options
audio-duplicates scan /music \
  --threshold 0.9 \
  --format json \
  --output results.json \
  --max-duration 180 \
  --no-progress
```

**Options:**
- `--threshold <number>` - Similarity threshold (0.0-1.0, default: 0.85)
- `--format <format>` - Output format: `json`, `csv`, or `text` (default: text)
- `--output <file>` - Output file path
- `--max-duration <seconds>` - Maximum duration to fingerprint
- `--no-progress` - Disable progress bar
- `--recursive` - Scan subdirectories (default: true)

#### `compare <file1> <file2>`
Compare two audio files directly.

```bash
audio-duplicates compare song1.mp3 song2.wav --max-duration 60
```

#### `fingerprint <file>`
Generate and display fingerprint for an audio file.

```bash
audio-duplicates fingerprint song.mp3 --output fingerprint.json
```

### Global Options
- `-v, --verbose` - Verbose output with detailed information
- `--threshold <number>` - Global similarity threshold
- `--format <format>` - Global output format

## 📊 Performance

### Benchmarks

On a modern CPU (Apple M1):
- **Fingerprint Generation**: 2-5x real-time (faster than playback)
- **Index Lookup**: ~1ms per query
- **Full Comparison**: 10-50ms depending on file length
- **Memory Usage**: ~4KB per minute of audio
- **Scalability**: Efficiently handles 10,000+ files

### Example Performance
```
Collection Size: 10,000 files (50GB)
Scan Time: ~8 minutes
Memory Usage: ~200MB
Duplicates Found: 847 groups (2,341 files)
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
async function processLargeCollection(directories) {
  await audioDuplicates.initializeIndex();

  for (const dir of directories) {
    console.log(`Processing directory: ${dir}`);

    // Process in batches to manage memory
    const duplicates = await audioDuplicates.scanDirectoryForDuplicates(dir, {
      threshold: 0.85,
      maxDuration: 300, // Limit to 5 minutes per file
      onProgress: (progress) => {
        if (progress.current % 100 === 0) {
          console.log(`Processed ${progress.current}/${progress.total} files`);
        }
      }
    });

    console.log(`Found ${duplicates.length} duplicate groups in ${dir}`);
  }

  // Get final results
  const allDuplicates = await audioDuplicates.findAllDuplicates();
  console.log(`Total duplicate groups: ${allDuplicates.length}`);

  await audioDuplicates.clearIndex();
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
- Use `maxDuration` to limit fingerprint length
- Process directories in batches
- Increase similarity threshold for faster results
- Use SSD storage for audio files

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