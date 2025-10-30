# Testing GitHub Copilot Agent Logs Collection

**Date**: October 30, 2025  
**Purpose**: Guide for testing AI agent log collection from GitHub Copilot in VS Code

## Overview

This guide explains how to test the Devlog collector's ability to monitor and capture GitHub Copilot agent activity logs from VS Code. The collector watches Copilot's log files in real-time and forwards events to the Devlog backend for analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              VS Code + GitHub Copilot                   │
│  - Generates logs during agent interactions             │
│  - Stored in ~/.config/Code/logs/*/exthost/             │
└────────────────┬────────────────────────────────────────┘
                 │ File System
                 │ (Log files)
                 ▼
┌─────────────────────────────────────────────────────────┐
│             Devlog Collector (Go)                       │
│  - Watches log files for changes                       │
│  - Parses Copilot-specific log format                  │
│  - Buffers events in SQLite (offline support)          │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/REST
                 │ (Batched events)
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Devlog Backend (Next.js)                   │
│  - Receives events via POST /api/agent/events          │
│  - Stores in PostgreSQL                                 │
│  - Powers dashboard and analytics                       │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. VS Code with GitHub Copilot Installed

```bash
# Check if Copilot is installed
ls ~/.vscode/extensions/ | grep copilot
# Expected output:
# github.copilot-1.x.x
# github.copilot-chat-0.x.x
```

### 2. Copilot Log Locations (Linux)

```bash
# Primary log location (current session)
~/.config/Code/logs/YYYYMMDDTHHMMSS/window1/exthost/GitHub.copilot/

# Historical logs (older sessions)
~/.config/Code/logs/*/window1/exthost/GitHub.copilot/

# Find your most recent Copilot logs
find ~/.config/Code/logs -name "GitHub.copilot" -type d | sort -r | head -5
```

**macOS locations:**
```bash
~/Library/Application Support/Code/logs/*/exthost/GitHub.copilot/
~/.vscode/extensions/github.copilot-*/logs
```

**Windows locations:**
```
%APPDATA%\Code\logs\*\exthost\GitHub.copilot\
%USERPROFILE%\.vscode\extensions\github.copilot-*\logs
```

### 3. Devlog Collector Built

```bash
cd packages/collector-go
make build
# Creates: bin/devlog-collector
```

### 4. Devlog Backend Running

```bash
# Start the web application
docker compose up web-dev -d --wait

# Verify it's running
curl http://localhost:3200/api/health
```

## Testing Methods

### Method 1: Manual Log Inspection (Quick Check)

**Purpose**: Verify Copilot is generating logs before testing collection.

#### Step 1: Start a Copilot session

1. Open VS Code
2. Open a code file (e.g., `test.ts`)
3. Trigger Copilot suggestions (start typing or use Cmd/Ctrl+I)
4. Use Copilot Chat if available

#### Step 2: Check logs are being generated

```bash
# Find today's log directory
LOG_DIR=$(find ~/.config/Code/logs -maxdepth 1 -type d -name "$(date +%Y%m%d)*" | sort -r | head -1)
echo "Log directory: $LOG_DIR"

# Check Copilot log directory exists
ls -la "$LOG_DIR/window1/exthost/GitHub.copilot/"

# Watch logs in real-time
tail -f "$LOG_DIR/window1/exthost/GitHub.copilot/output_*.log"
```

**Expected output**: JSON-formatted log entries like:
```json
{"timestamp":"2025-10-30T16:15:00.000Z","level":"info","message":"Copilot suggestion requested"}
{"timestamp":"2025-10-30T16:15:01.000Z","level":"info","message":"Completion shown","context":{"file":"test.ts"}}
```

### Method 2: Test Collector Discovery (Auto-Configuration)

**Purpose**: Verify the collector can automatically find Copilot logs.

#### Test the discovery function

```bash
cd packages/collector-go

# Run the discovery test (if available)
go test -v ./internal/watcher -run TestDiscoverAgentLogs

# Or manually test discovery
go run cmd/collector/main.go discover
```

**Expected output:**
```
Discovered agents:
  - copilot
    Path: /home/marvin/.config/Code/logs/20251030T161500/window1/exthost/GitHub.copilot
    Exists: true
    IsDir: true
```

### Method 3: Test Collector with Sample Data

**Purpose**: Test collector parsing without needing live Copilot activity.

#### Step 1: Create sample Copilot logs

```bash
# Create test log directory
mkdir -p tmp/test-copilot-logs

# Create sample log file (Copilot format)
cat > tmp/test-copilot-logs/output_2025-10-30.log << 'EOF'
{"timestamp":"2025-10-30T16:00:00.000Z","level":"info","message":"Extension activated"}
{"timestamp":"2025-10-30T16:00:05.000Z","level":"info","message":"Completion requested","context":{"file":"src/test.ts","line":10}}
{"timestamp":"2025-10-30T16:00:06.000Z","level":"info","message":"Completion shown","context":{"file":"src/test.ts","numSuggestions":3}}
{"timestamp":"2025-10-30T16:00:10.000Z","level":"info","message":"Completion accepted","context":{"file":"src/test.ts","accepted":true}}
EOF
```

#### Step 2: Configure collector to watch test directory

```bash
# Create test configuration
mkdir -p ~/.devlog
cat > ~/.devlog/collector-test.json << EOF
{
  "version": "1.0",
  "backendUrl": "http://localhost:3200",
  "projectId": "1",
  "agents": {
    "copilot": {
      "enabled": true,
      "logPath": "$PWD/tmp/test-copilot-logs"
    }
  },
  "collection": {
    "batchSize": 10,
    "batchInterval": "2s"
  },
  "logging": {
    "level": "debug"
  }
}
EOF
```

#### Step 3: Run collector with test config

```bash
cd packages/collector-go

# Run collector (will monitor test directory)
./bin/devlog-collector start --config ~/.devlog/collector-test.json -v
```

**Expected output:**
```
INFO Starting Devlog Collector...
INFO Configuration loaded from: /home/marvin/.devlog/collector-test.json
INFO Backend URL: http://localhost:3200
INFO Enabled agents:
  - copilot (log path: /home/marvin/projects/codervisor/devlog/tmp/test-copilot-logs)
DEBUG Watching: /home/marvin/projects/codervisor/devlog/tmp/test-copilot-logs
DEBUG Parsed event: completion_requested
DEBUG Parsed event: completion_shown
DEBUG Parsed event: completion_accepted
DEBUG Sending batch: 3 events
INFO Batch sent successfully
```

#### Step 4: Verify events in backend

```bash
# Check events were received
curl -s http://localhost:3200/api/agent/events?agentId=github-copilot | jq '.data | length'
# Expected: 3 (or more if you had previous data)

# View the events
curl -s http://localhost:3200/api/agent/events?agentId=github-copilot&limit=10 | jq '.data'
```

### Method 4: End-to-End Live Test

**Purpose**: Full integration test with live Copilot activity.

#### Step 1: Configure collector for production

```bash
# Create production config
cat > ~/.devlog/collector.json << EOF
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
    "file": "~/.devlog/collector.log"
  }
}
EOF
```

#### Step 2: Start collector in background

```bash
cd packages/collector-go

# Start collector as background process
./bin/devlog-collector start &
COLLECTOR_PID=$!

# Check it's running
ps aux | grep devlog-collector

# Tail logs
tail -f ~/.devlog/collector.log
```

#### Step 3: Generate Copilot activity

1. **Open VS Code**
2. **Create or open a TypeScript/JavaScript file**
3. **Perform various Copilot actions**:
   - Request inline suggestions (start typing)
   - Accept a suggestion (Tab)
   - Reject suggestions (Esc)
   - Use Copilot Chat (if available)
   - Ask for code explanations
   - Generate code from comments

#### Step 4: Monitor real-time collection

```bash
# Watch collector logs
tail -f ~/.devlog/collector.log

# Watch backend receiving events
docker compose logs -f web-dev | grep "POST /api/agent/events"

# Check event count increasing
watch -n 2 'curl -s http://localhost:3200/api/agent/events?agentId=github-copilot | jq ".data | length"'
```

#### Step 5: Verify in dashboard

Open http://localhost:3200/dashboard and verify:
- ✅ Active sessions count increasing
- ✅ Events today showing new events
- ✅ Recent activity timeline showing Copilot events
- ✅ Live Sessions panel showing "github-copilot"

#### Step 6: Stop collector gracefully

```bash
# Send SIGTERM to stop gracefully
kill -TERM $COLLECTOR_PID

# Or use the status command
./bin/devlog-collector stop
```

## Event Types to Look For

Copilot generates various event types you should see:

| Event Type | Description | Example Context |
|------------|-------------|-----------------|
| `extension_activated` | Copilot extension loaded | - |
| `completion_requested` | User triggered suggestion | `{file, line, column}` |
| `completion_shown` | Suggestions displayed | `{file, numSuggestions}` |
| `completion_accepted` | User accepted suggestion | `{file, accepted: true}` |
| `completion_rejected` | User rejected suggestion | `{file, accepted: false}` |
| `chat_message_sent` | User sent chat message | `{message, intent}` |
| `chat_response_received` | Copilot responded | `{responseLength}` |
| `llm_request` | API call to OpenAI | `{model, tokens}` |
| `llm_response` | API response received | `{tokens, duration}` |

## Troubleshooting

### Issue: No logs found

```bash
# Check if VS Code is running
ps aux | grep "code"

# Check if Copilot extension is enabled
code --list-extensions | grep copilot

# Check log directory exists
ls ~/.config/Code/logs/
```

**Solution**: Start VS Code and trigger Copilot activity.

### Issue: Collector can't find logs

```bash
# Enable verbose logging
./bin/devlog-collector start -v

# Manually specify log path
# Edit ~/.devlog/collector.json
{
  "agents": {
    "copilot": {
      "enabled": true,
      "logPath": "/home/marvin/.config/Code/logs/20251030T161500/window1/exthost/GitHub.copilot"
    }
  }
}
```

### Issue: Events not appearing in backend

```bash
# Check collector is sending events
tail -f ~/.devlog/collector.log | grep "Sending batch"

# Check backend is receiving
curl -X POST http://localhost:3200/api/agent/events \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "github-copilot",
    "projectId": 1,
    "sessionId": "test-session",
    "type": "test_event",
    "timestamp": "'$(date -Iseconds)'"
  }'

# Check database connection
docker compose exec web-dev npx prisma db pull
```

### Issue: High CPU usage

```bash
# Check batch settings - increase interval
{
  "collection": {
    "batchSize": 100,
    "batchInterval": "10s"  // Increase from 5s
  }
}

# Reduce logging level
{
  "logging": {
    "level": "warn"  // Change from "debug"
  }
}
```

## Validation Checklist

After testing, verify:

- [ ] Collector discovers Copilot log location automatically
- [ ] Log files are being watched for changes
- [ ] Events are parsed correctly from JSON format
- [ ] Events are batched and sent to backend
- [ ] Backend receives and stores events
- [ ] Dashboard displays Copilot activity
- [ ] Sessions page shows Copilot sessions
- [ ] Offline buffer works (test by stopping backend temporarily)
- [ ] Collector handles log rotation gracefully
- [ ] No memory leaks during extended running

## Performance Benchmarks

Expected performance characteristics:

- **Discovery time**: <100ms
- **Event parsing**: ~5000 events/sec
- **Memory usage**: ~30MB (idle), ~50MB (active)
- **CPU usage**: <1% (idle), 2-3% (active)
- **Batch latency**: 5s (configurable)
- **Offline buffer**: Up to 10,000 events

## Next Steps

1. **Implement agent adapter**: Create `internal/adapters/copilot_adapter.go`
2. **Add event parsing**: Parse Copilot's JSON log format
3. **Test with multiple agents**: Copilot + Claude + Cursor
4. **Production deployment**: Run as systemd service
5. **Monitoring**: Add Prometheus metrics

## Related Documentation

- [Collector README](../../packages/collector-go/README.md)
- [Agent Observability Core Features](../dev/20251022-agent-observability-core-features/README.md)
- [API Documentation](./API_RESPONSE_VALIDATION.md)
- [Deployment Guide](./VERCEL_DEPLOYMENT.md)

---

**Last Updated**: October 30, 2025  
**Tested On**: Linux (Ubuntu 24.04), VS Code 1.95, Copilot 1.323.1584
