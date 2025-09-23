#!/usr/bin/env node

const audioDuplicates = require('../lib/index');
const fs = require('fs');

async function debugPreprocessing() {
    console.log('🔍 Debugging Preprocessing Issues\n');

    const testFile = 'test_scenarios/original/106814.wav';

    if (!fs.existsSync(testFile)) {
        console.error('❌ Test file not found');
        return;
    }

    try {
        // Test with no preprocessing
        console.log('1. Original fingerprint:');
        const originalFp = await audioDuplicates.generateFingerprint(testFile);
        console.log(`   Duration: ${originalFp.duration}s`);
        console.log(`   Sample rate: ${originalFp.sampleRate}Hz`);
        console.log(`   Fingerprint length: ${originalFp.data.length}`);

        // Test with different silence thresholds
        const silenceThresholds = [-60, -50, -40, -30, -20];

        for (const threshold of silenceThresholds) {
            console.log(`\n2. Testing silence threshold ${threshold}dB:`);

            const config = {
                trimSilence: true,
                silenceThresholdDb: threshold,
                preservePaddingMs: 200,
                normalizeSampleRate: false,
                normalizeVolume: false
            };

            try {
                const result = await audioDuplicates.testPreprocessing(testFile, config);
                console.log(`   Duration: ${result.original.duration}s → ${result.processed.duration}s`);
                console.log(`   Samples: ${result.original.samples} → ${result.processed.samples}`);

                const reductionPercent = ((result.original.duration - result.processed.duration) / result.original.duration * 100).toFixed(1);
                console.log(`   Reduction: ${reductionPercent}%`);

                if (result.processed.duration < 0.5) {
                    console.log(`   ⚠️  Too aggressive - most audio treated as silence`);
                } else if (result.processed.duration > result.original.duration * 0.8) {
                    console.log(`   ✓ Reasonable trimming`);
                } else {
                    console.log(`   ~ Moderate trimming`);
                }
            } catch (error) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        // Test with silence trimming disabled
        console.log(`\n3. Testing with silence trimming disabled:`);
        const noSilenceConfig = {
            trimSilence: false,
            normalizeSampleRate: true,
            targetSampleRate: 44100,
            normalizeVolume: true
        };

        try {
            const result = await audioDuplicates.testPreprocessing(testFile, noSilenceConfig);
            console.log(`   Duration: ${result.original.duration}s → ${result.processed.duration}s`);
            console.log(`   Sample rate: ${result.original.sampleRate}Hz → ${result.processed.sampleRate}Hz`);

            const fp = await audioDuplicates.generateFingerprintWithPreprocessing(testFile, noSilenceConfig);
            console.log(`   Fingerprint generated: ${fp.data.length} elements`);
            console.log(`   ✓ Works without silence trimming`);
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
        }

    } catch (error) {
        console.error('Debug failed:', error.message);
    }
}

debugPreprocessing();