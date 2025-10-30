# Integration Tests

This directory contains end-to-end integration tests for the Devlog Collector.

## Overview

Integration tests verify that all components work correctly together:
- Agent adapters (log parsing)
- File system watcher (monitoring)
- HTTP client (batching, retry)
- SQLite buffer (offline support)
- Backend API integration

## Test Scenarios

### 1. `TestEndToEnd_CopilotLogParsing`
Verifies the complete flow from Copilot log file to backend API.

**What it tests**:
- Log file parsing with Copilot adapter
- Event extraction and formatting
- HTTP client batching and sending
- Backend API integration
- Data integrity through the pipeline

**Expected behavior**:
- 2 events parsed from sample log
- All events reach backend
- Event metadata preserved (agent ID, type, file path)

### 2. `TestEndToEnd_OfflineBuffering`
Verifies offline buffering when backend is unavailable.

**What it tests**:
- Detection of backend failures
- Automatic buffering to SQLite
- Event persistence across restarts
- Automatic retry when backend recovers
- Buffer cleanup after successful send

**Expected behavior**:
- Events buffered when backend down (503)
- Events retrieved from buffer intact
- Events sent successfully when backend up
- Buffer cleared after send

### 3. `TestEndToEnd_LogRotation`
Verifies handling of log file rotation.

**What it tests**:
- Processing events from initial file
- Detection of file rotation
- Processing events from new file
- No data loss during rotation

**Expected behavior**:
- Events from both files processed
- Rotation handled gracefully
- No duplicate or missed events

### 4. `TestEndToEnd_HighVolume`
Verifies performance with many events.

**What it tests**:
- Parsing 100 events efficiently
- Batching optimization
- Memory management
- Throughput

**Expected behavior**:
- 100/100 events processed (100% success)
- Processing completes in <5 seconds
- No memory leaks

## Running Tests

```bash
# Run all integration tests
go test ./internal/integration -v

# Run specific test
go test ./internal/integration -v -run TestEndToEnd_CopilotLogParsing

# Run with timeout
go test ./internal/integration -v -timeout 30s

# Skip in short mode (for CI)
go test ./internal/integration -short
```

## Test Environment

Each test creates an isolated environment:
- Temporary directory (auto-cleanup)
- Mock HTTP backend
- Real components (minimal mocking)
- SQLite buffer in temp location

## Writing New Tests

Template for new integration tests:

```go
func TestEndToEnd_YourScenario(t *testing.T) {
    // Setup temp environment
    tmpDir := t.TempDir()
    logDir := filepath.Join(tmpDir, "logs")
    os.MkdirAll(logDir, 0755)

    // Create mock backend
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Handle requests
    }))
    defer server.Close()

    // Initialize components
    registry := adapters.DefaultRegistry("test-project")
    adapter := adapters.NewCopilotAdapter("test-project")
    
    // ... rest of setup

    // Write test log files
    logFile := filepath.Join(logDir, "test.log")
    os.WriteFile(logFile, []byte("..."), 0644)

    // Parse and process
    events, _ := adapter.ParseLogFile(logFile)
    for _, event := range events {
        apiClient.SendEvent(event)
    }

    // Wait for async processing
    time.Sleep(1 * time.Second)

    // Assertions
    if eventCount != expectedCount {
        t.Errorf("expected %d events, got %d", expectedCount, eventCount)
    }
}
```

## Debugging Failed Tests

### Enable verbose logging
```go
log := logrus.New()
log.SetLevel(logrus.DebugLevel)
```

### Check test output
```bash
go test ./internal/integration -v 2>&1 | tee test.log
```

### Inspect temp files
```go
// Add this to prevent cleanup
tmpDir := t.TempDir()
t.Logf("Test directory: %s", tmpDir)
// Files remain until test completes
```

## Common Issues

**Events not received by backend**:
- Check batching delay (increase wait time)
- Verify log format matches adapter expectations
- Check mock server handler logic

**Buffer not storing events**:
- Ensure SendSingleEvent used (not SendEvent)
- Verify backend returns failure status
- Check buffer configuration

**Timing issues**:
- Increase sleep durations
- Use polling instead of fixed delays
- Check debounce settings

## CI/CD Integration

For continuous integration:

```yaml
# GitHub Actions example
- name: Run Integration Tests
  run: |
    go test ./internal/integration -v -timeout 60s
```

For faster CI (skip slow tests):
```bash
go test ./internal/integration -short
```

## Performance Benchmarks

Expected performance on modern hardware:

- Log parsing: ~5,000 events/second
- HTTP batching: ~1,000 events/second  
- Buffer operations: <1ms per event
- End-to-end latency: <100ms per event

## Related Documentation

- [Week 1 Complete](../WEEK1_COMPLETE.md) - Core implementation
- [Completion Roadmap](../README.md) - Overall progress
- [Go Collector README](../../../packages/collector-go/README.md) - Usage guide

## Support

For issues with integration tests:
1. Check test output for specific failures
2. Enable debug logging
3. Verify component configurations
4. Review related unit tests
