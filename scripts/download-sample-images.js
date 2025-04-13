/**
 * @fileoverview Enhanced Download Sample Images Script
 *
 * This script downloads sample large images for testing the compression utility.
 * It fetches high-quality images from Unsplash and saves them to the public/images directory.
 * Features include:
 * - Retry logic for failed downloads
 * - Parallel downloads with rate limiting
 * - Progress reporting for downloads
 *
 * @module download-sample-images
 * @author Chris Schweda
 * @version 1.1.0
 *
 * Usage: yarn download-samples [--parallel=<number>] [--retries=<number>]
 */

// Use ES modules
import fs from 'fs';
import path from 'path';
import https from 'https';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { fileURLToPath } from 'url';
import { cpus } from 'os';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pipelineAsync = promisify(pipeline);

/**
 * Parse command line arguments
 * @returns {Object} - Parsed command line arguments
 */
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            args[key] = value || true;
        }
    });
    return args;
}

// Parse command line arguments
const args = parseArgs();

/**
 * Configuration constants
 * @constant {string} IMAGES_DIR - Path to the images directory
 * @constant {number} MAX_RETRIES - Maximum number of retry attempts for failed downloads
 * @constant {number} PARALLEL_LIMIT - Maximum number of parallel downloads
 */
const IMAGES_DIR = path.join(__dirname, '../public/images');
const MAX_RETRIES = args.retries ? parseInt(args.retries) : 3;
const PARALLEL_LIMIT = args.parallel ? parseInt(args.parallel) : Math.max(1, Math.min(4, cpus().length - 1));

/**
 * Sample images to download
 * @constant {Array<Object>} SAMPLE_IMAGES - Array of sample image objects
 * @property {string} name - Filename to save the image as
 * @property {string} url - URL to download the image from
 */
const SAMPLE_IMAGES = [
    {
        name: 'large1.jpg',
        url: 'https://images.unsplash.com/photo-1682687982107-14492010e05e?q=80&w=3870&auto=format&fit=crop'
    },
    {
        name: 'large2.jpg',
        url: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?q=80&w=3870&auto=format&fit=crop'
    },
    {
        name: 'large3.jpg',
        url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?q=80&w=3870&auto=format&fit=crop'
    },
    {
        name: 'large4.jpg',
        url: 'https://images.unsplash.com/photo-1682687220067-dced9a881b56?q=80&w=3870&auto=format&fit=crop'
    },
    {
        name: 'large5.jpg',
        url: 'https://images.unsplash.com/photo-1682687220208-22d7a2543e88?q=80&w=3870&auto=format&fit=crop'
    }
];

/**
 * Ensures that the images directory exists, creating it if necessary
 * @function ensureDirectoryExists
 * @returns {void}
 */
function ensureDirectoryExists() {
    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
        console.log(`Created directory: ${IMAGES_DIR}`);
    }
}

/**
 * Creates a progress tracker for downloads
 * @function createProgressTracker
 * @param {string} filename - The name of the file being downloaded
 * @returns {Object} - Progress tracker object
 */
function createProgressTracker(filename) {
    let totalBytes = 0;
    let receivedBytes = 0;
    let lastLogTime = Date.now();
    const LOG_INTERVAL = 500; // ms

    return {
        setTotal(total) {
            totalBytes = parseInt(total);
        },
        update(chunk) {
            receivedBytes += chunk.length;

            // Only update the progress bar every LOG_INTERVAL ms to avoid console spam
            const now = Date.now();
            if (now - lastLogTime > LOG_INTERVAL) {
                lastLogTime = now;
                this.log();
            }
        },
        log() {
            if (totalBytes > 0) {
                const percent = Math.round((receivedBytes / totalBytes) * 100);
                const receivedMB = (receivedBytes / (1024 * 1024)).toFixed(2);
                const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
                process.stdout.write(`\r${filename}: ${receivedMB}MB/${totalMB}MB (${percent}%)`);
            } else {
                const receivedMB = (receivedBytes / (1024 * 1024)).toFixed(2);
                process.stdout.write(`\r${filename}: ${receivedMB}MB downloaded`);
            }
        },
        complete() {
            // Clear the line and move to the next line
            process.stdout.write('\r' + ' '.repeat(80) + '\r');
        }
    };
}

/**
 * Downloads a single image from a URL and saves it to the images directory
 * Includes retry logic and progress reporting
 * @async
 * @function downloadImage
 * @param {string} url - The URL of the image to download
 * @param {string} filename - The filename to save the image as
 * @param {number} [retryCount=0] - Current retry attempt
 * @returns {Promise<Object>} - Result of the download operation
 */
async function downloadImage(url, filename, retryCount = 0) {
    const filePath = path.join(IMAGES_DIR, filename);

    // Skip if the file already exists
    if (fs.existsSync(filePath)) {
        console.log(`File already exists: ${filename}`);
        return { success: true, skipped: true, filename };
    }

    console.log(`Downloading: ${filename} from ${url}`);
    const progress = createProgressTracker(filename);

    try {
        return await new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    // Handle redirects
                    const redirectUrl = response.headers.location;
                    if (redirectUrl) {
                        console.log(`Redirecting to: ${redirectUrl}`);
                        resolve(downloadImage(redirectUrl, filename, retryCount));
                        return;
                    }
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage}`));
                    return;
                }

                // Set total size if Content-Length is available
                if (response.headers['content-length']) {
                    progress.setTotal(response.headers['content-length']);
                }

                const fileStream = fs.createWriteStream(filePath);

                // Track progress
                response.on('data', (chunk) => {
                    progress.update(chunk);
                });

                fileStream.on('finish', () => {
                    fileStream.close();
                    progress.complete();

                    // Get file size
                    const stats = fs.statSync(filePath);
                    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

                    console.log(`Downloaded: ${filename} (${fileSizeMB} MB)`);
                    resolve({ success: true, filename, size: fileSizeMB });
                });

                fileStream.on('error', (err) => {
                    fs.unlink(filePath, () => {}); // Delete the file if there was an error
                    reject(err);
                });

                response.pipe(fileStream);
            });

            // Set a timeout to prevent hanging downloads
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error(`Download timeout for ${filename}`));
            });

            request.on('error', (err) => {
                reject(err);
            });
        });
    } catch (error) {
        // Implement retry logic
        if (retryCount < MAX_RETRIES) {
            console.error(`Error downloading ${filename} (attempt ${retryCount + 1}/${MAX_RETRIES + 1}): ${error.message}`);
            console.log(`Retrying download for ${filename} in ${(retryCount + 1) * 2} seconds...`);

            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));

            return downloadImage(url, filename, retryCount + 1);
        }

        console.error(`Failed to download ${filename} after ${MAX_RETRIES + 1} attempts: ${error.message}`);
        return { success: false, filename, error: error.message };
    }
}

/**
 * Creates a queue for parallel downloads
 * @function createDownloadQueue
 * @param {number} concurrency - Maximum number of concurrent downloads
 * @returns {Object} - Queue object with add and drain methods
 */
function createDownloadQueue(concurrency) {
    const tasks = [];
    let running = 0;
    let completed = 0;
    let total = 0;

    function runTask(task) {
        running++;
        task().then(result => {
            running--;
            completed++;
            return result;
        }).catch(err => {
            running--;
            completed++;
            console.error('\nQueue error:', err.message);
        }).finally(() => {
            if (tasks.length > 0) {
                const nextTask = tasks.shift();
                runTask(nextTask);
            } else if (running === 0) {
                queue.onDrain();
            }
        });
    }

    const queue = {
        add(task) {
            total++;
            if (running < concurrency) {
                runTask(task);
            } else {
                tasks.push(task);
            }
        },
        onDrain: () => {},
        getStats() {
            return { running, completed, total, pending: tasks.length };
        }
    };

    return queue;
}

/**
 * Downloads all sample images defined in the SAMPLE_IMAGES array
 * Uses parallel downloads with rate limiting
 * @async
 * @function downloadAllImages
 * @returns {Promise<void>} - Resolves when all downloads are complete
 */
async function downloadAllImages() {
    ensureDirectoryExists();

    console.log(`Downloading ${SAMPLE_IMAGES.length} sample images with ${PARALLEL_LIMIT} parallel workers...`);

    // Create a download queue with the specified concurrency
    const queue = createDownloadQueue(PARALLEL_LIMIT);

    // Results tracking
    const results = {
        downloaded: [],
        skipped: [],
        failed: []
    };

    // Create a promise that resolves when all downloads are complete
    const downloadsComplete = new Promise(resolve => {
        queue.onDrain = resolve;
    });

    // Add all images to the queue
    for (const image of SAMPLE_IMAGES) {
        queue.add(async () => {
            try {
                const result = await downloadImage(image.url, image.name);
                if (result.success) {
                    if (result.skipped) {
                        results.skipped.push(image.name);
                    } else {
                        results.downloaded.push(image.name);
                    }
                } else {
                    results.failed.push(image.name);
                }
            } catch (error) {
                console.error(`Error downloading ${image.name}:`, error.message);
                results.failed.push(image.name);
            }
        });
    }

    // Display progress updates
    const progressInterval = setInterval(() => {
        const stats = queue.getStats();
        if (stats.completed < stats.total) {
            const percent = Math.round((stats.completed / stats.total) * 100);
            process.stdout.write(`\rOverall progress: ${stats.completed}/${stats.total} (${percent}%) - ${stats.running} active downloads`);
        }
    }, 1000);

    // Wait for all downloads to complete
    await downloadsComplete;
    clearInterval(progressInterval);

    // Print summary
    console.log('\n\n=== Download Summary ===');
    console.log(`Total images: ${SAMPLE_IMAGES.length}`);
    console.log(`Downloaded: ${results.downloaded.length}`);
    console.log(`Skipped (already exist): ${results.skipped.length}`);
    console.log(`Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log('\nFailed downloads:');
        results.failed.forEach(name => {
            console.log(`  - ${name}`);
        });
    }

    console.log('\nDownload complete!');
}

// Run the script
downloadAllImages().catch(console.error);
