#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');
const path = require('path');

async function debugDuplicateDetection() {
    console.log('🔍 Debug: Testing duplicate detection with original and modified files\n');

    try {
        // Initialize index
        await audioDuplicates.initializeIndex();
        await audioDuplicates.setSimilarityThreshold(0.70);

        // Test with tiny volume change
        const originalFile = 'test_scenarios/original/106814.wav';
        const duplicateFile = 'test_scenarios/tiny_volume_change.wav'; // Tiny volume change

        if (!fs.existsSync(originalFile)) {
            throw new Error(`Original file not found: ${originalFile}`);
        }
        if (!fs.existsSync(duplicateFile)) {
            throw new Error(`Duplicate file not found: ${duplicateFile}`);
        }

        console.log('Adding files to index:');
        console.log(`  Original: ${originalFile}`);
        const id1 = await audioDuplicates.addFileToIndex(originalFile);
        console.log(`  -> File ID: ${id1}`);

        console.log(`  Duplicate: ${duplicateFile}`);
        const id2 = await audioDuplicates.addFileToIndex(duplicateFile);
        console.log(`  -> File ID: ${id2}`);

        // Get index stats
        const stats = await audioDuplicates.getIndexStats();
        console.log('\nIndex stats:', stats);

        // Find duplicates
        console.log('\nFinding duplicates...');
        const duplicates = await audioDuplicates.findAllDuplicates();
        console.log(`Found ${duplicates.length} duplicate groups:`);

        for (let i = 0; i < duplicates.length; i++) {
            const group = duplicates[i];
            console.log(`\nGroup ${i + 1}:`);
            console.log(`  Similarity: ${group.similarity || 'unknown'}`);
            console.log(`  Files:`, group.files || group);
        }

        // Let's also try direct fingerprint comparison
        console.log('\n🧪 Direct fingerprint comparison:');

        const fp1 = await audioDuplicates.generateFingerprint(originalFile);
        console.log('Original fingerprint generated');

        const fp2 = await audioDuplicates.generateFingerprint(duplicateFile);
        console.log('Modified fingerprint generated');

        const comparison = await audioDuplicates.compareFingerprints(fp1, fp2);
        console.log('Fingerprint comparison result:', comparison);

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
    }
}

debugDuplicateDetection();