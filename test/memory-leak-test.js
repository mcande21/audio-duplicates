const fs = require('fs');
const path = require('path');
const MemoryMonitor = require('../lib/memory_monitor');

/**
 * Comprehensive memory leak detection test
 * Tests the audio duplicates system for memory leaks and validates optimization
 */

// Enable garbage collection for testing
const gcAvailable = typeof global.gc === 'function';
if (!gcAvailable) {
    console.warn('⚠️  GC not available. Run with: node --expose-gc test/memory-leak-test.js');
}

function forceGC() {
    if (gcAvailable) {
        global.gc();
        // Multiple GC cycles for thorough cleanup
        setImmediate(() => global.gc());
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
        rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100
    };
}

async function testMemoryLeaks() {
    console.log('🧪 Starting Memory Leak Detection Tests\n');

    let audioDuplicates;
    try {
        audioDuplicates = require('../lib/index.js');
    } catch (error) {
        console.error('❌ Failed to load audio-duplicates library. Build first with: npm run build');
        console.error('Error:', error.message);
        process.exit(1);
    }

    const iterations = 20;
    const memoryGrowthThreshold = 5; // MB
    const testDirectories = ['test_extensions/', 'test_progress/'];

    // Find test directories that exist
    const availableTestDirs = testDirectories.filter(dir => {
        try {
            return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
        } catch {
            return false;
        }
    });

    if (availableTestDirs.length === 0) {
        console.log('⚠️  No test directories found. Creating minimal test...');
        return testMinimalMemoryOperations();
    }

    console.log(`📁 Testing with directories: ${availableTestDirs.join(', ')}`);
    console.log(`🔄 Running ${iterations} iterations\n`);

    // Memory monitor for the test
    const monitor = new MemoryMonitor({
        memoryLimitMB: 128,
        checkIntervalMs: 500,
        enabled: true
    });

    const memorySnapshots = [];
    let testPassed = true;

    // Initial memory baseline
    forceGC();
    await sleep(100);
    const initialMemory = getMemoryUsage();
    memorySnapshots.push({ iteration: 0, ...initialMemory });

    console.log(`📊 Initial Memory: ${initialMemory.heapUsed}MB heap, ${initialMemory.external}MB external`);

    monitor.start();

    try {
        // Test iterations
        for (let i = 1; i <= iterations; i++) {
            console.log(`🔄 Iteration ${i}/${iterations}`);

            // Initialize index
            await audioDuplicates.initializeIndex();

            // Process test directories
            for (const testDir of availableTestDirs) {
                try {
                    await audioDuplicates.scanDirectoryForDuplicates(testDir, {
                        threshold: 0.85,
                        extensions: ['.wav', '.mp3', '.flac']
                    });
                } catch (error) {
                    console.warn(`⚠️  Scan error for ${testDir}:`, error.message);
                }
            }

            // Clear index
            await audioDuplicates.clearIndex();

            // Force cleanup
            forceGC();
            await sleep(50); // Allow cleanup to complete

            // Take memory snapshot
            const currentMemory = getMemoryUsage();
            memorySnapshots.push({ iteration: i, ...currentMemory });

            const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
            const externalGrowth = currentMemory.external - initialMemory.external;

            console.log(`   Memory: ${currentMemory.heapUsed}MB heap (+${memoryGrowth.toFixed(2)}MB), ${currentMemory.external}MB external (+${externalGrowth.toFixed(2)}MB)`);

            // Check for concerning memory growth
            if (i > 5 && (memoryGrowth > memoryGrowthThreshold || externalGrowth > memoryGrowthThreshold)) {
                console.warn(`⚠️  Memory growth detected: heap +${memoryGrowth.toFixed(2)}MB, external +${externalGrowth.toFixed(2)}MB`);
            }
        }

        // Analysis
        console.log('\n📈 Memory Growth Analysis:');

        const finalMemory = memorySnapshots[memorySnapshots.length - 1];
        const totalHeapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
        const totalExternalGrowth = finalMemory.external - initialMemory.external;

        console.log(`   Initial Memory: ${initialMemory.heapUsed}MB heap, ${initialMemory.external}MB external`);
        console.log(`   Final Memory: ${finalMemory.heapUsed}MB heap, ${finalMemory.external}MB external`);
        console.log(`   Total Growth: ${totalHeapGrowth.toFixed(2)}MB heap, ${totalExternalGrowth.toFixed(2)}MB external`);

        // Linear regression to detect memory leaks
        const heapGrowthTrend = calculateMemoryTrend(memorySnapshots, 'heapUsed');
        const externalGrowthTrend = calculateMemoryTrend(memorySnapshots, 'external');

        console.log(`   Heap Growth Trend: ${heapGrowthTrend.toFixed(4)} MB/iteration`);
        console.log(`   External Growth Trend: ${externalGrowthTrend.toFixed(4)} MB/iteration`);

        // Determine test result
        const heapLeakThreshold = 0.1; // MB per iteration
        const externalLeakThreshold = 0.1; // MB per iteration

        if (heapGrowthTrend > heapLeakThreshold) {
            console.error(`❌ HEAP MEMORY LEAK DETECTED: ${heapGrowthTrend.toFixed(4)} MB/iteration (threshold: ${heapLeakThreshold})`);
            testPassed = false;
        }

        if (externalGrowthTrend > externalLeakThreshold) {
            console.error(`❌ EXTERNAL MEMORY LEAK DETECTED: ${externalGrowthTrend.toFixed(4)} MB/iteration (threshold: ${externalLeakThreshold})`);
            testPassed = false;
        }

        if (totalHeapGrowth > memoryGrowthThreshold) {
            console.error(`❌ EXCESSIVE HEAP MEMORY GROWTH: ${totalHeapGrowth.toFixed(2)}MB (threshold: ${memoryGrowthThreshold}MB)`);
            testPassed = false;
        }

    } finally {
        monitor.stop();
    }

    // Final cleanup test
    console.log('\n🧽 Testing final cleanup...');
    forceGC();
    await sleep(100);

    const cleanupMemory = getMemoryUsage();
    const cleanupGrowth = cleanupMemory.heapUsed - initialMemory.heapUsed;

    console.log(`   After cleanup: ${cleanupMemory.heapUsed}MB heap (+${cleanupGrowth.toFixed(2)}MB from initial)`);

    // Print results
    if (testPassed) {
        console.log('\n✅ MEMORY LEAK TEST PASSED');
        console.log('   No significant memory leaks detected');
        console.log('   Memory growth is within acceptable limits');
    } else {
        console.log('\n❌ MEMORY LEAK TEST FAILED');
        console.log('   Significant memory growth or leaks detected');
        console.log('   Review the implementation for memory management issues');
    }

    // Monitor stats
    const monitorStats = monitor.getStats();
    console.log('\n📊 Monitor Stats:');
    console.log(`   GC Forced: ${monitorStats.actions.gcForced} times`);
    console.log(`   Memory Warnings: ${monitorStats.actions.memoryWarnings}`);
    console.log(`   Peak Memory: ${(monitorStats.peaks.heapUsedMB + monitorStats.peaks.externalMB).toFixed(2)}MB`);

    return testPassed;
}

async function testMinimalMemoryOperations() {
    console.log('🧪 Running minimal memory operations test...');

    const audioDuplicates = require('../lib/index.js');
    const iterations = 10;

    forceGC();
    const initialMemory = getMemoryUsage();

    for (let i = 0; i < iterations; i++) {
        await audioDuplicates.initializeIndex();
        await audioDuplicates.clearIndex();
    }

    forceGC();
    await sleep(50);
    const finalMemory = getMemoryUsage();

    const growth = finalMemory.heapUsed - initialMemory.heapUsed;
    console.log(`   Memory growth: ${growth.toFixed(2)}MB`);

    if (growth < 1.0) {
        console.log('✅ Minimal operations test passed');
        return true;
    } else {
        console.log('❌ Minimal operations test failed - excessive growth');
        return false;
    }
}

function calculateMemoryTrend(snapshots, field) {
    const n = snapshots.length;
    if (n < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    snapshots.forEach((snapshot, i) => {
        const x = snapshot.iteration;
        const y = snapshot[field];

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    });

    // Linear regression slope (memory growth per iteration)
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
}

// Run the test
if (require.main === module) {
    testMemoryLeaks()
        .then(passed => {
            process.exit(passed ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test crashed:', error);
            process.exit(1);
        });
}

module.exports = { testMemoryLeaks };