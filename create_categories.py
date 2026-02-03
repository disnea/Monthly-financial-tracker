#!/usr/bin/env python3
"""
Script to create sample categories for the finance tracker
Run this after starting the backend services
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost/api/finance"
# You'll need to get a valid JWT token by logging in first
# For now, let's create a simple login function to get the token

def get_auth_token():
    """Get auth token by logging in with test credentials"""
    auth_url = "http://localhost/api/auth/login"
    
    # Try to login with sample credentials
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(auth_url, json=login_data)
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error during login: {e}")
        return None

def create_categories(token):
    """Create sample categories"""
    categories = [
        {
            "name": "Food & Dining",
            "type": "expense",
            "color": "#f97316",
            "icon": "utensils"
        },
        {
            "name": "Transportation",
            "type": "expense", 
            "color": "#3b82f6",
            "icon": "car"
        },
        {
            "name": "Shopping",
            "type": "expense",
            "color": "#a855f7", 
            "icon": "shopping"
        },
        {
            "name": "Utilities",
            "type": "expense",
            "color": "#10b981",
            "icon": "home"
        },
        {
            "name": "Healthcare",
            "type": "expense",
            "color": "#ef4444",
            "icon": "heart"
        },
        {
            "name": "Entertainment",
            "type": "expense",
            "color": "#ec4899",
            "icon": "film"
        }
    ]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    created_categories = []
    
    for category in categories:
        try:
            response = requests.post(f"{BASE_URL}/categories", 
                                    json=category, 
                                    headers=headers)
            
            if response.status_code == 200:
                created_category = response.json()
                created_categories.append(created_category)
                print(f"✅ Created category: {category['name']}")
            else:
                print(f"❌ Failed to create {category['name']}: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating {category['name']}: {e}")
    
    return created_categories

def list_categories(token):
    """List all categories"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/categories", headers=headers)
        if response.status_code == 200:
            categories = response.json()
            print(f"\n📋 Current categories ({len(categories)} total):")
            for cat in categories:
                print(f"  - {cat['name']} ({cat['color']}, {cat['icon']})")
            return categories
        else:
            print(f"❌ Failed to list categories: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error listing categories: {e}")
        return []

def main():
    print("🚀 Creating sample categories for Finance Tracker")
    print("=" * 50)
    
    # Get auth token
    print("🔐 Getting authentication token...")
    token = get_auth_token()
    
    if not token:
        print("\n❌ Could not get auth token. Please:")
        print("1. Make sure the auth service is running")
        print("2. Register/login with valid credentials")
        print("3. Update the login credentials in this script")
        return
    
    print("✅ Authentication successful!")
    
    # List existing categories first
    print("\n📋 Checking existing categories...")
    existing = list_categories(token)
    
    if existing:
        print(f"\n⚠️  You already have {len(existing)} categories.")
        response = input("Do you want to create the sample categories anyway? (y/N): ")
        if response.lower() != 'y':
            print("👋 Exiting...")
            return
    
    # Create categories
    print("\n🎨 Creating sample categories...")
    created = create_categories(token)
    
    if created:
        print(f"\n✅ Successfully created {len(created)} categories!")
        
        # List all categories after creation
        print("\n📋 Updated category list:")
        list_categories(token)
        
        print("\n🎉 Categories are ready! You can now:")
        print("1. Select categories when adding/editing expenses")
        print("2. Filter expenses by category in the sidebar")
        print("3. See category icons and colors on expense cards")
    else:
        print("\n❌ No categories were created. Please check the logs above.")

if __name__ == "__main__":
    main()
