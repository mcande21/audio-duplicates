#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');

/**
 * Test the enhanced silence padding handling features
 * Demonstrates new histogram-based alignment, sliding window comparison,
 * and improved preprocessing options
 */

async function testEnhancedAlignmentFeatures() {
    console.log('🚀 Testing Enhanced Alignment Features\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const silenceFiles = [
        { name: '0.5s start', path: 'test_scenarios/silence_start/106814_start0.5s.wav' },
        { name: '1s start', path: 'test_scenarios/silence_start/106814_start1s.wav' },
        { name: '2s start', path: 'test_scenarios/silence_start/106814_start2s.wav' },
        { name: '0.5s end', path: 'test_scenarios/silence_end/106814_end0.5s.wav' },
        { name: '1s end', path: 'test_scenarios/silence_end/106814_end1s.wav' },
        { name: '2s end', path: 'test_scenarios/silence_end/106814_end2s.wav' }
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

    // Test enhanced configuration options
    try {
        console.log('🔧 Configuring enhanced alignment settings...');

        // Set enhanced alignment parameters
        await audioDuplicates.setMaxAlignmentOffset(600); // 50 seconds for extensive padding
        await audioDuplicates.setBitErrorThreshold(0.2);  // More lenient for silence padding
        await audioDuplicates.setSimilarityThreshold(0.75); // Lower threshold for testing

        console.log('   ✅ Enhanced alignment configured');
        console.log('   - Max alignment offset: 600 samples (~50 seconds)');
        console.log('   - Bit error threshold: 0.2');
        console.log('   - Similarity threshold: 0.75');

        // Create optimized silence handling config
        const silenceConfig = audioDuplicates.createSilenceHandlingConfig({
            silenceThresholdDb: -65.0,
            preservePaddingMs: 200,
            targetRmsDb: -18.0
        });

        console.log('\n🎛️  Using optimized silence handling config:');
        console.log(`   - Silence threshold: ${silenceConfig.silenceThresholdDb}dB`);
        console.log(`   - Preserve padding: ${silenceConfig.preservePaddingMs}ms`);
        console.log(`   - Target RMS: ${silenceConfig.targetRmsDb}dB`);

        // Generate original fingerprint with enhanced preprocessing
        console.log('\n📋 Generating enhanced fingerprints...');
        const originalFp = await audioDuplicates.generateFingerprintWithPreprocessing(originalFile, silenceConfig);
        console.log(`   Original: ${originalFp.duration.toFixed(2)}s, ${originalFp.data.length} elements`);

        if (originalFp.data.length === 0) {
            console.log('❌ Original fingerprint failed');
            return;
        }

        console.log('\n🧪 Testing Enhanced Comparison Methods:\n');

        for (const testFile of silenceFiles) {
            if (!fs.existsSync(testFile.path)) {
                console.log(`⚠️  ${testFile.name}: File not found`);
                continue;
            }

            console.log(`Testing ${testFile.name}:`);

            try {
                // Generate test fingerprint with preprocessing
                const testFp = await audioDuplicates.generateFingerprintWithPreprocessing(testFile.path, silenceConfig);
                console.log(`   Processed: ${testFp.duration.toFixed(2)}s, ${testFp.data.length} elements`);

                if (testFp.data.length === 0) {
                    console.log(`   ❌ Fingerprint generation failed`);
                    continue;
                }

                // Traditional comparison
                const traditionalComp = await audioDuplicates.compareFingerprints(originalFp, testFp);
                console.log(`   Traditional comparison: ${(traditionalComp.similarityScore * 100).toFixed(2)}%`);
                console.log(`     Offset: ${traditionalComp.bestOffset}, Segments: ${traditionalComp.matchedSegments}`);

                // Enhanced sliding window comparison (if implemented in native code)
                try {
                    const slidingComp = await audioDuplicates.compareFingerprintsSlidingWindow(originalFp, testFp);
                    console.log(`   Sliding window: ${(slidingComp.similarityScore * 100).toFixed(2)}%`);

                    if (slidingComp.segmentMatches && slidingComp.segmentMatches.length > 0) {
                        console.log(`     Segment matches: ${slidingComp.segmentMatches.length}`);
                        console.log(`     Coverage ratio: ${(slidingComp.coverageRatio * 100).toFixed(1)}%`);

                        // Show best segment matches
                        const topMatches = slidingComp.segmentMatches.slice(0, 3);
                        console.log(`     Top matches: ${topMatches.map(m => `${(m.similarity * 100).toFixed(1)}%@${m.offset}`).join(', ')}`);
                    }

                    const improvement = slidingComp.similarityScore - traditionalComp.similarityScore;
                    if (improvement > 0.1) {
                        console.log(`   🎉 MAJOR sliding window improvement: +${(improvement * 100).toFixed(2)}% points`);
                    } else if (improvement > 0.02) {
                        console.log(`   ✅ Good sliding window improvement: +${(improvement * 100).toFixed(2)}% points`);
                    } else if (improvement > -0.02) {
                        console.log(`   ~ Similar performance: ${(improvement * 100).toFixed(2)}% points`);
                    } else {
                        console.log(`   ⚠️ Traditional performed better: ${(improvement * 100).toFixed(2)}% points`);
                    }
                } catch (slidingError) {
                    console.log(`   ⚠️  Sliding window not available: ${slidingError.message}`);
                }

                // Check detectability
                const bestScore = Math.max(traditionalComp.similarityScore, 0);
                if (bestScore >= 0.85) {
                    console.log(`   🎯 DETECTABLE at standard threshold`);
                } else if (bestScore >= 0.75) {
                    console.log(`   📊 Detectable at enhanced threshold`);
                } else if (bestScore >= 0.60) {
                    console.log(`   🔍 Detectable with relaxed threshold`);
                } else {
                    console.log(`   ❌ Not readily detectable`);
                }

            } catch (error) {
                console.log(`   ❌ Test failed: ${error.message}`);
            }

            console.log('');
        }

    } catch (error) {
        console.error('Enhanced alignment test failed:', error.message);
    }
}

async function testEnhancedDirectoryScanning() {
    console.log('\n🗂️  Testing Enhanced Directory Scanning\n');

    const testDir = 'test_scenarios';

    if (!fs.existsSync(testDir)) {
        console.log('⚠️  Test scenarios directory not found');
        return;
    }

    try {
        console.log('📂 Testing enhanced directory scanning with silence handling...');

        const results = await audioDuplicates.scanDirectoryForDuplicatesEnhanced(testDir, {
            threshold: 0.75,
            useSlidingWindow: true,
            enableSilenceTrimming: true,
            preprocessConfig: {
                silenceThresholdDb: -60.0,
                preservePaddingMs: 150
            },
            onProgress: (progress) => {
                console.log(`   Processing: ${progress.current}/${progress.total} - ${progress.file.split('/').pop()}`);
                if (progress.preprocessing) console.log(`     Using preprocessing`);
                if (progress.slidingWindow) console.log(`     Using sliding window`);
            }
        });

        console.log(`\n📊 Enhanced scanning results:`);
        console.log(`   Duplicate groups found: ${results.length}`);

        results.forEach((group, index) => {
            console.log(`\n   Group ${index + 1} (similarity: ${(group.avgSimilarity * 100).toFixed(2)}%):`);
            group.filePaths.forEach(file => {
                console.log(`     - ${file.split('/').pop()}`);
            });
        });

        if (results.length > 0) {
            console.log('\n   🎉 Enhanced scanning successfully detected duplicates!');
        } else {
            console.log('\n   📊 No duplicates detected with current settings');
        }

    } catch (error) {
        console.error('Enhanced directory scanning failed:', error.message);
    }
}

async function runEnhancedTests() {
    console.log('🎵 Enhanced Silence Handling Test Suite\n');
    console.log('Testing new histogram-based alignment and sliding window features');
    console.log('=' .repeat(70));

    await testEnhancedAlignmentFeatures();
    console.log('=' .repeat(70));
    await testEnhancedDirectoryScanning();

    console.log('\n' + '=' .repeat(70));
    console.log('📊 ENHANCED TESTING SUMMARY:');
    console.log('   This test demonstrates the new features for handling silence padding:');
    console.log('   ✨ Histogram-based offset detection');
    console.log('   ✨ Cross-correlation alignment');
    console.log('   ✨ Sliding window comparison mode');
    console.log('   ✨ Enhanced preprocessing configuration');
    console.log('   ✨ Improved alignment parameters');
    console.log('   ');
    console.log('   These features work together to provide better duplicate detection');
    console.log('   when audio files have different amounts of silence padding.');
    console.log('=' .repeat(70));
}

runEnhancedTests().catch(error => {
    console.error('💥 Enhanced test failed:', error.message);
    process.exit(1);
});