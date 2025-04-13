/**
 * @fileoverview Enhanced Image Compression Utility
 *
 * This script compresses images in the /images folder that are larger than the configured size.
 * Original images are preserved in /images/original/ directory.
 * The compression maintains original dimensions while reducing file size.
 * Features include:
 * - Support for multiple image formats (JPEG, PNG, WebP, AVIF, GIF)
 * - Parallel processing for faster compression
 * - Different compression algorithms based on image type
 * - Queue system for handling large batches
 *
 * @module compress-images
 * @author Chris Schweda
 * @version 1.1.0
 *
 * Usage: yarn compress [--algorithm=<auto|mozjpeg|webp|avif>] [--quality=<1-100>] [--parallel=<number>]
 */

// Use ES modules
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { cpus } from 'os';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load the config file
let config;
try {
    const configModule = await import('../src/config.js');
    config = configModule.default;
    console.log('Loaded configuration from config.js');
} catch (error) {
    console.warn('Could not load config.js, using default values:', error.message);
    // Default configuration if config.js cannot be loaded
    config = {
        images: {
            directory: '/images/',
            supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
            maxSizeMB: 1,
            compressionQuality: 80
        }
    };
}

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

// Configuration
const IMAGE_DIR = path.join(__dirname, '../public/images');
const ORIGINAL_DIR = path.join(IMAGE_DIR, 'original');
const MAX_SIZE_MB = args.maxSize ? parseFloat(args.maxSize) : config.images.maxSizeMB;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const QUALITY = args.quality ? parseInt(args.quality) : config.images.compressionQuality;
const ALGORITHM = args.algorithm || 'auto';
const PARALLEL_LIMIT = args.parallel ? parseInt(args.parallel) : Math.max(1, cpus().length - 1);
const SUPPORTED_FORMATS = [
    ...config.images.supportedFormats,
    '.avif', // Add AVIF support
    '.tiff', // Add TIFF support
    '.tif'   // Add TIF support
];

// Compression options for different formats
const COMPRESSION_OPTIONS = {
    jpeg: { quality: QUALITY, mozjpeg: ALGORITHM === 'mozjpeg' },
    png: { quality: QUALITY, compressionLevel: 9 },
    webp: { quality: QUALITY, lossless: false },
    avif: { quality: QUALITY, lossless: false },
    gif: { quality: QUALITY },
    tiff: { quality: QUALITY, compression: 'jpeg' }
};

/**
 * Ensures that the required directories exist, creating them if necessary
 * @function ensureDirectoriesExist
 * @returns {void}
 */
function ensureDirectoriesExist() {
    if (!fs.existsSync(IMAGE_DIR)) {
        fs.mkdirSync(IMAGE_DIR, { recursive: true });
        console.log(`Created directory: ${IMAGE_DIR}`);
    }

    if (!fs.existsSync(ORIGINAL_DIR)) {
        fs.mkdirSync(ORIGINAL_DIR, { recursive: true });
        console.log(`Created directory: ${ORIGINAL_DIR}`);
    }
}

/**
 * Checks if a file is an image based on its extension
 * @function isImage
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if the file is an image, false otherwise
 */
function isImage(filename) {
    const ext = path.extname(filename).toLowerCase();
    return SUPPORTED_FORMATS.includes(ext);
}

/**
 * Gets the file size in megabytes
 * @function getFileSizeMB
 * @param {string} filePath - The path to the file
 * @returns {number} - The file size in megabytes
 */
function getFileSizeMB(filePath) {
    const stats = fs.statSync(filePath);
    return stats.size / (1024 * 1024);
}

/**
 * Determines the best output format for an image
 * @function getOutputFormat
 * @param {string} filename - The filename of the image
 * @param {Object} metadata - The image metadata
 * @returns {Object} - The output format and options
 */
function getOutputFormat(filename, metadata) {
    const ext = path.extname(filename).toLowerCase();

    // If algorithm is explicitly set to a specific format, use that
    if (ALGORITHM === 'webp') return { format: 'webp', options: COMPRESSION_OPTIONS.webp };
    if (ALGORITHM === 'avif') return { format: 'avif', options: COMPRESSION_OPTIONS.avif };

    // Otherwise, use format-specific options based on the file extension
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return { format: 'jpeg', options: COMPRESSION_OPTIONS.jpeg };
        case '.png':
            // Use original format for PNGs with transparency
            if (metadata.hasAlpha) {
                return { format: 'png', options: COMPRESSION_OPTIONS.png };
            }
            // For PNGs without transparency, JPEG might be better
            return { format: 'jpeg', options: COMPRESSION_OPTIONS.jpeg };
        case '.webp':
            return { format: 'webp', options: COMPRESSION_OPTIONS.webp };
        case '.avif':
            return { format: 'avif', options: COMPRESSION_OPTIONS.avif };
        case '.gif':
            // Keep GIFs as GIFs if they have multiple frames (animations)
            if (metadata.pages && metadata.pages > 1) {
                return { format: 'gif', options: COMPRESSION_OPTIONS.gif };
            }
            // Convert single-frame GIFs to more efficient format
            return { format: 'webp', options: COMPRESSION_OPTIONS.webp };
        case '.tiff':
        case '.tif':
            return { format: 'tiff', options: COMPRESSION_OPTIONS.tiff };
        default:
            // Default to jpeg for unsupported formats
            return { format: 'jpeg', options: COMPRESSION_OPTIONS.jpeg };
    }
}

/**
 * Compresses an image if it's larger than the maximum size
 * @async
 * @function compressImage
 * @param {string} imagePath - The path to the image file
 * @returns {Promise<Object>} - Result of the compression
 */
async function compressImage(imagePath) {
    const filename = path.basename(imagePath);
    const originalSize = getFileSizeMB(imagePath);

    console.log(`\nProcessing: ${filename} (${originalSize.toFixed(2)} MB)`);

    // Skip if already compressed
    if (originalSize <= MAX_SIZE_MB) {
        console.log(`  Skipping: Image is already under ${MAX_SIZE_MB} MB`);
        return { success: false, skipped: true, path: imagePath };
    }

    // Move original to /original directory
    const originalPath = path.join(ORIGINAL_DIR, filename);

    // Check if original already exists
    if (!fs.existsSync(originalPath)) {
        fs.copyFileSync(imagePath, originalPath);
        console.log(`  Saved original to: ${path.relative(process.cwd(), originalPath)}`);
    } else {
        console.log(`  Original already exists: ${path.relative(process.cwd(), originalPath)}`);
    }

    try {
        // Process the image with sharp
        const image = sharp(imagePath);
        const metadata = await image.metadata();

        // Determine the best output format
        const { format, options } = getOutputFormat(filename, metadata);

        // Log the original dimensions that we're preserving
        console.log(`  Maintaining original dimensions: ${metadata.width}x${metadata.height}`);
        console.log(`  Using format: ${format} with quality: ${options.quality}%`);

        // Compress and save
        await image
            .toFormat(format, options)
            .toFile(imagePath + '.temp');

        // Replace the original with the compressed version
        fs.unlinkSync(imagePath);
        fs.renameSync(imagePath + '.temp', imagePath);

        // Get new size
        const newSize = getFileSizeMB(imagePath);
        const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

        console.log(`  Compressed: ${filename} using ${format} format`);
        console.log(`  Original: ${originalSize.toFixed(2)} MB, New: ${newSize.toFixed(2)} MB (${reduction}% reduction)`);

        return {
            success: true,
            path: imagePath,
            originalSize,
            newSize,
            reduction,
            format
        };
    } catch (error) {
        console.error(`  Error compressing ${filename}:`, error.message);

        // If compression fails, restore from original
        if (fs.existsSync(originalPath)) {
            console.log(`  Restoring original file...`);
            fs.copyFileSync(originalPath, imagePath);
        }

        return { success: false, error: error.message, path: imagePath };
    }
}

/**
 * Creates a queue for processing images in parallel
 * @function createQueue
 * @param {number} concurrency - Maximum number of concurrent operations
 * @returns {Object} - Queue object with add and drain methods
 */
function createQueue(concurrency) {
    const tasks = [];
    let running = 0;
    let completed = 0;
    let total = 0;

    function runTask(task) {
        running++;
        task().then(result => {
            running--;
            completed++;

            // Log progress
            const percent = Math.round((completed / total) * 100);
            process.stdout.write(`\rProgress: ${completed}/${total} (${percent}%) - ${running} active tasks`);

            return result;
        }).catch(err => {
            running--;
            completed++;
            console.error('\nTask error:', err.message);
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
        onDrain: () => {}
    };

    return queue;
}

/**
 * Processes all images in the directory, compressing those that are larger than the maximum size
 * Uses parallel processing for better performance
 * @async
 * @function processImages
 * @returns {Promise<void>}
 */
async function processImages() {
    ensureDirectoriesExist();

    try {
        // Get all files in the images directory
        const files = fs.readdirSync(IMAGE_DIR);

        // Filter out directories and non-image files
        const imagePaths = files
            .filter(file => {
                const filePath = path.join(IMAGE_DIR, file);
                return fs.statSync(filePath).isFile() && isImage(file);
            })
            .map(file => path.join(IMAGE_DIR, file));

        if (imagePaths.length === 0) {
            console.log('No images found in the directory.');
            return;
        }

        console.log(`Found ${imagePaths.length} images. Processing with ${PARALLEL_LIMIT} parallel workers...`);

        // Create a processing queue with the specified concurrency
        const queue = createQueue(PARALLEL_LIMIT);

        // Results tracking
        const results = {
            compressed: [],
            skipped: [],
            errors: []
        };

        // Create a promise that resolves when all tasks are complete
        const processingComplete = new Promise(resolve => {
            queue.onDrain = resolve;
        });

        // Add all images to the queue
        for (const imagePath of imagePaths) {
            queue.add(async () => {
                const filename = path.basename(imagePath);
                const sizeInMB = getFileSizeMB(imagePath);

                if (sizeInMB <= MAX_SIZE_MB) {
                    results.skipped.push({
                        name: filename,
                        size: sizeInMB.toFixed(2)
                    });
                    return;
                }

                const result = await compressImage(imagePath);
                if (result.success) {
                    results.compressed.push({
                        name: filename,
                        originalSize: result.originalSize.toFixed(2),
                        newSize: result.newSize.toFixed(2),
                        reduction: result.reduction,
                        format: result.format
                    });
                } else if (result.skipped) {
                    results.skipped.push({
                        name: filename,
                        size: sizeInMB.toFixed(2)
                    });
                } else {
                    results.errors.push({
                        name: filename,
                        error: result.error
                    });
                }
            });
        }

        // Wait for all tasks to complete
        await processingComplete;

        // Print summary
        console.log('\n\n=== Compression Summary ===');
        console.log(`Total images processed: ${imagePaths.length}`);
        console.log(`Images compressed: ${results.compressed.length}`);
        console.log(`Images skipped (under ${MAX_SIZE_MB} MB): ${results.skipped.length}`);
        console.log(`Errors: ${results.errors.length}`);

        if (results.compressed.length > 0) {
            console.log('\nCompressed images:');
            results.compressed.forEach(img => {
                console.log(`  - ${img.name}: ${img.originalSize} MB → ${img.newSize} MB (${img.reduction}% reduction) using ${img.format}`);
            });
        }

        if (results.errors.length > 0) {
            console.log('\nErrors:');
            results.errors.forEach(img => {
                console.log(`  - ${img.name}: ${img.error}`);
            });
        }

        console.log('\nCompression complete!');
        console.log('Original images have been preserved in the /images/original/ directory.');
        console.log('Compressed images are available in the /images/ directory.');
    } catch (error) {
        console.error('Error processing images:', error.message);
    }
}

/**
 * Runs the generate-api-images.js script to update the api-images.json file
 * @function updateApiImagesJson
 * @async
 * @returns {Promise<void>}
 */
async function updateApiImagesJson() {
    try {
        console.log('\nUpdating api-images.json file...');
        // Import and run the generate-api-images.js script
        const generateApiImagesModule = await import('./generate-api-images.js');
        // The module should automatically run when imported
        console.log('api-images.json updated successfully.');
    } catch (error) {
        console.error('Error updating api-images.json:', error.message);
    }
}

// Run the scripts
async function main() {
    await processImages();
    await updateApiImagesJson();
}

main().catch(console.error);
