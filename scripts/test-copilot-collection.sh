#!/bin/bash
# Quick test script for GitHub Copilot log collection
# Usage: ./scripts/test-copilot-collection.sh [method]
# Methods: discover, sample, live

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COLLECTOR_BIN="$PROJECT_ROOT/packages/collector-go/bin/devlog-collector"
TEST_LOG_DIR="$PROJECT_ROOT/tmp/test-copilot-logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if VS Code is installed
    if ! command -v code &> /dev/null; then
        log_warn "VS Code not found in PATH"
    else
        log_info "✓ VS Code installed"
    fi
    
    # Check if Copilot extension exists
    if [ -d ~/.vscode/extensions ] && ls ~/.vscode/extensions/github.copilot-* 1> /dev/null 2>&1; then
        log_info "✓ GitHub Copilot extension found"
        COPILOT_EXT=$(ls -d ~/.vscode/extensions/github.copilot-* | head -1)
        log_info "  Extension: $(basename $COPILOT_EXT)"
    else
        log_error "✗ GitHub Copilot extension not found"
        log_error "  Install from: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot"
        exit 1
    fi
    
    # Check if collector is built
    if [ ! -f "$COLLECTOR_BIN" ]; then
        log_warn "✗ Collector binary not found"
        log_info "Building collector..."
        cd "$PROJECT_ROOT/packages/collector-go"
        make build
        log_info "✓ Collector built"
    else
        log_info "✓ Collector binary found"
    fi
    
    # Check if backend is running
    if curl -s http://localhost:3200/api/health > /dev/null 2>&1; then
        log_info "✓ Backend is running"
    else
        log_warn "✗ Backend not running on localhost:3200"
        log_info "  Start with: docker compose up web-dev -d --wait"
    fi
    
    echo ""
}

# Method 1: Discover Copilot logs
test_discover() {
    log_info "=== Testing Log Discovery ==="
    echo ""
    
    # Find Copilot log directories
    log_info "Searching for Copilot log directories..."
    
    if [ "$(uname)" == "Darwin" ]; then
        # macOS
        LOG_BASE="$HOME/Library/Application Support/Code/logs"
    else
        # Linux
        LOG_BASE="$HOME/.config/Code/logs"
    fi
    
    if [ -d "$LOG_BASE" ]; then
        COPILOT_LOGS=$(find "$LOG_BASE" -name "GitHub.copilot" -type d 2>/dev/null | sort -r)
        
        if [ -z "$COPILOT_LOGS" ]; then
            log_warn "No Copilot log directories found"
            log_info "Start VS Code and use Copilot to generate logs"
        else
            log_info "Found Copilot log directories:"
            echo "$COPILOT_LOGS" | while read -r log_dir; do
                log_info "  - $log_dir"
                
                # Check for log files
                LOG_FILES=$(find "$log_dir" -name "*.log" 2>/dev/null)
                if [ -n "$LOG_FILES" ]; then
                    FILE_COUNT=$(echo "$LOG_FILES" | wc -l | tr -d ' ')
                    log_info "    Files: $FILE_COUNT log files"
                    
                    # Show latest log file
                    LATEST=$(ls -t "$log_dir"/*.log 2>/dev/null | head -1)
                    if [ -f "$LATEST" ]; then
                        SIZE=$(du -h "$LATEST" | cut -f1)
                        log_info "    Latest: $(basename $LATEST) ($SIZE)"
                        
                        # Show last few lines
                        log_info "    Sample (last 3 lines):"
                        tail -3 "$LATEST" | while read -r line; do
                            echo "      $line"
                        done
                    fi
                fi
                echo ""
            done
        fi
    else
        log_error "VS Code log directory not found: $LOG_BASE"
    fi
}

# Method 2: Test with sample data
test_sample() {
    log_info "=== Testing with Sample Data ==="
    echo ""
    
    # Create sample log directory
    log_info "Creating sample log directory: $TEST_LOG_DIR"
    mkdir -p "$TEST_LOG_DIR"
    
    # Generate sample logs
    log_info "Generating sample Copilot logs..."
    cat > "$TEST_LOG_DIR/output_$(date +%Y-%m-%d).log" << 'EOF'
{"timestamp":"2025-10-30T16:00:00.000Z","level":"info","message":"Extension activated","context":{"version":"1.323.1584"}}
{"timestamp":"2025-10-30T16:00:05.000Z","level":"info","message":"Completion requested","context":{"file":"src/test.ts","line":10,"column":5}}
{"timestamp":"2025-10-30T16:00:06.000Z","level":"info","message":"Completion shown","context":{"file":"src/test.ts","numSuggestions":3}}
{"timestamp":"2025-10-30T16:00:10.000Z","level":"info","message":"Completion accepted","context":{"file":"src/test.ts","accepted":true,"suggestion":"const result = data.map(x => x * 2);"}}
{"timestamp":"2025-10-30T16:00:15.000Z","level":"info","message":"Chat message sent","context":{"message":"Explain this function","intent":"explanation"}}
{"timestamp":"2025-10-30T16:00:17.000Z","level":"info","message":"Chat response received","context":{"responseLength":250,"duration":2000}}
EOF
    
    log_info "✓ Created $(wc -l < $TEST_LOG_DIR/output_$(date +%Y-%m-%d).log) sample log entries"
    echo ""
    
    # Create test config
    log_info "Creating test collector configuration..."
    TEST_CONFIG="$PROJECT_ROOT/tmp/collector-test.json"
    cat > "$TEST_CONFIG" << EOF
{
  "version": "1.0",
  "backendUrl": "http://localhost:3200",
  "projectId": "1",
  "agents": {
    "copilot": {
      "enabled": true,
      "logPath": "$TEST_LOG_DIR"
    }
  },
  "collection": {
    "batchSize": 10,
    "batchInterval": "2s"
  },
  "buffer": {
    "enabled": true
  },
  "logging": {
    "level": "debug",
    "file": "$PROJECT_ROOT/tmp/collector-test.log"
  }
}
EOF
    
    log_info "✓ Configuration created: $TEST_CONFIG"
    echo ""
    
    # Run collector
    log_info "Starting collector (press Ctrl+C to stop)..."
    log_info "Watch logs with: tail -f $PROJECT_ROOT/tmp/collector-test.log"
    echo ""
    
    "$COLLECTOR_BIN" start --config "$TEST_CONFIG" -v
}

# Method 3: Live testing
test_live() {
    log_info "=== Live Testing Setup ==="
    echo ""
    
    # Find latest log directory
    if [ "$(uname)" == "Darwin" ]; then
        LOG_BASE="$HOME/Library/Application Support/Code/logs"
    else
        LOG_BASE="$HOME/.config/Code/logs"
    fi
    
    LATEST_LOG_DIR=$(find "$LOG_BASE" -maxdepth 1 -type d -name "$(date +%Y%m%d)*" | sort -r | head -1)
    
    if [ -z "$LATEST_LOG_DIR" ]; then
        log_error "No VS Code log directory found for today"
        log_info "Start VS Code first, then run this test again"
        exit 1
    fi
    
    COPILOT_LOG_PATH="$LATEST_LOG_DIR/window1/exthost/GitHub.copilot"
    
    if [ ! -d "$COPILOT_LOG_PATH" ]; then
        log_error "Copilot log directory not found: $COPILOT_LOG_PATH"
        log_info "Open VS Code and use Copilot to create the directory"
        exit 1
    fi
    
    log_info "Found Copilot logs: $COPILOT_LOG_PATH"
    echo ""
    
    # Create production config
    PROD_CONFIG="$HOME/.devlog/collector.json"
    mkdir -p "$HOME/.devlog"
    
    log_info "Creating production configuration..."
    cat > "$PROD_CONFIG" << EOF
{
  "version": "1.0",
  "backendUrl": "http://localhost:3200",
  "projectId": "1",
  "agents": {
    "copilot": {
      "enabled": true,
      "logPath": "auto"
    }
  },
  "collection": {
    "batchSize": 50,
    "batchInterval": "5s"
  },
  "buffer": {
    "enabled": true,
    "maxSize": 10000
  },
  "logging": {
    "level": "info",
    "file": "$HOME/.devlog/collector.log"
  }
}
EOF
    
    log_info "✓ Configuration created: $PROD_CONFIG"
    echo ""
    
    log_info "Instructions for live testing:"
    echo ""
    echo "1. Start the collector:"
    echo "   $COLLECTOR_BIN start"
    echo ""
    echo "2. Open VS Code and perform Copilot actions:"
    echo "   - Request inline suggestions (start typing)"
    echo "   - Accept/reject suggestions"
    echo "   - Use Copilot Chat"
    echo ""
    echo "3. Monitor collection:"
    echo "   tail -f $HOME/.devlog/collector.log"
    echo ""
    echo "4. Check dashboard:"
    echo "   open http://localhost:3200/dashboard"
    echo ""
    echo "5. Stop collector:"
    echo "   $COLLECTOR_BIN stop"
    echo ""
    
    read -p "Start collector now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$COLLECTOR_BIN" start
    fi
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [method]

Test methods:
  discover  - Find and inspect Copilot log locations
  sample    - Test with generated sample data
  live      - Setup and run live collection from VS Code
  all       - Run all test methods (except live)

Examples:
  $0 discover
  $0 sample
  $0 live

EOF
}

# Main
main() {
    METHOD=${1:-discover}
    
    case $METHOD in
        discover)
            check_prerequisites
            test_discover
            ;;
        sample)
            check_prerequisites
            test_sample
            ;;
        live)
            check_prerequisites
            test_live
            ;;
        all)
            check_prerequisites
            test_discover
            echo ""
            log_info "Run './scripts/test-copilot-collection.sh sample' to test with sample data"
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
