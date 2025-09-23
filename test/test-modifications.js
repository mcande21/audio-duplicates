#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Audio Modification Test Suite
 *
 * Tests duplicate detection robustness against various audio modifications:
 * - Silence added at start, end, or middle
 * - Volume changes (increase/decrease)
 * - Sample rate variations
 * - Speed changes
 * - Bit depth modifications
 * - Compression artifacts
 */

class ModificationTestSuite {
    constructor(testScenariosDir = 'test_scenarios') {
        this.testScenariosDir = testScenariosDir;
        this.results = [];
        this.thresholds = [0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60];

        this.testCategories = [
            'silence_start',
            'silence_end',
            'silence_middle',
            'volume_increase',
            'volume_decrease',
            'sample_rate',
            'speed_faster',
            'speed_slower'
        ];
    }

    /**
     * Get all original files for baseline comparison
     */
    getOriginalFiles() {
        const originalDir = path.join(this.testScenariosDir, 'original');
        if (!fs.existsSync(originalDir)) {
            throw new Error(`Original files directory not found: ${originalDir}`);
        }

        return fs.readdirSync(originalDir)
            .filter(file => file.endsWith('.wav'))
            .map(file => ({
                name: path.basename(file, '.wav'),
                path: path.join(originalDir, file)
            }));
    }

    /**
     * Get modified files for a specific category
     */
    getModifiedFiles(category) {
        const categoryDir = path.join(this.testScenariosDir, category);
        if (!fs.existsSync(categoryDir)) {
            console.warn(`Category directory not found: ${categoryDir}`);
            return [];
        }

        return fs.readdirSync(categoryDir)
            .filter(file => file.endsWith('.wav'))
            .map(file => {
                const baseName = this.extractBaseName(file);
                const modification = this.extractModification(file);
                return {
                    name: file,
                    baseName,
                    modification,
                    path: path.join(categoryDir, file)
                };
            });
    }

    /**
     * Extract base filename from modified filename
     * Example: "106814_start0.5s.wav" -> "106814"
     */
    extractBaseName(filename) {
        return filename.split('_')[0];
    }

    /**
     * Extract modification details from filename
     * Example: "106814_start0.5s.wav" -> "start0.5s"
     */
    extractModification(filename) {
        const parts = filename.split('_');
        if (parts.length > 1) {
            return parts.slice(1).join('_').replace('.wav', '');
        }
        return 'unknown';
    }

    /**
     * Test duplicate detection between original and modified files
     */
    async testCategory(category, threshold) {
        console.log(`\n🔍 Testing ${category} at threshold ${threshold}`);

        try {
            // Initialize index with current threshold
            await audioDuplicates.initializeIndex();
            await audioDuplicates.setSimilarityThreshold(threshold);

            const originalFiles = this.getOriginalFiles();
            const modifiedFiles = this.getModifiedFiles(category);

            if (modifiedFiles.length === 0) {
                console.log(`   ⚠️  No modified files found for ${category}`);
                return [];
            }

            // Add all original files to index
            for (const originalFile of originalFiles) {
                await audioDuplicates.addFileToIndex(originalFile.path);
            }

            // Add all modified files to index
            for (const modifiedFile of modifiedFiles) {
                await audioDuplicates.addFileToIndex(modifiedFile.path);
            }

            // Find duplicates
            const duplicateGroups = await audioDuplicates.findAllDuplicates();

            // Analyze results
            const categoryResults = this.analyzeCategoryResults(
                category,
                threshold,
                originalFiles,
                modifiedFiles,
                duplicateGroups
            );

            console.log(`   ✅ Found ${duplicateGroups.length} duplicate groups`);
            console.log(`   📊 Detection rate: ${categoryResults.detectionRate.toFixed(2)}%`);

            return categoryResults;

        } catch (error) {
            console.error(`   ❌ Error testing ${category}:`, error.message);
            return {
                category,
                threshold,
                error: error.message,
                detectionRate: 0,
                totalPairs: 0,
                detectedPairs: 0
            };
        }
    }

    /**
     * Analyze results for a specific category
     */
    analyzeCategoryResults(category, threshold, originalFiles, modifiedFiles, duplicateGroups) {
        // Create mapping of expected pairs (original -> modified with same base name)
        const expectedPairs = new Map();

        for (const originalFile of originalFiles) {
            const matchingModified = modifiedFiles.filter(
                modFile => modFile.baseName === originalFile.name
            );
            expectedPairs.set(originalFile.name, matchingModified);
        }

        // Count how many expected pairs were detected
        let detectedPairs = 0;
        let totalPairs = 0;
        const detectedMatches = [];
        const missedMatches = [];

        for (const [originalName, modifiedFiles] of expectedPairs) {
            for (const modifiedFile of modifiedFiles) {
                totalPairs++;

                // Check if this pair was detected in duplicate groups
                const wasDetected = this.isPairDetected(originalName, modifiedFile, duplicateGroups);

                if (wasDetected) {
                    detectedPairs++;
                    detectedMatches.push({
                        original: originalName,
                        modified: modifiedFile.modification,
                        similarity: wasDetected.similarity
                    });
                } else {
                    missedMatches.push({
                        original: originalName,
                        modified: modifiedFile.modification
                    });
                }
            }
        }

        const detectionRate = totalPairs > 0 ? (detectedPairs / totalPairs) * 100 : 0;

        return {
            category,
            threshold,
            detectionRate,
            totalPairs,
            detectedPairs,
            detectedMatches,
            missedMatches,
            duplicateGroups: duplicateGroups.length
        };
    }

    /**
     * Check if a specific original-modified pair was detected in duplicate groups
     */
    isPairDetected(originalName, modifiedFile, duplicateGroups) {
        for (const group of duplicateGroups) {
            const filePaths = group.files || [];

            // Check if group contains both original and modified file
            const hasOriginal = filePaths.some(filePath =>
                path.basename(filePath, '.wav') === originalName
            );

            const hasModified = filePaths.some(filePath =>
                path.basename(filePath).includes(modifiedFile.baseName) &&
                path.basename(filePath).includes(modifiedFile.modification.split('.')[0])
            );

            if (hasOriginal && hasModified) {
                return {
                    similarity: group.similarity || 1.0,
                    group: group
                };
            }
        }
        return false;
    }

    /**
     * Run comprehensive test across all categories and thresholds
     */
    async runComprehensiveTest() {
        console.log('🎵 Comprehensive Audio Modification Test Suite\n');
        console.log(`📁 Test scenarios directory: ${this.testScenariosDir}`);
        console.log(`🎯 Testing thresholds: ${this.thresholds.join(', ')}`);
        console.log(`📋 Testing categories: ${this.testCategories.join(', ')}\n`);

        // Verify test scenarios exist
        if (!fs.existsSync(this.testScenariosDir)) {
            throw new Error(`Test scenarios directory not found: ${this.testScenariosDir}`);
        }

        const allResults = [];

        // Test each category at each threshold
        for (const category of this.testCategories) {
            for (const threshold of this.thresholds) {
                const result = await this.testCategory(category, threshold);
                allResults.push(result);
            }
        }

        this.results = allResults;
        this.generateSummaryReport();
        this.generateCSVReport();

        return allResults;
    }

    /**
     * Generate summary report
     */
    generateSummaryReport() {
        console.log('\n📊 COMPREHENSIVE TEST RESULTS SUMMARY\n');
        console.log('=' .repeat(80));

        // Group results by category
        const resultsByCategory = {};
        for (const result of this.results) {
            if (!resultsByCategory[result.category]) {
                resultsByCategory[result.category] = [];
            }
            resultsByCategory[result.category].push(result);
        }

        // Print category summaries
        for (const [category, categoryResults] of Object.entries(resultsByCategory)) {
            console.log(`\n📂 ${category.toUpperCase()}`);
            console.log('-'.repeat(40));

            // Find best threshold for this category
            const validResults = categoryResults.filter(r => !r.error);
            if (validResults.length === 0) {
                console.log('   ❌ No valid results');
                continue;
            }

            const bestResult = validResults.reduce((best, current) =>
                current.detectionRate > best.detectionRate ? current : best
            );

            console.log(`   Best threshold: ${bestResult.threshold} (${bestResult.detectionRate.toFixed(1)}% detection)`);
            console.log(`   Total test pairs: ${bestResult.totalPairs}`);

            // Show detection rates across thresholds
            console.log('   Detection rates by threshold:');
            for (const result of validResults) {
                const rate = result.detectionRate.toFixed(1).padStart(5);
                const bar = '█'.repeat(Math.floor(result.detectionRate / 5));
                console.log(`     ${result.threshold}: ${rate}% ${bar}`);
            }
        }

        // Overall statistics
        console.log('\n🎯 OVERALL STATISTICS');
        console.log('-'.repeat(40));

        const validResults = this.results.filter(r => !r.error);
        if (validResults.length > 0) {
            const avgDetectionRate = validResults.reduce((sum, r) => sum + r.detectionRate, 0) / validResults.length;
            const totalTests = validResults.length;
            const successfulTests = validResults.filter(r => r.detectionRate > 0).length;

            console.log(`   Average detection rate: ${avgDetectionRate.toFixed(2)}%`);
            console.log(`   Total tests performed: ${totalTests}`);
            console.log(`   Tests with detections: ${successfulTests} (${(successfulTests/totalTests*100).toFixed(1)}%)`);
        }

        console.log('\n✅ Test suite completed!');
    }

    /**
     * Generate CSV report for further analysis
     */
    generateCSVReport() {
        const csvPath = path.join(this.testScenariosDir, 'test_results.csv');

        const headers = [
            'Category',
            'Threshold',
            'Detection_Rate_%',
            'Total_Pairs',
            'Detected_Pairs',
            'Missed_Pairs',
            'Duplicate_Groups',
            'Error'
        ];

        const rows = this.results.map(result => [
            result.category,
            result.threshold,
            result.detectionRate.toFixed(2),
            result.totalPairs,
            result.detectedPairs,
            result.totalPairs - result.detectedPairs,
            result.duplicateGroups || 0,
            result.error || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        fs.writeFileSync(csvPath, csvContent);
        console.log(`\n📄 Detailed results saved to: ${csvPath}`);
    }

    /**
     * Test specific modification type and threshold
     */
    async testSpecific(category, threshold) {
        console.log(`🎵 Testing ${category} at threshold ${threshold}`);
        const result = await this.testCategory(category, threshold);

        console.log('\n📊 DETAILED RESULTS:');
        console.log(`Detection rate: ${result.detectionRate.toFixed(2)}%`);
        console.log(`Total pairs: ${result.totalPairs}`);
        console.log(`Detected pairs: ${result.detectedPairs}`);

        if (result.detectedMatches.length > 0) {
            console.log('\n✅ Detected matches:');
            for (const match of result.detectedMatches) {
                console.log(`   ${match.original} ↔ ${match.modified} (${(match.similarity * 100).toFixed(1)}%)`);
            }
        }

        if (result.missedMatches.length > 0) {
            console.log('\n❌ Missed matches:');
            for (const miss of result.missedMatches) {
                console.log(`   ${miss.original} ↔ ${miss.modified}`);
            }
        }

        return result;
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Run comprehensive test
        const testSuite = new ModificationTestSuite();
        testSuite.runComprehensiveTest().catch(error => {
            console.error('\n💥 Test suite failed:', error.message);
            process.exit(1);
        });
    } else if (args.length === 2) {
        // Test specific category and threshold
        const [category, threshold] = args;
        const testSuite = new ModificationTestSuite();
        testSuite.testSpecific(category, parseFloat(threshold)).catch(error => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
    } else {
        console.log('Usage:');
        console.log('  node test-modifications.js                    # Run comprehensive test');
        console.log('  node test-modifications.js <category> <threshold>  # Test specific case');
        console.log('');
        console.log('Categories: silence_start, silence_end, volume_increase, volume_decrease, sample_rate, speed_faster, speed_slower');
        console.log('Threshold: 0.0 to 1.0 (e.g., 0.85)');
        process.exit(1);
    }
}

module.exports = ModificationTestSuite;