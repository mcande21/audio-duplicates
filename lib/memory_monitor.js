const fs = require('fs');
const path = require('path');

/**
 * Memory monitoring and management for Node.js side
 * Works with the C++ AudioMemoryPool to provide complete memory oversight
 */
class MemoryMonitor {
  constructor(options = {}) {
    this.memoryLimitMB = options.memoryLimitMB || 256;
    this.checkIntervalMs = options.checkIntervalMs || 1000;
    this.gcThreshold = options.gcThreshold || 0.8;
    this.enabled = options.enabled !== false;

    this.stats = {
      peakHeapUsed: 0,
      peakExternal: 0,
      gcForced: 0,
      cleanupsCalled: 0,
      memoryWarnings: 0
    };

    this.intervalId = null;
    this.memoryWarningCallbacks = [];

    // Try to enable GC exposure
    this.gcAvailable = typeof global.gc === 'function';
    if (!this.gcAvailable && this.enabled) {
      console.warn('Memory Monitor: GC not exposed. Run with --expose-gc for better memory management');
    }
  }

  start() {
    if (!this.enabled || this.intervalId) return;

    console.log(`🧠 Memory Monitor: Started with ${this.memoryLimitMB}MB limit`);

    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkIntervalMs);

    // Set up process exit cleanup
    process.on('exit', () => this.onProcessExit());
    process.on('SIGINT', () => this.onProcessExit());
    process.on('SIGTERM', () => this.onProcessExit());
    process.on('beforeExit', () => this.onProcessExit());
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🧠 Memory Monitor: Stopped');
    }
  }

  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const externalMB = usage.external / 1024 / 1024;
    const totalMB = heapUsedMB + externalMB;

    // Update peak stats
    this.stats.peakHeapUsed = Math.max(this.stats.peakHeapUsed, usage.heapUsed);
    this.stats.peakExternal = Math.max(this.stats.peakExternal, usage.external);

    // Check if we're approaching memory limit
    const memoryRatio = totalMB / this.memoryLimitMB;

    if (memoryRatio > this.gcThreshold) {
      this.handleHighMemoryUsage(totalMB, memoryRatio);
    }

    // Emit memory info for debugging
    if (process.env.DEBUG_MEMORY) {
      console.log(`Memory: ${totalMB.toFixed(1)}MB (${(memoryRatio * 100).toFixed(1)}% of limit)`);
    }
  }

  handleHighMemoryUsage(totalMB, ratio) {
    this.stats.memoryWarnings++;

    console.warn(`⚠️  High memory usage: ${totalMB.toFixed(1)}MB (${(ratio * 100).toFixed(1)}% of ${this.memoryLimitMB}MB limit)`);

    // Notify callbacks
    this.memoryWarningCallbacks.forEach(callback => {
      try {
        callback(totalMB, ratio);
      } catch (error) {
        console.error('Memory warning callback error:', error);
      }
    });

    // Force garbage collection if available
    if (this.gcAvailable) {
      global.gc();
      this.stats.gcForced++;
      console.log('🗑️  Forced garbage collection');
    }

    // If still over limit after GC, this is critical
    const usageAfterGC = process.memoryUsage();
    const totalAfterGC = (usageAfterGC.heapUsed + usageAfterGC.external) / 1024 / 1024;

    if (totalAfterGC > this.memoryLimitMB) {
      console.error(`🚨 CRITICAL: Memory usage ${totalAfterGC.toFixed(1)}MB exceeds limit after GC!`);
      // Could implement emergency cleanup here
    }
  }

  onMemoryWarning(callback) {
    this.memoryWarningCallbacks.push(callback);
  }

  offMemoryWarning(callback) {
    const index = this.memoryWarningCallbacks.indexOf(callback);
    if (index > -1) {
      this.memoryWarningCallbacks.splice(index, 1);
    }
  }

  forceCleanup() {
    this.stats.cleanupsCalled++;

    if (this.gcAvailable) {
      // Multiple GC cycles to clean up generational garbage
      global.gc();
      setImmediate(() => {
        global.gc();
        console.log('🧽 Deep cleanup completed');
      });
    }
  }

  getStats() {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const externalMB = usage.external / 1024 / 1024;

    return {
      current: {
        heapUsedMB: heapUsedMB,
        externalMB: externalMB,
        totalMB: heapUsedMB + externalMB,
        rss: usage.rss / 1024 / 1024
      },
      peaks: {
        heapUsedMB: this.stats.peakHeapUsed / 1024 / 1024,
        externalMB: this.stats.peakExternal / 1024 / 1024
      },
      limits: {
        memoryLimitMB: this.memoryLimitMB,
        utilizationPercent: ((heapUsedMB + externalMB) / this.memoryLimitMB) * 100
      },
      actions: {
        gcForced: this.stats.gcForced,
        cleanupsCalled: this.stats.cleanupsCalled,
        memoryWarnings: this.stats.memoryWarnings
      }
    };
  }

  onProcessExit() {
    if (this.enabled) {
      const finalStats = this.getStats();
      console.log('🧠 Memory Monitor Final Stats:', {
        peakMemoryMB: finalStats.peaks.heapUsedMB + finalStats.peaks.externalMB,
        gcForced: finalStats.actions.gcForced,
        memoryWarnings: finalStats.actions.memoryWarnings
      });
    }
    this.stop();
  }

  // Create a batch processor with memory limits
  static createBatchProcessor(batchSize, memoryLimitMB = 128) {
    const monitor = new MemoryMonitor({ memoryLimitMB, enabled: true });
    monitor.start();

    return {
      async processBatches(items, processFn, options = {}) {
        const {
          onBatchStart,
          onBatchComplete,
          onMemoryWarning,
          yieldInterval = 10
        } = options;

        if (onMemoryWarning) {
          monitor.onMemoryWarning(onMemoryWarning);
        }

        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
          batches.push(items.slice(i, i + batchSize));
        }

        const results = [];

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];

          if (onBatchStart) {
            onBatchStart(i, batch.length, batches.length);
          }

          // Process batch
          const batchResults = await processFn(batch, i);
          results.push(...batchResults);

          if (onBatchComplete) {
            onBatchComplete(i, batchResults.length);
          }

          // Force cleanup between batches
          monitor.forceCleanup();

          // Yield to event loop periodically
          if (i % yieldInterval === 0) {
            await new Promise(resolve => setImmediate(resolve));
          }
        }

        monitor.stop();
        return results;
      }
    };
  }
}

module.exports = MemoryMonitor;