# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an audio duplicate detection library built as a Node.js native addon. It uses Chromaprint fingerprinting technology for high-performance audio analysis and duplicate detection. The project combines C++ native code for performance-critical operations with JavaScript/TypeScript for the user-facing API.

## Architecture

### Core Components

**Native C++ Layer (`src/`)**:
- `main.cpp` - N-API bindings and JavaScript interface
- `chromaprint_wrapper.cpp/h` - Chromaprint library integration for fingerprint generation
- `fingerprint_comparator.cpp/h` - Optimized fingerprint comparison algorithms
- `fingerprint_index.cpp/h` - Inverted index for O(1) duplicate lookups
- `audio_loader.cpp/h` - Audio file loading using libsndfile

**JavaScript Layer (`lib/`)**:
- `index.js` - Main API with async wrappers around native functions
- `index.d.ts` - TypeScript type definitions

**CLI Tool (`cli/`)**:
- `audio-duplicates.js` - Command-line interface using Commander.js

### Key Data Structures

- **Fingerprint**: Contains audio fingerprint data (uint32 array), sample rate, duration, and file path
- **FingerprintIndex**: Global singleton for batch processing with inverted index for fast lookups
- **DuplicateGroup**: Groups of files identified as duplicates with similarity scores

## Build Commands

```bash
# Build the native addon
npm run build

# Clean build artifacts
npm run clean

# Full rebuild (clean + build)
npm run rebuild

# Run tests
npm test
```

## Development Workflow

### Prerequisites
The project requires system libraries that must be installed before building:
- **macOS**: `brew install chromaprint libsndfile`
- **Ubuntu**: `sudo apt-get install libchromaprint-dev libsndfile1-dev`

### Building
The project uses node-gyp for building the native addon. The `binding.gyp` file contains platform-specific configurations including library paths for macOS Homebrew installations.

### Testing
Tests are located in `test/test.js` and can be run with `npm test`. The test suite includes sample audio files in `test_A/` and `test_B/` directories.

## API Design Patterns

### Async Wrappers
All native functions are wrapped in JavaScript promises in `lib/index.js`. Native functions are synchronous but wrapped for consistent async API.

### Error Handling
- File existence checks in JavaScript layer before calling native code
- Native exceptions are converted to JavaScript errors
- Graceful fallback for binary loading (prebuilt → Release → Debug)

### Memory Management
The C++ layer uses smart pointers (`std::unique_ptr`) for automatic memory management. The global index (`g_index`) persists across function calls for performance.

## Performance Considerations

- Use the index-based functions (`initializeIndex`, `addFileToIndex`, `findAllDuplicates`) for batch processing
- Limit fingerprint duration with `maxDuration` parameter for large files
- The index provides O(1) lookups vs O(n²) direct comparisons

## Common Tasks

### Adding New Native Functions
1. Add function declaration to appropriate header file in `src/`
2. Implement in corresponding `.cpp` file
3. Export in `main.cpp` with N-API bindings
4. Add JavaScript wrapper in `lib/index.js`
5. Update TypeScript definitions in `lib/index.d.ts`

### CLI Extensions
Extend `cli/audio-duplicates.js` using Commander.js patterns. Follow existing command structure with error handling and progress reporting.