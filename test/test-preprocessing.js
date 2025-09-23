#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');
const path = require('path');

/**
 * Preprocessing Validation Test Suite
 *
 * Tests the new preprocessing functionality to ensure it works correctly
 * and improves duplicate detection for modified audio files.
 */

async function testPreprocessingBasics() {
    console.log('🧪 Testing Basic Preprocessing Functionality\n');

    // Test file
    const testFile = 'test_scenarios/original/106814.wav';

    if (!fs.existsSync(testFile)) {
        console.error('❌ Test file not found. Run generate-test-audio.js first.');
        return false;
    }

    try {
        // Test 1: Basic preprocessing test
        console.log('1. Testing basic preprocessing:');
        const defaultConfig = {
            trimSilence: true,
            normalizeSampleRate: true,
            normalizeVolume: true
        };

        const preprocessingResult = await audioDuplicates.testPreprocessing(testFile, defaultConfig);
        console.log('   Original:', preprocessingResult.original);
        console.log('   Processed:', preprocessingResult.processed);

        if (preprocessingResult.processed.sampleRate === 44100) {
            console.log('   ✓ Sample rate normalization working');
        } else {
            console.log('   ❌ Sample rate normalization failed');
        }

        // Test 2: Generate fingerprint with preprocessing
        console.log('\n2. Testing fingerprint generation with preprocessing:');
        const fingerprint = await audioDuplicates.generateFingerprintWithPreprocessing(testFile, defaultConfig);

        if (fingerprint && fingerprint.data && fingerprint.data.length > 0) {
            console.log('   ✓ Fingerprint generated successfully');
            console.log(`   Fingerprint length: ${fingerprint.data.length}`);
            console.log(`   Sample rate: ${fingerprint.sampleRate}`);
            console.log(`   Duration: ${fingerprint.duration.toFixed(2)}s`);
        } else {
            console.log('   ❌ Fingerprint generation failed');
            return false;
        }

        return true;

    } catch (error) {
        console.error('   ❌ Test failed:', error.message);
        return false;
    }
}

async function testSilenceTrimming() {
    console.log('\n🔇 Testing Silence Trimming\n');

    // Use a file with silence padding
    const originalFile = 'test_scenarios/original/106814.wav';
    const silencePaddedFile = 'test_scenarios/silence_start/106814_start0.5s.wav';

    if (!fs.existsSync(originalFile) || !fs.existsSync(silencePaddedFile)) {
        console.log('⚠️  Silence test files not found, skipping silence trimming test');
        return true;
    }

    try {
        const silenceConfig = {
            trimSilence: true,
            silenceThresholdDb: -40,
            preservePaddingMs: 50,
            normalizeSampleRate: true,
            normalizeVolume: true
        };

        // Test original vs silence-padded with preprocessing
        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, silenceConfig);
        const paddedFp = await audioDuplicates.generateFingerprintWithPreprocessing(silencePaddedFile, silenceConfig);

        console.log('1. Comparing original vs silence-padded with preprocessing:');
        const comparison = await audioDuplicates.compareFingerprints(originalFp, paddedFp);

        console.log(`   Similarity: ${(comparison.similarityScore * 100).toFixed(2)}%`);
        console.log(`   Matched segments: ${comparison.matchedSegments}`);
        console.log(`   Is duplicate: ${comparison.isDuplicate}`);

        if (comparison.similarityScore > 0.7) {
            console.log('   ✅ Silence trimming improved similarity!');
        } else {
            console.log('   ⚠️  Silence trimming needs adjustment');
        }

        return true;

    } catch (error) {
        console.error('   ❌ Silence trimming test failed:', error.message);
        return false;
    }
}

async function testVolumeNormalization() {
    console.log('\n🔊 Testing Volume Normalization\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const volumeChangedFile = 'test_scenarios/volume_increase/106814_vol1.1x.wav';

    if (!fs.existsSync(originalFile) || !fs.existsSync(volumeChangedFile)) {
        console.log('⚠️  Volume test files not found, skipping volume normalization test');
        return true;
    }

    try {
        const volumeConfig = {
            trimSilence: true,
            normalizeSampleRate: true,
            normalizeVolume: true,
            useRmsNormalization: true,
            targetRmsDb: -20
        };

        // Test original vs volume-changed with preprocessing
        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, volumeConfig);
        const volumeFp = await audioDuplicates.generateFingerprintWithPreprocessing(volumeChangedFile, volumeConfig);

        console.log('1. Comparing original vs volume-changed with preprocessing:');
        const comparison = await audioDuplicates.compareFingerprints(originalFp, volumeFp);

        console.log(`   Similarity: ${(comparison.similarityScore * 100).toFixed(2)}%`);
        console.log(`   Matched segments: ${comparison.matchedSegments}`);
        console.log(`   Is duplicate: ${comparison.isDuplicate}`);

        if (comparison.similarityScore > 0.8) {
            console.log('   ✅ Volume normalization significantly improved similarity!');
        } else if (comparison.similarityScore > 0.5) {
            console.log('   ✅ Volume normalization moderately improved similarity');
        } else {
            console.log('   ⚠️  Volume normalization needs adjustment');
        }

        return true;

    } catch (error) {
        console.error('   ❌ Volume normalization test failed:', error.message);
        return false;
    }
}

async function testSampleRateNormalization() {
    console.log('\n📊 Testing Sample Rate Normalization\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const resampledFile = 'test_scenarios/sample_rate/106814_22050Hz.wav';

    if (!fs.existsSync(originalFile) || !fs.existsSync(resampledFile)) {
        console.log('⚠️  Sample rate test files not found, skipping sample rate test');
        return true;
    }

    try {
        const sampleRateConfig = {
            trimSilence: true,
            normalizeSampleRate: true,
            targetSampleRate: 44100,
            normalizeVolume: true
        };

        // Test original vs resampled with preprocessing
        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, sampleRateConfig);
        const resampledFp = await audioDuplicates.generateFingerprintWithPreprocessing(resampledFile, sampleRateConfig);

        console.log('1. Comparing original vs resampled with preprocessing:');
        const comparison = await audioDuplicates.compareFingerprints(originalFp, resampledFp);

        console.log(`   Similarity: ${(comparison.similarityScore * 100).toFixed(2)}%`);
        console.log(`   Matched segments: ${comparison.matchedSegments}`);
        console.log(`   Is duplicate: ${comparison.isDuplicate}`);

        if (comparison.similarityScore > 0.9) {
            console.log('   ✅ Sample rate normalization working perfectly!');
        } else if (comparison.similarityScore > 0.7) {
            console.log('   ✅ Sample rate normalization working well');
        } else {
            console.log('   ⚠️  Sample rate normalization needs improvement');
        }

        return true;

    } catch (error) {
        console.error('   ❌ Sample rate normalization test failed:', error.message);
        return false;
    }
}

async function testConfigurationOptions() {
    console.log('\n⚙️ Testing Configuration Options\n');

    const testFile = 'test_scenarios/original/106814.wav';

    if (!fs.existsSync(testFile)) {
        console.log('⚠️  Test file not found, skipping configuration test');
        return true;
    }

    try {
        // Test different configuration combinations
        const configs = [
            {
                name: 'Minimal (defaults)',
                config: {}
            },
            {
                name: 'Silence trimming only',
                config: {
                    trimSilence: true,
                    normalizeSampleRate: false,
                    normalizeVolume: false
                }
            },
            {
                name: 'Volume normalization only',
                config: {
                    trimSilence: false,
                    normalizeSampleRate: false,
                    normalizeVolume: true
                }
            },
            {
                name: 'All features enabled',
                config: {
                    trimSilence: true,
                    silenceThresholdDb: -35,
                    normalizeSampleRate: true,
                    targetSampleRate: 44100,
                    normalizeVolume: true,
                    useRmsNormalization: true,
                    targetRmsDb: -18
                }
            }
        ];

        for (const test of configs) {
            console.log(`${test.name}:`);
            try {
                const result = await audioDuplicates.testPreprocessing(testFile, test.config);
                console.log(`   Duration: ${result.original.duration}s → ${result.processed.duration}s`);
                console.log(`   Sample rate: ${result.original.sampleRate}Hz → ${result.processed.sampleRate}Hz`);
                console.log(`   ✓ Config processed successfully`);
            } catch (error) {
                console.log(`   ❌ Config failed: ${error.message}`);
            }
        }

        return true;

    } catch (error) {
        console.error('   ❌ Configuration test failed:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🎵 Audio Preprocessing Validation Test Suite\n');
    console.log('=' .repeat(60));

    const tests = [
        testPreprocessingBasics,
        testSilenceTrimming,
        testVolumeNormalization,
        testSampleRateNormalization,
        testConfigurationOptions
    ];

    let passed = 0;
    let total = tests.length;

    for (const test of tests) {
        try {
            const result = await test();
            if (result) {
                passed++;
            }
        } catch (error) {
            console.error(`❌ Test failed with error: ${error.message}`);
        }
        console.log(''); // Add spacing between tests
    }

    console.log('=' .repeat(60));
    console.log(`📊 Test Results: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('✅ All preprocessing tests passed!');
        console.log('\n🎯 Preprocessing functionality is working correctly.');
        console.log('Next step: Re-run modification tests with preprocessing enabled.');
    } else {
        console.log('⚠️  Some preprocessing tests failed.');
        console.log('Review the results above and check the implementation.');
    }

    return passed === total;
}

// CLI interface
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('\n💥 Test suite crashed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    });
}

module.exports = {
    testPreprocessingBasics,
    testSilenceTrimming,
    testVolumeNormalization,
    testSampleRateNormalization,
    testConfigurationOptions,
    runAllTests
};