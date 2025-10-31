# Hierarchy API Documentation

This directory contains the complete API documentation for the Devlog Hierarchy API endpoints.

## Quick Links

- **OpenAPI Specification**: [hierarchy-api.yaml](./hierarchy-api.yaml)
- **Usage Examples**: [examples.md](./examples.md)
- **Integration Guide**: See below

## Overview

The Hierarchy API manages the 5-level organizational structure:

```
Organization
└── Projects (Git repositories)
    └── Machines (Development environments)
        └── Workspaces (VS Code windows)
            └── ChatSessions (AI conversations)
                └── AgentEvents (Time-series events)
```

## API Endpoints

### Machines
- `POST /api/machines` - Create/update machine
- `GET /api/machines` - List all machines
- `GET /api/machines/{id}` - Get machine details

### Workspaces
- `POST /api/workspaces` - Create/update workspace
- `GET /api/workspaces/{workspaceId}` - Get workspace by VS Code ID

### Projects
- `GET /api/projects/{id}/hierarchy` - Get project hierarchy tree
- `GET /api/projects/{id}/events` - Get filtered events

### Chat Sessions
- `POST /api/chat-sessions` - Create/update session
- `GET /api/chat-sessions/{sessionId}/events` - Get session events

### Events
- `POST /api/events/batch` - Batch create events (max 1000)
- `GET /api/events/stream` - Real-time event stream (SSE)

### Health
- `GET /api/health` - Health check

## Authentication

Currently, the API does not require authentication in development mode. Production deployment will use JWT tokens or API keys.

## Rate Limiting

- Standard requests: 100 requests/minute
- Batch events: 10 requests/minute
- Event stream: 1 concurrent connection per filter combination

## Error Handling

All errors return a consistent format:

```json
{
  "error": "Human-readable error message",
  "details": "Optional additional details"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created (batch events)
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

## Viewing the Specification

### Using Swagger UI

1. Install Swagger UI:
```bash
npm install -g swagger-ui
```

2. Serve the specification:
```bash
swagger-ui serve hierarchy-api.yaml
```

3. Open http://localhost:8080 in your browser

### Using Redoc

1. Install Redoc CLI:
```bash
npm install -g redoc-cli
```

2. Generate static HTML:
```bash
redoc-cli bundle hierarchy-api.yaml -o docs.html
```

3. Open `docs.html` in your browser

### Online Viewers

Upload `hierarchy-api.yaml` to:
- [Swagger Editor](https://editor.swagger.io/)
- [Redocly](https://redocly.github.io/redoc/)

## Development

### Running Tests

```bash
# Run all API tests
RUN_INTEGRATION_TESTS=true pnpm test

# Run specific test suite
RUN_INTEGRATION_TESTS=true pnpm test hierarchy-api.test.ts
```

### Test Server

Start the development server:

```bash
pnpm dev:web
```

The API will be available at http://localhost:3200/api

## Integration Examples

See [examples.md](./examples.md) for detailed integration examples including:

- Go collector integration
- JavaScript/TypeScript clients
- Python clients
- curl examples

## Changelog

### v1.0.0 (2025-10-31)
- Initial release
- Machine, workspace, project, session, and event endpoints
- Real-time event streaming via SSE
- Comprehensive filtering and validation
