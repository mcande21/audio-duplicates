# Audio Duplicate Detection - Testing Framework

This directory contains a comprehensive testing framework for evaluating the robustness of audio duplicate detection across various modifications and scenarios.

## Testing Overview

The testing framework consists of several components designed to thoroughly evaluate how well the duplicate detection system handles modified audio files:

### 🎵 Test Components

1. **Core API Tests** (`test.js`) - Basic functionality testing
2. **Audio Generation** (`generate-test-audio.js`) - Creates modified audio test scenarios
3. **Modification Testing** (`test-modifications.js`) - Comprehensive robustness evaluation
4. **Results Analysis** (`analyze-results.js`) - Statistical analysis and reporting
5. **Debug Tools** (`debug-test.js`) - Detailed fingerprint comparison testing

## Quick Start

### Prerequisites

Ensure you have the required audio processing tools installed:

```bash
# macOS
brew install chromaprint libsndfile sox

# Ubuntu
sudo apt-get install libchromaprint-dev libsndfile1-dev sox
```

### Basic Testing

1. **Run core API tests:**
   ```bash
   npm test
   # or
   node test/test.js
   ```

2. **Generate test audio scenarios:**
   ```bash
   node test/generate-test-audio.js
   ```

3. **Run comprehensive modification tests:**
   ```bash
   node test/test-modifications.js
   ```

4. **Analyze and visualize results:**
   ```bash
   node test/analyze-results.js
   ```

## Test Scenarios

The testing framework generates and evaluates the following modification types:

### 🔇 Silence Modifications
- **Silence at start**: 0.5s, 1s, 2s, 5s padding
- **Silence at end**: 0.5s, 1s, 2s, 5s padding
- **Silence in middle**: 0.1s, 0.5s, 1s insertion

### 🔊 Volume Modifications
- **Volume increase**: 1.1x, 1.2x, 1.5x, 2.0x
- **Volume decrease**: 0.9x, 0.8x, 0.5x, 0.25x

### 📊 Sample Rate Variations
- **Different rates**: 22050Hz, 44100Hz, 48000Hz, 96000Hz

### ⚡ Speed Modifications
- **Faster**: 1.01x, 1.02x, 1.05x, 1.1x
- **Slower**: 0.99x, 0.98x, 0.95x, 0.9x

## Testing Process

### 1. Audio Generation (`generate-test-audio.js`)

Creates a comprehensive test dataset:

```bash
node test/generate-test-audio.js [source_dir] [output_dir]
```

**Default:** Processes first 5 files from `test_A/` → `test_scenarios/`

**Output structure:**
```
test_scenarios/
├── original/          # Baseline files
├── silence_start/     # Files with silence at start
├── silence_end/       # Files with silence at end
├── volume_increase/   # Volume-boosted files
├── volume_decrease/   # Volume-reduced files
├── sample_rate/       # Different sample rates
├── speed_faster/      # Sped-up files
└── speed_slower/      # Slowed-down files
```

### 2. Modification Testing (`test-modifications.js`)

Tests duplicate detection across all scenarios and thresholds:

```bash
# Comprehensive test (all categories, all thresholds)
node test/test-modifications.js

# Test specific category and threshold
node test/test-modifications.js volume_increase 0.85
```

**Test thresholds:** 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60

**Output:** CSV results file for analysis

### 3. Results Analysis (`analyze-results.js`)

Generates comprehensive reports and insights:

```bash
node test/analyze-results.js [csv_file]
```

**Analysis includes:**
- Detection rates by modification type
- Optimal threshold recommendations
- Robustness classification
- Performance insights
- Usage recommendations

## Sample Results

Based on testing with Chromaprint fingerprinting:

### Key Findings

🔴 **High Sensitivity**: Chromaprint is very sensitive to audio modifications
- Even small volume changes (>0.1%) break duplicate detection
- Silence padding significantly affects fingerprints
- Speed changes are not tolerated

✅ **Robust Against**:
- Exact copies (100% detection)
- Tiny volume changes (<0.1%)
- Bit-perfect format conversions

⚠️ **Sensitive To**:
- Volume modifications >10%
- Added silence >0.5s
- Speed changes >1%
- Sample rate conversion

### Threshold Recommendations

| Use Case | Recommended Threshold | Trade-off |
|----------|----------------------|-----------|
| Exact matches only | 0.95+ | High precision, low recall |
| General duplicate detection | 0.85 | Balanced precision/recall |
| Loose similarity | 0.70 | High recall, lower precision |

## Test File Structure

```
test/
├── README.md                    # This documentation
├── test.js                      # Main test suite
├── generate-test-audio.js       # Audio scenario generator
├── test-modifications.js        # Modification robustness tests
├── analyze-results.js           # Results analysis and reporting
├── debug-test.js               # Debug and troubleshooting
└── test_scenarios/             # Generated test data
    ├── original/               # Baseline audio files
    ├── silence_start/          # Start-padded files
    ├── silence_end/            # End-padded files
    ├── volume_increase/        # Volume-boosted files
    ├── volume_decrease/        # Volume-reduced files
    ├── sample_rate/            # Sample rate variants
    ├── speed_faster/           # Sped-up files
    ├── speed_slower/           # Slowed-down files
    ├── test_results.csv        # Test results data
    └── test_results_analysis.json # Analysis output
```

## Advanced Usage

### Custom Test Scenarios

Modify `generate-test-audio.js` to add new modification types:

```javascript
// Example: Add pitch shift testing
this.modifications.pitch = {
    up: [1.02, 1.05, 1.1],     // Semitones up
    down: [0.98, 0.95, 0.9]    // Semitones down
};
```

### Custom Analysis

Extend `analyze-results.js` for additional metrics:

```javascript
// Example: Add correlation analysis
analyzeCategoryCorrelations() {
    // Custom correlation analysis between modification types
}
```

### Debugging Detection Issues

Use `debug-test.js` to investigate specific fingerprint comparisons:

```javascript
// Examine fingerprint details
const fp1 = await audioDuplicates.generateFingerprint(file1);
const fp2 = await audioDuplicates.generateFingerprint(file2);
const comparison = await audioDuplicates.compareFingerprints(fp1, fp2);
```

## Performance Considerations

- **File Count**: Test with 5 base files → ~145 generated variants
- **Processing Time**: ~2-3 minutes for full test generation
- **Disk Space**: ~50MB for complete test scenarios
- **Memory Usage**: Minimal - tests process files sequentially

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run Audio Duplicate Tests
  run: |
    npm run build
    npm test
    node test/generate-test-audio.js
    node test/test-modifications.js
    node test/analyze-results.js
```

## Troubleshooting

### Common Issues

1. **Sox not found**: Install sox audio processing tool
2. **No test files**: Ensure audio files exist in `test_A/` directory
3. **Permission errors**: Check file permissions for test directories
4. **Memory issues**: Reduce number of test files for large datasets

### Debug Commands

```bash
# Check addon building
npm run build

# Verify dependencies
which sox && which ffmpeg

# Test single file processing
node -e "console.log(require('./lib/index').generateFingerprint('test_A/file.wav'))"

# Check test file generation
node test/generate-test-audio.js && ls -la test_scenarios/
```

## Contributing

When adding new test scenarios:

1. **Audio Generation**: Add new modification types to `generate-test-audio.js`
2. **Testing Logic**: Update `test-modifications.js` to handle new categories
3. **Analysis**: Extend `analyze-results.js` for new metrics
4. **Documentation**: Update this README with new test descriptions

## License

Same as main project - see parent directory LICENSE file.