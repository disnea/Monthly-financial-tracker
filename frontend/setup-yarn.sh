#!/bin/bash

echo "🍺 Setting up Financial Tracker Frontend with Yarn..."
echo ""

# Check if brew is installed
if ! command -v brew &> /dev/null
then
    echo "❌ Homebrew is not installed."
    echo ""
    echo "Install Homebrew first:"
    echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    echo ""
    exit 1
fi

echo "✅ Homebrew found: $(brew --version | head -n 1)"
echo ""

# Check if yarn is installed, if not install it via brew
if ! command -v yarn &> /dev/null
then
    echo "📦 Yarn not found. Installing via Homebrew..."
    brew install yarn
    echo ""
else
    echo "✅ Yarn found: $(yarn --version)"
    echo ""
fi

# Check node version
if command -v node &> /dev/null
then
    echo "✅ Node found: $(node --version)"
else
    echo "⚠️  Node.js not found. Installing via Homebrew..."
    brew install node
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Installing dependencies with Yarn..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Clear yarn cache
yarn cache clean

# Install with yarn (much more reliable than npm)
yarn install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ All dependencies installed successfully with Yarn!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎉 Setup complete! You can now:"
    echo ""
    echo "   1. Start development server:"
    echo "      yarn dev"
    echo ""
    echo "   2. Or use npm:"
    echo "      npm run dev"
    echo ""
    echo "   3. Open your browser to:"
    echo "      http://localhost:3000"
    echo ""
    echo "   4. Create your first account and start tracking finances!"
    echo ""
    echo "💡 Tip: Yarn is faster and more reliable than npm!"
    echo ""
else
    echo ""
    echo "❌ Installation failed."
    echo ""
    echo "Try these alternatives:"
    echo "   1. Check internet connection"
    echo "   2. Try with VPN enabled/disabled"
    echo "   3. Manual install:"
    echo "      yarn install --network-timeout 100000"
    echo ""
    exit 1
fi
