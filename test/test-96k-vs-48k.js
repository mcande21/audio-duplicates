#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');

/**
 * Focused test: 96kHz vs 48kHz sample rate comparison
 */

async function test96kVs48k() {
    console.log('🎯 Focused Test: 96kHz vs 48kHz Sample Rate Comparison\n');

    const file96k = 'test_scenarios/sample_rate/106814_96000Hz.wav';
    const file48k = 'test_scenarios/sample_rate/106814_48000Hz.wav';

    console.log('📁 Test files:');
    console.log(`   96kHz: ${file96k} ${fs.existsSync(file96k) ? '✓' : '❌'}`);
    console.log(`   48kHz: ${file48k} ${fs.existsSync(file48k) ? '✓' : '❌'}`);

    if (!fs.existsSync(file96k) || !fs.existsSync(file48k)) {
        console.error('❌ Required test files not found');
        return;
    }

    console.log('\n🔬 Testing different preprocessing approaches:\n');

    // Test 1: No preprocessing
    console.log('1️⃣ NO PREPROCESSING:');
    try {
        const fp96k_raw = await audioDuplicates.generateFingerprint(file96k);
        const fp48k_raw = await audioDuplicates.generateFingerprint(file48k);

        console.log(`   96kHz: ${fp96k_raw.sampleRate}Hz, ${fp96k_raw.duration.toFixed(2)}s, ${fp96k_raw.data.length} elements`);
        console.log(`   48kHz: ${fp48k_raw.sampleRate}Hz, ${fp48k_raw.duration.toFixed(2)}s, ${fp48k_raw.data.length} elements`);

        const comp_raw = await audioDuplicates.compareFingerprints(fp96k_raw, fp48k_raw);
        console.log(`   Similarity: ${(comp_raw.similarityScore * 100).toFixed(2)}%`);
        console.log(`   Matched segments: ${comp_raw.matchedSegments}`);
        console.log(`   Is duplicate: ${comp_raw.isDuplicate}`);
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
    }

    // Test 2: Sample rate normalization only
    console.log('\n2️⃣ SAMPLE RATE NORMALIZATION ONLY:');
    const sampleRateOnlyConfig = {
        trimSilence: false,
        normalizeSampleRate: true,
        targetSampleRate: 44100,
        normalizeVolume: false
    };

    try {
        const test96k = await audioDuplicates.testPreprocessing(file96k, sampleRateOnlyConfig);
        const test48k = await audioDuplicates.testPreprocessing(file48k, sampleRateOnlyConfig);

        console.log(`   96kHz: ${test96k.original.sampleRate}Hz → ${test96k.processed.sampleRate}Hz`);
        console.log(`   48kHz: ${test48k.original.sampleRate}Hz → ${test48k.processed.sampleRate}Hz`);

        const fp96k_norm = await audioDuplicates.generateFingerprintWithPreprocessing(file96k, sampleRateOnlyConfig);
        const fp48k_norm = await audioDuplicates.generateFingerprintWithPreprocessing(file48k, sampleRateOnlyConfig);

        console.log(`   96kHz processed: ${fp96k_norm.sampleRate}Hz, ${fp96k_norm.data.length} elements`);
        console.log(`   48kHz processed: ${fp48k_norm.sampleRate}Hz, ${fp48k_norm.data.length} elements`);

        const comp_norm = await audioDuplicates.compareFingerprints(fp96k_norm, fp48k_norm);
        console.log(`   Similarity: ${(comp_norm.similarityScore * 100).toFixed(2)}%`);
        console.log(`   Matched segments: ${comp_norm.matchedSegments}`);
        console.log(`   Is duplicate: ${comp_norm.isDuplicate}`);
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
    }

    // Test 3: Full preprocessing
    console.log('\n3️⃣ FULL PREPROCESSING:');
    const fullConfig = {
        trimSilence: false,  // Keep simple for this test
        normalizeSampleRate: true,
        targetSampleRate: 44100,
        normalizeVolume: true,
        useRmsNormalization: true,
        targetRmsDb: -20
    };

    try {
        const fp96k_full = await audioDuplicates.generateFingerprintWithPreprocessing(file96k, fullConfig);
        const fp48k_full = await audioDuplicates.generateFingerprintWithPreprocessing(file48k, fullConfig);

        console.log(`   96kHz fully processed: ${fp96k_full.sampleRate}Hz, ${fp96k_full.data.length} elements`);
        console.log(`   48kHz fully processed: ${fp48k_full.sampleRate}Hz, ${fp48k_full.data.length} elements`);

        const comp_full = await audioDuplicates.compareFingerprints(fp96k_full, fp48k_full);
        console.log(`   Similarity: ${(comp_full.similarityScore * 100).toFixed(2)}%`);
        console.log(`   Matched segments: ${comp_full.matchedSegments}`);
        console.log(`   Is duplicate: ${comp_full.isDuplicate}`);
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
    }

    // Test 4: Different target sample rates
    console.log('\n4️⃣ TESTING DIFFERENT TARGET SAMPLE RATES:');

    const targetRates = [22050, 44100, 48000];

    for (const targetRate of targetRates) {
        console.log(`\n   Target: ${targetRate}Hz`);

        const config = {
            trimSilence: false,
            normalizeSampleRate: true,
            targetSampleRate: targetRate,
            normalizeVolume: false
        };

        try {
            const fp96k = await audioDuplicates.generateFingerprintWithPreprocessing(file96k, config);
            const fp48k = await audioDuplicates.generateFingerprintWithPreprocessing(file48k, config);

            const comparison = await audioDuplicates.compareFingerprints(fp96k, fp48k);
            console.log(`     Similarity: ${(comparison.similarityScore * 100).toFixed(2)}%`);
            console.log(`     Elements: 96k=${fp96k.data.length}, 48k=${fp48k.data.length}`);
        } catch (error) {
            console.log(`     ❌ Failed: ${error.message}`);
        }
    }

    // Summary
    console.log('\n📊 ANALYSIS:');
    console.log('   This test shows how well our sample rate normalization');
    console.log('   handles the significant difference between 96kHz and 48kHz.');
    console.log('   \n   96kHz has 2x the sample rate of 48kHz, making this');
    console.log('   a good test of our resampling quality.');
}

async function testOriginalVsResampled() {
    console.log('\n\n🔄 BONUS TEST: Original vs All Resampled Versions\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const file96k = 'test_scenarios/sample_rate/106814_96000Hz.wav';
    const file48k = 'test_scenarios/sample_rate/106814_48000Hz.wav';

    const config = {
        trimSilence: false,
        normalizeSampleRate: true,
        targetSampleRate: 44100,
        normalizeVolume: true
    };

    if (!fs.existsSync(originalFile)) {
        console.log('⚠️  Original file not found');
        return;
    }

    try {
        console.log('Testing original vs resampled versions:');

        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, config);
        console.log(`\nOriginal (preprocessed): ${originalFp.sampleRate}Hz, ${originalFp.data.length} elements`);

        const testFiles = [
            { name: '96kHz version', path: file96k },
            { name: '48kHz version', path: file48k }
        ];

        for (const testFile of testFiles) {
            if (fs.existsSync(testFile.path)) {
                const testFp = await audioDuplicates.generateFingerprintWithPreprocessing(testFile.path, config);
                const comparison = await audioDuplicates.compareFingerprints(originalFp, testFp);

                console.log(`\n${testFile.name}:`);
                console.log(`   Similarity vs original: ${(comparison.similarityScore * 100).toFixed(2)}%`);
                console.log(`   Matched segments: ${comparison.matchedSegments}`);

                if (comparison.similarityScore > 0.95) {
                    console.log(`   🎉 EXCELLENT match with original`);
                } else if (comparison.similarityScore > 0.85) {
                    console.log(`   ✅ GOOD match with original`);
                } else {
                    console.log(`   📊 Moderate similarity`);
                }
            }
        }

    } catch (error) {
        console.error('Bonus test failed:', error.message);
    }
}

async function runTest() {
    console.log('🎵 96kHz vs 48kHz Sample Rate Test\n');
    console.log('=' .repeat(60));

    await test96kVs48k();
    await testOriginalVsResampled();

    console.log('\n' + '=' .repeat(60));
    console.log('✅ 96kHz vs 48kHz testing completed!');
}

runTest().catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
});