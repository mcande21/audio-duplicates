#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Audio Test Generator
 *
 * Generates various modified versions of audio files for testing duplicate detection
 * robustness against different types of modifications.
 */

class AudioTestGenerator {
    constructor(sourceDir = 'test_A', outputDir = 'test_scenarios') {
        this.sourceDir = sourceDir;
        this.outputDir = outputDir;
        this.audioExtensions = ['.wav', '.mp3', '.flac'];

        // Test modification parameters
        this.modifications = {
            silence: {
                start: [0.5, 1.0, 2.0, 5.0], // seconds of silence at start
                end: [0.5, 1.0, 2.0, 5.0],   // seconds of silence at end
                middle: [0.1, 0.5, 1.0]      // seconds of silence in middle
            },
            volume: {
                increase: [1.1, 1.2, 1.5, 2.0], // volume multipliers
                decrease: [0.9, 0.8, 0.5, 0.25] // volume multipliers
            },
            sampleRate: [22050, 44100, 48000, 96000], // different sample rates
            speed: {
                faster: [1.01, 1.02, 1.05, 1.1], // speed multipliers
                slower: [0.99, 0.98, 0.95, 0.9]  // speed multipliers
            },
            bitdepth: [16, 24], // bit depths for wav files
            compression: {
                mp3: [128, 192, 256, 320], // kbps
                flac: [0, 5, 8] // compression levels
            }
        };
    }

    /**
     * Initialize output directories
     */
    initializeDirectories() {
        console.log('🔧 Initializing test directories...');

        const directories = [
            this.outputDir,
            path.join(this.outputDir, 'original'),
            path.join(this.outputDir, 'silence_start'),
            path.join(this.outputDir, 'silence_end'),
            path.join(this.outputDir, 'silence_middle'),
            path.join(this.outputDir, 'volume_increase'),
            path.join(this.outputDir, 'volume_decrease'),
            path.join(this.outputDir, 'sample_rate'),
            path.join(this.outputDir, 'speed_faster'),
            path.join(this.outputDir, 'speed_slower'),
            path.join(this.outputDir, 'bitdepth'),
            path.join(this.outputDir, 'compression')
        ];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`   Created: ${dir}`);
            }
        }
    }

    /**
     * Get all audio files from source directory
     */
    getSourceFiles() {
        if (!fs.existsSync(this.sourceDir)) {
            throw new Error(`Source directory not found: ${this.sourceDir}`);
        }

        const files = fs.readdirSync(this.sourceDir)
            .filter(file => this.audioExtensions.includes(path.extname(file).toLowerCase()))
            .slice(0, 5) // Limit to first 5 files for manageable test set
            .map(file => path.join(this.sourceDir, file));

        console.log(`📁 Found ${files.length} source audio files`);
        return files;
    }

    /**
     * Copy original files to test scenarios directory
     */
    copyOriginalFiles(sourceFiles) {
        console.log('📋 Copying original files...');

        for (const sourceFile of sourceFiles) {
            const filename = path.basename(sourceFile);
            const destPath = path.join(this.outputDir, 'original', filename);

            try {
                fs.copyFileSync(sourceFile, destPath);
                console.log(`   Copied: ${filename}`);
            } catch (error) {
                console.error(`   ❌ Failed to copy ${filename}: ${error.message}`);
            }
        }
    }

    /**
     * Generate files with silence added at start
     */
    generateSilenceStartFiles(sourceFiles) {
        console.log('🔇 Generating silence-at-start variations...');

        for (const sourceFile of sourceFiles) {
            const filename = path.basename(sourceFile, path.extname(sourceFile));
            const ext = path.extname(sourceFile);

            for (const silenceDuration of this.modifications.silence.start) {
                const outputFile = path.join(
                    this.outputDir,
                    'silence_start',
                    `${filename}_start${silenceDuration}s${ext}`
                );

                try {
                    // Use sox to add silence at the beginning
                    const command = `sox "${sourceFile}" "${outputFile}" pad ${silenceDuration} 0`;
                    execSync(command, { stdio: 'pipe' });
                    console.log(`   Created: ${path.basename(outputFile)}`);
                } catch (error) {
                    console.error(`   ❌ Failed to create ${path.basename(outputFile)}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Generate files with silence added at end
     */
    generateSilenceEndFiles(sourceFiles) {
        console.log('🔇 Generating silence-at-end variations...');

        for (const sourceFile of sourceFiles) {
            const filename = path.basename(sourceFile, path.extname(sourceFile));
            const ext = path.extname(sourceFile);

            for (const silenceDuration of this.modifications.silence.end) {
                const outputFile = path.join(
                    this.outputDir,
                    'silence_end',
                    `${filename}_end${silenceDuration}s${ext}`
                );

                try {
                    // Use sox to add silence at the end
                    const command = `sox "${sourceFile}" "${outputFile}" pad 0 ${silenceDuration}`;
                    execSync(command, { stdio: 'pipe' });
                    console.log(`   Created: ${path.basename(outputFile)}`);
                } catch (error) {
                    console.error(`   ❌ Failed to create ${path.basename(outputFile)}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Generate files with silence in middle
     */
    generateSilenceMiddleFiles(sourceFiles) {
        console.log('🔇 Generating silence-in-middle variations...');

        for (const sourceFile of sourceFiles) {
            const filename = path.basename(sourceFile, path.extname(sourceFile));
            const ext = path.extname(sourceFile);

            for (const silenceDuration of this.modifications.silence.middle) {
                const outputFile = path.join(
                    this.outputDir,
                    'silence_middle',
                    `${filename}_middle${silenceDuration}s${ext}`
                );

                try {
                    // Get file duration first
                    const durationCmd = `soxi -D "${sourceFile}"`;
                    const duration = parseFloat(execSync(durationCmd, { encoding: 'utf8' }).trim());
                    const halfPoint = duration / 2;

                    // Split, add silence, rejoin
                    const tempDir = '/tmp/audio_split';
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

                    const part1 = path.join(tempDir, `part1_${Date.now()}.wav`);
                    const part2 = path.join(tempDir, `part2_${Date.now()}.wav`);
                    const silenceFile = path.join(tempDir, `silence_${Date.now()}.wav`);

                    // Split the file
                    execSync(`sox "${sourceFile}" "${part1}" trim 0 ${halfPoint}`, { stdio: 'pipe' });
                    execSync(`sox "${sourceFile}" "${part2}" trim ${halfPoint}`, { stdio: 'pipe' });

                    // Create silence file with same sample rate and channels as original
                    const sampleRate = execSync(`soxi -r "${sourceFile}"`, { encoding: 'utf8' }).trim();
                    const channels = execSync(`soxi -c "${sourceFile}"`, { encoding: 'utf8' }).trim();
                    execSync(`sox -n -r ${sampleRate} -c ${channels} "${silenceFile}" trim 0.0 ${silenceDuration}`, { stdio: 'pipe' });

                    // Combine: part1 + silence + part2
                    execSync(`sox "${part1}" "${silenceFile}" "${part2}" "${outputFile}"`, { stdio: 'pipe' });

                    // Cleanup temp files
                    [part1, part2, silenceFile].forEach(file => {
                        if (fs.existsSync(file)) fs.unlinkSync(file);
                    });

                    console.log(`   Created: ${path.basename(outputFile)}`);
                } catch (error) {
                    console.error(`   ❌ Failed to create ${path.basename(outputFile)}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Generate files with volume changes
     */
    generateVolumeFiles(sourceFiles) {
        console.log('🔊 Generating volume variation files...');

        // Volume increase
        for (const sourceFile of sourceFiles) {
            const filename = path.basename(sourceFile, path.extname(sourceFile));
            const ext = path.extname(sourceFile);

            for (const multiplier of this.modifications.volume.increase) {
                const outputFile = path.join(
                    this.outputDir,
                    'volume_increase',
                    `${filename}_vol${multiplier}x${ext}`
                );

                try {
                    const command = `sox "${sourceFile}" "${outputFile}" vol ${multiplier}`;
                    execSync(command, { stdio: 'pipe' });
                    console.log(`   Created: ${path.basename(outputFile)}`);
                } catch (error) {
                    console.error(`   ❌ Failed to create ${path.basename(outputFile)}: ${error.message}`);
                }
            }

            // Volume decrease
            for (const multiplier of this.modifications.volume.decrease) {
                const outputFile = path.join(
                    this.outputDir,
                    'volume_decrease',
                    `${filename}_vol${multiplier}x${ext}`
                );

                try {
                    const command = `sox "${sourceFile}" "${outputFile}" vol ${multiplier}`;
                    execSync(command, { stdio: 'pipe' });
                    console.log(`   Created: ${path.basename(outputFile)}`);
                } catch (error) {
                    console.error(`   ❌ Failed to create ${path.basename(outputFile)}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Generate files with different sample rates
     */
    generateSampleRateFiles(sourceFiles) {
        console.log('📊 Generating sample rate variations...');

        for (const sourceFile of sourceFiles) {
            const filename = path.basename(sourceFile, path.extname(sourceFile));
            const ext = path.extname(sourceFile);

            for (const sampleRate of this.modifications.sampleRate) {
                const outputFile = path.join(
                    this.outputDir,
                    'sample_rate',
                    `${filename}_${sampleRate}Hz${ext}`
                );

                try {
                    const command = `sox "${sourceFile}" -r ${sampleRate} "${outputFile}"`;
                    execSync(command, { stdio: 'pipe' });
                    console.log(`   Created: ${path.basename(outputFile)}`);
                } catch (error) {
                    console.error(`   ❌ Failed to create ${path.basename(outputFile)}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Generate files with speed changes
     */
    generateSpeedFiles(sourceFiles) {
        console.log('⚡ Generating speed variation files...');

        // Faster
        for (const sourceFile of sourceFiles) {
            const filename = path.basename(sourceFile, path.extname(sourceFile));
            const ext = path.extname(sourceFile);

            for (const multiplier of this.modifications.speed.faster) {
                const outputFile = path.join(
                    this.outputDir,
                    'speed_faster',
                    `${filename}_speed${multiplier}x${ext}`
                );

                try {
                    const command = `sox "${sourceFile}" "${outputFile}" speed ${multiplier}`;
                    execSync(command, { stdio: 'pipe' });
                    console.log(`   Created: ${path.basename(outputFile)}`);
                } catch (error) {
                    console.error(`   ❌ Failed to create ${path.basename(outputFile)}: ${error.message}`);
                }
            }

            // Slower
            for (const multiplier of this.modifications.speed.slower) {
                const outputFile = path.join(
                    this.outputDir,
                    'speed_slower',
                    `${filename}_speed${multiplier}x${ext}`
                );

                try {
                    const command = `sox "${sourceFile}" "${outputFile}" speed ${multiplier}`;
                    execSync(command, { stdio: 'pipe' });
                    console.log(`   Created: ${path.basename(outputFile)}`);
                } catch (error) {
                    console.error(`   ❌ Failed to create ${path.basename(outputFile)}: ${error.message}`);
                }
            }
        }
    }

    /**
     * Generate all test audio files
     */
    async generateAllTests() {
        console.log('🎵 Audio Test Generator Starting...\n');

        try {
            this.initializeDirectories();
            const sourceFiles = this.getSourceFiles();

            if (sourceFiles.length === 0) {
                throw new Error('No source audio files found');
            }

            this.copyOriginalFiles(sourceFiles);
            this.generateSilenceStartFiles(sourceFiles);
            this.generateSilenceEndFiles(sourceFiles);
            this.generateSilenceMiddleFiles(sourceFiles);
            this.generateVolumeFiles(sourceFiles);
            this.generateSampleRateFiles(sourceFiles);
            this.generateSpeedFiles(sourceFiles);

            console.log('\n✅ Test audio generation completed!');
            console.log(`📁 All test files saved to: ${this.outputDir}`);

            // Generate summary
            this.generateSummary();

        } catch (error) {
            console.error('\n❌ Test generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate summary of created files
     */
    generateSummary() {
        console.log('\n📊 Test File Summary:');

        const testDirs = [
            'original', 'silence_start', 'silence_end', 'silence_middle',
            'volume_increase', 'volume_decrease', 'sample_rate',
            'speed_faster', 'speed_slower'
        ];

        let totalFiles = 0;

        for (const testDir of testDirs) {
            const dirPath = path.join(this.outputDir, testDir);
            if (fs.existsSync(dirPath)) {
                const fileCount = fs.readdirSync(dirPath).length;
                console.log(`   ${testDir}: ${fileCount} files`);
                totalFiles += fileCount;
            }
        }

        console.log(`   Total: ${totalFiles} test files created`);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const sourceDir = args[0] || 'test_A';
    const outputDir = args[1] || 'test_scenarios';

    const generator = new AudioTestGenerator(sourceDir, outputDir);

    generator.generateAllTests().catch(error => {
        console.error('\n💥 Generation failed:', error.message);
        process.exit(1);
    });
}

module.exports = AudioTestGenerator;