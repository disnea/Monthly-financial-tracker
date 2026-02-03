#!/bin/bash

# Script to create sample categories using curl
# Replace YOUR_JWT_TOKEN with an actual token from login

BASE_URL="http://localhost/api/finance"
TOKEN="YOUR_JWT_TOKEN"

echo "🚀 Creating sample categories for Finance Tracker"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Replace YOUR_JWT_TOKEN with a real token!"
echo "Get a token by logging in via the frontend or using:"
echo "curl -X POST http://localhost/api/auth/login \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}'"
echo ""

# Check if token is set
if [ "$TOKEN" = "YOUR_JWT_TOKEN" ]; then
    echo "❌ Please update the TOKEN variable with your actual JWT token"
    exit 1
fi

# Categories to create
declare -a categories=(
    "Food & Dining|#f97316|utensils"
    "Transportation|#3b82f6|car"
    "Shopping|#a855f7|shopping"
    "Utilities|#10b981|home"
    "Healthcare|#ef4444|heart"
    "Entertainment|#ec4899|film"
)

echo "🎨 Creating categories..."
echo ""

for category in "${categories[@]}"; do
    IFS='|' read -r name color icon <<< "$category"
    
    echo "Creating: $name"
    
    curl -X POST "${BASE_URL}/categories" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"${name}\",
        \"type\": \"expense\",
        \"color\": \"${color}\",
        \"icon\": \"${icon}\"
      }" \
      -w "\nStatus: %{http_code}\n" \
      -s
    
    echo ""
done

echo "✅ Done! Listing all categories..."
echo ""

curl -X GET "${BASE_URL}/categories" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || curl -X GET "${BASE_URL}/categories" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo ""
echo "🎉 Categories are ready! You can now:"
echo "1. Select categories when adding/editing expenses"
echo "2. Filter expenses by category in the sidebar" 
echo "3. See category icons and colors on expense cards"
