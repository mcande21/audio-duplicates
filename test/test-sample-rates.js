#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');

/**
 * Test sample rate duplicate detection specifically
 */

async function testSampleRateDetection() {
    console.log('📊 Testing Sample Rate Duplicate Detection\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const sampleRateFiles = [
        { name: '22050Hz', path: 'test_scenarios/sample_rate/106814_22050Hz.wav' },
        { name: '44100Hz', path: 'test_scenarios/sample_rate/106814_44100Hz.wav' },
        { name: '48000Hz', path: 'test_scenarios/sample_rate/106814_48000Hz.wav' },
        { name: '96000Hz', path: 'test_scenarios/sample_rate/106814_96000Hz.wav' }
    ];

    if (!fs.existsSync(originalFile)) {
        console.error('❌ Original file not found');
        return;
    }

    console.log('🔍 Files to test:');
    console.log(`   Original: ${originalFile}`);
    for (const file of sampleRateFiles) {
        const exists = fs.existsSync(file.path) ? '✓' : '❌';
        console.log(`   ${file.name}: ${file.path} ${exists}`);
    }
    console.log('');

    // Sample rate normalization config
    const sampleRateConfig = {
        trimSilence: false,  // Keep it simple - focus on sample rate only
        normalizeSampleRate: true,
        targetSampleRate: 44100,
        normalizeVolume: true,  // Volume normalization helps too
        useRmsNormalization: true,
        targetRmsDb: -20
    };

    console.log('🔧 Preprocessing config:', sampleRateConfig);
    console.log('');

    try {
        // First, let's check what the original file's sample rate actually is
        console.log('📋 Original file analysis:');
        const originalTest = await audioDuplicates.testPreprocessing(originalFile, sampleRateConfig);
        console.log(`   Original sample rate: ${originalTest.original.sampleRate}Hz`);
        console.log(`   After preprocessing: ${originalTest.processed.sampleRate}Hz`);
        console.log(`   Duration: ${originalTest.original.duration.toFixed(2)}s → ${originalTest.processed.duration.toFixed(2)}s`);
        console.log('');

        // Generate original fingerprint with preprocessing
        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, sampleRateConfig);
        console.log(`   Original fingerprint: ${originalFp.data.length} elements, ${originalFp.sampleRate}Hz`);
        console.log('');

        if (originalFp.data.length === 0) {
            console.error('❌ Original fingerprint generation failed');
            return;
        }

        // Test each sample rate variant
        for (const testFile of sampleRateFiles) {
            if (!fs.existsSync(testFile.path)) {
                console.log(`⚠️  ${testFile.name}: File not found, skipping`);
                continue;
            }

            console.log(`🧪 Testing ${testFile.name}:`);

            try {
                // Test preprocessing effect
                const testResult = await audioDuplicates.testPreprocessing(testFile.path, sampleRateConfig);
                console.log(`   Original: ${testResult.original.sampleRate}Hz → Processed: ${testResult.processed.sampleRate}Hz`);

                // Compare WITHOUT preprocessing
                const testFpNoPrep = await audioDuplicates.generateFingerprint(testFile.path);
                const originalFpNoPrep = await audioDuplicates.generateFingerprint(originalFile);
                const comparisonNoPrep = await audioDuplicates.compareFingerprints(originalFpNoPrep, testFpNoPrep);

                // Compare WITH preprocessing
                const testFpWithPrep = await audioDuplicates.generateFingerprintWithPreprocessing(testFile.path, sampleRateConfig);
                const comparisonWithPrep = await audioDuplicates.compareFingerprints(originalFp, testFpWithPrep);

                console.log(`   No preprocessing:   ${(comparisonNoPrep.similarityScore * 100).toFixed(2)}% similarity`);
                console.log(`   With preprocessing: ${(comparisonWithPrep.similarityScore * 100).toFixed(2)}% similarity`);

                const improvement = comparisonWithPrep.similarityScore - comparisonNoPrep.similarityScore;
                if (improvement > 0.1) {
                    console.log(`   🎉 MAJOR improvement: +${(improvement * 100).toFixed(2)}% points`);
                } else if (improvement > 0.01) {
                    console.log(`   ✅ Good improvement: +${(improvement * 100).toFixed(2)}% points`);
                } else if (improvement > -0.01) {
                    console.log(`   ~ Minimal change: ${(improvement * 100).toFixed(2)}% points`);
                } else {
                    console.log(`   ⚠️ Decreased: ${(improvement * 100).toFixed(2)}% points`);
                }

                // Check detection at different thresholds
                const thresholds = [0.95, 0.90, 0.85, 0.80, 0.75, 0.70];
                let detectedAt = null;

                for (const threshold of thresholds) {
                    if (comparisonWithPrep.similarityScore >= threshold) {
                        detectedAt = threshold;
                        break;
                    }
                }

                if (detectedAt) {
                    console.log(`   🎯 Detectable as duplicate at threshold ${detectedAt}`);
                } else if (comparisonWithPrep.similarityScore > 0.5) {
                    console.log(`   📊 High similarity but below common thresholds`);
                } else {
                    console.log(`   ❌ Low similarity - not detectable`);
                }

            } catch (error) {
                console.log(`   ❌ Test failed: ${error.message}`);
            }

            console.log('');
        }

        // Summary
        console.log('📊 SAMPLE RATE TEST SUMMARY:');
        console.log('   The results above show how well sample rate normalization');
        console.log('   is working for duplicate detection across different sample rates.');

    } catch (error) {
        console.error('❌ Sample rate test failed:', error.message);
    }
}

async function testSpecificSampleRatePair() {
    console.log('\n🎯 Focused Test: Specific Sample Rate Pair\n');

    // Test the most common conversion: 48kHz → 44.1kHz
    const file48k = 'test_scenarios/sample_rate/106814_48000Hz.wav';
    const file44k = 'test_scenarios/sample_rate/106814_44100Hz.wav';

    if (!fs.existsSync(file48k) || !fs.existsSync(file44k)) {
        console.log('⚠️  48kHz or 44.1kHz test files not found');
        return;
    }

    const config = {
        trimSilence: false,
        normalizeSampleRate: true,
        targetSampleRate: 44100,
        normalizeVolume: true
    };

    try {
        console.log('Testing 48kHz vs 44.1kHz (most common conversion):');

        const fp48k = await audioDuplicates.generateFingerprintWithPreprocessing(file48k, config);
        const fp44k = await audioDuplicates.generateFingerprintWithPreprocessing(file44k, config);

        console.log(`   48kHz file → processed: ${fp48k.sampleRate}Hz, ${fp48k.data.length} elements`);
        console.log(`   44.1kHz file → processed: ${fp44k.sampleRate}Hz, ${fp44k.data.length} elements`);

        if (fp48k.data.length > 0 && fp44k.data.length > 0) {
            const comparison = await audioDuplicates.compareFingerprints(fp48k, fp44k);
            console.log(`\n   Similarity: ${(comparison.similarityScore * 100).toFixed(2)}%`);
            console.log(`   Matched segments: ${comparison.matchedSegments}`);
            console.log(`   Is duplicate: ${comparison.isDuplicate}`);

            if (comparison.similarityScore > 0.9) {
                console.log('   🎉 EXCELLENT: Sample rate normalization working perfectly!');
            } else if (comparison.similarityScore > 0.7) {
                console.log('   ✅ GOOD: Sample rate normalization working well');
            } else if (comparison.similarityScore > 0.5) {
                console.log('   📊 MODERATE: Some improvement from normalization');
            } else {
                console.log('   ⚠️ LIMITED: Sample rate normalization needs improvement');
            }
        } else {
            console.log('   ❌ Fingerprint generation failed');
        }

    } catch (error) {
        console.error('   ❌ Focused test failed:', error.message);
    }
}

async function runSampleRateTests() {
    console.log('🎵 Sample Rate Duplicate Detection Test Suite\n');
    console.log('=' .repeat(60));

    await testSampleRateDetection();
    console.log('\n' + '=' .repeat(60));
    await testSpecificSampleRatePair();

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Sample rate testing completed!');
    console.log('\nThis test shows how effective our sample rate normalization');
    console.log('is for detecting duplicates across different sample rates.');
}

runSampleRateTests().catch(error => {
    console.error('💥 Sample rate test failed:', error.message);
    process.exit(1);
});