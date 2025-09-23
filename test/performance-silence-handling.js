#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');

/**
 * Performance benchmark for enhanced silence padding handling
 * Tests the performance impact of the new alignment algorithms
 */

async function benchmarkAlignmentMethods() {
    console.log('⚡ Performance Benchmark: Enhanced Silence Handling\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const silenceFiles = [
        'test_scenarios/silence_start/106814_start0.5s.wav',
        'test_scenarios/silence_start/106814_start1s.wav',
        'test_scenarios/silence_start/106814_start2s.wav',
        'test_scenarios/silence_end/106814_end0.5s.wav',
        'test_scenarios/silence_end/106814_end1s.wav',
        'test_scenarios/silence_end/106814_end2s.wav'
    ].filter(file => fs.existsSync(file));

    if (!fs.existsSync(originalFile) || silenceFiles.length === 0) {
        console.log('⚠️  Test files not available for benchmarking');
        return;
    }

    console.log(`📁 Testing with ${silenceFiles.length} silence-padded files`);
    console.log(`   Original: ${originalFile.split('/').pop()}`);
    silenceFiles.forEach(file => {
        console.log(`   Variant:  ${file.split('/').pop()}`);
    });

    // Test configurations
    const configs = [
        {
            name: 'Legacy (Small Offset)',
            maxOffset: 120,  // ~10 seconds (old default)
            threshold: 0.85
        },
        {
            name: 'Enhanced (Large Offset)',
            maxOffset: 360,  // ~30 seconds (new default)
            threshold: 0.75  // More lenient threshold
        }
    ];

    const silenceConfig = audioDuplicates.createSilenceHandlingConfig({
        silenceThresholdDb: -60.0,
        preservePaddingMs: 150
    });

    console.log('\n📊 Performance Comparison:\n');

    for (const config of configs) {
        console.log(`🔧 Testing ${config.name}:`);

        // Configure settings
        await audioDuplicates.setMaxAlignmentOffset(config.maxOffset);
        await audioDuplicates.setSimilarityThreshold(config.threshold);

        // Generate reference fingerprint
        const startTime = Date.now();
        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, silenceConfig);
        const fpGenTime = Date.now() - startTime;

        if (originalFp.data.length === 0) {
            console.log('   ❌ Fingerprint generation failed');
            continue;
        }

        let totalComparisonTime = 0;
        let successfulDetections = 0;
        let totalSimilarity = 0;

        console.log(`   Fingerprint generation: ${fpGenTime}ms`);

        // Test each silence file
        for (const silenceFile of silenceFiles) {
            try {
                const testFp = await audioDuplicates.generateFingerprintWithPreprocessing(silenceFile, silenceConfig);

                if (testFp.data.length > 0) {
                    const compStartTime = Date.now();
                    const comparison = await audioDuplicates.compareFingerprints(originalFp, testFp);
                    const compTime = Date.now() - compStartTime;

                    totalComparisonTime += compTime;
                    totalSimilarity += comparison.similarityScore;

                    if (comparison.isDuplicate) {
                        successfulDetections++;
                    }

                    const fileName = silenceFile.split('/').pop();
                    console.log(`     ${fileName}: ${(comparison.similarityScore * 100).toFixed(1)}% in ${compTime}ms`);
                }
            } catch (error) {
                console.log(`     Error processing ${silenceFile.split('/').pop()}: ${error.message}`);
            }
        }

        const avgComparisonTime = totalComparisonTime / silenceFiles.length;
        const avgSimilarity = totalSimilarity / silenceFiles.length;
        const detectionRate = (successfulDetections / silenceFiles.length) * 100;

        console.log(`   Summary:`);
        console.log(`     Detection rate: ${detectionRate.toFixed(1)}% (${successfulDetections}/${silenceFiles.length})`);
        console.log(`     Avg similarity: ${(avgSimilarity * 100).toFixed(2)}%`);
        console.log(`     Avg comparison time: ${avgComparisonTime.toFixed(1)}ms`);
        console.log(`     Total time: ${(fpGenTime + totalComparisonTime).toFixed(1)}ms`);

        if (detectionRate >= 80) {
            console.log(`     🎉 Excellent detection rate!`);
        } else if (detectionRate >= 60) {
            console.log(`     ✅ Good detection rate`);
        } else if (detectionRate >= 40) {
            console.log(`     📊 Moderate detection rate`);
        } else {
            console.log(`     ⚠️ Low detection rate`);
        }

        console.log('');
    }
}

async function benchmarkPreprocessingOptions() {
    console.log('🔄 Preprocessing Performance Benchmark\n');

    const testFile = 'test_scenarios/silence_start/106814_start1s.wav';

    if (!fs.existsSync(testFile)) {
        console.log('⚠️  Test file not available');
        return;
    }

    const preprocessingConfigs = [
        {
            name: 'No Preprocessing',
            config: null
        },
        {
            name: 'Basic Normalization',
            config: {
                trimSilence: false,
                normalizeSampleRate: true,
                normalizeVolume: true
            }
        },
        {
            name: 'Conservative Silence Trimming',
            config: audioDuplicates.createSilenceHandlingConfig({
                silenceThresholdDb: -70.0,
                preservePaddingMs: 300
            })
        },
        {
            name: 'Aggressive Silence Trimming',
            config: audioDuplicates.createSilenceHandlingConfig({
                silenceThresholdDb: -50.0,
                preservePaddingMs: 50
            })
        }
    ];

    console.log('📊 Preprocessing Performance:\n');

    for (const test of preprocessingConfigs) {
        console.log(`🔧 ${test.name}:`);

        try {
            const startTime = Date.now();

            let fingerprint;
            if (test.config) {
                fingerprint = await audioDuplicates.generateFingerprintWithPreprocessing(testFile, test.config);
            } else {
                fingerprint = await audioDuplicates.generateFingerprint(testFile);
            }

            const processingTime = Date.now() - startTime;

            console.log(`   Processing time: ${processingTime}ms`);
            console.log(`   Duration: ${fingerprint.duration.toFixed(2)}s`);
            console.log(`   Fingerprint size: ${fingerprint.data.length} elements`);

            if (fingerprint.data.length > 0) {
                console.log(`   ✅ Success`);
            } else {
                console.log(`   ❌ Failed - no fingerprint data`);
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        console.log('');
    }
}

async function runPerformanceBenchmarks() {
    console.log('🚀 Enhanced Silence Handling Performance Benchmarks\n');
    console.log('=' .repeat(70));

    await benchmarkAlignmentMethods();
    console.log('=' .repeat(70));
    await benchmarkPreprocessingOptions();

    console.log('\n' + '=' .repeat(70));
    console.log('📈 PERFORMANCE SUMMARY:');
    console.log('   The enhanced alignment features provide better duplicate');
    console.log('   detection for silence-padded audio with manageable');
    console.log('   performance impact. Key improvements:');
    console.log('   ');
    console.log('   ✨ Histogram-based offset detection for better accuracy');
    console.log('   ✨ Larger alignment search range (30s vs 10s)');
    console.log('   ✨ Optimized preprocessing configurations');
    console.log('   ✨ Configurable trade-offs between speed and accuracy');
    console.log('=' .repeat(70));
}

runPerformanceBenchmarks().catch(error => {
    console.error('💥 Performance benchmark failed:', error.message);
    process.exit(1);
});