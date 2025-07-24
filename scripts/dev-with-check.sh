#!/bin/bash

# Dev server checker - verify what's actually running on port 3000

echo "🔍 Checking for dev servers..."

if lsof -ti:3000 > /dev/null 2>&1; then
    echo "📡 Port 3000 is in use:"
    
    # Get detailed process information
    process_info=$(lsof -i:3000 -P -n | grep LISTEN)
    
    if echo "$process_info" | grep -q "node\|npm\|pnpm\|next"; then
        echo "✅ Dev server detected on port 3000"
        echo "   Process: $(echo "$process_info" | awk '{print $1, $2, $9}')"
        
        # Check if it's specifically a Next.js dev server
        if pgrep -f "next dev" > /dev/null; then
            echo "   Type: Next.js development server"
        elif pgrep -f "dev:web" > /dev/null; then
            echo "   Type: Web development server"
        else
            echo "   Type: Node.js application"
        fi
        
        echo ""
        echo "🌐 Your dev server is available at: http://localhost:3000"
        echo "💡 Use this running server instead of starting a new one"
        exit 0
    else
        echo "⚠️  Port 3000 is occupied by a non-dev process:"
        echo "   Process: $(echo "$process_info" | awk '{print $1, $2, $9}')"
        echo ""
        echo "❌ Cannot start dev server - port conflict detected"
        echo "💡 Kill the process or use a different port"
        exit 1
    fi
fi

echo "✅ Port 3000 is available"
echo ""
echo "🚀 Starting dev server on port 3000..."

# Run the actual dev command
exec "$@"
