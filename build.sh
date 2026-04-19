#!/usr/bin/env bash
# Build script for Render deployment
echo "Building frontend..."
npm install
npm run build

echo "Installing backend dependencies..."
pip install -r backend/requirements.txt
