#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');
const path = require('path');

/**
 * Threshold Sweep Test
 *
 * Tests a wide range of thresholds to find if ANY threshold can detect
 * modified files as duplicates.
 */

async function sweepThresholds() {
    console.log('🔍 Threshold Sweep Test - Finding Detection Boundaries\n');

    // Test with minimal volume modification
    const originalFile = 'test_scenarios/original/106814.wav';
    const modifiedFile = 'test_scenarios/minimal_test.wav';

    if (!fs.existsSync(originalFile) || !fs.existsSync(modifiedFile)) {
        console.error('❌ Test files not found. Run generate-test-audio.js first.');
        return;
    }

    // Test a wide range of thresholds
    const thresholds = [0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.20, 0.10, 0.05, 0.01];

    console.log('Testing thresholds from 0.90 down to 0.01...\n');

    for (const threshold of thresholds) {
        try {
            // Initialize index
            await audioDuplicates.initializeIndex();
            await audioDuplicates.setSimilarityThreshold(threshold);

            // Add files
            await audioDuplicates.addFileToIndex(originalFile);
            await audioDuplicates.addFileToIndex(modifiedFile);

            // Find duplicates
            const duplicates = await audioDuplicates.findAllDuplicates();

            const detected = duplicates.length > 0;
            const status = detected ? '✅ DETECTED' : '❌ not detected';

            console.log(`Threshold ${threshold.toFixed(2)}: ${status}`);

            if (detected) {
                console.log(`   → Similarity: ${duplicates[0].avgSimilarity || 'unknown'}`);
                console.log(`   → First detection at threshold ${threshold}!`);
                break;
            }

        } catch (error) {
            console.log(`Threshold ${threshold.toFixed(2)}: ❌ error - ${error.message}`);
        }
    }

    // Also test direct fingerprint comparison
    console.log('\n🧪 Direct fingerprint comparison:');
    try {
        const fp1 = await audioDuplicates.generateFingerprint(originalFile);
        const fp2 = await audioDuplicates.generateFingerprint(modifiedFile);
        const comparison = await audioDuplicates.compareFingerprints(fp1, fp2);

        console.log(`   Similarity score: ${comparison.similarityScore}`);
        console.log(`   Matched segments: ${comparison.matchedSegments}`);
        console.log(`   Bit error rate: ${comparison.bitErrorRate}`);
        console.log(`   Is duplicate: ${comparison.isDuplicate}`);

        if (comparison.similarityScore === 0) {
            console.log('\n💡 Insight: Fingerprints have 0% similarity - no threshold will detect this as duplicate');
        } else {
            console.log(`\n💡 Insight: Try threshold around ${comparison.similarityScore} for detection`);
        }

    } catch (error) {
        console.error('   Error in direct comparison:', error.message);
    }
}

sweepThresholds().catch(error => {
    console.error('\n💥 Threshold sweep failed:', error.message);
    process.exit(1);
});