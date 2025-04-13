/**
 * @fileoverview Toggle Switch Functionality
 * 
 * Handles the custom toggle switch UI for checkboxes
 * 
 * @module toggle-switch
 * @author Chris Schweda
 * @version 1.0.0
 */

/**
 * Initialize toggle switches
 * This function sets up the custom toggle switch UI for checkboxes
 */
export function initializeToggleSwitches() {
    // Find the randomize checkbox
    const randomizeCheckbox = document.getElementById('randomize-checkbox');
    
    if (randomizeCheckbox) {
        // Get the dot element (the circle that moves in the toggle)
        const dotElement = randomizeCheckbox.parentElement.querySelector('.dot');
        
        // Get the background track element
        const trackElement = randomizeCheckbox.parentElement.querySelector('.block');
        
        // Set initial state
        updateToggleState(randomizeCheckbox, dotElement, trackElement);
        
        // Add change event listener
        randomizeCheckbox.addEventListener('change', () => {
            updateToggleState(randomizeCheckbox, dotElement, trackElement);
        });
        
        // Add click event to the parent label to toggle the checkbox
        randomizeCheckbox.parentElement.addEventListener('click', (e) => {
            // Prevent default to avoid double toggling
            e.preventDefault();
            
            // Toggle the checkbox
            randomizeCheckbox.checked = !randomizeCheckbox.checked;
            
            // Dispatch change event
            randomizeCheckbox.dispatchEvent(new Event('change'));
        });
    }
}

/**
 * Update the visual state of a toggle switch
 * @param {HTMLInputElement} checkbox - The checkbox element
 * @param {HTMLElement} dotElement - The dot element that moves
 * @param {HTMLElement} trackElement - The track background element
 */
function updateToggleState(checkbox, dotElement, trackElement) {
    if (checkbox.checked) {
        dotElement.classList.add('translate-x-6');
        trackElement.classList.remove('bg-gray-300', 'dark:bg-gray-600');
        trackElement.classList.add('bg-blue-500', 'dark:bg-blue-600');
    } else {
        dotElement.classList.remove('translate-x-6');
        trackElement.classList.add('bg-gray-300', 'dark:bg-gray-600');
        trackElement.classList.remove('bg-blue-500', 'dark:bg-blue-600');
    }
}
