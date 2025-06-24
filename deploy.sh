#!/bin/bash

# Kinobi Deployment Script for Val Town
# This script prepares your project for deployment to Val Town

set -e

echo "🚀 Preparing Kinobi for Val Town deployment..."

# Create deployment directory
DEPLOY_DIR="kinobi-deploy"
rm -rf $DEPLOY_DIR
mkdir $DEPLOY_DIR

echo "📁 Creating deployment bundle..."

# Copy only the necessary source files
mkdir -p $DEPLOY_DIR/src
# Copy all files from src except test files, .DS_Store, and kinobi_alpha.png
rsync -av --exclude='*.test.ts' --exclude='*.test.js' --exclude='.DS_Store' --exclude='kinobi_alpha.png' src/ $DEPLOY_DIR/src/

# Copy only the required root files
cp kinobi_alpha.gif $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp bun.lockb $DEPLOY_DIR/
cp val.json $DEPLOY_DIR/

# Remove any README or non-essential files from the deploy dir
rm -f $DEPLOY_DIR/README.md

# Print summary and next steps
echo "✅ Deployment bundle created in: $DEPLOY_DIR"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://val.town"
echo "2. Create a new val"
echo "3. Upload all files from the $DEPLOY_DIR folder"
echo "4. Set entrypoint to: src/server.ts"
echo "5. Set runtime to: bun"
echo "6. Deploy!"
echo ""
echo "🎉 Your Kinobi app will be live at: https://your-username.kinobi.val.town" 