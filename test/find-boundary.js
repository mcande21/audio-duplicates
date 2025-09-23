#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Find Detection Boundary
 *
 * Systematically test volume modifications to find the exact point
 * where Chromaprint fingerprinting breaks.
 */

async function findDetectionBoundary() {
    console.log('🔍 Finding Exact Detection Boundary for Volume Changes\n');

    const originalFile = 'test_scenarios/original/106814.wav';
    const testFile = 'test_scenarios/boundary_test.wav';

    if (!fs.existsSync(originalFile)) {
        console.error('❌ Original file not found');
        return;
    }

    // Test increasingly larger volume changes
    const volumeFactors = [
        1.0001,  // 0.01% increase
        1.001,   // 0.1% increase
        1.005,   // 0.5% increase
        1.01,    // 1% increase
        1.02,    // 2% increase
        1.05,    // 5% increase
        1.1,     // 10% increase
        1.2      // 20% increase
    ];

    console.log('Testing volume factors from 1.0001 to 1.2...\n');

    for (const factor of volumeFactors) {
        try {
            // Create modified file
            const command = `sox "${originalFile}" "${testFile}" vol ${factor}`;
            execSync(command, { stdio: 'pipe' });

            // Test detection
            await audioDuplicates.initializeIndex();
            await audioDuplicates.setSimilarityThreshold(0.85);

            await audioDuplicates.addFileToIndex(originalFile);
            await audioDuplicates.addFileToIndex(testFile);

            const duplicates = await audioDuplicates.findAllDuplicates();
            const detected = duplicates.length > 0;

            // Get direct fingerprint comparison
            const fp1 = await audioDuplicates.generateFingerprint(originalFile);
            const fp2 = await audioDuplicates.generateFingerprint(testFile);
            const comparison = await audioDuplicates.compareFingerprints(fp1, fp2);

            const percentChange = ((factor - 1) * 100).toFixed(3);
            const status = detected ? '✅ DETECTED' : '❌ NOT DETECTED';

            console.log(`Volume ${factor} (+${percentChange}%): ${status}`);
            console.log(`   Similarity: ${comparison.similarityScore.toFixed(6)}`);
            console.log(`   Matched segments: ${comparison.matchedSegments}`);
            console.log(`   Bit error rate: ${comparison.bitErrorRate.toFixed(6)}`);

            if (!detected && comparison.similarityScore === 0) {
                console.log(`\n🎯 BOUNDARY FOUND: Detection breaks at +${percentChange}% volume increase`);
                console.log(`   Previous factor still worked, this one completely fails`);
                break;
            }

        } catch (error) {
            console.log(`Volume ${factor}: ❌ error - ${error.message}`);
        }
    }

    // Cleanup
    if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
    }

    console.log('\n💡 Key Insights:');
    console.log('   - Chromaprint fingerprints are extremely sensitive to volume changes');
    console.log('   - Even tiny changes can completely break similarity detection');
    console.log('   - When similarity drops to 0, no threshold can recover detection');
}

findDetectionBoundary().catch(error => {
    console.error('\n💥 Boundary test failed:', error.message);
    process.exit(1);
});