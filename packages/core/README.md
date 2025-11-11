# @codervisor/devlog-core

Core services and types for the **AI Coding Agent Observability Platform**.

This package provides the foundational services for monitoring, analyzing, and optimizing AI coding agent activities. It also includes optional project management features for organizing agent sessions and development work.

## 🎯 Features

### 🔍 Agent Observability (Primary)

**Event Collection & Storage:**

- Capture all AI agent activities (file operations, LLM requests, commands)
- High-performance event ingestion with TimescaleDB
- Complete, immutable audit trail of agent behavior
- Efficient time-series queries and filtering

**Session Management:**

- Track complete agent working sessions from start to finish
- Link events into analyzable workflows
- Record session objectives and outcomes
- Calculate session-level performance metrics

**Analytics Engine:**

- Aggregate metrics across events and sessions
- Performance analysis (speed, efficiency, token usage)
- Pattern detection for success and failure modes
- Quality assessment of AI-generated code

### 📊 Project Management (Supporting)

**Optional features for organizing agent sessions:**

- Project organization for multi-codebase teams
- Work item tracking (features, bugs, tasks)
- Document attachments and note-taking
- Status workflows and progress tracking

**Note:** "Work item" is the preferred terminology (industry standard). "Devlog entry" is legacy but still fully supported.

## 📦 Installation

```bash
pnpm add @codervisor/devlog-core
```

## 🚀 Usage

### Agent Observability

```typescript
import { AgentEventService, AgentSessionService } from '@codervisor/devlog-core/server';

// Start tracking an agent session
const sessionService = AgentSessionService.getInstance(projectId);
await sessionService.initialize();

const session = await sessionService.create({
  agentId: 'github-copilot',
  projectId: 1,
  objective: 'Implement user authentication',
  workItemId: 42, // Optional: link to work item
});

// Log agent events
const eventService = AgentEventService.getInstance(projectId);
await eventService.initialize();

await eventService.logEvent({
  type: 'file_write',
  agentId: 'github-copilot',
  agentVersion: '1.0.0',
  sessionId: session.id,
  projectId: 1,
  context: {
    workingDirectory: '/app',
    filePath: 'src/auth/login.ts',
    branch: 'feature/auth',
  },
  data: {
    content: '// Implementation...',
    linesAdded: 45,
  },
  metrics: {
    duration: 1500,
    tokenCount: 1200,
  },
});

// End the session
await sessionService.end(session.id, {
  outcome: 'success',
  summary: 'JWT authentication implemented with tests',
});

// Query and analyze
const events = await eventService.queryEvents({
  sessionId: session.id,
  eventType: 'file_write',
});

const stats = await eventService.getEventStats({
  sessionId: session.id,
});
```

### Project Management (Optional)

```typescript
import {
  PrismaProjectService,
  PrismaDevlogService,
  WorkItem,
} from '@codervisor/devlog-core/server';

// Create a project
const projectService = PrismaProjectService.getInstance();
await projectService.initialize();

const project = await projectService.create({
  name: 'my-app',
  description: 'Main application',
  repositoryUrl: 'https://github.com/org/repo',
});

// Create a work item (optional - for organizing agent sessions)
const workItemService = PrismaDevlogService.getInstance(project.id);
await workItemService.initialize();

const item: WorkItem = await workItemService.create({
  title: 'Implement authentication',
  type: 'feature',
  description: 'Add JWT-based authentication',
  status: 'new',
  priority: 'high',
  projectId: project.id,
});

// Update work item status
await workItemService.update(item.id!, {
  status: 'in-progress',
});

// Add progress note
await workItemService.addNote(item.id!, {
  category: 'progress',
  content: 'Completed login endpoint implementation',
});
```

## 🏗️ Architecture

### Module Organization

The package is organized into two main feature domains:

#### `agent-observability/` - PRIMARY FEATURE

- `AgentEventService` - Event collection and querying
- `AgentSessionService` - Session lifecycle management
- Agent observability types and interfaces

#### `project-management/` - SUPPORTING FEATURE

- `PrismaProjectService` - Project organization
- `PrismaDevlogService` - Work item tracking (legacy: "devlog entries")
- `PrismaDocumentService` - Document attachments
- Project and work item types

### Import Patterns

```typescript
// Recommended: Import from organized modules
import { AgentEventService, AgentSessionService } from '@codervisor/devlog-core/server';

// Legacy: Direct imports still work
import { AgentEventService } from '@codervisor/devlog-core';

// Types (client-safe)
import type { AgentEvent, WorkItem } from '@codervisor/devlog-core';
```

## LLM Service

The package includes an integrated LLM (Large Language Model) service for AI-powered features using the Vercel AI SDK. Supports OpenAI and Azure OpenAI.

### Basic Usage

```typescript
import { createLLMServiceFromEnv, LLMService } from '@codervisor/devlog-core/server';

// Create service from environment variables
const llmService = createLLMServiceFromEnv();
await llmService.initialize();

// Simple completion
const response = await llmService.simpleCompletion(
  'Explain what a devlog is in software development.',
);

// Advanced completion with custom configuration
const completion = await llmService.generateCompletion({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What are the benefits of TypeScript?' },
  ],
  model: {
    provider: 'openai',
    model: 'gpt-4',
    maxTokens: 500,
    temperature: 0.3,
  },
});

// Streaming completion
for await (const chunk of llmService.generateStreamingCompletion(request)) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
  if (chunk.isComplete) break;
}
```

### Embedding Operations

```typescript
// Single text embedding
const embedding = await llmService.simpleEmbed('Text to convert to vector embedding');

// Multiple text embeddings
const embeddings = await llmService.simpleEmbedMany([
  'First text to embed',
  'Second text to embed',
  'Third text to embed',
]);

// Advanced embedding with custom model
const response = await llmService.embed({
  text: 'Advanced text for embedding',
  model: 'text-embedding-3-large',
  metadata: { source: 'documentation' },
});

// Calculate similarity between embeddings
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const similarity = cosineSimilarity(embeddings[0], embeddings[1]);
```

### Environment Configuration

```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_DEFAULT_MODEL=gpt-4
OPENAI_ORGANIZATION=your_org_id  # optional

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_OPENAI_API_VERSION=2023-12-01-preview

# Default settings
LLM_MAX_TOKENS=1000
LLM_TEMPERATURE=0.7

# Embedding models
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Manual Configuration

```typescript
const service = new LLMService({
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1', // or Azure endpoint
  defaultModel: 'gpt-4',
  defaultEmbeddingModel: 'text-embedding-3-small',
  organization: 'your-org', // OpenAI only
  apiVersion: '2023-12-01-preview', // Azure only
  defaultModelConfig: {
    maxTokens: 1000,
    temperature: 0.7,
  },
});
```

## API Reference

### DevlogManager

#### Constructor

```typescript
new DevlogManager(options?: DevlogManagerOptions)
```

Options:

- `workspaceRoot?: string` - Root directory of your project (defaults to `process.cwd()`)
- `devlogDir?: string` - Custom directory for devlog storage (defaults to `{workspaceRoot}/.devlog`)

#### Methods

- `createDevlog(request: CreateDevlogRequest): Promise<DevlogEntry>`
- `updateDevlog(request: UpdateDevlogRequest): Promise<DevlogEntry>`
- `getDevlog(id: string): Promise<DevlogEntry | null>`
- `listDevlogs(filters?: DevlogFilter): Promise<DevlogEntry[]>`
- `searchDevlogs(query: string): Promise<DevlogEntry[]>`
- `addNote(id: string, note: Omit<DevlogNote, "id" | "timestamp">): Promise<DevlogEntry>`
- `completeDevlog(id: string, summary?: string): Promise<DevlogEntry>`
- `deleteDevlog(id: string): Promise<void>`
- `getActiveContext(limit?: number): Promise<DevlogEntry[]>`
- `updateAIContext(args: AIContextUpdate): Promise<DevlogEntry>`
- `addDecision(args: DecisionArgs): Promise<DevlogEntry>`
- `getStats(): Promise<DevlogStats>`

## Storage

The core package supports multiple storage backends:

- **SQLite**: Default for local development, provides good performance and full-text search
- **PostgreSQL**: For production environments requiring multi-user access
- **MySQL**: Alternative database option for web applications
- **Enterprise**: Integration with external systems like Jira, Azure DevOps, etc.

Storage is configured through the `DevlogManager` constructor or environment variables.

## Integration

This core package is designed to be used by:

- `@codervisor/devlog-mcp` - MCP server for AI assistants
- `@codervisor/devlog-web` - Web interface for browsing devlogs
- Custom applications and scripts

## License

Apache 2.0
