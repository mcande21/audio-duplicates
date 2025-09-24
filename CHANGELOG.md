# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Windows prebuild support
- Additional audio format support

## [1.0.5] - 2024-09-24

### Added
- **OpenMP Parallelization**: Replaced custom thread pool with OpenMP for better performance and simpler code
- **Async File Discovery**: Parallel directory traversal using async/await with p-limit concurrency control
- **Configurable File Extensions**: New `--extensions` CLI flag to specify file types to scan (e.g., `--extensions wav,mp3,flac`)
- **Real-time Discovery Progress**: Live updates during file discovery showing files scanned and audio files found
- **macOS OpenMP Support**: Proper libomp library integration for Apple Silicon and Intel Macs

### Changed
- **Default Behavior**: Now scans only .wav files by default for faster performance (configurable with `--extensions`)
- **Progress Reporting**: Three-phase progress system (discovery → processing → duplicate detection)
- **Performance**: Significant improvements for large directories (500GB+) with parallel discovery

### Fixed
- **Memory Management**: Better resource handling with OpenMP automatic parallelization
- **Progress Bar Accuracy**: Shows correct file counts and real-time updates
- **Build System**: Improved binding.gyp configuration for cross-platform OpenMP support

### Technical
- Added p-limit dependency for concurrency control
- Upgraded to OpenMP-based parallel processing
- Enhanced error handling for malformed audio files
- Better filesystem handling for large directory structures

## [1.0.0] - 2024-09-23

### Added
- Initial release of audio-duplicates library
- High-performance audio fingerprinting using Chromaprint
- Native C++ implementation with Node.js bindings
- Command-line interface (CLI) tool
- TypeScript definitions and full TypeScript support
- Cross-platform support (macOS, Linux, planned Windows)
- Inverted index for O(1) duplicate lookups
- Configurable similarity thresholds
- Progress reporting for batch operations
- Multiple output formats (JSON, CSV, text)
- Comprehensive test suite
- Examples and documentation

### Features
- **Audio Formats**: MP3, WAV, FLAC, OGG, M4A, AAC, WMA support
- **Performance**: ~200x faster than JavaScript implementations
- **Scalability**: Efficiently handles 10,000+ files
- **Memory Efficiency**: ~4KB per minute of audio
- **CLI Commands**:
  - `scan` - Scan directories for duplicates
  - `compare` - Compare two audio files
  - `fingerprint` - Generate fingerprint for a file
- **API Functions**:
  - Fingerprint generation and comparison
  - Index management for batch processing
  - High-level directory scanning utilities
  - Configuration management

### Technical Details
- Built with Node-API (N-API) for stability across Node.js versions
- Uses Chromaprint for robust audio fingerprinting
- Optimized C++ algorithms for fast comparison
- Smart preprocessing for better duplicate detection
- Automatic fallback building system (prebuilt → source compilation)

### Dependencies
- Node.js >=18.0.0
- System libraries: chromaprint, libsndfile
- Cross-platform build support with node-gyp

### Documentation
- Comprehensive README with installation and usage guides
- API reference with TypeScript definitions
- CLI help and examples
- Performance benchmarks and algorithm details
- Troubleshooting guide for common issues

[Unreleased]: https://github.com/mcande21/audio-duplicates/compare/v1.0.4...HEAD
[1.0.4]: https://github.com/mcande21/audio-duplicates/releases/tag/v1.0.4