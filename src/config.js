/**
 * @fileoverview Web Photo Screensaver Configuration
 *
 * This file contains all configurable options for the Web Photo Screensaver application.
 * Modify these settings to customize the behavior of the application.
 *
 * @module config
 * @author Chris Schweda
 * @version 1.1.0
 */

/**
 * Base configuration object containing all application settings
 * @type {Object}
 */
const baseConfig = {
    /**
     * Image Settings
     * @namespace
     * @property {string} directory - Default directory for images
     * @property {string[]} supportedFormats - List of supported image file extensions
     * @property {number} maxSizeMB - Maximum size in MB before compression
     * @property {number} compressionQuality - JPEG compression quality (0-100)
     * @property {number} sampleImageCount - Number of sample images to download
     */
    images: {
        // Default directory for images
        directory: '/images/',

        // Supported image formats
        supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],

        // Maximum size in MB before compression
        maxSizeMB: 1,

        // Compression quality (0-100)
        compressionQuality: 80,

        // Number of sample images to download
        sampleImageCount: 25
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
 * Determines the current environment
 * @returns {string} The current environment (development, production, or test)
 */
function getCurrentEnvironment() {
    // Check if we're in a Node.js environment
    const isNode = typeof window === 'undefined' && typeof process !== 'undefined';

    // Node.js environment
    if (isNode) {
        if (process.env && process.env.NODE_ENV) {
            return process.env.NODE_ENV;
        }
        // Default to development in Node.js if not specified
        return 'development';
    }

    // Browser environment
    else {
        // Check for environment variables (when using bundlers that support it)
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
            return process.env.NODE_ENV;
        }

        // Check for URL parameters (useful for testing)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('env')) {
            return urlParams.get('env');
        }

        // Default to development if running on localhost, otherwise production
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'development'
            : 'production';
    }
}

/**
 * Validates a configuration value against its schema
 * @param {*} value - The value to validate
 * @param {Object} schema - The schema to validate against
 * @param {string} path - The path to the value in the configuration
 * @returns {Array<string>} - Array of error messages, empty if valid
 */
function validateValue(value, schema, path) {
    const errors = [];

    if (schema.required && (value === undefined || value === null)) {
        errors.push(`${path} is required`);
        return errors;
    }

    if (value === undefined || value === null) {
        return errors; // Skip validation for optional undefined/null values
    }

    switch (schema.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push(`${path} must be a string`);
            } else if (schema.pattern && !schema.pattern.test(value)) {
                errors.push(`${path} must match pattern ${schema.pattern}`);
            }
            break;

        case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
                errors.push(`${path} must be a number`);
            } else {
                if (schema.min !== undefined && value < schema.min) {
                    errors.push(`${path} must be at least ${schema.min}`);
                }
                if (schema.max !== undefined && value > schema.max) {
                    errors.push(`${path} must be at most ${schema.max}`);
                }
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push(`${path} must be a boolean`);
            }
            break;

        case 'array':
            if (!Array.isArray(value)) {
                errors.push(`${path} must be an array`);
            } else if (schema.itemType && value.length > 0) {
                // Validate array items if itemType is specified
                value.forEach((item, index) => {
                    if (typeof item !== schema.itemType) {
                        errors.push(`${path}[${index}] must be a ${schema.itemType}`);
                    }
                });
            }
            break;

        case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                errors.push(`${path} must be an object`);
            }
            break;
    }

    return errors;
}

/**
 * Validates the entire configuration against the schema
 * @param {Object} config - The configuration to validate
 * @param {Object} schema - The schema to validate against
 * @returns {Array<string>} - Array of error messages, empty if valid
 */
function validateConfig(config, schema) {
    const errors = [];

    function validateObject(obj, schemaObj, path = '') {
        for (const key in schemaObj) {
            const currentPath = path ? `${path}.${key}` : key;
            const currentSchema = schemaObj[key];

            if (typeof currentSchema === 'object' && !currentSchema.type) {
                // This is a nested schema, recurse
                if (!obj[key] && currentSchema.required) {
                    errors.push(`${currentPath} is required`);
                } else if (obj[key]) {
                    validateObject(obj[key], currentSchema, currentPath);
                }
            } else {
                // This is a leaf schema, validate the value
                const valueErrors = validateValue(obj[key], currentSchema, currentPath);
                errors.push(...valueErrors);
            }
        }
    }

    validateObject(config, schema);
    return errors;
}

/**
 * Deep merges two objects
 * @param {Object} target - The target object
 * @param {Object} source - The source object
 * @returns {Object} - The merged object
 */
function deepMerge(target, source) {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
    }

    return output;
}

/**
 * Checks if a value is an object
 * @param {*} item - The value to check
 * @returns {boolean} - True if the value is an object, false otherwise
 */
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Schema definitions for configuration validation
 * @type {Object}
 */
const configSchema = {
    images: {
        directory: { type: 'string', required: true },
        supportedFormats: { type: 'array', required: true, itemType: 'string' },
        maxSizeMB: { type: 'number', required: true, min: 0.1, max: 10 },
        compressionQuality: { type: 'number', required: true, min: 1, max: 100 },
        sampleImageCount: { type: 'number', required: true, min: 5, max: 100 }
    },
    display: {
        defaultDuration: { type: 'number', required: true, min: 1, max: 60 },
        minDuration: { type: 'number', required: true, min: 0.5, max: 10 },
        defaultBackgroundColor: { type: 'string', required: true, pattern: /^#[0-9A-Fa-f]{6}$/ },
        fadeTransitionDuration: { type: 'number', required: true, min: 50, max: 1000 },
        defaultRandomizeOrder: { type: 'boolean', required: true }
    },
    ui: {
        thumbnailSize: { type: 'number', required: true, min: 50, max: 500 },
        menuHideDelay: { type: 'number', required: true, min: 0, max: 1000 },
        messageDisplayDuration: { type: 'number', required: true, min: 500, max: 10000 },
        emptyFolderWarning: { type: 'string', required: true }
    },
    placeholders: {
        sampleImages: { type: 'array', required: true },
        errorImageTemplate: { type: 'string', required: true },
        noImagesTemplate: { type: 'string', required: true }
    }
};

/**
 * Environment-specific configurations
 * @type {Object}
 */
const environments = {
    development: {
        images: {
            directory: '/images/',
            maxSizeMB: 2, // More lenient in development
            compressionQuality: 90, // Higher quality in development
            sampleImageCount: 30 // More sample images in development
        },
        ui: {
            messageDisplayDuration: 5000 // Longer messages in development
        }
    },
    production: {
        images: {
            maxSizeMB: 1, // Stricter in production
            compressionQuality: 80, // Balance quality and size in production
            sampleImageCount: 20 // Fewer sample images in production
        },
        ui: {
            messageDisplayDuration: 3000 // Standard message duration in production
        }
    },
    test: {
        // Test-specific overrides
        display: {
            defaultDuration: 2, // Faster transitions for testing
            fadeTransitionDuration: 100 // Faster fades for testing
        }
    }
};

// Get the current environment
const currentEnv = getCurrentEnvironment();

// Merge the base config with environment-specific overrides
let config = baseConfig;
if (environments[currentEnv]) {
    config = deepMerge(baseConfig, environments[currentEnv]);
}

// Validate the final configuration
const validationErrors = validateConfig(config, configSchema);
if (validationErrors.length > 0) {
    console.error('Configuration validation errors:', validationErrors);
    // In development, throw an error to make validation issues obvious
    if (currentEnv === 'development') {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
    }
}

/**
 * Export the configuration object
 * @exports config
 */
export default config;
