/**
 * @fileoverview Simple Download Sample Images Script
 *
 * This script downloads 20 sample images from Unsplash and saves them to the public/images directory.
 * It preserves the original filenames and updates the api-images.json file when done.
 *
 * @module download-sample-images
 * @author Chris Schweda
 * @version 2.0.0
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const IMAGES_DIR = path.join(__dirname, '../public/images');
const API_JSON_FILE = path.join(__dirname, '../public/api-images.json');

// Sample images to download - 20 high-quality images from Unsplash with their filenames
const SAMPLE_IMAGES = [
    { url: 'https://images.unsplash.com/photo-1682687982107-14492010e05e?q=80&w=3870&auto=format&fit=crop', filename: 'large1.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?q=80&w=3870&auto=format&fit=crop', filename: 'large2.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?q=80&w=3870&auto=format&fit=crop', filename: 'large3.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687220067-dced9a881b56?q=80&w=3870&auto=format&fit=crop', filename: 'large4.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687220208-22d7a2543e88?q=80&w=3870&auto=format&fit=crop', filename: 'large5.jpg' },
    { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=3870&auto=format&fit=crop', filename: 'large6.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687220305-ce8a9ab237b1?q=80&w=3870&auto=format&fit=crop', filename: 'large7.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687221080-5cb261c645cb?q=80&w=3870&auto=format&fit=crop', filename: 'large8.jpg' },
    { url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=3870&auto=format&fit=crop', filename: 'large9.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687221363-72518513620e?q=80&w=3870&auto=format&fit=crop', filename: 'large10.jpg' },
    { url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=3870&auto=format&fit=crop', filename: 'large11.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687221080-5cb261c645cb?q=80&w=3870&auto=format&fit=crop', filename: 'large12.jpg' },
    { url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=3870&auto=format&fit=crop', filename: 'large13.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687221363-72518513620e?q=80&w=3870&auto=format&fit=crop', filename: 'large14.jpg' },
    { url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=3870&auto=format&fit=crop', filename: 'large15.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687221080-5cb261c645cb?q=80&w=2070&auto=format&fit=crop', filename: 'small1.jpg' },
    { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2070&auto=format&fit=crop', filename: 'small2.jpg' },
    { url: 'https://images.unsplash.com/photo-1682687221363-72518513620e?q=80&w=2070&auto=format&fit=crop', filename: 'small3.jpg' },
    { url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=2070&auto=format&fit=crop', filename: 'small4.jpg' },
    { url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=2070&auto=format&fit=crop', filename: 'small5.jpg' }
];

/**
 * Ensures that the images directory exists, creating it if necessary
 */
function ensureDirectoryExists() {
    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
        console.log(`Created directory: ${IMAGES_DIR}`);
    }
}

/**
 * Downloads a single image from a URL and saves it to the images directory
 * @param {string} url - The URL of the image to download
 * @param {string} filename - The filename to save the image as
 * @returns {Promise<string>} - Resolves with the filename of the downloaded image
 */
async function downloadImage(url, filename) {
    const filePath = path.join(IMAGES_DIR, filename);

    console.log(`Downloading: ${filename} from ${url}`);

    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle redirects
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    console.log(`Redirecting to: ${redirectUrl}`);
                    resolve(downloadImage(redirectUrl, filename));
                    return;
                }
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(filePath);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded: ${filename}`);
                resolve(filename);
            });

            fileStream.on('error', (err) => {
                fs.unlink(filePath, () => {});
                reject(err);
            });

            response.pipe(fileStream);
        });

        request.on('error', (err) => {
            reject(err);
        });

        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error(`Download timeout for ${filename}`));
        });
    });
}

/**
 * Updates the api-images.json file with all images in the public/images directory
 */
function updateApiImagesJson() {
    try {
        // Get all files in the images directory
        const files = fs.readdirSync(IMAGES_DIR);

        // Filter for image files only
        const imageFiles = files.filter(file => {
            const filePath = path.join(IMAGES_DIR, file);
            const isFile = fs.statSync(filePath).isFile();
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
            return isFile && isImage;
        });

        // Sort alphabetically
        imageFiles.sort();

        // Write to the API JSON file
        fs.writeFileSync(API_JSON_FILE, JSON.stringify(imageFiles, null, 2));
        console.log(`Updated ${API_JSON_FILE} with ${imageFiles.length} images`);
    } catch (error) {
        console.error(`Failed to update ${API_JSON_FILE}:`, error.message);
    }
}

/**
 * Main function to download images and update the API JSON file
 */
async function main() {
    try {
        console.log('Starting download of sample images...');
        ensureDirectoryExists();

        const downloadedFiles = [];

        // Download images sequentially
        for (const image of SAMPLE_IMAGES) {
            try {
                const filename = await downloadImage(image.url, image.filename);
                downloadedFiles.push(filename);
            } catch (error) {
                console.error(`Error downloading ${image.filename}:`, error.message);
            }
        }

        console.log('\nDownload complete!');
        console.log(`Downloaded ${downloadedFiles.length} of ${SAMPLE_IMAGES.length} images`);

        // Update the api-images.json file with all images in the directory
        console.log('\nUpdating api-images.json with all images in the directory...');
        updateApiImagesJson();

        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
main();
