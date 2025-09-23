#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');

/**
 * Test preprocessing with modification scenarios
 *
 * Compare detection rates before and after preprocessing
 */

async function testWithPreprocessing() {
    console.log('🧪 Testing Modification Detection WITH Preprocessing\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const testFiles = [
        { name: 'silence_start_0.5s', path: 'test_scenarios/silence_start/106814_start0.5s.wav' },
        { name: 'silence_end_1s', path: 'test_scenarios/silence_end/106814_end1s.wav' },
        { name: 'volume_1.02x', path: 'test_scenarios/volume_increase/106814_vol1.02x.wav' },
        { name: 'sample_rate_22050', path: 'test_scenarios/sample_rate/106814_22050Hz.wav' }
    ];

    // Optimized preprocessing config based on our debugging
    const preprocessConfig = {
        trimSilence: true,
        silenceThresholdDb: -55,  // Less aggressive
        preservePaddingMs: 200,   // Keep more padding
        normalizeSampleRate: true,
        targetSampleRate: 44100,
        normalizeVolume: true,
        useRmsNormalization: true,
        targetRmsDb: -20
    };

    console.log('Preprocessing config:', preprocessConfig);
    console.log('');

    if (!fs.existsSync(originalFile)) {
        console.error('❌ Original file not found');
        return;
    }

    try {
        // Generate original fingerprint with preprocessing
        console.log('Generating original fingerprint with preprocessing...');
        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, preprocessConfig);
        console.log(`Original: ${originalFp.duration.toFixed(2)}s, ${originalFp.data.length} elements\n`);

        // Test each modification
        for (const testFile of testFiles) {
            if (!fs.existsSync(testFile.path)) {
                console.log(`⚠️  ${testFile.name}: File not found, skipping`);
                continue;
            }

            console.log(`Testing ${testFile.name}:`);

            try {
                // Test WITHOUT preprocessing first
                const modFpNoPrep = await audioDuplicates.generateFingerprint(testFile.path);
                const comparisonNoPrep = await audioDuplicates.compareFingerprints(originalFp, modFpNoPrep);

                // Test WITH preprocessing
                const modFpWithPrep = await audioDuplicates.generateFingerprintWithPreprocessing(testFile.path, preprocessConfig);
                const comparisonWithPrep = await audioDuplicates.compareFingerprints(originalFp, modFpWithPrep);

                console.log(`   Without preprocessing: ${(comparisonNoPrep.similarityScore * 100).toFixed(2)}% similarity`);
                console.log(`   With preprocessing:    ${(comparisonWithPrep.similarityScore * 100).toFixed(2)}% similarity`);

                const improvement = comparisonWithPrep.similarityScore - comparisonNoPrep.similarityScore;
                if (improvement > 0.1) {
                    console.log(`   🎉 MAJOR improvement: +${(improvement * 100).toFixed(2)}%`);
                } else if (improvement > 0.01) {
                    console.log(`   ✅ Improvement: +${(improvement * 100).toFixed(2)}%`);
                } else if (improvement > -0.01) {
                    console.log(`   ~ No significant change`);
                } else {
                    console.log(`   ⚠️  Decreased: ${(improvement * 100).toFixed(2)}%`);
                }

                // Check if it would be detected as duplicate at different thresholds
                const thresholds = [0.95, 0.90, 0.85, 0.80, 0.75, 0.70];
                let detectedAt = null;

                for (const threshold of thresholds) {
                    if (comparisonWithPrep.similarityScore >= threshold) {
                        detectedAt = threshold;
                        break;
                    }
                }

                if (detectedAt) {
                    console.log(`   🎯 Would be detected as duplicate at threshold ${detectedAt}`);
                } else {
                    console.log(`   ❌ Would not be detected at any common threshold`);
                }

            } catch (error) {
                console.log(`   ❌ Test failed: ${error.message}`);
            }

            console.log('');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

async function quickComparisonTest() {
    console.log('🚀 Quick Comparison: Before vs After Preprocessing\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const modifiedFile = 'test_scenarios/silence_start/106814_start0.5s.wav';

    if (!fs.existsSync(originalFile) || !fs.existsSync(modifiedFile)) {
        console.log('⚠️  Test files not found');
        return;
    }

    try {
        // Test 1: No preprocessing
        console.log('1. No preprocessing:');
        const orig1 = await audioDuplicates.generateFingerprint(originalFile);
        const mod1 = await audioDuplicates.generateFingerprint(modifiedFile);
        const comp1 = await audioDuplicates.compareFingerprints(orig1, mod1);
        console.log(`   Similarity: ${(comp1.similarityScore * 100).toFixed(2)}%`);

        // Test 2: With preprocessing
        console.log('\n2. With preprocessing:');
        const config = {
            trimSilence: true,
            silenceThresholdDb: -55,
            normalizeSampleRate: true,
            normalizeVolume: true
        };

        const orig2 = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, config);
        const mod2 = await audioDuplicates.generateFingerprintWithPreprocessing(modifiedFile, config);
        const comp2 = await audioDuplicates.compareFingerprints(orig2, mod2);
        console.log(`   Similarity: ${(comp2.similarityScore * 100).toFixed(2)}%`);

        const improvement = comp2.similarityScore - comp1.similarityScore;
        console.log(`\n📊 Improvement: ${(improvement * 100).toFixed(2)}% points`);

        if (improvement > 0.1) {
            console.log('🎉 Significant improvement achieved!');
        } else if (improvement > 0) {
            console.log('✅ Some improvement achieved');
        } else {
            console.log('⚠️  No improvement or worse');
        }

    } catch (error) {
        console.error('Quick test failed:', error.message);
    }
}

async function runTests() {
    console.log('🎵 Preprocessing Modification Test\n');
    console.log('=' .repeat(50));

    await quickComparisonTest();
    console.log('\n' + '=' .repeat(50));
    await testWithPreprocessing();

    console.log('✅ Preprocessing modification tests completed!');
}

runTests().catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});