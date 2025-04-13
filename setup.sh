#!/bin/bash

# Backup the original index.html
mv index.html index.original.html

# Move the new index.html into place
mv index.new.html index.html

echo "Setup complete! The application has been refactored to use Vite."
echo "To start the development server, run: yarn dev"
echo "To build for production, run: yarn build"
