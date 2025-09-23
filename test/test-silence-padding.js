#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');

/**
 * Comprehensive silence padding detection testing
 * Goal: Find optimal settings to detect duplicates with added silence
 */

async function testSilenceThresholds() {
    console.log('🔇 Testing Different Silence Detection Thresholds\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const silenceFiles = [
        { name: '0.5s start', path: 'test_scenarios/silence_start/106814_start0.5s.wav', type: 'start' },
        { name: '1s start', path: 'test_scenarios/silence_start/106814_start1s.wav', type: 'start' },
        { name: '2s start', path: 'test_scenarios/silence_start/106814_start2s.wav', type: 'start' },
        { name: '0.5s end', path: 'test_scenarios/silence_end/106814_end0.5s.wav', type: 'end' },
        { name: '1s end', path: 'test_scenarios/silence_end/106814_end1s.wav', type: 'end' },
        { name: '2s end', path: 'test_scenarios/silence_end/106814_end2s.wav', type: 'end' }
    ];

    if (!fs.existsSync(originalFile)) {
        console.error('❌ Original file not found');
        return;
    }

    console.log('📁 Available test files:');
    console.log(`   Original: ${originalFile}`);
    for (const file of silenceFiles) {
        const exists = fs.existsSync(file.path) ? '✓' : '❌';
        console.log(`   ${file.name}: ${exists}`);
    }
    console.log('');

    // Test different silence thresholds
    const thresholds = [-70, -65, -60, -55, -50, -45];

    console.log('🧪 Testing silence thresholds with different padding amounts:\n');

    for (const threshold of thresholds) {
        console.log(`🔧 Threshold: ${threshold}dB`);

        const configs = [
            {
                name: 'Conservative',
                config: {
                    trimSilence: true,
                    silenceThresholdDb: threshold,
                    preservePaddingMs: 500,  // Keep lots of padding
                    normalizeSampleRate: true,
                    normalizeVolume: true
                }
            },
            {
                name: 'Moderate',
                config: {
                    trimSilence: true,
                    silenceThresholdDb: threshold,
                    preservePaddingMs: 200,  // Moderate padding
                    normalizeSampleRate: true,
                    normalizeVolume: true
                }
            }
        ];

        for (const configTest of configs) {
            console.log(`   ${configTest.name} (${configTest.config.preservePaddingMs}ms padding):`);

            try {
                // Test preprocessing effect on original
                const originalResult = await audioDuplicates.testPreprocessing(originalFile, configTest.config);
                console.log(`     Original: ${originalResult.original.duration.toFixed(2)}s → ${originalResult.processed.duration.toFixed(2)}s`);

                // Test with a silence file (0.5s start padding)
                const silenceFile = silenceFiles.find(f => f.name === '0.5s start');
                if (silenceFile && fs.existsSync(silenceFile.path)) {
                    const silenceResult = await audioDuplicates.testPreprocessing(silenceFile.path, configTest.config);
                    console.log(`     0.5s pad: ${silenceResult.original.duration.toFixed(2)}s → ${silenceResult.processed.duration.toFixed(2)}s`);

                    // Quick similarity test
                    if (originalResult.processed.duration > 0.5 && silenceResult.processed.duration > 0.5) {
                        const origFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, configTest.config);
                        const silFp = await audioDuplicates.generateFingerprintWithPreprocessing(silenceFile.path, configTest.config);

                        if (origFp.data.length > 0 && silFp.data.length > 0) {
                            const comp = await audioDuplicates.compareFingerprints(origFp, silFp);
                            console.log(`     Similarity: ${(comp.similarityScore * 100).toFixed(2)}%`);

                            if (comp.similarityScore > 0.8) {
                                console.log(`     🎉 GOOD: High similarity achieved!`);
                            } else if (comp.similarityScore > 0.5) {
                                console.log(`     📊 MODERATE: Some similarity`);
                            } else {
                                console.log(`     ⚠️ LOW: Needs adjustment`);
                            }
                        } else {
                            console.log(`     ❌ Fingerprint generation failed`);
                        }
                    } else {
                        console.log(`     ⚠️ Audio too short after trimming`);
                    }
                }
            } catch (error) {
                console.log(`     ❌ Failed: ${error.message}`);
            }
        }
        console.log('');
    }
}

async function testSpecificSilenceScenarios() {
    console.log('\n🎯 Testing Specific Silence Scenarios\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const testFiles = [
        { name: '0.5s start', path: 'test_scenarios/silence_start/106814_start0.5s.wav' },
        { name: '1s start', path: 'test_scenarios/silence_start/106814_start1s.wav' },
        { name: '0.5s end', path: 'test_scenarios/silence_end/106814_end0.5s.wav' },
        { name: '1s end', path: 'test_scenarios/silence_end/106814_end1s.wav' }
    ];

    // Based on our volume success, let's try a conservative approach
    const optimizedConfig = {
        trimSilence: true,
        silenceThresholdDb: -70,    // Very conservative
        preservePaddingMs: 300,      // Keep substantial padding
        normalizeSampleRate: true,
        targetSampleRate: 44100,
        normalizeVolume: true,       // This works great
        useRmsNormalization: true,
        targetRmsDb: -20
    };

    console.log('🔧 Optimized config for silence detection:');
    console.log(JSON.stringify(optimizedConfig, null, 2));
    console.log('');

    if (!fs.existsSync(originalFile)) {
        console.error('❌ Original file not found');
        return;
    }

    try {
        // Generate original fingerprint
        console.log('📋 Generating original fingerprint...');
        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, optimizedConfig);
        console.log(`   Original: ${originalFp.duration.toFixed(2)}s, ${originalFp.data.length} elements`);

        if (originalFp.data.length === 0) {
            console.log('❌ Original fingerprint failed - config too aggressive');
            return;
        }

        console.log('\n🧪 Testing silence-padded files:\n');

        for (const testFile of testFiles) {
            if (!fs.existsSync(testFile.path)) {
                console.log(`⚠️  ${testFile.name}: File not found`);
                continue;
            }

            console.log(`Testing ${testFile.name}:`);

            try {
                // Show preprocessing effect
                const preprocessResult = await audioDuplicates.testPreprocessing(testFile.path, optimizedConfig);
                console.log(`   Preprocessing: ${preprocessResult.original.duration.toFixed(2)}s → ${preprocessResult.processed.duration.toFixed(2)}s`);

                // Test WITHOUT preprocessing
                const origNoPrep = await audioDuplicates.generateFingerprint(originalFile);
                const testNoPrep = await audioDuplicates.generateFingerprint(testFile.path);
                const compNoPrep = await audioDuplicates.compareFingerprints(origNoPrep, testNoPrep);

                // Test WITH preprocessing
                const testWithPrep = await audioDuplicates.generateFingerprintWithPreprocessing(testFile.path, optimizedConfig);
                console.log(`   Processed fingerprint: ${testWithPrep.data.length} elements`);

                if (testWithPrep.data.length > 0) {
                    const compWithPrep = await audioDuplicates.compareFingerprints(originalFp, testWithPrep);

                    console.log(`   No preprocessing:   ${(compNoPrep.similarityScore * 100).toFixed(2)}%`);
                    console.log(`   With preprocessing: ${(compWithPrep.similarityScore * 100).toFixed(2)}%`);

                    const improvement = compWithPrep.similarityScore - compNoPrep.similarityScore;
                    if (improvement > 0.2) {
                        console.log(`   🎉 MAJOR improvement: +${(improvement * 100).toFixed(2)}% points`);
                    } else if (improvement > 0.05) {
                        console.log(`   ✅ Good improvement: +${(improvement * 100).toFixed(2)}% points`);
                    } else if (improvement > -0.05) {
                        console.log(`   ~ Minimal change: ${(improvement * 100).toFixed(2)}% points`);
                    } else {
                        console.log(`   ⚠️ Decreased: ${(improvement * 100).toFixed(2)}% points`);
                    }

                    // Check if detectable
                    if (compWithPrep.similarityScore >= 0.85) {
                        console.log(`   🎯 DETECTABLE at standard threshold (0.85)`);
                    } else if (compWithPrep.similarityScore >= 0.70) {
                        console.log(`   📊 Detectable at lower threshold (0.70)`);
                    } else {
                        console.log(`   ❌ Not detectable at common thresholds`);
                    }
                } else {
                    console.log(`   ❌ Processed fingerprint failed`);
                }

            } catch (error) {
                console.log(`   ❌ Test failed: ${error.message}`);
            }

            console.log('');
        }

    } catch (error) {
        console.error('Specific scenario test failed:', error.message);
    }
}

async function testNoSilenceTrimmingApproach() {
    console.log('\n🚀 Alternative Approach: No Silence Trimming (Just Normalization)\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const silenceFile = 'test_scenarios/silence_start/106814_start0.5s.wav';

    // Maybe silence trimming isn't the answer - let's try just normalization
    const normalizationOnlyConfig = {
        trimSilence: false,           // Don't trim silence
        normalizeSampleRate: true,
        targetSampleRate: 44100,
        normalizeVolume: true,        // This works great for volume
        useRmsNormalization: true,
        targetRmsDb: -20
    };

    console.log('🔧 Normalization-only approach:');
    console.log(JSON.stringify(normalizationOnlyConfig, null, 2));

    if (!fs.existsSync(originalFile) || !fs.existsSync(silenceFile)) {
        console.log('⚠️  Test files not found');
        return;
    }

    try {
        console.log('\nTesting normalization-only approach:');

        const origFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, normalizationOnlyConfig);
        const silFp = await audioDuplicates.generateFingerprintWithPreprocessing(silenceFile, normalizationOnlyConfig);

        console.log(`   Original: ${origFp.duration.toFixed(2)}s, ${origFp.data.length} elements`);
        console.log(`   With 0.5s silence: ${silFp.duration.toFixed(2)}s, ${silFp.data.length} elements`);

        if (origFp.data.length > 0 && silFp.data.length > 0) {
            const comparison = await audioDuplicates.compareFingerprints(origFp, silFp);
            console.log(`\n   Similarity with just normalization: ${(comparison.similarityScore * 100).toFixed(2)}%`);

            if (comparison.similarityScore > 0.7) {
                console.log(`   🎉 SUCCESS: Normalization alone might be enough!`);
            } else {
                console.log(`   📊 Partial success - normalization helps but not enough`);
            }
        } else {
            console.log(`   ❌ Fingerprint generation failed`);
        }

    } catch (error) {
        console.error('Normalization-only test failed:', error.message);
    }
}

async function runSilenceTests() {
    console.log('🎵 Silence Padding Detection Test Suite\n');
    console.log('=' .repeat(60));

    await testSilenceThresholds();
    console.log('=' .repeat(60));
    await testSpecificSilenceScenarios();
    console.log('=' .repeat(60));
    await testNoSilenceTrimmingApproach();

    console.log('\n' + '=' .repeat(60));
    console.log('📊 SILENCE TESTING SUMMARY:');
    console.log('   The tests above explore different approaches to handle');
    console.log('   silence padding in duplicate detection.');
    console.log('   \n   Key findings will help us optimize the silence detection');
    console.log('   to achieve the same success we had with volume normalization.');
}

runSilenceTests().catch(error => {
    console.error('💥 Silence test failed:', error.message);
    process.exit(1);
});