#!/bin/bash
# Stable Environment Manager
# Manages the production/stable server on port 28080 using PM2

PORT=28080
APP_NAME="openclaw-dashboard-stable"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[StableEnv]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[StableEnv]${NC} $1"
}

log_error() {
    echo -e "${RED}[StableEnv]${NC} $1"
}

# Check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 is not installed. Installing..."
        npm install -g pm2
    fi
}

# Start the stable server
start() {
    check_pm2
    
    log_info "Starting stable server on port $PORT..."
    
    # Check if already running
    if pm2 describe $APP_NAME &> /dev/null; then
        log_warn "Server is already running. Restarting..."
        pm2 restart $APP_NAME
    else
        # Build first, then start with PM2
        log_info "Building production bundle..."
        npm run build
        
        log_info "Starting PM2 process..."
        pm2 start npx --name $APP_NAME -- vite preview --port $PORT
        
        # Save PM2 process list for restart on boot
        pm2 startup
        pm2 save
    fi
    
    log_info "Stable server started. Available at http://localhost:$PORT"
    pm2 list
}

# Stop the stable server
stop() {
    log_info "Stopping stable server..."
    pm2 stop $APP_NAME 2>/dev/null
    log_info "Server stopped."
}

# Restart the stable server
restart() {
    log_info "Restarting stable server..."
    pm2 restart $APP_NAME
    log_info "Server restarted."
}

# Show status
status() {
    pm2 describe $APP_NAME
}

# View logs
logs() {
    pm2 logs $APP_NAME
}

# Delete the PM2 process
delete() {
    log_info "Deleting stable server..."
    pm2 delete $APP_NAME
    log_info "Server deleted."
}

# Parse command
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    delete)
        delete
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|delete}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the stable server"
        echo "  stop    - Stop the stable server"
        echo "  restart - Restart the stable server"
        echo "  status  - Show server status"
        echo "  logs    - View server logs"
        echo "  delete  - Delete the PM2 process"
        exit 1
        ;;
esac

exit 0
