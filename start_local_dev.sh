#!/bin/bash

echo "========================================="
echo "FootyLabs Local Development Startup"
echo "========================================="
echo ""

# Add Docker to PATH if needed
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker command not found."
    echo "   Please ensure Docker Desktop is installed and running."
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo "❌ Docker daemon is not running."
    echo "   Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start Supabase
echo "Starting local Supabase..."
echo "NOTE: First time setup downloads ~2GB of Docker images."
echo "This can take 10-15 minutes depending on your internet speed."
echo ""

# Run in background and capture output
supabase start > /tmp/supabase_start.log 2>&1 &
SUPABASE_PID=$!

echo "Supabase is starting (PID: $SUPABASE_PID)..."
echo "Monitoring progress..."
echo ""

# Monitor the log file
while kill -0 $SUPABASE_PID 2>/dev/null; do
    # Show last relevant line from log
    tail -1 /tmp/supabase_start.log | grep -E "(Pulling|Download|Started|API URL)" && echo ""
    sleep 2
done

# Check if it succeeded
if grep -q "API URL" /tmp/supabase_start.log; then
    echo ""
    echo "========================================="
    echo "✅ Supabase started successfully!"
    echo "========================================="
    echo ""
    cat /tmp/supabase_start.log | grep -A 20 "API URL"
    echo ""
    echo "Testing migrations..."
    supabase db reset
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migrations applied successfully!"
        echo ""
        echo "You can now:"
        echo "1. View your database at: http://localhost:54323"
        echo "2. Start Next.js: npm run dev"
        echo "3. Your local player tables are ready!"
    fi
else
    echo "❌ Supabase failed to start. Check the log:"
    echo ""
    tail -20 /tmp/supabase_start.log
fi