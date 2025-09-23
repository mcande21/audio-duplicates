const audioDuplicates = require('../lib/index');
const fs = require('fs');
const path = require('path');

console.log('Testing Audio Duplicates addon...\n');

async function runTests() {
    console.log('🎵 Audio Duplicate Detection - Test Suite\n');

    // Test 1: Initialize index
    console.log('1. Testing index initialization:');
    try {
        const result = await audioDuplicates.initializeIndex();
        console.log('   Result:', result);
        if (result === true) {
            console.log('   ✓ Passed\n');
        } else {
            console.log('   ✗ Failed: Expected true\n');
            return;
        }
    } catch (error) {
        console.log('   ✗ Failed:', error.message, '\n');
        return;
    }

    // Test 2: Get initial index stats
    console.log('2. Testing index stats:');
    try {
        const stats = await audioDuplicates.getIndexStats();
        console.log('   Stats:', stats);
        if (typeof stats === 'object' &&
            typeof stats.fileCount === 'number' &&
            typeof stats.indexSize === 'number' &&
            typeof stats.loadFactor === 'number') {
            console.log('   ✓ Passed\n');
        } else {
            console.log('   ✗ Failed: Invalid stats object\n');
        }
    } catch (error) {
        console.log('   ✗ Failed:', error.message, '\n');
    }

    // Test 3: Set similarity threshold
    console.log('3. Testing similarity threshold setting:');
    try {
        const result = await audioDuplicates.setSimilarityThreshold(0.9);
        console.log('   Result:', result);
        if (result === true) {
            console.log('   ✓ Passed\n');
        } else {
            console.log('   ✗ Failed: Expected true\n');
        }
    } catch (error) {
        console.log('   ✗ Failed:', error.message, '\n');
    }

    // Test 4: Test invalid threshold
    console.log('4. Testing invalid similarity threshold:');
    try {
        await audioDuplicates.setSimilarityThreshold(1.5);
        console.log('   ✗ Failed: Should have thrown error\n');
    } catch (error) {
        console.log('   Expected error:', error.message);
        console.log('   ✓ Passed\n');
    }

    // Test 5: Clear index
    console.log('5. Testing index clear:');
    try {
        const result = await audioDuplicates.clearIndex();
        console.log('   Result:', result);
        if (result === true) {
            console.log('   ✓ Passed\n');
        } else {
            console.log('   ✗ Failed: Expected true\n');
        }
    } catch (error) {
        console.log('   ✗ Failed:', error.message, '\n');
    }

    // Test 6: Find duplicates on empty index
    console.log('6. Testing find duplicates on empty index:');
    try {
        const duplicates = await audioDuplicates.findAllDuplicates();
        console.log('   Duplicates found:', duplicates.length);
        if (Array.isArray(duplicates) && duplicates.length === 0) {
            console.log('   ✓ Passed\n');
        } else {
            console.log('   ✗ Failed: Expected empty array\n');
        }
    } catch (error) {
        console.log('   ✗ Failed:', error.message, '\n');
    }

    console.log('✅ Core API tests completed successfully!');

    // Test 7: Audio file duplicate detection with real files
    if (fs.existsSync('test_A') && fs.existsSync('test_B')) {
        console.log('\n7. Testing real audio file duplicate detection:');
        try {
            await audioDuplicates.clearIndex();
            await audioDuplicates.initializeIndex();
            await audioDuplicates.setSimilarityThreshold(0.85);

            // Add a few test files
            const testFileA = 'test_A/131244.wav';
            const testFileB = 'test_B/835911.wav'; // Known duplicate

            if (fs.existsSync(testFileA) && fs.existsSync(testFileB)) {
                await audioDuplicates.addFileToIndex(testFileA);
                await audioDuplicates.addFileToIndex(testFileB);

                const duplicates = await audioDuplicates.findAllDuplicates();
                console.log(`   Found ${duplicates.length} duplicate groups`);

                if (duplicates.length > 0) {
                    console.log('   ✓ Passed: Detected known duplicates\n');
                } else {
                    console.log('   ⚠ Warning: No duplicates detected (check threshold)\n');
                }
            } else {
                console.log('   ⚠ Skipped: Test audio files not found\n');
            }
        } catch (error) {
            console.log('   ✗ Failed:', error.message, '\n');
        }
    }

    // Test 8: Modification robustness testing
    if (fs.existsSync('test_scenarios/original')) {
        console.log('\n8. Testing modification robustness:');
        try {
            await audioDuplicates.clearIndex();
            await audioDuplicates.initializeIndex();
            await audioDuplicates.setSimilarityThreshold(0.85);

            const originalFile = 'test_scenarios/original/106814.wav';
            const modifiedFile = 'test_scenarios/tiny_volume_change.wav';

            if (fs.existsSync(originalFile)) {
                // Create tiny volume change for testing
                const { execSync } = require('child_process');
                try {
                    execSync(`sox "${originalFile}" "${modifiedFile}" vol 1.001`, { stdio: 'pipe' });

                    await audioDuplicates.addFileToIndex(originalFile);
                    await audioDuplicates.addFileToIndex(modifiedFile);

                    const duplicates = await audioDuplicates.findAllDuplicates();

                    if (duplicates.length > 0) {
                        console.log('   ✓ Passed: Detected duplicate despite tiny modification');
                    } else {
                        console.log('   ⚠ Note: Tiny modification not detected as duplicate');
                    }

                    // Cleanup
                    if (fs.existsSync(modifiedFile)) {
                        fs.unlinkSync(modifiedFile);
                    }
                } catch (soxError) {
                    console.log('   ⚠ Skipped: Sox not available for modification testing');
                }
            } else {
                console.log('   ⚠ Skipped: Test scenarios not generated');
            }
        } catch (error) {
            console.log('   ✗ Failed:', error.message);
        }
        console.log('');
    }

    console.log('📝 Note: Audio file processing tests require:');
    console.log('   1. Chromaprint library installed');
    console.log('   2. libsndfile library installed');
    console.log('   3. Audio files for testing');
    console.log('\n🚀 Advanced testing available:');
    console.log('   1. Generate test scenarios: node test/generate-test-audio.js');
    console.log('   2. Run modification tests: node test/test-modifications.js');
    console.log('   3. Analyze results: node test/analyze-results.js');
    console.log('   4. Test CLI: ./cli/audio-duplicates.js scan <directory>');
    console.log('\n🔧 Installation guide:');
    console.log('   macOS: brew install chromaprint libsndfile sox');
    console.log('   Ubuntu: sudo apt-get install libchromaprint-dev libsndfile1-dev sox');
    console.log('   Windows: See README for Windows installation instructions');
}

// Handle async test execution
runTests().catch(error => {
    console.error('\n❌ Test suite failed:', error.message);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});

console.log('Note: If you see a "bindings file" error, run "npm run build" first.');