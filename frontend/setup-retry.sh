#!/bin/bash

echo "🚀 Setting up Financial Tracker Frontend (with retry logic)..."
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo "✅ node found: $(node --version)"
echo ""

# Configure npm for better reliability
echo "⚙️  Configuring npm for better reliability..."
npm config set fetch-timeout 60000
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-retries 5
echo ""

# Clear cache first
echo "🧹 Clearing npm cache..."
npm cache clean --force
echo ""

# Install dependencies with retry logic
echo "📦 Installing dependencies (with automatic retries)..."
echo "This may take 2-5 minutes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

MAX_ATTEMPTS=3
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "🔄 Attempt $ATTEMPT of $MAX_ATTEMPTS..."
    
    npm install --progress=true --loglevel=info
    
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
        exit 0
    else
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo ""
            echo "⚠️  Attempt $ATTEMPT failed. Retrying in 5 seconds..."
            echo "   (If you have VPN, try enabling/disabling it)"
            sleep 5
            echo ""
        fi
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "❌ Installation failed after $MAX_ATTEMPTS attempts."
echo ""
echo "🔍 Troubleshooting steps:"
echo ""
echo "   1. Check your internet connection"
echo "   2. Try using a VPN or different network"
echo "   3. Use yarn instead:"
echo "      npm install -g yarn"
echo "      yarn install"
echo ""
echo "   4. Try a different npm registry:"
echo "      npm config set registry https://registry.npmmirror.com"
echo "      npm install"
echo ""
exit 1
