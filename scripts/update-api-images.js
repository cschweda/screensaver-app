/**
 * @fileoverview Update API Images JSON
 *
 * This script scans the public/images directory and generates a JSON file
 * containing a list of all image files. The JSON file is used by the application
 * to load images without requiring a server-side API.
 *
 * @module update-api-images
 * @author Chris Schweda
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const IMAGES_DIR = path.join(__dirname, '../public/images');
const API_JSON_FILE = path.join(__dirname, '../public/api-images.json');

/**
 * Updates the api-images.json file with all images in the public/images directory
 */
function updateApiImagesJson() {
    try {
        console.log('Updating api-images.json...');
        
        // Check if the images directory exists
        if (!fs.existsSync(IMAGES_DIR)) {
            console.warn(`Images directory not found: ${IMAGES_DIR}`);
            // Create an empty JSON file
            fs.writeFileSync(API_JSON_FILE, JSON.stringify([], null, 2));
            console.log('Created empty api-images.json file');
            return;
        }
        
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
        process.exit(1);
    }
}

// Run the script
updateApiImagesJson();
process.exit(0);
