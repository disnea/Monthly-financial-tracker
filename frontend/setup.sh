#!/bin/bash

echo "🚀 Setting up Financial Tracker Frontend..."
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo "✅ node found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "This may take 2-5 minutes depending on your internet speed..."
echo ""
echo "Installing packages (you'll see progress below):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run npm install with progress output
npm install --progress=true --loglevel=info

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All dependencies installed successfully!"
    echo ""
    echo "🎉 Setup complete! You can now:"
    echo ""
    echo "   1. Start development server:"
    echo "      npm run dev"
    echo ""
    echo "   2. Open your browser to:"
    echo "      http://localhost:3000"
    echo ""
    echo "   3. Create your first account and start tracking finances!"
    echo ""
else
    echo ""
    echo "❌ Installation failed. Please check the error messages above."
    echo ""
    echo "Common fixes:"
    echo "   - Delete node_modules folder and try again"
    echo "   - Clear npm cache: npm cache clean --force"
    echo "   - Update npm: npm install -g npm@latest"
    echo ""
    exit 1
fi
