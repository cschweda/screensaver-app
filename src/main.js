/**
 * Web Photo Screensaver Application
 *
 * A browser-based photo screensaver that displays images in fullscreen mode with smooth transitions.
 * Supports custom images, configurable display duration, and keyboard navigation.
 *
 * @author Chris Schweda
 * @version 1.0.0
 */

import './style.css';

/**
 * Loading Overlay Management
 * Handles the loading overlay to prevent Flash of Unstyled Content (FOUC)
 */
const loadingOverlay = document.getElementById('loading-overlay');
const mainContent = document.getElementById('main-content');

/**
 * Hides the loading overlay and shows the main content
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
 * DOM Elements
 * @type {Object} Collection of DOM element references
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
const cornerMenu = document.getElementById('corner-menu');
const exitButton = document.getElementById('exit-button');
const restartButton = document.getElementById('restart-button');
const cornerZones = document.querySelectorAll('.corner-zone');
const bgColorInput = document.getElementById('bg-color-input');
const messageBox = document.getElementById('message-box');
// Container for fullscreen elements - used in multiple functions for DOM manipulation
// This variable is used in displayImage() function for adding/removing CSS classes and DOM manipulation
// The IDE may show a warning that it's unused, but it is actually used in the code
const fullscreenElements = document.getElementById('fullscreen-elements');
const loadingIndicator = document.getElementById('loading-indicator');

/**
 * State Variables
 */
/** @type {Object[]} Array to hold images from the images folder */
let folderImages = [];
/** @type {Object[]} Array to hold selected images for the slideshow */
let selectedImages = [];
/** @type {number[]} Array to hold the order of images to display */
let displayOrder = [];
/** @type {number} Current index in the display order array */
let currentOrderIndex = 0;
/** @type {number} Current index in the image array being displayed */
let currentImageIndex = 0;
/** @type {number|null} Interval ID for the slideshow */
let slideshowInterval;
/** @type {number} Default duration in milliseconds between image transitions */
let displayDuration = 5000;
/** @type {number|null} Timeout ID for hiding the menu */
let menuTimeout;
/** @type {boolean} Flag to track if images should be displayed in random order */
let randomizeOrder = false;
/** @type {Object.<string, boolean>} Cache for preloaded images */
let preloadedImages = {};

/**
 * Utility Functions
 */

/**
 * Displays a temporary message to the user
 * @param {string} message - The message to display
 * @param {number} [duration=3000] - How long to show the message in milliseconds
 */
function showMessage(message, duration = 3000) {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, duration);
}

/**
 * Compresses an image if it's larger than the specified size
 * @param {string} imageUrl - The URL of the image to compress
 * @param {string} imageName - The name of the image
 * @param {number} [maxSizeInMB=1] - Maximum size in MB before compression
 * @returns {Promise<Object>} - Object containing the compressed image URL and metadata
 */
async function compressImageIfNeeded(imageUrl, imageName, maxSizeInMB = 1) {
    try {
        // Fetch the image to check its size
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const originalSizeInMB = blob.size / (1024 * 1024);

        // If the image is smaller than the max size, return the original
        if (originalSizeInMB <= maxSizeInMB) {
            return {
                url: imageUrl,
                name: imageName,
                size: originalSizeInMB.toFixed(2),
                compressed: false
            };
        }

        // Create an image element to load the image
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Create a canvas to compress the image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate the new dimensions while maintaining aspect ratio
                // For large images, we'll reduce the dimensions to improve compression
                let width = img.width;
                let height = img.height;

                // Scale down very large images more aggressively
                const scaleFactor = originalSizeInMB > 5 ? 0.5 : 0.7;

                width = Math.floor(width * scaleFactor);
                height = Math.floor(height * scaleFactor);

                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;

                // Draw the image on the canvas with the new dimensions
                ctx.drawImage(img, 0, 0, width, height);

                // Convert the canvas to a Blob with reduced quality
                const quality = originalSizeInMB > 5 ? 0.6 : 0.8;

                canvas.toBlob((compressedBlob) => {
                    if (!compressedBlob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }

                    // Create a URL for the compressed blob
                    const compressedUrl = URL.createObjectURL(compressedBlob);
                    const compressedSizeInMB = compressedBlob.size / (1024 * 1024);

                    // Return the compressed image info
                    resolve({
                        url: compressedUrl,
                        name: `${imageName} (compressed)`,
                        originalSize: originalSizeInMB.toFixed(2),
                        size: compressedSizeInMB.toFixed(2),
                        compressed: true,
                        compressionRatio: (originalSizeInMB / compressedSizeInMB).toFixed(1)
                    });
                }, 'image/jpeg', quality);
            };

            img.onerror = () => {
                reject(new Error(`Failed to load image: ${imageName}`));
            };

            img.src = imageUrl;
        });
    } catch (error) {
        console.error('Error compressing image:', error);
        // Return the original image if compression fails
        return {
            url: imageUrl,
            name: imageName,
            compressed: false
        };
    }
}

/**
 * Loads images from the images folder and creates thumbnails
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
            // Try to fetch the list of images from the public/images directory
            const response = await fetch('/api/images');
            if (response.ok) {
                folderImageFiles = await response.json();
            }
        } catch (error) {
            console.warn('Could not fetch images from API, using sample images instead:', error);
        }

        // If no images were found in the folder, use sample images
        if (folderImageFiles.length === 0) {
            console.log('No images found in the public/images folder, using sample images');

            // Sample image URLs using placeholder services
            const sampleImages = [
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
            ];

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
 * @param {Object} image - The image object
 * @param {number} index - The index of the image in the folderImages array
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
 */
function updateSelectedImages() {
    selectedImages = folderImages.filter(image => image.selected);
    // Update the start button text whenever selected images change
    updateStartButtonText();
}

/**
 * Updates the start button text with the current number of selected images
 */
function updateStartButtonText() {
    startButton.textContent = `Start Screensaver (${selectedImages.length} photos)`;
    startButton.disabled = selectedImages.length === 0;
}

/**
 * Gets the current list of images to display
 * @returns {Array} - The list of selected images
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
    hideMenu(); // Hide menu after action
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
            case 'm':
            case 'M':
                // Toggle menu
                if (cornerMenu.style.display === 'block') {
                    hideMenu();
                } else {
                    showMenu();
                }
                break;
        }
    }
});

// Handle mouse entering corner zones (only in fullscreen)
cornerZones.forEach(zone => {
    zone.addEventListener('mouseenter', () => {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            showMenu();
        }
    });
});

// Handle mouse leaving the menu itself
cornerMenu.addEventListener('mouseleave', () => {
    hideMenu();
});

/**
 * Core Logic Functions
 */

/**
 * Displays an image at the specified index
 * @param {number} index - The index of the image to display
 */
function displayImage(index) {
    const imageList = getCurrentImageList();

    if (index >= 0 && index < imageList.length) {
        const imageUrl = getImageUrl(index);
        const imageName = getImageName(index);

        // Show loading indicator
        loadingIndicator.style.display = 'block';

        // First fade out the current image
        imageDisplay.classList.add('fade-out');
        imageDisplay.classList.remove('fade-in');

        // Create and preload the next image
        const nextImage = new Image();
        nextImage.onload = () => {
            // Hide loading indicator once image is loaded
            loadingIndicator.style.display = 'none';

            // After the fade-out is complete, update the image and fade it back in
            setTimeout(() => {
                // Update the image source and info
                imageDisplay.src = imageUrl;
                imageDisplay.alt = imageName;
                imageInfo.textContent = imageName;

                // Calculate optimal size for the image based on its natural dimensions
                // This will be handled by CSS now with our improved layout

                // Fade the image back in
                imageDisplay.classList.remove('fade-out');
                imageDisplay.classList.add('fade-in');
            }, 250); // Half the transition time for a smoother experience
        };

        nextImage.onerror = () => {
            // Hide loading indicator on error
            loadingIndicator.style.display = 'none';

            console.error("Error loading image:", imageUrl);
            const fallbackUrl = `https://placehold.co/600x400/${bgColorInput.value.substring(1)}/ffffff?text=Error+Loading+Image`;

            // After the fade-out is complete, update with error image
            setTimeout(() => {
                imageDisplay.src = fallbackUrl;
                imageInfo.textContent = `Error loading: ${imageName}`;

                // Fade the image back in
                imageDisplay.classList.remove('fade-out');
                imageDisplay.classList.add('fade-in');
            }, 250);
        };

        nextImage.src = imageUrl;

    } else if (imageList.length === 0) {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';

        // Fade out current image
        imageDisplay.classList.add('fade-out');
        imageDisplay.classList.remove('fade-in');

        setTimeout(() => {
            const fallbackUrl = `https://placehold.co/800x600/${bgColorInput.value.substring(1)}/ffffff?text=No+Images+Available`;
            imageDisplay.src = fallbackUrl;
            imageInfo.textContent = '';

            // Fade the image back in
            imageDisplay.classList.remove('fade-out');
            imageDisplay.classList.add('fade-in');
        }, 250);
    }
}


/**
 * Advances to the next image in the slideshow
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
 */
function stopSlideshow() {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
}

/**
 * Requests fullscreen mode for the container
 */
function requestFullscreen() {
    // Update duration from input just before starting
    displayDuration = parseInt(durationInput.value, 10) * 1000;
    if (isNaN(displayDuration) || displayDuration < 1000) {
        displayDuration = 5000; // Fallback
        durationInput.value = 5;
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
        hideMenu(); // Ensure menu is hidden initially
    } else {
        // Exited fullscreen
        stopSlideshow();
        hideMenu(); // Ensure menu is hidden
        // Clear the preloaded images cache when exiting
        preloadedImages = {};
    }
}

/**
 * Shows the corner menu
 */
function showMenu() {
    clearTimeout(menuTimeout); // Clear any pending hide timeout
    cornerMenu.style.display = 'block';
}

/**
 * Hides the corner menu with a slight delay
 */
function hideMenu() {
    // Hide slightly delayed to allow moving mouse from zone to menu
    menuTimeout = setTimeout(() => {
        cornerMenu.style.display = 'none';
    }, 300); // 300ms delay
}

// Prevent mouse leaving menu from immediately hiding if re-entering quickly
cornerMenu.addEventListener('mouseenter', () => {
    clearTimeout(menuTimeout);
});


/**
 * Initial Setup
 */

/**
 * Initializes the application
 */
async function initializeApp() {
    // Set initial background color variable
    bgColorInput.dispatchEvent(new Event('input'));

    // Initialize state variables
    currentImageIndex = 0;
    randomizeOrder = false;
    randomizeCheckbox.checked = false;

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
