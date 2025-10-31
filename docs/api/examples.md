# Hierarchy API Usage Examples

Complete examples for integrating with the Devlog Hierarchy API.

## Table of Contents

- [Quick Start](#quick-start)
- [Machine Operations](#machine-operations)
- [Workspace Operations](#workspace-operations)
- [Project Hierarchy](#project-hierarchy)
- [Event Management](#event-management)
- [Real-time Streaming](#real-time-streaming)
- [Client Libraries](#client-libraries)

---

## Quick Start

### 1. Health Check

```bash
curl http://localhost:3200/api/health
```

Response:
```json
{
  "status": "ok"
}
```

### 2. Register a Machine

```bash
curl -X POST http://localhost:3200/api/machines \
  -H "Content-Type: application/json" \
  -d '{
    "machineId": "my-dev-machine",
    "hostname": "macbook-pro",
    "username": "developer",
    "osType": "darwin",
    "osVersion": "14.0",
    "machineType": "local",
    "ipAddress": "192.168.1.100"
  }'
```

Response:
```json
{
  "id": 1,
  "machineId": "my-dev-machine",
  "hostname": "macbook-pro",
  "username": "developer",
  "osType": "darwin",
  "osVersion": "14.0",
  "machineType": "local",
  "ipAddress": "192.168.1.100",
  "metadata": {},
  "createdAt": "2025-10-31T10:00:00.000Z",
  "lastSeenAt": "2025-10-31T10:00:00.000Z"
}
```

### 3. Create a Workspace

```bash
curl -X POST http://localhost:3200/api/workspaces \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 1,
    "machineId": 1,
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "workspacePath": "/Users/developer/projects/myapp",
    "workspaceType": "folder",
    "branch": "main",
    "commit": "abc123def456"
  }'
```

---

## Machine Operations

### List All Machines

```bash
curl http://localhost:3200/api/machines
```

Response:
```json
[
  {
    "id": 1,
    "machineId": "my-dev-machine",
    "hostname": "macbook-pro",
    "username": "developer",
    "osType": "darwin",
    "osVersion": "14.0",
    "machineType": "local",
    "ipAddress": "192.168.1.100",
    "metadata": {},
    "createdAt": "2025-10-31T10:00:00.000Z",
    "lastSeenAt": "2025-10-31T10:00:00.000Z",
    "_count": {
      "workspaces": 5
    }
  }
]
```

### Get Machine Details

```bash
curl http://localhost:3200/api/machines/1
```

Response includes all workspaces for the machine:
```json
{
  "id": 1,
  "machineId": "my-dev-machine",
  "hostname": "macbook-pro",
  "username": "developer",
  "osType": "darwin",
  "osVersion": "14.0",
  "machineType": "local",
  "ipAddress": "192.168.1.100",
  "metadata": {},
  "createdAt": "2025-10-31T10:00:00.000Z",
  "lastSeenAt": "2025-10-31T10:00:00.000Z",
  "workspaces": [
    {
      "id": 1,
      "projectId": 1,
      "machineId": 1,
      "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
      "workspacePath": "/Users/developer/projects/myapp",
      "workspaceType": "folder",
      "branch": "main",
      "commit": "abc123",
      "createdAt": "2025-10-31T10:00:00.000Z",
      "lastSeenAt": "2025-10-31T10:00:00.000Z",
      "project": {
        "id": 1,
        "name": "myapp",
        "fullName": "developer/myapp",
        "repoUrl": "https://github.com/developer/myapp",
        "repoOwner": "developer",
        "repoName": "myapp",
        "description": "My application",
        "createdAt": "2025-10-31T09:00:00.000Z",
        "updatedAt": "2025-10-31T10:00:00.000Z"
      },
      "_count": {
        "chatSessions": 10
      }
    }
  ]
}
```

---

## Workspace Operations

### Get Workspace by VS Code ID

```bash
curl http://localhost:3200/api/workspaces/550e8400-e29b-41d4-a716-446655440000
```

Response:
```json
{
  "workspace": {
    "id": 1,
    "projectId": 1,
    "machineId": 1,
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "workspacePath": "/Users/developer/projects/myapp",
    "workspaceType": "folder",
    "branch": "main",
    "commit": "abc123",
    "createdAt": "2025-10-31T10:00:00.000Z",
    "lastSeenAt": "2025-10-31T10:00:00.000Z",
    "project": { /* project details */ },
    "machine": { /* machine details */ },
    "chatSessions": [ /* recent sessions */ ]
  },
  "context": {
    "projectId": 1,
    "machineId": 1,
    "workspaceId": 1,
    "projectName": "developer/myapp",
    "machineName": "macbook-pro"
  }
}
```

---

## Project Hierarchy

### Get Complete Hierarchy

```bash
curl http://localhost:3200/api/projects/1/hierarchy
```

Response:
```json
{
  "project": {
    "id": 1,
    "name": "myapp",
    "fullName": "developer/myapp",
    "repoUrl": "https://github.com/developer/myapp",
    "repoOwner": "developer",
    "repoName": "myapp",
    "description": "My application",
    "createdAt": "2025-10-31T09:00:00.000Z",
    "updatedAt": "2025-10-31T10:00:00.000Z"
  },
  "machines": [
    {
      "machine": {
        "id": 1,
        "machineId": "my-dev-machine",
        "hostname": "macbook-pro",
        "username": "developer",
        "osType": "darwin",
        "osVersion": "14.0",
        "machineType": "local",
        "ipAddress": "192.168.1.100",
        "metadata": {},
        "createdAt": "2025-10-31T10:00:00.000Z",
        "lastSeenAt": "2025-10-31T10:00:00.000Z"
      },
      "workspaces": [
        {
          "workspace": { /* workspace details */ },
          "sessions": [ /* chat sessions */ ],
          "eventCount": 150
        }
      ]
    }
  ]
}
```

### Get Filtered Events

#### Filter by timestamp range

```bash
curl "http://localhost:3200/api/projects/1/events?from=2025-10-31T00:00:00Z&to=2025-10-31T23:59:59Z&limit=50"
```

#### Filter by machine

```bash
curl "http://localhost:3200/api/projects/1/events?machineId=1"
```

#### Filter by workspace

```bash
curl "http://localhost:3200/api/projects/1/events?workspaceId=1"
```

#### Filter by event type and severity

```bash
curl "http://localhost:3200/api/projects/1/events?eventType=llm_request&severity=error"
```

#### Combined filters

```bash
curl "http://localhost:3200/api/projects/1/events?machineId=1&from=2025-10-31T00:00:00Z&eventType=file_write&limit=100"
```

Response:
```json
{
  "events": [
    {
      "id": "event-uuid-1",
      "timestamp": "2025-10-31T10:30:00.000Z",
      "eventType": "llm_request",
      "agentId": "copilot",
      "agentVersion": "1.0.0",
      "sessionId": "session-uuid-1",
      "projectId": 1,
      "context": {
        "filePath": "/src/main.ts",
        "cursorPosition": { "line": 10, "column": 5 }
      },
      "data": {
        "prompt": "Generate a function to...",
        "model": "gpt-4"
      },
      "metrics": {
        "tokens": 150
      },
      "tags": ["code-generation"],
      "severity": "info",
      "createdAt": "2025-10-31T10:30:00.000Z",
      "session": {
        "workspace": {
          "machine": { /* machine */ },
          "project": { /* project */ }
        }
      }
    }
  ],
  "count": 1,
  "filters": {
    "projectId": 1,
    "machineId": 1,
    "from": "2025-10-31T00:00:00Z",
    "eventType": "llm_request",
    "limit": 100
  }
}
```

---

## Event Management

### Create Chat Session

```bash
curl -X POST http://localhost:3200/api/chat-sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440001",
    "workspaceId": 1,
    "agentType": "copilot",
    "modelId": "gpt-4",
    "startedAt": "2025-10-31T10:00:00Z",
    "messageCount": 5,
    "totalTokens": 1000
  }'
```

### Batch Create Events

```bash
curl -X POST http://localhost:3200/api/events/batch \
  -H "Content-Type: application/json" \
  -d '[
    {
      "timestamp": "2025-10-31T10:00:00Z",
      "eventType": "llm_request",
      "agentId": "copilot",
      "agentVersion": "1.0.0",
      "sessionId": "550e8400-e29b-41d4-a716-446655440001",
      "projectId": 1,
      "context": {
        "filePath": "/src/main.ts"
      },
      "data": {
        "prompt": "Generate a function"
      },
      "tags": ["code-generation"],
      "severity": "info"
    },
    {
      "timestamp": "2025-10-31T10:00:05Z",
      "eventType": "llm_response",
      "agentId": "copilot",
      "agentVersion": "1.0.0",
      "sessionId": "550e8400-e29b-41d4-a716-446655440001",
      "projectId": 1,
      "context": {
        "filePath": "/src/main.ts"
      },
      "data": {
        "response": "function generate() { ... }"
      },
      "metrics": {
        "tokens": 150
      },
      "tags": ["code-generation"],
      "severity": "info"
    }
  ]'
```

Response:
```json
{
  "created": 2,
  "requested": 2
}
```

### Get Session Events

```bash
curl http://localhost:3200/api/chat-sessions/550e8400-e29b-41d4-a716-446655440001/events
```

---

## Real-time Streaming

### Server-Sent Events (SSE)

#### Subscribe to all project events

```bash
curl -N http://localhost:3200/api/events/stream?projectId=1
```

#### Subscribe to machine events

```bash
curl -N http://localhost:3200/api/events/stream?projectId=1&machineId=1
```

#### Subscribe to workspace events

```bash
curl -N http://localhost:3200/api/events/stream?projectId=1&workspaceId=1
```

SSE Stream Format:
```
event: connected
data: {"timestamp":"2025-10-31T10:00:00.000Z","filters":{"projectId":1}}

: heartbeat 1698753600000

event: events
data: {"type":"events","data":[{"id":"event-1","eventType":"llm_request",...}]}

event: error
data: {"type":"error","error":"Connection lost"}
```

---

## Client Libraries

### JavaScript/TypeScript

```typescript
// Using fetch
async function createMachine(machineData) {
  const response = await fetch('http://localhost:3200/api/machines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(machineData),
  });
  return response.json();
}

// Using EventSource for SSE
const eventSource = new EventSource(
  'http://localhost:3200/api/events/stream?projectId=1'
);

eventSource.addEventListener('connected', (event) => {
  console.log('Connected:', JSON.parse(event.data));
});

eventSource.addEventListener('events', (event) => {
  const data = JSON.parse(event.data);
  console.log('New events:', data.data);
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

### React Hook

```typescript
import { useRealtimeEvents } from '@/hooks/use-realtime-events';

function MyComponent() {
  const { events, isConnected } = useRealtimeEvents({
    projectId: 1,
    machineId: 5,
  });

  return (
    <div>
      <p>Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            {event.eventType} at {event.timestamp}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Python

```python
import requests
import json

# Create machine
def create_machine(machine_data):
    response = requests.post(
        'http://localhost:3200/api/machines',
        json=machine_data
    )
    return response.json()

# Batch create events
def batch_create_events(events):
    response = requests.post(
        'http://localhost:3200/api/events/batch',
        json=events
    )
    return response.json()

# SSE stream (using sseclient library)
from sseclient import SSEClient

messages = SSEClient('http://localhost:3200/api/events/stream?projectId=1')
for msg in messages:
    if msg.event == 'events':
        data = json.loads(msg.data)
        print('New events:', data['data'])
```

### Go (Collector Integration)

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

type MachineData struct {
    MachineID   string                 `json:"machineId"`
    Hostname    string                 `json:"hostname"`
    Username    string                 `json:"username"`
    OSType      string                 `json:"osType"`
    OSVersion   string                 `json:"osVersion"`
    MachineType string                 `json:"machineType"`
    IPAddress   string                 `json:"ipAddress"`
    Metadata    map[string]interface{} `json:"metadata"`
}

func registerMachine(baseURL string, data MachineData) error {
    body, err := json.Marshal(data)
    if err != nil {
        return err
    }

    resp, err := http.Post(
        baseURL+"/machines",
        "application/json",
        bytes.NewBuffer(body),
    )
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return nil
}

// Usage
func main() {
    machineData := MachineData{
        MachineID:   "my-machine-id",
        Hostname:    "dev-machine",
        Username:    "developer",
        OSType:      "linux",
        OSVersion:   "22.04",
        MachineType: "local",
    }

    err := registerMachine("http://localhost:3200/api", machineData)
    if err != nil {
        panic(err)
    }
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "details": "Optional additional context"
}
```

### Common Errors

**400 Bad Request - Invalid Input**
```json
{
  "error": "Validation failed: machineId is required"
}
```

**404 Not Found**
```json
{
  "error": "Machine not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to create machine",
  "details": "Database connection error"
}
```

---

## Best Practices

1. **Machine Registration**: Always register machines before creating workspaces
2. **Workspace ID**: Use VS Code's workspace ID for consistency
3. **Batch Events**: Use batch endpoint for better performance (up to 1000 events)
4. **Event Stream**: Filter streams to reduce bandwidth and processing
5. **Error Handling**: Always check response status codes
6. **Idempotency**: Most endpoints support upsert operations for safe retries

---

## Next Steps

- View the [OpenAPI Specification](./hierarchy-api.yaml) for complete details
- Check the [Integration Tests](../../apps/web/tests/lib/api/hierarchy-api.test.ts) for more examples
- Review the [API README](./README.md) for development setup
