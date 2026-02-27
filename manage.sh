#!/bin/bash

# NYC Operations Command Center - Management Script
# Usage: ./manage.sh [command]

set -e

APP_NAME="NYC Operations Command Center"
PORT=3000
PID_FILE=".server.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           NYC Operations Command Center                      ║"
    echo "║                   Management Script                          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start the development server in background"
    echo "  stop        Stop the development server"
    echo "  restart     Restart the development server"
    echo "  status      Check if the server is running"
    echo "  test        Run authentication tests"
    echo "  test:auth   Run authentication tests (alias)"
    echo "  build       Build for production"
    echo "  prod        Start production server"
    echo "  logs        Show server logs (if running in background)"
    echo "  dev         Start in foreground (interactive mode)"
    echo "  install     Install dependencies"
    echo "  clean       Remove build artifacts and node_modules"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start          # Start server in background"
    echo "  $0 status         # Check if running"
    echo "  $0 test           # Test Snowflake authentication"
    echo "  $0 stop           # Stop the server"
}

check_port() {
    lsof -i :$PORT >/dev/null 2>&1
}

get_pid() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE"
    else
        lsof -t -i :$PORT 2>/dev/null || echo ""
    fi
}

do_status() {
    echo -e "${CYAN}Checking server status...${NC}"
    echo ""
    
    if check_port; then
        PID=$(get_pid)
        echo -e "  Status:  ${GREEN}● Running${NC}"
        echo -e "  PID:     ${PID}"
        echo -e "  Port:    ${PORT}"
        echo -e "  URL:     http://localhost:${PORT}"
        echo ""
        return 0
    else
        echo -e "  Status:  ${RED}○ Stopped${NC}"
        echo ""
        return 1
    fi
}

do_start() {
    echo -e "${CYAN}Starting ${APP_NAME}...${NC}"
    echo ""
    
    if check_port; then
        echo -e "${YELLOW}⚠ Server is already running on port ${PORT}${NC}"
        do_status
        return 0
    fi
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}⚠ Warning: .env.local not found${NC}"
        echo "  Run '$0 test' to verify authentication configuration"
        echo ""
    fi
    
    # Start in background
    nohup npm run dev > .server.log 2>&1 &
    echo $! > "$PID_FILE"
    
    echo "  Starting server..."
    sleep 3
    
    if check_port; then
        echo -e "${GREEN}✓ Server started successfully${NC}"
        echo ""
        echo -e "  URL:     ${CYAN}http://localhost:${PORT}${NC}"
        echo -e "  Logs:    $0 logs"
        echo -e "  Stop:    $0 stop"
    else
        echo -e "${RED}✗ Failed to start server${NC}"
        echo "  Check logs with: $0 logs"
        return 1
    fi
}

do_stop() {
    echo -e "${CYAN}Stopping ${APP_NAME}...${NC}"
    echo ""
    
    if ! check_port; then
        echo -e "${YELLOW}⚠ Server is not running${NC}"
        rm -f "$PID_FILE"
        return 0
    fi
    
    PID=$(get_pid)
    
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null || true
        sleep 1
        
        # Force kill if still running
        if check_port; then
            kill -9 $PID 2>/dev/null || true
            sleep 1
        fi
    fi
    
    # Clean up any remaining processes on the port
    REMAINING=$(lsof -t -i :$PORT 2>/dev/null || echo "")
    if [ -n "$REMAINING" ]; then
        echo "$REMAINING" | xargs kill -9 2>/dev/null || true
    fi
    
    rm -f "$PID_FILE"
    
    if check_port; then
        echo -e "${RED}✗ Failed to stop server${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Server stopped${NC}"
    fi
}

do_restart() {
    do_stop
    echo ""
    do_start
}

do_test() {
    echo -e "${CYAN}Running authentication tests...${NC}"
    echo ""
    npx ts-node scripts/test-auth.ts
}

do_build() {
    echo -e "${CYAN}Building for production...${NC}"
    echo ""
    npm run build
    echo ""
    echo -e "${GREEN}✓ Build complete${NC}"
    echo "  Run '$0 prod' to start production server"
}

do_prod() {
    echo -e "${CYAN}Starting production server...${NC}"
    echo ""
    
    if [ ! -d ".next" ]; then
        echo -e "${YELLOW}⚠ No build found. Running build first...${NC}"
        npm run build
    fi
    
    npm run start
}

do_dev() {
    echo -e "${CYAN}Starting development server (foreground)...${NC}"
    echo ""
    echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop"
    echo ""
    npm run dev
}

do_logs() {
    if [ -f ".server.log" ]; then
        echo -e "${CYAN}Server logs (last 50 lines):${NC}"
        echo ""
        tail -50 .server.log
    else
        echo -e "${YELLOW}No log file found${NC}"
        echo "  Start the server with '$0 start' first"
    fi
}

do_install() {
    echo -e "${CYAN}Installing dependencies...${NC}"
    echo ""
    npm install
    echo ""
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

do_clean() {
    echo -e "${CYAN}Cleaning build artifacts...${NC}"
    echo ""
    
    # Stop server if running
    if check_port; then
        do_stop
    fi
    
    rm -rf .next
    rm -rf node_modules
    rm -f .server.log
    rm -f .server.pid
    
    echo -e "${GREEN}✓ Cleaned${NC}"
    echo "  Run '$0 install' to reinstall dependencies"
}

# Main
print_banner

case "${1:-help}" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    restart)
        do_restart
        ;;
    status)
        do_status
        ;;
    test|test:auth)
        do_test
        ;;
    build)
        do_build
        ;;
    prod|production)
        do_prod
        ;;
    dev|develop)
        do_dev
        ;;
    logs|log)
        do_logs
        ;;
    install)
        do_install
        ;;
    clean)
        do_clean
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac
