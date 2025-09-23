const audioDuplicates = require('../lib/index');
const path = require('path');

/**
 * Basic usage example for the audio duplicates library
 *
 * This example demonstrates:
 * 1. Generating fingerprints for audio files
 * 2. Comparing two audio files
 * 3. Scanning a directory for duplicates
 */

async function basicUsageExample() {
    console.log('🎵 Audio Duplicates - Basic Usage Example\n');

    try {
        // Example 1: Generate fingerprint for a single file
        console.log('1. Generating fingerprint...');
        // Note: Replace with actual audio file path
        const testFile = 'test-audio.mp3';

        if (require('fs').existsSync(testFile)) {
            const fingerprint = await audioDuplicates.generateFingerprint(testFile);
            console.log(`   Fingerprint generated for: ${testFile}`);
            console.log(`   Duration: ${fingerprint.duration.toFixed(2)}s`);
            console.log(`   Sample Rate: ${fingerprint.sampleRate}Hz`);
            console.log(`   Data Points: ${fingerprint.data.length}`);
        } else {
            console.log(`   Skipped: ${testFile} not found`);
        }
        console.log();

        // Example 2: Compare two files
        console.log('2. Comparing two files...');
        const file1 = 'audio1.mp3';
        const file2 = 'audio2.mp3';

        if (require('fs').existsSync(file1) && require('fs').existsSync(file2)) {
            const fp1 = await audioDuplicates.generateFingerprint(file1);
            const fp2 = await audioDuplicates.generateFingerprint(file2);

            const comparison = await audioDuplicates.compareFingerprints(fp1, fp2);

            console.log(`   Comparing: ${file1} vs ${file2}`);
            console.log(`   Similarity: ${(comparison.similarityScore * 100).toFixed(2)}%`);
            console.log(`   Bit Error Rate: ${(comparison.bitErrorRate * 100).toFixed(2)}%`);
            console.log(`   Are Duplicates: ${comparison.isDuplicate ? 'YES' : 'NO'}`);
        } else {
            console.log(`   Skipped: Test files not found`);
        }
        console.log();

        // Example 3: Scan directory for duplicates
        console.log('3. Scanning directory for duplicates...');
        const musicDir = './music'; // Replace with actual directory

        if (require('fs').existsSync(musicDir)) {
            const duplicates = await audioDuplicates.scanDirectoryForDuplicates(musicDir, {
                threshold: 0.85,
                onProgress: (progress) => {
                    const percent = ((progress.current / progress.total) * 100).toFixed(1);
                    console.log(`   Progress: ${percent}% (${progress.current}/${progress.total}) - ${path.basename(progress.file)}`);
                }
            });

            console.log(`\n   Found ${duplicates.length} duplicate group(s):`);
            duplicates.forEach((group, index) => {
                console.log(`\n   Group ${index + 1} (${(group.avgSimilarity * 100).toFixed(1)}% similarity):`);
                group.filePaths.forEach(filePath => {
                    console.log(`     - ${filePath}`);
                });
            });
        } else {
            console.log(`   Skipped: Directory ${musicDir} not found`);
        }
        console.log();

        // Example 4: Using the index directly for batch processing
        console.log('4. Using index for batch processing...');

        await audioDuplicates.initializeIndex();
        await audioDuplicates.setSimilarityThreshold(0.9);

        // Add some files to the index (replace with actual files)
        const testFiles = ['song1.mp3', 'song2.mp3', 'song3.mp3'];
        const existingFiles = testFiles.filter(file => require('fs').existsSync(file));

        if (existingFiles.length > 0) {
            for (const file of existingFiles) {
                try {
                    const fileId = await audioDuplicates.addFileToIndex(file);
                    console.log(`   Added to index: ${file} (ID: ${fileId})`);
                } catch (error) {
                    console.log(`   Failed to add: ${file} - ${error.message}`);
                }
            }

            const indexStats = await audioDuplicates.getIndexStats();
            console.log(`   Index contains ${indexStats.fileCount} files`);

            const duplicatesFromIndex = await audioDuplicates.findAllDuplicates();
            console.log(`   Found ${duplicatesFromIndex.length} duplicate groups from index`);

            await audioDuplicates.clearIndex();
        } else {
            console.log('   No test files found for index example');
        }

        console.log('\n✅ Examples completed!');
        console.log('\n📝 Note: To run these examples with real audio files:');
        console.log('   1. Place some audio files in the current directory');
        console.log('   2. Update the file paths in this example');
        console.log('   3. Make sure Chromaprint and libsndfile are installed');
        console.log('   4. Build the addon: npm run build');

    } catch (error) {
        console.error('\n❌ Error running examples:', error.message);
        console.error('\nMake sure to:');
        console.error('1. Install system dependencies (chromaprint, libsndfile)');
        console.error('2. Build the addon: npm run build');
        console.error('3. Have audio files available for testing');
    }
}

// Run the examples
if (require.main === module) {
    basicUsageExample();
}

module.exports = { basicUsageExample };