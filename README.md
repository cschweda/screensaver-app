# Web Photo Screensaver

A browser-based photo screensaver that displays custom images in fullscreen mode with smooth transitions.

Perfect for showcasing photos on any device with a web browser.

## Features

- **Image Display**: Shows your own photos or uses sample placeholder images if none are available
- **Automatic Image Compression**: Compresses images over 1MB while preserving originals
- **Customizable Settings**:
  - Adjustable display duration for each image
  - Customizable background color
  - Option to randomize image order
- **Smooth Transitions**: Fade effects between images for a professional look
- **Responsive Design**: Works on any screen size from mobile to desktop
- **User-Friendly Controls**:
  - Keyboard navigation (arrow keys, spacebar)
  - Corner menu for easy access to controls
  - Select/deselect specific images to display

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20.19.0 (specified in .nvmrc)
- [Yarn](https://yarnpkg.com/)

If you use [nvm](https://github.com/nvm-sh/nvm), you can simply run `nvm use` to switch to the correct Node.js version.

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/web-photo-screensaver.git
cd web-photo-screensaver

# Install dependencies
yarn install
```

### Adding Your Images

Place your images in the `public/images` directory. The application will automatically:

1. Detect all image files in this directory
2. Compress any images larger than 1MB
3. Store original versions in `public/images/original`
4. Use the compressed versions for display

```bash
# Optional: Download 20 sample images for testing
yarn download-samples

# If you add or remove images manually, reindex them
yarn reindex
```

### Development

```bash
# Start the development server (includes automatic image compression)
yarn dev
```

This will:
1. Generate the api-images.json file with a list of all images
2. Run the image compression script on any images over 1MB
3. Start the development server at http://localhost:3000

### Building for Production

```bash
# Build for production (includes automatic image compression)
yarn build
```

The built files will be in the `dist` directory and can be deployed to any static hosting service.

## Configuration

All application settings are centralized in the `src/config.js` file. You can customize the application by modifying these settings.

### Image Settings

| Option | Default | Description |
|--------|---------|-------------|
| `images.directory` | `/images/` | Default directory for images |
| `images.supportedFormats` | `['.jpg', '.jpeg', '.png', '.webp', '.gif']` | Supported image file formats |
| `images.maxSizeMB` | `1` | Maximum size in MB before compression |
| `images.compressionQuality` | `80` | JPEG compression quality (0-100) |
| `images.sampleImageCount` | `25` | Number of sample images to download |

### Display Settings

| Option | Default | Description |
|--------|---------|-------------|
| `display.defaultDuration` | `5` | Default display duration in seconds |
| `display.minDuration` | `1` | Minimum allowed duration in seconds |
| `display.defaultBackgroundColor` | `'#2e2e2e'` | Default background color |
| `display.fadeTransitionDuration` | `250` | Fade transition duration in milliseconds |
| `display.defaultRandomizeOrder` | `false` | Default randomize order setting |

### UI Settings

| Option | Default | Description |
|--------|---------|-------------|
| `ui.thumbnailSize` | `200` | Thumbnail size in pixels |
| `ui.menuHideDelay` | `300` | Menu hide delay in milliseconds |
| `ui.messageDisplayDuration` | `3000` | Message display duration in milliseconds |
| `ui.emptyFolderWarning` | `'Please add images to the /images/ folder to use the screensaver.'` | Empty folder warning message |

### How to Modify Configuration

To customize the application, edit the `src/config.js` file:

```javascript
// Example: Changing the thumbnail size and display duration
const config = {
  // ... other settings
  display: {
    defaultDuration: 8, // Change to 8 seconds
    // ... other display settings
  },
  ui: {
    thumbnailSize: 250, // Change to larger thumbnails
    // ... other UI settings
  }
};
```

After making changes to the configuration, restart the development server for the changes to take effect.

## Usage Guide

### Starting the Screensaver

1. Launch the application in your browser
2. Select the images you want to display (all are selected by default)
3. Adjust the display duration if desired (in seconds)
4. Toggle the "Randomize Order" option if you want images in random order
5. Click the "Start Screensaver" button

### Controls During Slideshow

- **Mouse**: Move to any corner to access the menu
- **Keyboard**:
  - **Arrow Right/Space**: Next image
  - **Arrow Left**: Previous image
  - **M**: Toggle menu visibility
  - **R**: Restart slideshow from beginning
  - **Esc**: Exit fullscreen

## Image Compression

The application includes an automatic image compression feature:

- **Target**: Only images larger than 1MB are compressed
- **Original Preservation**: Original images are preserved in `public/images/original`
- **Aspect Ratio**: Compression maintains the original aspect ratio
- **Quality**: Compression quality is adjusted based on image size
- **Manual Trigger**: Run `yarn compress` to manually compress images all images in the `public/images` directory.

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge).

## Project Structure

```
├── public/           # Public assets
│   └── images/       # Image directory
│       └── original/ # Original uncompressed images
├── scripts/          # Utility scripts
│   ├── compress-images.js    # Image compression utility
│   └── download-sample-images.js # Sample image downloader
├── src/              # Source files
│   ├── main.js       # Main JavaScript entry point
│   └── style.css     # Styles (using TailwindCSS)
├── index.html        # Main HTML file
├── vite.config.js    # Vite configuration
└── package.json      # Project dependencies and scripts
```

## License

MIT