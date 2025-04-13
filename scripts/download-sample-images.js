/**
 * @fileoverview Download Sample Images Script
 *
 * This script downloads sample large images for testing the compression utility.
 * It fetches high-quality images from Unsplash and saves them to the public/images directory.
 *
 * @module download-sample-images
 * @author Chris Schweda
 * @version 1.0.0
 *
 * Usage: yarn download-samples
 */

// Use ES modules
import fs from 'fs';
import path from 'path';
import https from 'https';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pipelineAsync = promisify(pipeline);

/**
 * Configuration constants
 * @constant {string} IMAGES_DIR - Path to the images directory
 */
const IMAGES_DIR = path.join(__dirname, '../public/images');

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
 * Downloads a single image from a URL and saves it to the images directory
 * @async
 * @function downloadImage
 * @param {string} url - The URL of the image to download
 * @param {string} filename - The filename to save the image as
 * @returns {Promise<void>} - Resolves when the download is complete
 */
async function downloadImage(url, filename) {
    const filePath = path.join(IMAGES_DIR, filename);

    // Skip if the file already exists
    if (fs.existsSync(filePath)) {
        console.log(`File already exists: ${filename}`);
        return;
    }

    console.log(`Downloading: ${filename} from ${url}`);

    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage}`));
                return;
            }

            const fileStream = fs.createWriteStream(filePath);

            fileStream.on('finish', () => {
                fileStream.close();

                // Get file size
                const stats = fs.statSync(filePath);
                const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

                console.log(`Downloaded: ${filename} (${fileSizeMB} MB)`);
                resolve();
            });

            fileStream.on('error', (err) => {
                fs.unlink(filePath, () => {}); // Delete the file if there was an error
                reject(err);
            });

            response.pipe(fileStream);
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Downloads all sample images defined in the SAMPLE_IMAGES array
 * @async
 * @function downloadAllImages
 * @returns {Promise<void>} - Resolves when all downloads are complete
 */
async function downloadAllImages() {
    ensureDirectoryExists();

    console.log(`Downloading ${SAMPLE_IMAGES.length} sample images...`);

    for (const image of SAMPLE_IMAGES) {
        try {
            await downloadImage(image.url, image.name);
        } catch (error) {
            console.error(`Error downloading ${image.name}:`, error.message);
        }
    }

    console.log('Download complete!');
}

// Run the script
downloadAllImages().catch(console.error);
