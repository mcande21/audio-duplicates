#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Audio Modification Test Results Analyzer
 *
 * Analyzes test results from the modification test suite and generates
 * comprehensive reports, charts, and insights about duplicate detection
 * robustness across different modification types.
 */

class ResultsAnalyzer {
    constructor(csvPath = 'test_scenarios/test_results.csv') {
        this.csvPath = csvPath;
        this.results = [];
        this.categories = new Set();
        this.thresholds = new Set();
    }

    /**
     * Load and parse CSV results
     */
    loadResults() {
        if (!fs.existsSync(this.csvPath)) {
            throw new Error(`Results file not found: ${this.csvPath}`);
        }

        const csvContent = fs.readFileSync(this.csvPath, 'utf8');
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const result = {};

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                let value = values[j];

                // Parse numeric values
                if (header === 'Threshold' || header === 'Detection_Rate_%') {
                    value = parseFloat(value);
                } else if (header.includes('Pairs') || header.includes('Groups')) {
                    value = parseInt(value) || 0;
                }

                result[header] = value;
            }

            this.results.push(result);
            this.categories.add(result.Category);
            this.thresholds.add(result.Threshold);
        }

        console.log(`📊 Loaded ${this.results.length} test results`);
        console.log(`📂 Categories: ${Array.from(this.categories).join(', ')}`);
        console.log(`🎯 Thresholds: ${Array.from(this.thresholds).sort().join(', ')}`);
    }

    /**
     * Generate comprehensive analysis report
     */
    generateAnalysisReport() {
        console.log('\n' + '='.repeat(80));
        console.log('🎵 COMPREHENSIVE AUDIO MODIFICATION ANALYSIS REPORT');
        console.log('='.repeat(80));

        this.analyzeByCategory();
        this.analyzeByThreshold();
        this.findOptimalThresholds();
        this.generateInsights();
        this.generateRecommendations();
    }

    /**
     * Analyze results by modification category
     */
    analyzeByCategory() {
        console.log('\n📂 ANALYSIS BY MODIFICATION CATEGORY\n');

        const sortedCategories = Array.from(this.categories).sort();

        for (const category of sortedCategories) {
            const categoryResults = this.results.filter(r => r.Category === category);

            if (categoryResults.length === 0) continue;

            console.log(`\n🔍 ${category.toUpperCase()}`);
            console.log('-'.repeat(50));

            // Calculate statistics
            const detectionRates = categoryResults
                .filter(r => !r.Error)
                .map(r => r['Detection_Rate_%']);

            if (detectionRates.length === 0) {
                console.log('   ❌ No valid results');
                continue;
            }

            const maxDetection = Math.max(...detectionRates);
            const minDetection = Math.min(...detectionRates);
            const avgDetection = detectionRates.reduce((a, b) => a + b, 0) / detectionRates.length;

            console.log(`   Max detection rate: ${maxDetection.toFixed(1)}%`);
            console.log(`   Min detection rate: ${minDetection.toFixed(1)}%`);
            console.log(`   Avg detection rate: ${avgDetection.toFixed(1)}%`);

            // Find best threshold
            const bestResult = categoryResults.reduce((best, current) =>
                (current['Detection_Rate_%'] || 0) > (best['Detection_Rate_%'] || 0) ? current : best
            );

            console.log(`   Best threshold: ${bestResult.Threshold} (${bestResult['Detection_Rate_%'].toFixed(1)}%)`);

            // Show detection by threshold
            console.log('   Detection rates by threshold:');
            const sortedThresholds = Array.from(this.thresholds).sort((a, b) => b - a);

            for (const threshold of sortedThresholds) {
                const result = categoryResults.find(r => r.Threshold === threshold);
                if (result && !result.Error) {
                    const rate = result['Detection_Rate_%'].toFixed(1).padStart(5);
                    const bar = this.generateProgressBar(result['Detection_Rate_%'], 100, 20);
                    console.log(`     ${threshold}: ${rate}% ${bar}`);
                }
            }

            // Robustness classification
            const robustness = this.classifyRobustness(maxDetection);
            console.log(`   🏷️  Robustness: ${robustness}`);
        }
    }

    /**
     * Analyze results by threshold value
     */
    analyzeByThreshold() {
        console.log('\n🎯 ANALYSIS BY SIMILARITY THRESHOLD\n');

        const sortedThresholds = Array.from(this.thresholds).sort((a, b) => b - a);

        for (const threshold of sortedThresholds) {
            const thresholdResults = this.results.filter(r => r.Threshold === threshold);

            console.log(`\n🎯 THRESHOLD ${threshold}`);
            console.log('-'.repeat(30));

            const validResults = thresholdResults.filter(r => !r.Error);
            if (validResults.length === 0) {
                console.log('   ❌ No valid results');
                continue;
            }

            const totalTests = validResults.length;
            const successfulTests = validResults.filter(r => r['Detection_Rate_%'] > 0).length;
            const avgDetection = validResults.reduce((sum, r) => sum + r['Detection_Rate_%'], 0) / totalTests;

            console.log(`   Total tests: ${totalTests}`);
            console.log(`   Successful tests: ${successfulTests} (${(successfulTests/totalTests*100).toFixed(1)}%)`);
            console.log(`   Average detection: ${avgDetection.toFixed(1)}%`);

            // Show best and worst categories
            const bestCategory = validResults.reduce((best, current) =>
                current['Detection_Rate_%'] > best['Detection_Rate_%'] ? current : best
            );
            const worstCategory = validResults.reduce((worst, current) =>
                current['Detection_Rate_%'] < worst['Detection_Rate_%'] ? current : worst
            );

            console.log(`   Best category: ${bestCategory.Category} (${bestCategory['Detection_Rate_%'].toFixed(1)}%)`);
            console.log(`   Worst category: ${worstCategory.Category} (${worstCategory['Detection_Rate_%'].toFixed(1)}%)`);
        }
    }

    /**
     * Find optimal thresholds for each category
     */
    findOptimalThresholds() {
        console.log('\n🏆 OPTIMAL THRESHOLD RECOMMENDATIONS\n');

        const sortedCategories = Array.from(this.categories).sort();

        console.log('Category'.padEnd(20) + 'Optimal Threshold'.padEnd(18) + 'Detection Rate');
        console.log('-'.repeat(58));

        for (const category of sortedCategories) {
            const categoryResults = this.results
                .filter(r => r.Category === category && !r.Error)
                .sort((a, b) => b['Detection_Rate_%'] - a['Detection_Rate_%']);

            if (categoryResults.length === 0) {
                console.log(`${category.padEnd(20)}${'N/A'.padEnd(18)}N/A`);
                continue;
            }

            const bestResult = categoryResults[0];
            const rate = `${bestResult['Detection_Rate_%'].toFixed(1)}%`;

            console.log(`${category.padEnd(20)}${bestResult.Threshold.toString().padEnd(18)}${rate}`);
        }
    }

    /**
     * Generate insights about Chromaprint behavior
     */
    generateInsights() {
        console.log('\n💡 KEY INSIGHTS\n');

        const insights = [];

        // Overall performance insight
        const allValidResults = this.results.filter(r => !r.Error);
        const overallAvg = allValidResults.reduce((sum, r) => sum + r['Detection_Rate_%'], 0) / allValidResults.length;

        if (overallAvg < 10) {
            insights.push('🔴 Chromaprint fingerprinting is highly sensitive to audio modifications');
        } else if (overallAvg < 50) {
            insights.push('🟡 Chromaprint shows moderate sensitivity to audio modifications');
        } else {
            insights.push('🟢 Chromaprint is relatively robust to audio modifications');
        }

        // Category-specific insights
        const categoryAvgs = {};
        for (const category of this.categories) {
            const categoryResults = allValidResults.filter(r => r.Category === category);
            if (categoryResults.length > 0) {
                categoryAvgs[category] = categoryResults.reduce((sum, r) => sum + r['Detection_Rate_%'], 0) / categoryResults.length;
            }
        }

        const sortedByPerformance = Object.entries(categoryAvgs)
            .sort((a, b) => b[1] - a[1]);

        if (sortedByPerformance.length > 0) {
            const [bestCategory, bestAvg] = sortedByPerformance[0];
            const [worstCategory, worstAvg] = sortedByPerformance[sortedByPerformance.length - 1];

            insights.push(`📈 Most robust to: ${bestCategory} (${bestAvg.toFixed(1)}% avg detection)`);
            insights.push(`📉 Least robust to: ${worstCategory} (${worstAvg.toFixed(1)}% avg detection)`);
        }

        // Threshold insights
        const thresholdPerformance = {};
        for (const threshold of this.thresholds) {
            const thresholdResults = allValidResults.filter(r => r.Threshold === threshold);
            if (thresholdResults.length > 0) {
                const successRate = thresholdResults.filter(r => r['Detection_Rate_%'] > 0).length / thresholdResults.length;
                thresholdPerformance[threshold] = successRate;
            }
        }

        const bestThreshold = Object.entries(thresholdPerformance)
            .sort((a, b) => b[1] - a[1])[0];

        if (bestThreshold) {
            insights.push(`🎯 Most effective threshold: ${bestThreshold[0]} (${(bestThreshold[1] * 100).toFixed(1)}% success rate)`);
        }

        // Print insights
        for (let i = 0; i < insights.length; i++) {
            console.log(`${i + 1}. ${insights[i]}`);
        }
    }

    /**
     * Generate recommendations for using the duplicate detection system
     */
    generateRecommendations() {
        console.log('\n🎯 RECOMMENDATIONS FOR DUPLICATE DETECTION\n');

        const recommendations = [];

        // Analyze which modifications break detection
        const robustCategories = [];
        const sensitiveCategories = [];

        for (const category of this.categories) {
            const categoryResults = this.results.filter(r => r.Category === category && !r.Error);
            if (categoryResults.length === 0) continue;

            const maxDetection = Math.max(...categoryResults.map(r => r['Detection_Rate_%']));

            if (maxDetection > 70) {
                robustCategories.push(category);
            } else if (maxDetection < 10) {
                sensitiveCategories.push(category);
            }
        }

        if (robustCategories.length > 0) {
            recommendations.push(`✅ System can reliably detect duplicates despite: ${robustCategories.join(', ')}`);
        }

        if (sensitiveCategories.length > 0) {
            recommendations.push(`⚠️  System struggles with: ${sensitiveCategories.join(', ')}`);
            recommendations.push(`💡 Consider preprocessing to normalize these variations before duplicate detection`);
        }

        // Threshold recommendations
        const allValidResults = this.results.filter(r => !r.Error);
        const thresholdStats = {};

        for (const threshold of this.thresholds) {
            const thresholdResults = allValidResults.filter(r => r.Threshold === threshold);
            const avgDetection = thresholdResults.reduce((sum, r) => sum + r['Detection_Rate_%'], 0) / thresholdResults.length;
            thresholdStats[threshold] = avgDetection;
        }

        const bestThresholdForAvg = Object.entries(thresholdStats)
            .sort((a, b) => b[1] - a[1])[0];

        if (bestThresholdForAvg) {
            recommendations.push(`🎯 For general use, set threshold to ${bestThresholdForAvg[0]} for best overall performance`);
        }

        recommendations.push(`🔧 Consider implementing audio normalization before fingerprinting`);
        recommendations.push(`📊 Monitor detection rates in production to fine-tune thresholds`);

        // Print recommendations
        for (let i = 0; i < recommendations.length; i++) {
            console.log(`${i + 1}. ${recommendations[i]}`);
        }
    }

    /**
     * Generate a simple progress bar
     */
    generateProgressBar(value, max, width) {
        const percentage = Math.min(value / max, 1);
        const filled = Math.floor(percentage * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * Classify robustness based on detection rate
     */
    classifyRobustness(maxDetectionRate) {
        if (maxDetectionRate >= 90) return '🟢 Excellent';
        if (maxDetectionRate >= 70) return '🟡 Good';
        if (maxDetectionRate >= 50) return '🟠 Moderate';
        if (maxDetectionRate >= 20) return '🔴 Poor';
        return '⚫ Very Poor';
    }

    /**
     * Export results to JSON for further analysis
     */
    exportToJSON() {
        const jsonPath = this.csvPath.replace('.csv', '_analysis.json');
        const analysisData = {
            summary: {
                totalTests: this.results.length,
                categories: Array.from(this.categories),
                thresholds: Array.from(this.thresholds).sort()
            },
            results: this.results,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(jsonPath, JSON.stringify(analysisData, null, 2));
        console.log(`\n💾 Analysis data exported to: ${jsonPath}`);
    }

    /**
     * Run complete analysis
     */
    analyze() {
        console.log('🎵 Audio Modification Test Results Analyzer\n');

        try {
            this.loadResults();
            this.generateAnalysisReport();
            this.exportToJSON();

            console.log('\n✅ Analysis completed successfully!');

        } catch (error) {
            console.error('\n❌ Analysis failed:', error.message);
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const csvPath = args[0] || 'test_scenarios/test_results.csv';

    const analyzer = new ResultsAnalyzer(csvPath);
    analyzer.analyze().catch(error => {
        console.error('\n💥 Analysis failed:', error.message);
        process.exit(1);
    });
}

module.exports = ResultsAnalyzer;