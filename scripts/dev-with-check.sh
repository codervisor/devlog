#!/bin/bash

# Simple dev server checker - just show what's running on common ports

echo "🔍 Checking for dev servers..."

for port in 3000 3001 3002; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "📡 Port $port is in use: http://localhost:$port"
        exit 0
    fi
done

echo ""
echo "🚀 Starting dev server on port 3000..."

# Run the actual dev command
exec "$@"
