#!/bin/bash
# dev-server.sh - Unified Development Server Start Script
# Usage: ./dev-server.sh [port] [npm script]
# Examples:
#   ./dev-server.sh           # Start on default port 5173
#   ./dev-server.sh 18789      # Start on port 18789
#   ./dev-server.sh 3002 test # Run npm run test on port 3002

set -e

# Default values
PORT=${1:-5173}
NPM_SCRIPT=${2:-dev}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}[DevOps]${NC} Starting development server..."

# Function to kill processes on specific port
kill_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}[DevOps]${NC} Killing existing process on port $port..."
        lsof -i :$port | grep LISTEN | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Kill zombie Vite/Node processes (common ports)
echo -e "${GREEN}[DevOps]${NC} Scanning for zombie processes..."
for p in 5173 3000 18789 3002 3003; do
    kill_port $p
done

# Kill any orphaned vite processes
pkill -f "vite" 2>/dev/null || true
sleep 1

# Export the port for Vite
export PORT=$PORT

# Start the API server in the background
echo -e "${GREEN}[DevOps]${NC} Starting API backend server..."
node server/api-server.js > server/api.log 2>&1 &
API_PID=$!
echo -e "${GREEN}[DevOps]${NC} API Server PID: $API_PID"

# Start the server
echo -e "${GREEN}[DevOps]${NC} Starting on port $PORT with npm run $NPM_SCRIPT..."
echo -e "${GREEN}[DevOps]${NC} Server will be available at http://localhost:$PORT"

# Use vite's --host flag to ensure accessibility
npx vite --host --port $PORT
