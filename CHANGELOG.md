# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Windows prebuild support
- Additional audio format support
- Performance optimizations for large collections

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

[Unreleased]: https://github.com/cooperanderson/audio-duplicates/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cooperanderson/audio-duplicates/releases/tag/v1.0.0