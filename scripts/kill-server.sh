#!/bin/bash
# kill-server.sh - Safely Kill Development Server
# Usage: ./kill-server.sh [port]
# Examples:
#   ./kill-server.sh      # Kill all dev servers
#   ./kill-server.sh 3001 # Kill server on port 3001

set -e

# Default: kill all common dev ports
PORT=$1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[DevOps]${NC} Stopping development servers..."

kill_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        local pid=$(lsof -i :$port | grep LISTEN | awk '{print $2}' | head -1)
        if [ -n "$pid" ]; then
            echo -e "${YELLOW}[DevOps]${NC} Killing process $pid on port $port..."
            kill -9 $pid 2>/dev/null && echo -e "${GREEN}[DevOps]${NC} Port $port freed" || echo -e "${RED}[DevOps]${NC} Failed to kill port $port"
        fi
    else
        echo -e "${GREEN}[DevOps]${NC} Port $port is free"
    fi
}

if [ -n "$PORT" ]; then
    # Kill specific port
    kill_port $PORT
else
    # Kill all common dev ports
    for p in 5173 3000 3001 3002 3003; do
        kill_port $p
    done
    
    # Also kill any remaining node/vite processes started by current user
    echo -e "${YELLOW}[DevOps]${NC} Cleaning up remaining node/vite processes..."
    pkill -f "vite" 2>/dev/null || true
fi

echo -e "${GREEN}[DevOps]${NC} Server cleanup complete!"
