/**
 * @fileoverview Web Photo Screensaver Configuration
 *
 * This file contains all configurable options for the Web Photo Screensaver application.
 * Modify these settings to customize the behavior of the application.
 *
 * @module config
 * @author Chris Schweda
 * @version 1.0.0
 */

/**
 * Configuration object containing all application settings
 * @type {Object}
 */
const config = {
    /**
     * Image Settings
     * @namespace
     * @property {string} directory - Default directory for images
     * @property {string[]} supportedFormats - List of supported image file extensions
     * @property {number} maxSizeMB - Maximum size in MB before compression
     * @property {number} compressionQuality - JPEG compression quality (0-100)
     */
    images: {
        // Default directory for images
        directory: '/images/',

        // Supported image formats
        supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],

        // Maximum size in MB before compression
        maxSizeMB: 1,

        // Compression quality (0-100)
        compressionQuality: 80
    },

    /**
     * Display Settings
     * @namespace
     * @property {number} defaultDuration - Default display duration in seconds
     * @property {number} minDuration - Minimum allowed duration in seconds
     * @property {string} defaultBackgroundColor - Default background color in hex format
     * @property {number} fadeTransitionDuration - Fade transition duration in milliseconds
     * @property {boolean} defaultRandomizeOrder - Default randomize order setting
     */
    display: {
        // Default display duration in seconds
        defaultDuration: 5,

        // Minimum allowed duration in seconds
        minDuration: 1,

        // Default background color
        defaultBackgroundColor: '#2e2e2e',

        // Fade transition duration in milliseconds
        fadeTransitionDuration: 250,

        // Default randomize order setting
        defaultRandomizeOrder: false
    },

    /**
     * UI Settings
     * @namespace
     * @property {number} thumbnailSize - Thumbnail size in pixels
     * @property {number} menuHideDelay - Menu hide delay in milliseconds
     * @property {number} messageDisplayDuration - Message display duration in milliseconds
     * @property {string} emptyFolderWarning - Empty folder warning message
     */
    ui: {
        // Thumbnail size in pixels
        thumbnailSize: 200,

        // Menu hide delay in milliseconds
        menuHideDelay: 300,

        // Message display duration in milliseconds
        messageDisplayDuration: 3000,

        // Empty folder warning message
        emptyFolderWarning: 'Please add images to the /images/ folder to use the screensaver.'
    },

    /**
     * Placeholder Images
     * @namespace
     * @property {Array<Object>} sampleImages - Sample images to use when no images are found
     * @property {string} sampleImages[].name - Name of the sample image
     * @property {string} sampleImages[].url - URL of the sample image
     * @property {string} errorImageTemplate - Error image placeholder template with {bgColor} placeholder
     * @property {string} noImagesTemplate - No images available placeholder template with {bgColor} placeholder
     */
    placeholders: {
        // Sample images to use when no images are found
        sampleImages: [
            { name: 'landscape1.jpg', url: 'https://picsum.photos/800/600?random=1' },
            { name: 'portrait1.jpg', url: 'https://picsum.photos/600/800?random=2' },
            { name: 'square1.jpg', url: 'https://picsum.photos/600/600?random=3' },
            { name: 'panorama1.jpg', url: 'https://picsum.photos/1200/400?random=4' },
            { name: 'image1.jpg', url: 'https://picsum.photos/800/600?random=5' },
            { name: 'image2.jpg', url: 'https://picsum.photos/800/600?random=6' },
            { name: 'image3.jpg', url: 'https://picsum.photos/800/600?random=7' },
            { name: 'image4.jpg', url: 'https://picsum.photos/800/600?random=8' },
            { name: 'image5.jpg', url: 'https://picsum.photos/800/600?random=9' },
            { name: 'image6.jpg', url: 'https://picsum.photos/800/600?random=10' },
            { name: 'image7.jpg', url: 'https://picsum.photos/800/600?random=11' },
            { name: 'image8.jpg', url: 'https://picsum.photos/800/600?random=12' },
            { name: 'image9.jpg', url: 'https://picsum.photos/800/600?random=13' },
            { name: 'image10.jpg', url: 'https://picsum.photos/800/600?random=14' },
            { name: 'image11.jpg', url: 'https://picsum.photos/800/600?random=15' },
            { name: 'image12.jpg', url: 'https://picsum.photos/800/600?random=16' },
            { name: 'image13.jpg', url: 'https://picsum.photos/800/600?random=17' },
            { name: 'image14.jpg', url: 'https://picsum.photos/800/600?random=18' },
            { name: 'image15.jpg', url: 'https://picsum.photos/800/600?random=19' },
            { name: 'image16.jpg', url: 'https://picsum.photos/800/600?random=20' }
        ],

        // Error image placeholder template
        errorImageTemplate: 'https://placehold.co/600x400/{bgColor}/ffffff?text=Error+Loading+Image',

        // No images available placeholder template
        noImagesTemplate: 'https://placehold.co/800x600/{bgColor}/ffffff?text=No+Images+Available'
    }
};

/**
 * Export the configuration object
 * @exports config
 */
export default config;
