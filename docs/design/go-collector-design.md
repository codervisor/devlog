# Go Client Collector - Design Document

## Overview

The Go Client Collector is a lightweight, cross-platform binary that runs on developer machines to capture AI agent activities in real-time and forward them to the devlog backend.

**Why Go?**
- Small binary size (~10-20MB) - minimal footprint on developer machines
- Cross-platform support - single codebase for Windows, macOS, Linux
- Efficient resource usage - low CPU/memory impact
- Fast startup time - responsive even on resource-constrained machines
- Easy distribution - single binary, no runtime dependencies

## Architecture

### High-Level Design

```
Developer Machine
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  AI Agents                                                  │
│  ├─ GitHub Copilot → ~/.vscode/extensions/.../logs         │
│  ├─ Claude Code → ~/.claude/logs                           │
│  ├─ Cursor → ~/Library/Application Support/Cursor/logs     │
│  └─ Others                                                  │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │                                                    │    │
│  │           Go Collector Process                     │    │
│  │                                                    │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  Log Watcher (fsnotify)                  │     │    │
│  │  │  • Watches agent log directories         │     │    │
│  │  │  • Detects new/modified log files        │     │    │
│  │  └────────────┬─────────────────────────────┘     │    │
│  │               │                                    │    │
│  │  ┌────────────▼─────────────────────────────┐     │    │
│  │  │  Adapter Registry                         │     │    │
│  │  │  • Auto-detects agent type               │     │    │
│  │  │  • Routes to appropriate parser          │     │    │
│  │  └────────────┬─────────────────────────────┘     │    │
│  │               │                                    │    │
│  │  ┌────────────▼─────────────────────────────┐     │    │
│  │  │  Event Parser (Agent-Specific Adapters)  │     │    │
│  │  │  • Parses agent-specific log format      │     │    │
│  │  │  • Transforms to standard AgentEvent     │     │    │
│  │  │  • Enriches with context                 │     │    │
│  │  └────────────┬─────────────────────────────┘     │    │
│  │               │                                    │    │
│  │  ┌────────────▼─────────────────────────────┐     │    │
│  │  │  Local Buffer (SQLite)                   │     │    │
│  │  │  • Stores events temporarily             │     │    │
│  │  │  • Enables offline operation             │     │    │
│  │  │  • Deduplication                         │     │    │
│  │  └────────────┬─────────────────────────────┘     │    │
│  │               │                                    │    │
│  │  ┌────────────▼─────────────────────────────┐     │    │
│  │  │  Batch Manager                           │     │    │
│  │  │  • Batches events (100 or 5s)            │     │    │
│  │  │  • Compresses batches                    │     │    │
│  │  │  • Manages send queue                    │     │    │
│  │  └────────────┬─────────────────────────────┘     │    │
│  │               │                                    │    │
│  │  ┌────────────▼─────────────────────────────┐     │    │
│  │  │  Backend Client (HTTP/gRPC)              │     │    │
│  │  │  • Sends batches to backend              │     │    │
│  │  │  • Retry with exponential backoff        │     │    │
│  │  │  • Connection pooling                    │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  │                                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/gRPC over TLS
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                                                             │
│              Devlog Backend (Cloud)                         │
│  • TypeScript API Gateway                                   │
│  • Go Event Processor                                       │
│  • PostgreSQL + TimescaleDB                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Configuration Management

**Config File Location**: `~/.devlog/collector.json`

```json
{
  "version": "1.0",
  "backendUrl": "https://api.devlog.io",
  "apiKey": "${DEVLOG_API_KEY}",
  "projectId": "my-project",
  
  "collection": {
    "batchSize": 100,
    "batchInterval": "5s",
    "maxRetries": 3,
    "retryBackoff": "exponential"
  },
  
  "buffer": {
    "enabled": true,
    "maxSize": 10000,
    "dbPath": "~/.devlog/buffer.db"
  },
  
  "agents": {
    "copilot": {
      "enabled": true,
      "logPath": "auto"
    },
    "claude": {
      "enabled": true,
      "logPath": "auto"
    },
    "cursor": {
      "enabled": true,
      "logPath": "auto"
    }
  },
  
  "logging": {
    "level": "info",
    "file": "~/.devlog/collector.log"
  }
}
```

**Go Implementation**:
```go
type Config struct {
    Version    string `json:"version"`
    BackendURL string `json:"backendUrl"`
    APIKey     string `json:"apiKey"`
    ProjectID  string `json:"projectId"`
    
    Collection struct {
        BatchSize      int    `json:"batchSize"`
        BatchInterval  string `json:"batchInterval"`
        MaxRetries     int    `json:"maxRetries"`
        RetryBackoff   string `json:"retryBackoff"`
    } `json:"collection"`
    
    Buffer struct {
        Enabled bool   `json:"enabled"`
        MaxSize int    `json:"maxSize"`
        DBPath  string `json:"dbPath"`
    } `json:"buffer"`
    
    Agents map[string]AgentConfig `json:"agents"`
    
    Logging struct {
        Level string `json:"level"`
        File  string `json:"file"`
    } `json:"logging"`
}

func LoadConfig(path string) (*Config, error) {
    // Load from file
    // Support environment variable expansion
    // Validate configuration
    // Apply defaults
}
```

### 2. Log Discovery & Watching

**Auto-detection Strategy**:

```go
package discovery

import (
    "os"
    "path/filepath"
    "runtime"
)

// AgentLogLocations defines default log paths per OS
var AgentLogLocations = map[string]map[string][]string{
    "copilot": {
        "darwin":  []string{"~/.vscode/extensions/github.copilot*/logs"},
        "linux":   []string{"~/.vscode/extensions/github.copilot*/logs"},
        "windows": []string{"%USERPROFILE%\\.vscode\\extensions\\github.copilot*\\logs"},
    },
    "claude": {
        "darwin":  []string{"~/.claude/logs", "~/Library/Application Support/Claude/logs"},
        "linux":   []string{"~/.claude/logs", "~/.config/claude/logs"},
        "windows": []string{"%APPDATA%\\Claude\\logs"},
    },
    "cursor": {
        "darwin":  []string{"~/Library/Application Support/Cursor/logs"},
        "linux":   []string{"~/.config/Cursor/logs"},
        "windows": []string{"%APPDATA%\\Cursor\\logs"},
    },
}

// DiscoverAgentLogs finds actual log file locations
func DiscoverAgentLogs(agentName string) ([]string, error) {
    os := runtime.GOOS
    patterns := AgentLogLocations[agentName][os]
    
    var foundPaths []string
    for _, pattern := range patterns {
        // Expand home directory and env variables
        expanded := expandPath(pattern)
        
        // Handle glob patterns
        matches, err := filepath.Glob(expanded)
        if err != nil {
            continue
        }
        
        foundPaths = append(foundPaths, matches...)
    }
    
    return foundPaths, nil
}
```

**File Watching**:

```go
package watcher

import (
    "github.com/fsnotify/fsnotify"
)

type LogWatcher struct {
    watcher *fsnotify.Watcher
    paths   map[string]string // path -> agent name
    events  chan LogEvent
}

type LogEvent struct {
    AgentName string
    FilePath  string
    Operation string
    Timestamp time.Time
}

func NewLogWatcher() (*LogWatcher, error) {
    w, err := fsnotify.NewWatcher()
    if err != nil {
        return nil, err
    }
    
    return &LogWatcher{
        watcher: w,
        paths:   make(map[string]string),
        events:  make(chan LogEvent, 100),
    }, nil
}

func (lw *LogWatcher) Watch(path string, agentName string) error {
    lw.paths[path] = agentName
    return lw.watcher.Add(path)
}

func (lw *LogWatcher) Start() {
    go func() {
        for {
            select {
            case event := <-lw.watcher.Events:
                if event.Op&fsnotify.Write == fsnotify.Write {
                    agentName := lw.paths[event.Name]
                    lw.events <- LogEvent{
                        AgentName: agentName,
                        FilePath:  event.Name,
                        Operation: "write",
                        Timestamp: time.Now(),
                    }
                }
            case err := <-lw.watcher.Errors:
                log.Printf("Watcher error: %v", err)
            }
        }
    }()
}

func (lw *LogWatcher) Events() <-chan LogEvent {
    return lw.events
}
```

### 3. Agent Adapters

**Adapter Interface**:

```go
package adapters

type AgentAdapter interface {
    // AgentID returns the unique identifier for this agent
    AgentID() string
    
    // CanHandle checks if this adapter can parse the given log entry
    CanHandle(rawLog []byte) bool
    
    // ParseEvent converts raw log to standard AgentEvent
    ParseEvent(rawLog []byte) (*AgentEvent, error)
    
    // ExtractSessionInfo derives session information from logs
    ExtractSessionInfo(logs [][]byte) (*SessionInfo, error)
}

type AgentEvent struct {
    ID          string                 `json:"id"`
    Timestamp   time.Time              `json:"timestamp"`
    Type        string                 `json:"type"`
    AgentID     string                 `json:"agentId"`
    SessionID   string                 `json:"sessionId"`
    ProjectID   string                 `json:"projectId"`
    Context     map[string]interface{} `json:"context"`
    Data        map[string]interface{} `json:"data"`
    Metrics     *EventMetrics          `json:"metrics,omitempty"`
}
```

**Example: Copilot Adapter**:

```go
package adapters

import (
    "encoding/json"
    "regexp"
)

type CopilotAdapter struct {
    sessionID string
}

func NewCopilotAdapter() *CopilotAdapter {
    return &CopilotAdapter{
        sessionID: generateSessionID(),
    }
}

func (a *CopilotAdapter) AgentID() string {
    return "github-copilot"
}

func (a *CopilotAdapter) CanHandle(rawLog []byte) bool {
    // Check if log contains Copilot-specific markers
    return regexp.MustCompile(`"source":"copilot"`).Match(rawLog) ||
           regexp.MustCompile(`github.copilot`).Match(rawLog)
}

func (a *CopilotAdapter) ParseEvent(rawLog []byte) (*AgentEvent, error) {
    // Parse Copilot's JSON log format
    var logEntry struct {
        Timestamp string                 `json:"timestamp"`
        Level     string                 `json:"level"`
        Message   string                 `json:"message"`
        Data      map[string]interface{} `json:"data"`
    }
    
    if err := json.Unmarshal(rawLog, &logEntry); err != nil {
        return nil, err
    }
    
    // Transform to standard format
    event := &AgentEvent{
        ID:        generateEventID(),
        Timestamp: parseTimestamp(logEntry.Timestamp),
        Type:      determineEventType(logEntry),
        AgentID:   "github-copilot",
        SessionID: a.sessionID,
        Data:      logEntry.Data,
    }
    
    // Extract metrics if available
    if tokenCount, ok := logEntry.Data["tokenCount"].(float64); ok {
        event.Metrics = &EventMetrics{
            TokenCount: int(tokenCount),
        }
    }
    
    return event, nil
}

func determineEventType(logEntry logEntry) string {
    // Map Copilot events to standard types
    switch {
    case contains(logEntry.Message, "completion"):
        return "llm_response"
    case contains(logEntry.Message, "file_edit"):
        return "file_write"
    case contains(logEntry.Message, "error"):
        return "error_encountered"
    default:
        return "user_interaction"
    }
}
```

### 4. Local Buffer (SQLite)

**Schema**:

```sql
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    agent_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    data BLOB NOT NULL,
    sent INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    INDEX idx_sent (sent),
    INDEX idx_timestamp (timestamp)
);

CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT
);
```

**Go Implementation**:

```go
package buffer

import (
    "database/sql"
    _ "github.com/mattn/go-sqlite3"
)

type Buffer struct {
    db     *sql.DB
    maxSize int
}

func NewBuffer(dbPath string, maxSize int) (*Buffer, error) {
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        return nil, err
    }
    
    // Initialize schema
    if err := initSchema(db); err != nil {
        return nil, err
    }
    
    return &Buffer{db: db, maxSize: maxSize}, nil
}

func (b *Buffer) Store(event *AgentEvent) error {
    data, err := json.Marshal(event)
    if err != nil {
        return err
    }
    
    _, err = b.db.Exec(`
        INSERT INTO events (id, timestamp, agent_id, session_id, event_type, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, event.ID, event.Timestamp.Unix(), event.AgentID, event.SessionID, 
       event.Type, data, time.Now().Unix())
    
    // Enforce max size
    b.cleanup()
    
    return err
}

func (b *Buffer) GetUnsent(limit int) ([]*AgentEvent, error) {
    rows, err := b.db.Query(`
        SELECT data FROM events 
        WHERE sent = 0 
        ORDER BY timestamp 
        LIMIT ?
    `, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var events []*AgentEvent
    for rows.Next() {
        var data []byte
        if err := rows.Scan(&data); err != nil {
            continue
        }
        
        var event AgentEvent
        if err := json.Unmarshal(data, &event); err != nil {
            continue
        }
        
        events = append(events, &event)
    }
    
    return events, nil
}

func (b *Buffer) MarkSent(eventIDs []string) error {
    // Mark as sent and delete after confirmation
    _, err := b.db.Exec(`
        DELETE FROM events WHERE id IN (?)
    `, strings.Join(eventIDs, ","))
    
    return err
}
```

### 5. Batch Manager

```go
package batch

import (
    "time"
)

type BatchManager struct {
    batchSize     int
    batchInterval time.Duration
    buffer        *Buffer
    client        *BackendClient
    events        chan *AgentEvent
}

func NewBatchManager(batchSize int, interval time.Duration, 
                      buffer *Buffer, client *BackendClient) *BatchManager {
    return &BatchManager{
        batchSize:     batchSize,
        batchInterval: interval,
        buffer:        buffer,
        client:        client,
        events:        make(chan *AgentEvent, 1000),
    }
}

func (bm *BatchManager) Start() {
    go bm.processBatches()
}

func (bm *BatchManager) Add(event *AgentEvent) {
    // Store in buffer first
    if err := bm.buffer.Store(event); err != nil {
        log.Printf("Failed to buffer event: %v", err)
        return
    }
    
    bm.events <- event
}

func (bm *BatchManager) processBatches() {
    batch := make([]*AgentEvent, 0, bm.batchSize)
    ticker := time.NewTicker(bm.batchInterval)
    defer ticker.Stop()
    
    for {
        select {
        case event := <-bm.events:
            batch = append(batch, event)
            if len(batch) >= bm.batchSize {
                bm.sendBatch(batch)
                batch = batch[:0]
            }
            
        case <-ticker.C:
            if len(batch) > 0 {
                bm.sendBatch(batch)
                batch = batch[:0]
            }
        }
    }
}

func (bm *BatchManager) sendBatch(batch []*AgentEvent) {
    if err := bm.client.SendBatch(batch); err != nil {
        log.Printf("Failed to send batch: %v", err)
        // Events remain in buffer for retry
        return
    }
    
    // Mark as sent in buffer
    eventIDs := make([]string, len(batch))
    for i, e := range batch {
        eventIDs[i] = e.ID
    }
    bm.buffer.MarkSent(eventIDs)
}
```

### 6. Backend Client

```go
package client

import (
    "bytes"
    "compress/gzip"
    "encoding/json"
    "net/http"
    "time"
)

type BackendClient struct {
    baseURL    string
    apiKey     string
    httpClient *http.Client
}

func NewBackendClient(baseURL, apiKey string) *BackendClient {
    return &BackendClient{
        baseURL: baseURL,
        apiKey:  apiKey,
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
            Transport: &http.Transport{
                MaxIdleConns:        10,
                IdleConnTimeout:     90 * time.Second,
                MaxIdleConnsPerHost: 5,
            },
        },
    }
}

func (c *BackendClient) SendBatch(events []*AgentEvent) error {
    // Serialize events
    data, err := json.Marshal(map[string]interface{}{
        "events": events,
    })
    if err != nil {
        return err
    }
    
    // Compress with gzip
    var compressed bytes.Buffer
    gzWriter := gzip.NewWriter(&compressed)
    if _, err := gzWriter.Write(data); err != nil {
        return err
    }
    gzWriter.Close()
    
    // Send to backend
    req, err := http.NewRequest("POST", 
        c.baseURL+"/api/agent/events/batch", 
        &compressed)
    if err != nil {
        return err
    }
    
    req.Header.Set("Authorization", "Bearer "+c.apiKey)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Content-Encoding", "gzip")
    
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("backend returned status %d", resp.StatusCode)
    }
    
    return nil
}

func (c *BackendClient) SendBatchWithRetry(events []*AgentEvent, maxRetries int) error {
    var err error
    backoff := time.Second
    
    for i := 0; i < maxRetries; i++ {
        err = c.SendBatch(events)
        if err == nil {
            return nil
        }
        
        log.Printf("Retry %d/%d after error: %v", i+1, maxRetries, err)
        time.Sleep(backoff)
        backoff *= 2 // Exponential backoff
    }
    
    return err
}
```

## Distribution & Installation

### 1. Build Process

**Cross-compilation**:

```bash
# Build for all platforms
GOOS=darwin GOARCH=amd64 go build -o bin/devlog-collector-darwin-amd64 cmd/collector/main.go
GOOS=darwin GOARCH=arm64 go build -o bin/devlog-collector-darwin-arm64 cmd/collector/main.go
GOOS=linux GOARCH=amd64 go build -o bin/devlog-collector-linux-amd64 cmd/collector/main.go
GOOS=windows GOARCH=amd64 go build -o bin/devlog-collector-windows-amd64.exe cmd/collector/main.go
```

### 2. NPM Package Wrapper

**package.json**:

```json
{
  "name": "@codervisor/devlog-collector",
  "version": "1.0.0",
  "description": "AI Agent Activity Collector for Devlog",
  "bin": {
    "devlog-collector": "bin/collector"
  },
  "scripts": {
    "postinstall": "node scripts/install.js"
  },
  "files": [
    "bin/",
    "scripts/"
  ]
}
```

**scripts/install.js**:

```javascript
const os = require('os');
const path = require('path');
const fs = require('fs');

const platform = os.platform();
const arch = os.arch();

const binaryMap = {
  'darwin-x64': 'devlog-collector-darwin-amd64',
  'darwin-arm64': 'devlog-collector-darwin-arm64',
  'linux-x64': 'devlog-collector-linux-amd64',
  'win32-x64': 'devlog-collector-windows-amd64.exe'
};

const binaryName = binaryMap[`${platform}-${arch}`];
if (!binaryName) {
  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

const binaryPath = path.join(__dirname, '..', 'bin', binaryName);
const targetPath = path.join(__dirname, '..', 'bin', 'collector');

// Create symlink or copy
if (platform === 'win32') {
  fs.copyFileSync(binaryPath, targetPath + '.exe');
} else {
  fs.symlinkSync(binaryName, targetPath);
  fs.chmodSync(binaryPath, 0o755);
}

console.log('✅ Devlog collector installed successfully');
```

### 3. Auto-start Configuration

**macOS (launchd)**:

```xml
<!-- ~/Library/LaunchAgents/io.devlog.collector.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.devlog.collector</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/devlog-collector</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

**Linux (systemd)**:

```ini
# ~/.config/systemd/user/devlog-collector.service
[Unit]
Description=Devlog AI Agent Collector
After=network.target

[Service]
ExecStart=/usr/local/bin/devlog-collector start
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

## Performance Characteristics

| Metric | Target | Typical |
|--------|--------|---------|
| **Binary Size** | < 20MB | ~15MB |
| **Memory Usage** | < 50MB | ~30MB |
| **CPU Usage (idle)** | < 1% | ~0.5% |
| **CPU Usage (active)** | < 5% | ~2% |
| **Event Processing** | > 1K events/sec | ~5K events/sec |
| **Startup Time** | < 1s | ~300ms |
| **Latency (event → buffer)** | < 10ms | ~2ms |
| **Network Bandwidth** | Varies | ~10KB/s (compressed) |

## Security Considerations

1. **API Key Storage**: Use OS keychain/credential manager
2. **TLS**: All backend communication over HTTPS/TLS 1.3
3. **Data Privacy**: Optional PII filtering before transmission
4. **File Permissions**: Restrict log access to user account only
5. **Code Signing**: Sign binaries for macOS/Windows

## Monitoring & Debugging

**Health Check Endpoint**:

```go
// HTTP server for health checks and status
http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status": "healthy",
        "version": version,
        "uptime": time.Since(startTime).String(),
        "eventsProcessed": eventsCount,
        "bufferSize": bufferSize,
    })
})

http.ListenAndServe("localhost:9090", nil)
```

**Logging**:

```go
import "github.com/sirupsen/logrus"

log := logrus.New()
log.SetFormatter(&logrus.JSONFormatter{})
log.SetLevel(logrus.InfoLevel)

log.WithFields(logrus.Fields{
    "agent": "copilot",
    "events": 100,
    "duration": "523ms",
}).Info("Batch sent successfully")
```

## Future Enhancements

1. **Smart Filtering**: ML-based filtering of noise/irrelevant events
2. **Local Analytics**: Basic metrics on device before sending
3. **Compression Optimization**: Better compression algorithms
4. **Delta Updates**: Send only changed data
5. **WebAssembly**: Browser-based collector for web IDEs

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-20  
**Status**: Implementation Ready
