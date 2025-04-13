/**
 * @fileoverview Generate API Images JSON
 *
 * This script scans the public/images directory and generates a JSON file
 * containing a list of all image files. The JSON file is used by the application
 * to load images without requiring a server-side API.
 *
 * @module generate-api-images
 * @author Chris Schweda
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
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
            supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tiff', '.tif']
        }
    };
}

// Configuration
const IMAGE_DIR = path.join(__dirname, '../public/images');
const API_JSON_FILE = path.join(__dirname, '../public/api-images.json');
const SUPPORTED_FORMATS = config.images.supportedFormats;

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
 * Generates the api-images.json file
 * @function generateApiImagesJson
 * @async
 * @returns {Promise<void>}
 */
async function generateApiImagesJson() {
    try {
        console.log('Generating api-images.json...');
        
        // Check if the images directory exists
        if (!fs.existsSync(IMAGE_DIR)) {
            console.warn(`Images directory not found: ${IMAGE_DIR}`);
            // Create an empty JSON file
            fs.writeFileSync(API_JSON_FILE, JSON.stringify([], null, 2));
            console.log('Created empty api-images.json file');
            return;
        }
        
        // Get all files in the images directory
        const files = fs.readdirSync(IMAGE_DIR);
        
        // Filter out directories and non-image files
        const imageFiles = files.filter(file => {
            const filePath = path.join(IMAGE_DIR, file);
            return fs.statSync(filePath).isFile() && isImage(file);
        });
        
        // Sort the files alphabetically
        imageFiles.sort((a, b) => a.localeCompare(b));
        
        // Write the JSON file
        fs.writeFileSync(API_JSON_FILE, JSON.stringify(imageFiles, null, 2));
        
        console.log(`Generated api-images.json with ${imageFiles.length} images`);
    } catch (error) {
        console.error('Error generating api-images.json:', error.message);
    }
}

// Run the script
generateApiImagesJson().catch(console.error);
