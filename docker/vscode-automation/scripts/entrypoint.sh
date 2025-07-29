#!/bin/bash
set -euo pipefail

# VSCode Automation Container Entrypoint
# Manages the startup and orchestration of all automation services

# Default configuration
DEFAULT_DISPLAY=":99"
DEFAULT_CODE_SERVER_PORT=8080
DEFAULT_VNC_PORT=5900
DEFAULT_NOVNC_PORT=6080

# Environment variables with defaults
DISPLAY=${DISPLAY:-$DEFAULT_DISPLAY}
CODE_SERVER_PORT=${CODE_SERVER_PORT:-$DEFAULT_CODE_SERVER_PORT}
VNC_PORT=${VNC_PORT:-$DEFAULT_VNC_PORT}
NOVNC_PORT=${NOVNC_PORT:-$DEFAULT_NOVNC_PORT}
AUTOMATION_MODE=${AUTOMATION_MODE:-interactive}
LOG_LEVEL=${LOG_LEVEL:-info}

# Logging function
log() {
    local level=$1
    shift
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $*"
}

# Initialize X11 display
init_display() {
    log "INFO" "Initializing virtual display $DISPLAY"
    
    # Start Xvfb
    Xvfb $DISPLAY -screen 0 1920x1080x24 -ac +extension GLX +render -noreset > /logs/xvfb.log 2>&1 &
    export XVFB_PID=$!
    
    # Wait for X server to start
    sleep 2
    
    # Start window manager
    DISPLAY=$DISPLAY fluxbox > /logs/fluxbox.log 2>&1 &
    export FLUXBOX_PID=$!
    
    # Start VNC server
    x11vnc -display $DISPLAY -nopw -listen localhost -xkb -rfbport $VNC_PORT > /logs/vnc.log 2>&1 &
    export VNC_PID=$!
    
    log "INFO" "Display initialized successfully"
}

# Setup GitHub Copilot authentication
setup_copilot_auth() {
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        log "INFO" "Setting up GitHub Copilot authentication"
        
        # Set up git configuration
        git config --global user.name "VSCode Automation"
        git config --global user.email "automation@codervisor.dev"
        
        # Create VS Code settings for Copilot
        mkdir -p ~/.config/Code\ -\ Insiders/User
        cat > ~/.config/Code\ -\ Insiders/User/settings.json << EOF
{
    "github.copilot.enable": {
        "*": true,
        "yaml": true,
        "plaintext": true,
        "markdown": true
    },
    "github.copilot.chat.enabled": true,
    "editor.inlineSuggest.enabled": true,
    "editor.quickSuggestions": {
        "other": true,
        "comments": true,
        "strings": true
    },
    "workbench.startupEditor": "none",
    "telemetry.telemetryLevel": "off",
    "update.mode": "none"
}
EOF
        
        log "INFO" "GitHub Copilot configuration completed"
    else
        log "WARN" "GITHUB_TOKEN not provided - Copilot features will be limited"
    fi
}

# Start code-server
start_code_server() {
    log "INFO" "Starting code-server on port $CODE_SERVER_PORT"
    
    code-server \
        --bind-addr 0.0.0.0:$CODE_SERVER_PORT \
        --auth none \
        --disable-telemetry \
        --disable-update-check \
        /workspace > /logs/code-server.log 2>&1 &
    
    export CODE_SERVER_PID=$!
    
    # Wait for code-server to be ready
    local attempts=0
    local max_attempts=30
    
    while ! curl -f http://localhost:$CODE_SERVER_PORT/healthz > /dev/null 2>&1; do
        attempts=$((attempts + 1))
        if [ $attempts -gt $max_attempts ]; then
            log "ERROR" "Code-server failed to start within 60 seconds"
            return 1
        fi
        log "INFO" "Waiting for code-server to be ready... ($attempts/$max_attempts)"
        sleep 2
    done
    
    log "INFO" "Code-server is ready at http://localhost:$CODE_SERVER_PORT"
}

# Setup test environment
setup_test_environment() {
    log "INFO" "Setting up test environment"
    
    # Ensure test files exist
    if [ ! -f /workspace/automation-test/src/algorithms.py ]; then
        log "INFO" "Creating test files"
        cp -r /workspace/automation-test/* /workspace/ 2>/dev/null || true
    fi
    
    # Install common development dependencies
    cd /workspace
    
    # Create package.json if it doesn't exist
    if [ ! -f package.json ]; then
        cat > package.json << EOF
{
    "name": "vscode-automation-test",
    "version": "1.0.0",
    "description": "Test environment for VSCode automation",
    "main": "index.js",
    "scripts": {
        "test": "echo \\"No tests yet\\""
    },
    "dependencies": {
        "express": "^4.18.0",
        "lodash": "^4.17.0",
        "axios": "^1.6.0"
    },
    "devDependencies": {
        "@types/node": "^20.0.0",
        "@types/express": "^4.17.0",
        "typescript": "^5.0.0"
    }
}
EOF
        
        # Install dependencies
        npm install > /logs/npm-install.log 2>&1 || log "WARN" "Failed to install npm dependencies"
    fi
    
    # Create TypeScript config
    if [ ! -f tsconfig.json ]; then
        cat > tsconfig.json << EOF
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
EOF
    fi
    
    log "INFO" "Test environment setup completed"
}

# Start automation service
start_automation_service() {
    if [ "$AUTOMATION_MODE" = "automated" ]; then
        log "INFO" "Starting automated testing service"
        
        # Run automation tests
        cd /automation
        if [ -f "ai/automation/cli/automation.js" ]; then
            node ai/automation/cli/automation.js > /logs/automation.log 2>&1 &
            export AUTOMATION_PID=$!
        else
            log "WARN" "Automation CLI not found, skipping automated tests"
        fi
    else
        log "INFO" "Running in interactive mode - automation service not started"
    fi
}

# Cleanup function
cleanup() {
    log "INFO" "Shutting down services..."
    
    # Kill all background processes
    kill ${AUTOMATION_PID:-} 2>/dev/null || true
    kill ${CODE_SERVER_PID:-} 2>/dev/null || true
    kill ${VNC_PID:-} 2>/dev/null || true
    kill ${FLUXBOX_PID:-} 2>/dev/null || true
    kill ${XVFB_PID:-} 2>/dev/null || true
    
    log "INFO" "Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Main execution
main() {
    local command=${1:-start}
    
    case $command in
        start)
            log "INFO" "Starting VSCode automation container"
            log "INFO" "Mode: $AUTOMATION_MODE"
            log "INFO" "Display: $DISPLAY"
            log "INFO" "Code-server port: $CODE_SERVER_PORT"
            log "INFO" "VNC port: $VNC_PORT"
            
            # Initialize services
            init_display
            setup_copilot_auth
            setup_test_environment
            start_code_server
            start_automation_service
            
            log "INFO" "All services started successfully"
            log "INFO" "Access code-server at: http://localhost:$CODE_SERVER_PORT"
            log "INFO" "Access VNC at: localhost:$VNC_PORT"
            
            # Keep container running
            while true; do
                sleep 30
                
                # Health check - ensure critical services are running
                if ! kill -0 ${XVFB_PID:-} 2>/dev/null; then
                    log "ERROR" "Xvfb process died, restarting..."
                    init_display
                fi
                
                if ! kill -0 ${CODE_SERVER_PID:-} 2>/dev/null; then
                    log "ERROR" "Code-server process died, restarting..."
                    start_code_server
                fi
            done
            ;;
            
        test)
            log "INFO" "Running automation tests"
            setup_copilot_auth
            cd /automation
            if [ -f "ai/automation/cli/automation.js" ]; then
                node ai/automation/cli/automation.js
            else
                log "WARN" "Automation CLI not found - container setup test only"
                echo "VSCode automation container test completed"
            fi
            ;;
            
        shell)
            log "INFO" "Starting interactive shell"
            exec bash
            ;;
            
        *)
            log "ERROR" "Unknown command: $command"
            log "INFO" "Available commands: start, test, shell"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
