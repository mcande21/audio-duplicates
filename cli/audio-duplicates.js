#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const audioDuplicates = require('../lib/index');

const program = new Command();

program
  .name('audio-duplicates')
  .description('Fast audio duplicate detection using Chromaprint fingerprinting')
  .version('1.0.4');

// Global options
program
  .option('-v, --verbose', 'verbose output')
  .option('--threshold <number>', 'similarity threshold (0.0-1.0)', parseFloat, 0.85)
  .option('--format <format>', 'output format (json|csv|text)', 'text')
  .option('-j, --threads <number>', 'number of threads for parallel processing (0=auto)', parseInt, 0);

// Scan command
program
  .command('scan <directories...>')
  .description('scan directories for duplicate audio files')
  .option('--recursive', 'scan subdirectories recursively', true)
  .option('--max-duration <seconds>', 'maximum duration to fingerprint (seconds)', parseInt)
  .option('--output <file>', 'output file path')
  .option('--no-progress', 'disable progress bar')
  .option('--parallel', 'use parallel processing for faster scanning')
  .option('--extensions <extensions>', 'file extensions to scan (comma-separated, default: wav)', 'wav')
  .action(async (directories, options) => {
    try {
      await scanCommand(directories, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (program.opts().verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Compare command
program
  .command('compare <file1> <file2>')
  .description('compare two audio files')
  .option('--max-duration <seconds>', 'maximum duration to fingerprint (seconds)', parseInt)
  .action(async (file1, file2, options) => {
    try {
      await compareCommand(file1, file2, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (program.opts().verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Fingerprint command
program
  .command('fingerprint <file>')
  .description('generate fingerprint for an audio file')
  .option('--max-duration <seconds>', 'maximum duration to fingerprint (seconds)', parseInt)
  .option('--output <file>', 'output file path')
  .action(async (file, options) => {
    try {
      await fingerprintCommand(file, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      if (program.opts().verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

async function scanCommand(directories, options) {
  const globalOpts = program.opts();

  // Handle single directory input or array of directories
  const directoryList = Array.isArray(directories) ? directories : [directories];

  // Validate all directories exist
  for (const directory of directoryList) {
    if (!fs.existsSync(directory)) {
      throw new Error(`Directory not found: ${directory}`);
    }
  }

  console.log(chalk.blue('🎵 Audio Duplicate Scanner'));
  console.log(chalk.gray(`Scanning: ${directoryList.join(', ')}`));
  console.log(chalk.gray(`Threshold: ${globalOpts.threshold}`));
  if (options.parallel) {
    const threads = globalOpts.threads || require('os').cpus().length;
    console.log(chalk.gray(`Parallel Mode: ${threads} threads`));
  }
  console.log();

  // Progress bar
  let progressBar;
  if (options.progress !== false) {
    progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} files | {filename}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
  }

  // Parse extensions from CLI option
  const extensions = options.extensions
    .split(',')
    .map(ext => ext.trim().startsWith('.') ? ext.trim() : '.' + ext.trim());

  console.log(chalk.gray(`Extensions: ${extensions.join(', ')}`));

  const scanOptions = {
    threshold: globalOpts.threshold,
    extensions: extensions,
    concurrency: globalOpts.threads || require('os').cpus().length,
    onProgress: (progress) => {
      if (progress.phase === 'discovery_start') {
        console.log(chalk.cyan('📁 Discovering audio files...'));
      } else if (progress.phase === 'discovery') {
        // Update discovery progress (overwrite previous line)
        process.stdout.write(`\r📁 Scanned ${chalk.cyan(progress.scannedFiles.toLocaleString())} files, found ${chalk.green(progress.audioFiles.toLocaleString())} audio files... (${progress.currentPath})`);
      } else if (progress.phase === 'discovery_complete') {
        // Clear the line and show final discovery results
        process.stdout.write('\r' + ' '.repeat(100) + '\r'); // Clear line
        console.log(`✅ ${chalk.green(progress.message)}`);
        console.log();

        // Initialize progress bar with correct total
        if (progressBar && progress.audioFiles > 0) {
          progressBar.start(progress.audioFiles, 0, {
            filename: 'Starting fingerprint analysis...'
          });
        }
      } else if (progress.phase === 'processing' && progressBar) {
        // During fingerprinting phase
        const filename = path.basename(progress.file);
        const extra = progress.parallel ? ` [${progress.concurrency} threads]` : '';
        progressBar.update(progress.current, {
          filename: filename + extra
        });
      } else if (progress.phase === 'duplicate_detection') {
        // During duplicate detection phase
        if (progressBar) {
          progressBar.stop();
        }
        console.log();
        console.log(chalk.yellow('🔍 ' + progress.message));
      } else if (progress.current && progressBar && !progress.phase) {
        // Fallback for any other progress updates
        const filename = progress.file ? path.basename(progress.file) : 'Processing...';
        progressBar.update(progress.current, {
          filename: filename
        });
      }
    }
  };

  console.log(chalk.yellow('🔍 Scanning for audio files...'));

  let duplicateGroups;
  if (options.parallel) {
    // Use parallel scanning for better performance
    if (directoryList.length === 1) {
      duplicateGroups = await audioDuplicates.scanDirectoryForDuplicatesParallel(directoryList[0], scanOptions);
    } else {
      // For multiple directories in parallel mode, scan each one and combine results
      const allGroups = [];
      for (const directory of directoryList) {
        const groups = await audioDuplicates.scanDirectoryForDuplicatesParallel(directory, scanOptions);
        allGroups.push(...groups);
      }
      duplicateGroups = allGroups;
    }
  } else {
    // Use sequential scanning
    if (directoryList.length === 1) {
      duplicateGroups = await audioDuplicates.scanDirectoryForDuplicates(directoryList[0], scanOptions);
    } else {
      duplicateGroups = await audioDuplicates.scanMultipleDirectoriesForDuplicates(directoryList, scanOptions);
    }
  }

  if (progressBar) {
    progressBar.stop();
  }

  console.log();
  console.log(chalk.green('✅ Scan complete!'));

  if (duplicateGroups.length === 0) {
    console.log(chalk.green('No duplicates found.'));
    return;
  }

  console.log(chalk.yellow(`Found ${duplicateGroups.length} duplicate group(s):`));
  console.log();

  // Format output
  const output = formatOutput(duplicateGroups, globalOpts.format);

  if (options.output) {
    fs.writeFileSync(options.output, output);
    console.log(chalk.green(`Results saved to: ${options.output}`));
  } else {
    console.log(output);
  }

  // Summary statistics
  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.filePaths.length, 0);
  const potentialSavings = totalDuplicates - duplicateGroups.length;

  console.log();
  console.log(chalk.blue('📊 Summary:'));
  console.log(`  Total duplicate files: ${totalDuplicates}`);
  console.log(`  Duplicate groups: ${duplicateGroups.length}`);
  console.log(`  Potential space savings: ${potentialSavings} files`);
}

async function compareCommand(file1, file2, options) {
  const globalOpts = program.opts();

  if (!fs.existsSync(file1)) {
    throw new Error(`File not found: ${file1}`);
  }
  if (!fs.existsSync(file2)) {
    throw new Error(`File not found: ${file2}`);
  }

  console.log(chalk.blue('🎵 Audio File Comparison'));
  console.log(chalk.gray(`File 1: ${file1}`));
  console.log(chalk.gray(`File 2: ${file2}`));
  console.log();

  console.log(chalk.yellow('🔍 Generating fingerprints...'));

  let fp1, fp2;

  if (options.maxDuration) {
    fp1 = await audioDuplicates.generateFingerprintLimited(file1, options.maxDuration);
    fp2 = await audioDuplicates.generateFingerprintLimited(file2, options.maxDuration);
  } else {
    fp1 = await audioDuplicates.generateFingerprint(file1);
    fp2 = await audioDuplicates.generateFingerprint(file2);
  }

  console.log(chalk.yellow('🔍 Comparing fingerprints...'));

  const result = await audioDuplicates.compareFingerprints(fp1, fp2);

  console.log();
  console.log(chalk.green('✅ Comparison complete!'));
  console.log();

  // Display results
  console.log(chalk.blue('📊 Results:'));
  console.log(`  Similarity Score: ${chalk.cyan((result.similarityScore * 100).toFixed(2) + '%')}`);
  console.log(`  Bit Error Rate: ${chalk.cyan((result.bitErrorRate * 100).toFixed(2) + '%')}`);
  console.log(`  Best Offset: ${chalk.cyan(result.bestOffset)} samples`);
  console.log(`  Matched Segments: ${chalk.cyan(result.matchedSegments)}`);
  console.log(`  Are Duplicates: ${result.isDuplicate ? chalk.green('YES') : chalk.red('NO')}`);

  if (globalOpts.verbose) {
    console.log();
    console.log(chalk.gray('📄 Fingerprint Details:'));
    console.log(`  File 1: ${fp1.data.length} values, ${fp1.duration.toFixed(2)}s`);
    console.log(`  File 2: ${fp2.data.length} values, ${fp2.duration.toFixed(2)}s`);
  }
}

async function fingerprintCommand(file, options) {
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  console.log(chalk.blue('🎵 Audio Fingerprint Generator'));
  console.log(chalk.gray(`File: ${file}`));
  console.log();

  console.log(chalk.yellow('🔍 Generating fingerprint...'));

  let fingerprint;
  if (options.maxDuration) {
    fingerprint = await audioDuplicates.generateFingerprintLimited(file, options.maxDuration);
  } else {
    fingerprint = await audioDuplicates.generateFingerprint(file);
  }

  console.log(chalk.green('✅ Fingerprint generated!'));
  console.log();

  const output = JSON.stringify(fingerprint, null, 2);

  if (options.output) {
    fs.writeFileSync(options.output, output);
    console.log(chalk.green(`Fingerprint saved to: ${options.output}`));
  } else {
    console.log(chalk.blue('📄 Fingerprint:'));
    console.log(output);
  }

  console.log();
  console.log(chalk.blue('📊 Details:'));
  console.log(`  Sample Rate: ${fingerprint.sampleRate} Hz`);
  console.log(`  Duration: ${fingerprint.duration.toFixed(2)} seconds`);
  console.log(`  Data Points: ${fingerprint.data.length}`);
}

function formatOutput(duplicateGroups, format) {
  switch (format) {
    case 'json':
      return JSON.stringify(duplicateGroups, null, 2);

    case 'csv':
      let csv = 'Group,Similarity,File\n';
      duplicateGroups.forEach((group, groupIndex) => {
        group.filePaths.forEach(filePath => {
          csv += `${groupIndex + 1},${(group.avgSimilarity * 100).toFixed(2)}%,"${filePath}"\n`;
        });
      });
      return csv;

    case 'text':
    default:
      let output = '';
      duplicateGroups.forEach((group, groupIndex) => {
        output += chalk.yellow(`\n📁 Group ${groupIndex + 1} (${(group.avgSimilarity * 100).toFixed(2)}% similarity):\n`);
        group.filePaths.forEach((filePath, fileIndex) => {
          const prefix = fileIndex === group.filePaths.length - 1 ? '  └─' : '  ├─';
          output += `${prefix} ${filePath}\n`;
        });
      });
      return output;
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();