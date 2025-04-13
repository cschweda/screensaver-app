/**
 * @fileoverview Web Photo Screensaver Application
 *
 * A browser-based photo screensaver that displays images in fullscreen mode with smooth transitions.
 * Supports custom images, configurable display duration, and keyboard navigation.
 * Features include image selection, randomization, background color customization, and more.
 *
 * @module main
 * @author Chris Schweda
 * @version 1.0.0
 * @requires module:config
 * @requires module:style.css
 */

import './style.css';
import config from './config.js';
import { initializeToggleSwitches } from './toggle-switch.js';

/**
 * Loading Overlay Management
 * Handles the loading overlay to prevent Flash of Unstyled Content (FOUC)
 */
const loadingOverlay = document.getElementById('loading-overlay');
const mainContent = document.getElementById('main-content');

/**
 * Hides the loading overlay and shows the main content
 * @function hideLoadingOverlay
 * @returns {void}
 */
function hideLoadingOverlay() {
    // Fade out the loading overlay
    loadingOverlay.style.opacity = '0';

    // Show the main content
    mainContent.classList.remove('content-hidden');
    mainContent.style.opacity = '1';

    // Remove the overlay from the DOM after the transition
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 500); // Match the transition duration in CSS
}

/**
 * Applies configuration values to the DOM
 * @function applyConfigToDOM
 * @returns {void}
 */
function applyConfigToDOM() {
    // Set the thumbnail size CSS variable
    document.documentElement.style.setProperty('--thumbnail-size', `${config.ui.thumbnailSize}px`);
}

/**
 * DOM Elements
 * Collection of DOM element references
 * @type {Object}
 */
const thumbnailContainer = document.getElementById('thumbnail-container');
const thumbnailLoading = document.getElementById('thumbnail-loading');
const selectAllButton = document.getElementById('select-all-button');
const deselectAllButton = document.getElementById('deselect-all-button');
const emptyFolderWarning = document.getElementById('empty-folder-warning');
const durationInput = document.getElementById('duration-input');
const randomizeCheckbox = document.getElementById('randomize-checkbox');
const startButton = document.getElementById('start-button');
const fullscreenContainer = document.getElementById('fullscreen-container');
const imageDisplay = document.getElementById('image-display');
const imageInfo = document.getElementById('image-info');
const exitButton = document.getElementById('exit-button');
const restartButton = document.getElementById('restart-button');
const bgColorInput = document.getElementById('bg-color-input');
const messageBox = document.getElementById('message-box');

const loadingIndicator = document.getElementById('loading-indicator');

/**
 * State Variables
 */
/** Array to hold images from the images folder
 * @type {Object[]} */
let folderImages = [];
/** Array to hold selected images for the slideshow
 * @type {Object[]} */
let selectedImages = [];
/** Array to hold the order of images to display
 * @type {number[]} */
let displayOrder = [];
/** Current index in the display order array
 * @type {number} */
let currentOrderIndex = 0;
/** Current index in the image array being displayed
 * @type {number} */
let currentImageIndex = 0;
/** Interval ID for the slideshow
 * @type {number|null} */
let slideshowInterval;
/** Default duration in milliseconds between image transitions
 * @type {number} */
let displayDuration = 5000;

/** Flag to track if images should be displayed in random order
 * @type {boolean} */
let randomizeOrder = false;
/** Cache for preloaded images
 * @type {Object.<string, boolean>} */
let preloadedImages = {};

/**
 * Utility Functions
 */

/**
 * Displays a temporary message to the user
 * @function showMessage
 * @param {string} message - The message to display
 * @param {number} [duration=config.ui.messageDisplayDuration] - How long to show the message in milliseconds
 * @returns {void}
 */
function showMessage(message, duration = config.ui.messageDisplayDuration) {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, duration);
}

// Deprecated compressImageIfNeeded function removed - compression is now handled server-side

/**
 * Loads images from the images folder and creates thumbnails
 * First tries to load from the local images directory, then falls back to sample images
 * @function loadImagesFromFolder
 * @async
 * @returns {Promise<boolean>} - True if images were found, false otherwise
 */
async function loadImagesFromFolder() {
    try {
        // Show loading indicator
        thumbnailLoading.style.display = 'flex';

        // Clear the thumbnail container (except the loading indicator)
        Array.from(thumbnailContainer.children).forEach(child => {
            if (child !== thumbnailLoading) {
                child.remove();
            }
        });

        // First try to load images from the public/images directory
        let folderImageFiles = [];

        try {
            // Try to fetch the list of images from the JSON file
            const response = await fetch('/api-images.json');
            if (response.ok) {
                folderImageFiles = await response.json();
                console.log('Loaded images from JSON file:', folderImageFiles);
            } else {
                console.warn('Could not fetch images from JSON file, status:', response.status);
            }
        } catch (error) {
            console.warn('Could not fetch images from JSON file, using sample images instead:', error);
        }

        // If no images were found in the folder, use sample images
        if (folderImageFiles.length === 0) {
            console.log('No images found in the public/images folder, using sample images');

            // Use sample images from config
            const sampleImages = config.placeholders.sampleImages;

            // Create image objects from sample images
            folderImages = sampleImages.map(img => ({
                url: img.url,
                name: img.name,
                selected: true
            }));
        } else {
            // Create image objects from the files in the public/images directory
            folderImages = folderImageFiles.map(file => ({
                url: `/images/${file}`,
                name: file,
                selected: true
            }));

            console.log(`Found ${folderImages.length} images in the public/images folder`);
        }

        // Hide loading indicator
        thumbnailLoading.style.display = 'none';

        if (folderImages.length === 0) {
            console.log('No images found');
            emptyFolderWarning.classList.remove('hidden');
            // Update the warning message from config
            const warningText = emptyFolderWarning.querySelector('p:last-child');
            if (warningText) {
                warningText.textContent = config.ui.emptyFolderWarning;
            }
            startButton.disabled = true;
            return false;
        }

        // Hide the warning if we have images
        emptyFolderWarning.classList.add('hidden');

        // Sort images by name for consistent display
        folderImages.sort((a, b) => a.name.localeCompare(b.name));

        // Create thumbnails for each image
        folderImages.forEach((image, index) => {
            createThumbnail(image, index);
        });

        // Update the selected images array
        updateSelectedImages();

        console.log(`Found ${folderImages.length} images in the images folder`);
        return true;
    } catch (error) {
        console.error('Error loading images from folder:', error);
        // Hide loading indicator
        thumbnailLoading.style.display = 'none';
        emptyFolderWarning.classList.remove('hidden');
        startButton.disabled = true;
        return false;
    }
}

/**
 * Creates a thumbnail element for an image
 * @function createThumbnail
 * @param {Object} image - The image object
 * @param {string} image.url - The URL of the image
 * @param {string} image.name - The name of the image
 * @param {boolean} image.selected - Whether the image is selected
 * @param {number} index - The index of the image in the folderImages array
 * @returns {void}
 */
function createThumbnail(image, index) {
    // Create the thumbnail container
    const thumbnailItem = document.createElement('div');
    thumbnailItem.className = 'thumbnail-item' + (image.selected ? ' selected' : '');
    thumbnailItem.dataset.index = index;

    // Create a container for the image and loading spinner
    const imageContainer = document.createElement('div');
    imageContainer.className = 'thumbnail-image-container';

    // Create the loading spinner
    const spinner = document.createElement('div');
    spinner.className = 'thumbnail-spinner';
    spinner.innerHTML = `
        <div class="spinner-border" role="status">
            <div class="spinner-circle"></div>
        </div>
    `;

    // Create the image element
    const img = document.createElement('img');
    img.className = 'thumbnail-image';
    img.alt = image.name;
    img.loading = 'lazy'; // Lazy load images for better performance

    // Add load event to hide spinner when image loads
    img.onload = () => {
        spinner.style.display = 'none';
        img.style.opacity = '1';
    };

    // Add error handling for images
    img.onerror = () => {
        // If image fails to load, show a placeholder and hide spinner
        spinner.style.display = 'none';
        img.style.opacity = '1';
        img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23374151'/%3E%3Ctext x='75' y='75' font-family='Arial' font-size='14' fill='white' text-anchor='middle' dominant-baseline='middle'%3E${image.name}%3C/text%3E%3C/svg%3E`;
    };

    // Set the image source after setting up events
    img.src = image.url;

    // Create the checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'thumbnail-checkbox';
    checkbox.checked = image.selected;
    checkbox.addEventListener('change', (e) => {
        // Update the selected state
        folderImages[index].selected = e.target.checked;
        thumbnailItem.classList.toggle('selected', e.target.checked);

        // Update the selected images array
        updateSelectedImages();
    });

    // Create the image name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'thumbnail-name';
    nameLabel.textContent = image.name;

    // Add click event to the thumbnail (excluding the checkbox)
    thumbnailItem.addEventListener('click', (e) => {
        // Only toggle if the click wasn't on the checkbox
        if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            // Trigger the change event
            checkbox.dispatchEvent(new Event('change'));
        }
    });

    // Append elements to the image container
    imageContainer.appendChild(img);
    imageContainer.appendChild(spinner);

    // Append elements to the thumbnail
    thumbnailItem.appendChild(imageContainer);
    thumbnailItem.appendChild(checkbox);
    thumbnailItem.appendChild(nameLabel);

    // Add the thumbnail to the container
    thumbnailContainer.appendChild(thumbnailItem);
}

/**
 * Updates the selectedImages array based on the selected state of folderImages
 * @function updateSelectedImages
 * @returns {void}
 */
function updateSelectedImages() {
    selectedImages = folderImages.filter(image => image.selected);
    // Update the start button text whenever selected images change
    updateStartButtonText();
}

/**
 * Updates the start button text with the current number of selected images
 * @function updateStartButtonText
 * @returns {void}
 */
function updateStartButtonText() {
    startButton.textContent = `Start Screensaver (${selectedImages.length} photos)`;
    startButton.disabled = selectedImages.length === 0;
}

/**
 * Gets the current list of images to display
 * @function getCurrentImageList
 * @returns {Object[]} - The list of selected images
 */
function getCurrentImageList() {
    return selectedImages;
}

/**
 * Generates the display order for images based on randomization setting
 * @param {number} length - The number of images
 * @returns {number[]} - Array of indices representing the display order
 */
function generateDisplayOrder(length) {
    if (length === 0) return [];

    // Create an array of indices [0, 1, 2, ..., length-1]
    const order = Array.from({ length }, (_, i) => i);

    // If randomize is enabled, shuffle the array
    if (randomizeOrder) {
        // Fisher-Yates shuffle algorithm
        for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]]; // Swap elements
        }
    }

    return order;
}

/**
 * Gets the URL for an image at the specified index
 * @param {number} index - The index of the image
 * @returns {string} - The URL of the image
 */
function getImageUrl(index) {
    if (index < 0 || index >= selectedImages.length) return '';
    return selectedImages[index].url;
}

/**
 * Gets the name for an image at the specified index
 * @param {number} index - The index of the image
 * @returns {string} - The name of the image
 */
function getImageName(index) {
    if (index < 0 || index >= selectedImages.length) return '';
    return selectedImages[index].name;
}

/**
 * Preloads images for smoother transitions
 * @param {number} startIndex - The index to start preloading from
 * @param {number} [count=3] - How many images to preload
 */
function preloadImages(startIndex, count = 3) {
    if (selectedImages.length === 0) return;

    for (let i = 0; i < count; i++) {
        const index = (startIndex + i) % selectedImages.length;
        const imageUrl = getImageUrl(index);

        // Skip if already preloaded
        if (preloadedImages[imageUrl]) continue;

        // Create new image for preloading
        const img = new Image();
        img.onload = () => {
            preloadedImages[imageUrl] = true;
            console.log(`Preloaded image: ${imageUrl}`);
        };
        img.onerror = () => {
            console.error(`Failed to preload image: ${imageUrl}`);
        };
        img.src = imageUrl;
    }
}

/**
 * Event Listeners
 *
 * Note: The fullscreenElements variable is used in multiple places:
 * - In the displayImage function for adding/removing CSS classes
 * - In the displayImage function for appending the next image element
 * - In the handleFullscreenChange function indirectly through DOM manipulation
 */

// Handle select all button click
selectAllButton.addEventListener('click', () => {
    // Update all images to be selected
    folderImages.forEach((image, index) => {
        image.selected = true;

        // Update the UI
        const thumbnailItem = thumbnailContainer.querySelector(`.thumbnail-item[data-index="${index}"]`);
        if (thumbnailItem) {
            thumbnailItem.classList.add('selected');
            const checkbox = thumbnailItem.querySelector('.thumbnail-checkbox');
            if (checkbox) checkbox.checked = true;
        }
    });

    // Update the selected images array
    updateSelectedImages();

    showMessage("All photos selected.");
});

// Handle deselect all button click
deselectAllButton.addEventListener('click', () => {
    // Update all images to be deselected
    folderImages.forEach((image, index) => {
        image.selected = false;

        // Update the UI
        const thumbnailItem = thumbnailContainer.querySelector(`.thumbnail-item[data-index="${index}"]`);
        if (thumbnailItem) {
            thumbnailItem.classList.remove('selected');
            const checkbox = thumbnailItem.querySelector('.thumbnail-checkbox');
            if (checkbox) checkbox.checked = false;
        }
    });

    // Update the selected images array
    updateSelectedImages();

    showMessage("All photos deselected.");
});

// Handle randomize checkbox change
randomizeCheckbox.addEventListener('change', (event) => {
    randomizeOrder = event.target.checked;
    if (randomizeOrder) {
        showMessage("Photos will be displayed in random order.");
    } else {
        showMessage("Photos will be displayed in sequential order.");
    }

    // If slideshow is running, regenerate the display order
    if (slideshowInterval) {
        displayOrder = generateDisplayOrder(selectedImages.length);
        // Keep the current image but reset the order index to match
        currentOrderIndex = displayOrder.indexOf(currentImageIndex);
        if (currentOrderIndex === -1) currentOrderIndex = 0; // Fallback if not found
    }
});

// Handle duration change
durationInput.addEventListener('change', () => {
    const seconds = parseInt(durationInput.value, 10);
    if (seconds >= 1) {
        displayDuration = seconds * 1000;
        // If slideshow is running, restart it with the new duration
        if (slideshowInterval) {
            stopSlideshow();
            startSlideshow();
        }
    } else {
        durationInput.value = displayDuration / 1000; // Reset to previous valid value
        showMessage("Duration must be at least 1 second.", 4000);
    }
});

// Handle background color change
bgColorInput.addEventListener('input', (event) => {
    const color = event.target.value;
    fullscreenContainer.style.setProperty('--bg-color', color);
});

// Handle Start Button click
startButton.addEventListener('click', () => {
    const imageList = getCurrentImageList();
    if (imageList.length > 0) {
        requestFullscreen(); // Attempt to go fullscreen
    } else {
        showMessage("No images available to display.", 4000);
    }
});

// Handle Exit Button click
exitButton.addEventListener('click', () => {
    exitFullscreen();
});

// Handle Restart Button click
restartButton.addEventListener('click', () => {
    currentImageIndex = 0;
    stopSlideshow(); // Stop current cycle
    const imageList = getCurrentImageList();
    if (imageList.length > 0) {
        displayImage(currentImageIndex); // Show first image immediately (already in fullscreen)
        startSlideshow(); // Start new cycle
    }
    // Menu functionality removed - using Escape key only for exiting fullscreen
});

// Handle fullscreen change events (browser exit, e.g., Esc key)
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari

// Add keyboard controls for accessibility
document.addEventListener('keydown', (event) => {
    // Only handle keyboard events when in fullscreen
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        switch(event.key) {
            case 'ArrowRight':
            case ' ': // Space bar
                nextImage();
                break;
            case 'ArrowLeft':
                previousImage();
                break;
            case 'Escape': // Already handled by browser for exiting fullscreen
                break;
            // Menu toggle functionality removed - using Escape key only for exiting fullscreen
        }
    }
});

// Corner menu functionality removed - using Escape key only for exiting fullscreen

/**
 * Core Logic Functions
 */

/**
 * Fades out the current image
 * @function fadeOutCurrentImage
 * @returns {void}
 */
function fadeOutCurrentImage() {
    imageDisplay.classList.add('fade-out');
    imageDisplay.classList.remove('fade-in');
}

/**
 * Fades in the current image
 * @function fadeInCurrentImage
 * @returns {void}
 */
function fadeInCurrentImage() {
    imageDisplay.classList.remove('fade-out');
    imageDisplay.classList.add('fade-in');
}

/**
 * Shows the loading indicator
 * @function showLoadingIndicator
 * @returns {void}
 */
function showLoadingIndicator() {
    loadingIndicator.style.display = 'block';
}

/**
 * Hides the loading indicator
 * @function hideLoadingIndicator
 * @returns {void}
 */
function hideLoadingIndicator() {
    loadingIndicator.style.display = 'none';
}

// updateImageDisplay function removed - now handled directly in displayImage

/**
 * Handles the case when an image fails to load
 * @function handleImageLoadError
 * @param {string} imageUrl - The URL of the image that failed to load
 * @param {string} imageName - The name of the image that failed to load
 * @returns {void}
 */
function handleImageLoadError(imageUrl, imageName) {
    hideLoadingIndicator();
    console.error("Error loading image:", imageUrl);

    // Use the error image template from config
    const fallbackUrl = config.placeholders.errorImageTemplate.replace('{bgColor}', bgColorInput.value.substring(1));

    // After the fade-out is complete, update with error image
    setTimeout(() => {
        imageDisplay.src = fallbackUrl;
        imageInfo.textContent = `Error loading: ${imageName}`;
        fadeInCurrentImage();
    }, config.display.fadeTransitionDuration);
}

/**
 * Handles the case when no images are available
 * @function handleNoImages
 * @returns {void}
 */
function handleNoImages() {
    hideLoadingIndicator();
    fadeOutCurrentImage();

    setTimeout(() => {
        // Use the no images template from config
        const fallbackUrl = config.placeholders.noImagesTemplate.replace('{bgColor}', bgColorInput.value.substring(1));
        imageDisplay.src = fallbackUrl;
        imageInfo.textContent = '';
        fadeInCurrentImage();
    }, config.display.fadeTransitionDuration);
}

/**
 * Displays an image at the specified index using requestAnimationFrame for smoother transitions
 * @function displayImage
 * @param {number} index - The index of the image to display
 * @returns {void}
 */
function displayImage(index) {
    console.log(`Displaying image at index ${index}`); // Debug log
    const imageList = getCurrentImageList();
    console.log(`Current image list length: ${imageList.length}`); // Debug log

    if (index >= 0 && index < imageList.length) {
        const imageUrl = getImageUrl(index);
        const imageName = getImageName(index);
        console.log(`Loading image: ${imageName} from ${imageUrl}`); // Debug log

        showLoadingIndicator();
        fadeOutCurrentImage();

        // Create and preload the next image
        const nextImage = new Image();
        nextImage.onload = () => {
            console.log(`Image loaded successfully: ${imageUrl}`); // Debug log
            hideLoadingIndicator();

            // Update the image display directly
            imageDisplay.src = imageUrl;
            imageDisplay.alt = imageName || 'Screensaver Image';

            // Make sure the image is visible
            imageDisplay.style.display = 'block';

            // Update the image info text
            if (imageInfo) {
                imageInfo.textContent = imageName || '';
            }

            // Fade the image back in
            fadeInCurrentImage();
            console.log('Image display updated successfully'); // Debug log
        };

        nextImage.onerror = () => {
            console.error(`Failed to load image: ${imageUrl}`); // Debug log
            hideLoadingIndicator();
            handleImageLoadError(imageUrl, imageName);
        };

        nextImage.src = imageUrl;
    } else if (imageList.length === 0) {
        console.log('No images to display'); // Debug log
        handleNoImages();
    } else {
        console.error(`Invalid image index: ${index}, list length: ${imageList.length}`); // Debug log
    }
}


/**
 * Advances to the next image in the slideshow
 * @function nextImage
 * @returns {void}
 */
function nextImage() {
    if (selectedImages.length === 0) return; // Do nothing if no images

    // Move to the next position in the display order
    currentOrderIndex = (currentOrderIndex + 1) % displayOrder.length; // Loop back to 0
    currentImageIndex = displayOrder[currentOrderIndex];
    displayImage(currentImageIndex);

    // Preload the next few images
    const nextOrderIndex = (currentOrderIndex + 1) % displayOrder.length;
    const nextImageIndex = displayOrder[nextOrderIndex];
    preloadImages(nextImageIndex, 3);

    // Reset the slideshow timer to prevent immediate transition
    resetSlideshowTimer();
}

/**
 * Goes to the previous image in the slideshow
 * @function previousImage
 * @returns {void}
 */
function previousImage() {
    if (selectedImages.length === 0) return; // Do nothing if no images

    // Go to previous image in the display order, loop to end if at first image
    currentOrderIndex = (currentOrderIndex - 1 + displayOrder.length) % displayOrder.length;
    currentImageIndex = displayOrder[currentOrderIndex];
    displayImage(currentImageIndex);

    // Preload the previous few images (in case user keeps going back)
    const prevOrderIndex = (currentOrderIndex - 1 + displayOrder.length) % displayOrder.length;
    const prevImageIndex = displayOrder[prevOrderIndex];
    preloadImages(prevImageIndex, 2);

    // Reset the slideshow timer to prevent immediate transition
    resetSlideshowTimer();
}

/**
 * Resets the slideshow timer with a delay to prevent double transitions
 * @function resetSlideshowTimer
 * @returns {void}
 */
function resetSlideshowTimer() {
    // Only reset if slideshow is active
    if (slideshowInterval) {
        // Stop the current slideshow
        stopSlideshow();

        // Wait for the transition to complete before starting a new slideshow
        // This ensures no double-transitions occur
        setTimeout(() => {
            startSlideshow();
        }, 600); // Slightly longer than the transition duration (500ms)
    }
}

/**
 * Starts the slideshow with the current display duration
 * @function startSlideshow
 * @returns {void}
 */
function startSlideshow() {
    // Clear any existing interval first
    stopSlideshow();
    // Only start interval if more than one image
    if (selectedImages.length > 1) {
        slideshowInterval = setInterval(nextImage, displayDuration);
    } else if (selectedImages.length === 1) {
        // If only one image, make sure it's displayed (already handled by handleFullscreenChange)
        // No interval needed
    }
}

/**
 * Stops the slideshow by clearing the interval
 * @function stopSlideshow
 * @returns {void}
 */
function stopSlideshow() {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
}

/**
 * Requests fullscreen mode for the container
 * @function requestFullscreen
 * @returns {void}
 */
function requestFullscreen() {
    // Update duration from input just before starting
    displayDuration = parseInt(durationInput.value, 10) * 1000;
    if (isNaN(displayDuration) || displayDuration < (config.display.minDuration * 1000)) {
        displayDuration = config.display.defaultDuration * 1000; // Fallback
        durationInput.value = config.display.defaultDuration;
    }

    // Update randomize setting
    randomizeOrder = randomizeCheckbox.checked;

    // Update background color
    fullscreenContainer.style.setProperty('--bg-color', bgColorInput.value);

    // Request fullscreen on the container
    console.log("Requesting fullscreen..."); // Debug log
    if (fullscreenContainer.requestFullscreen) {
        fullscreenContainer.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            showMessage(`Could not enter fullscreen: ${err.message}`, 5000);
        });
    } else if (fullscreenContainer.webkitRequestFullscreen) { /* Safari */
        fullscreenContainer.webkitRequestFullscreen(); // Note: Safari might not return a promise or support catch easily
    } else if (fullscreenContainer.msRequestFullscreen) { /* IE11 */
        fullscreenContainer.msRequestFullscreen();
    } else {
        console.error("Fullscreen API is not supported by this browser.");
        showMessage("Fullscreen is not supported by your browser.", 5000);
    }
}

/**
 * Exits fullscreen mode
 * @function exitFullscreen
 * @returns {void}
 */
function exitFullscreen() {
    console.log("Exiting fullscreen..."); // Debug log
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
    }
}

/**
 * Handles fullscreen change events
 * @function handleFullscreenChange
 * @returns {void}
 */
function handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    console.log("Fullscreen change detected. Is fullscreen:", isFullscreen); // Debug log
    if (isFullscreen) {
        // Entered fullscreen
        if (selectedImages.length === 0) {
            // If no images are selected, exit fullscreen
            exitFullscreen();
            showMessage("No images selected. Please select at least one image.", 4000);
            return;
        }

        // Generate the display order based on randomization setting
        displayOrder = generateDisplayOrder(selectedImages.length);
        currentOrderIndex = 0;
        currentImageIndex = displayOrder[0] || 0;

        // Preload the first few images
        preloadImages(currentImageIndex, 5);

        // Display the first image immediately
        displayImage(currentImageIndex);

        // Start the slideshow
        startSlideshow();
        // Menu functionality removed - using Escape key only for exiting fullscreen
    } else {
        // Exited fullscreen
        stopSlideshow();
        // Menu functionality removed - using Escape key only for exiting fullscreen
        // Clear the preloaded images cache when exiting
        preloadedImages = {};
    }
}

// Corner menu functionality removed - using Escape key only for exiting fullscreen


/**
 * Initial Setup
 */

/**
 * Initializes the application
 * @function initializeApp
 * @async
 * @returns {Promise<void>}
 */
async function initializeApp() {
    // Apply configuration values to the DOM
    applyConfigToDOM();

    // Set initial background color variable
    bgColorInput.dispatchEvent(new Event('input'));

    // Initialize state variables
    currentImageIndex = 0;
    randomizeOrder = config.display.defaultRandomizeOrder;
    randomizeCheckbox.checked = config.display.defaultRandomizeOrder;

    // Set default duration
    durationInput.value = config.display.defaultDuration;

    // Set default background color
    bgColorInput.value = config.display.defaultBackgroundColor;

    // Initialize display order (will be regenerated when entering fullscreen)
    displayOrder = [];
    currentOrderIndex = 0;

    // Clear the display
    imageDisplay.src = ""; // Ensure image is blank initially outside fullscreen
    imageInfo.textContent = "";

    // Load images from the folder
    await loadImagesFromFolder();

    // Set up select all/deselect all buttons
    if (folderImages.length > 0) {
        showMessage(`Loaded ${folderImages.length} images from the images folder.`);
    }

    // Initialize custom UI components
    initializeToggleSwitches();

    // Update color preview when background color changes
    bgColorInput.addEventListener('input', (e) => {
        const colorPreview = document.querySelector('#controls-container .flex-1 .w-full');
        if (colorPreview) {
            colorPreview.style.backgroundColor = e.target.value;
        }
    });

    // Hide the loading overlay once everything is initialized
    hideLoadingOverlay();
}

/**
 * Event Listeners for Page Load
 */

// Run initialization when the DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Ensure the loading overlay is hidden even if there are slow resources
window.addEventListener('load', () => {
    // If initialization is complete, this will have no effect
    // If not, it ensures the overlay is hidden once all resources are loaded
    setTimeout(hideLoadingOverlay, 500);
});
