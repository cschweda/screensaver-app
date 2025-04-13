import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite configuration
 * @see https://vite.dev/config/
 */
export default defineConfig({
  server: {
    port: 5173,
    open: false, // Don't automatically open browser

    // Add API endpoints for the development server
    proxy: {},

    // Setup middleware to handle image listing
    middlewares: [
      (req, res, next) => {
        // API endpoint to list images in the public/images directory
        if (req.url === '/api/images') {
          try {
            const imagesDir = path.resolve('public/images');

            // Check if the directory exists
            if (!fs.existsSync(imagesDir)) {
              res.statusCode = 404;
              res.end(JSON.stringify([]));
              return;
            }

            // Get all files in the directory
            const files = fs.readdirSync(imagesDir);

            // Filter out directories and non-image files
            const imageFiles = files.filter(file => {
              const filePath = path.join(imagesDir, file);
              const isFile = fs.statSync(filePath).isFile();
              const ext = path.extname(file).toLowerCase();
              return isFile && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
            });

            // Return the list of image files
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(imageFiles));
          } catch (error) {
            console.error('Error listing images:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to list images' }));
          }
          return;
        }

        // Continue to the next middleware
        next();
      }
    ]
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
});
