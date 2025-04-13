/**
 * @fileoverview Image Compression Utility
 *
 * This script compresses images in the /images folder that are larger than 1MB.
 * Original images are preserved in /images/original/ directory.
 * The compression maintains original dimensions while reducing file size.
 *
 * @module compress-images
 * @author Chris Schweda
 * @version 1.0.0
 *
 * Usage: yarn compress
 */

// Use ES modules
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

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

// Configuration
const IMAGE_DIR = path.join(__dirname, '../public/images');
const ORIGINAL_DIR = path.join(IMAGE_DIR, 'original');
const MAX_SIZE_MB = config.images.maxSizeMB; // Maximum size in MB before compression
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const QUALITY = config.images.compressionQuality; // JPEG quality (0-100)
const SUPPORTED_FORMATS = config.images.supportedFormats;

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
 * Compresses an image if it's larger than the maximum size
 * @async
 * @function compressImage
 * @param {string} imagePath - The path to the image file
 * @returns {Promise<boolean>} - True if the image was compressed, false otherwise
 */
async function compressImage(imagePath) {
    const filename = path.basename(imagePath);
    const originalSize = getFileSizeMB(imagePath);

    console.log(`\nProcessing: ${filename} (${originalSize.toFixed(2)} MB)`);

    // Skip if already compressed
    if (originalSize <= MAX_SIZE_MB) {
        console.log(`  Skipping: Image is already under ${MAX_SIZE_MB} MB`);
        return false;
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
        // Determine compression settings based on size
        let compressionQuality = QUALITY;

        // For very large images, apply more aggressive compression quality
        // but maintain original dimensions
        if (originalSize > 10) {
            compressionQuality = 60;
        } else if (originalSize > 5) {
            compressionQuality = 70;
        } else if (originalSize > 2) {
            compressionQuality = 75;
        }

        // Process the image with sharp
        const image = sharp(imagePath);
        const metadata = await image.metadata();

        // Log the original dimensions that we're preserving
        console.log(`  Maintaining original dimensions: ${metadata.width}x${metadata.height}`);
        console.log(`  Applying compression quality: ${compressionQuality}%`);

        // Compress and save
        await image
            .jpeg({ quality: compressionQuality })
            .toFile(imagePath + '.temp');

        // Replace the original with the compressed version
        fs.unlinkSync(imagePath);
        fs.renameSync(imagePath + '.temp', imagePath);

        // Get new size
        const newSize = getFileSizeMB(imagePath);
        const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

        console.log(`  Compressed: ${filename}`);
        console.log(`  Original: ${originalSize.toFixed(2)} MB, New: ${newSize.toFixed(2)} MB (${reduction}% reduction)`);

        return true;
    } catch (error) {
        console.error(`  Error compressing ${filename}:`, error.message);
        return false;
    }
}

/**
 * Processes all images in the directory, compressing those that are larger than the maximum size
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

        console.log(`Found ${imagePaths.length} images. Processing...`);

        let compressedCount = 0;
        let skippedCount = 0;
        const skippedImages = [];
        const compressedImages = [];

        // Process each image
        for (const imagePath of imagePaths) {
            const filename = path.basename(imagePath);
            const sizeInMB = getFileSizeMB(imagePath);

            if (sizeInMB <= MAX_SIZE_MB) {
                console.log(`Skipping: ${filename} (${sizeInMB.toFixed(2)} MB) - Already under ${MAX_SIZE_MB} MB`);
                skippedCount++;
                skippedImages.push({ name: filename, size: sizeInMB.toFixed(2) });
                continue;
            }

            const wasCompressed = await compressImage(imagePath);
            if (wasCompressed) {
                compressedCount++;
                compressedImages.push(filename);
            }
        }

        // Print summary
        console.log('\n=== Compression Summary ===');
        console.log(`Total images processed: ${imagePaths.length}`);
        console.log(`Images compressed: ${compressedCount}`);
        console.log(`Images skipped (under ${MAX_SIZE_MB} MB): ${skippedCount}`);

        if (skippedCount > 0) {
            console.log('\nSkipped images (under 1MB):');
            skippedImages.forEach(img => {
                console.log(`  - ${img.name} (${img.size} MB)`);
            });
        }

        if (compressedCount > 0) {
            console.log('\nCompressed images:');
            compressedImages.forEach(name => {
                console.log(`  - ${name}`);
            });
        }

        console.log('\nCompression complete!');
        console.log('Original images have been preserved in the /images/original/ directory.');
        console.log('Compressed images are available in the /images/ directory.');

    } catch (error) {
        console.error('Error processing images:', error);
    }
}

// Run the script
processImages().catch(console.error);
