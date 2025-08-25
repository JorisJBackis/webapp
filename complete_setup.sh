#!/bin/bash

echo "======================================="
echo "FootyLabs Local Development Setup"
echo "======================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop:"
    echo "   1. Download from: https://www.docker.com/products/docker-desktop/"
    echo "   2. Install and open Docker Desktop"
    echo "   3. Run this script again"
    exit 1
fi

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "⚠️  Docker is installed but not running."
    echo "   Starting Docker Desktop..."
    open -a Docker
    echo "   Waiting for Docker to start (30 seconds)..."
    sleep 30
    
    if ! docker ps &> /dev/null; then
        echo "❌ Docker still not running. Please ensure Docker Desktop is running."
        exit 1
    fi
fi

echo "✅ Docker is running"
echo ""

# Start Supabase
echo "Starting local Supabase..."
echo "This may take 5-10 minutes on first run to download images..."
echo ""

supabase start

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================="
    echo "✅ Local Supabase is running!"
    echo "======================================="
    echo ""
    echo "Access your local services:"
    echo "  Studio UI: http://localhost:54323"
    echo "  API:       http://localhost:54321"
    echo ""
    echo "Testing migration..."
    echo ""
    
    # Test migration
    supabase db reset
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration applied successfully!"
        echo ""
        echo "You can now:"
        echo "1. View your tables at: http://localhost:54323"
        echo "2. Start developing the player features"
        echo "3. Run 'npm run dev' to start Next.js with local Supabase"
    else
        echo "❌ Migration failed. Check the error above."
    fi
else
    echo "❌ Failed to start Supabase. Check Docker is running."
fi