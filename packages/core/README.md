# @codervisor/devlog-core

Core functionality for the devlog system. This package provides the main `DevlogManager` class that handles creation,
updating, querying, and management of development logs.

## Features

- **CRUD Operations**: Create, read, update, and delete devlog entries
- **Multiple Storage Backends**: SQLite, PostgreSQL, MySQL, and Enterprise integrations
- **Rich Context**: Support for business context, technical context, and AI-enhanced metadata
- **Filtering & Search**: Query devlogs by status, type, priority, tags, and text search
- **Notes & Progress Tracking**: Add timestamped notes to track progress
- **AI Context Management**: Special handling for AI assistant context and insights
- **LLM Service**: Integrated Large Language Model support for AI-powered features
- **Decision Tracking**: Record important decisions with rationale
- **Statistics**: Get overview statistics of your devlog entries
- **Status Workflow**: Comprehensive status system for tracking work progression

## Devlog Status System

Devlog entries use a well-defined status system to track work progression:

**Open Statuses (Active Work):**

- `new` - Work ready to start
- `in-progress` - Actively being developed
- `blocked` - Temporarily stopped due to dependencies
- `in-review` - Awaiting review/approval
- `testing` - Being validated through testing

**Closed Statuses (Completed Work):**

- `done` - Successfully completed
- `cancelled` - Abandoned/deprioritized

**Typical Workflow:** `new` → `in-progress` → `in-review` → `testing` → `done`

📖 **[View Complete Status Workflow Guide](../../docs/reference/devlog-status-workflow.md)**

## Installation

```bash
pnpm add @codervisor/devlog-core
```

## Usage

```typescript
import { DevlogManager } from '@codervisor/devlog-core';

// Initialize the manager
const devlog = new DevlogManager({
  workspaceRoot: '/path/to/your/project',
  // devlogDir: '/custom/path/.devlog' // optional custom directory
});

// Create a new devlog entry
const entry = await devlog.createDevlog({
  title: 'Implement user authentication',
  type: 'feature',
  description: 'Add JWT-based authentication system',
  priority: 'high',
  businessContext: 'Users need secure login to access protected feature',
  technicalContext: 'Using JWT tokens with refresh mechanism',
  acceptanceCriteria: [
    'Users can register with email/password',
    'Users can login and receive JWT token',
    'Protected routes require valid token',
  ],
});

// Update the devlog
await devlog.updateDevlog({
  id: entry.id,
  status: 'in-progress',
  progress: 'Completed user registration endpoint',
});

// Add a note
await devlog.addNote(entry.id, {
  category: 'progress',
  content: 'Fixed validation issues with email format',
});

// List all devlog
const allDevlogs = await devlog.listDevlogs();

// Filter devlog
const inProgressTasks = await devlog.listDevlogs({
  status: ['in-progress'],
  type: ['feature', 'bugfix'],
});

// Search devlog
const authDevlogs = await devlog.searchDevlogs('authentication');

// Get active context for AI assistants
const activeContext = await devlog.getActiveContext(5);

// Complete a devlog
await devlog.completeDevlog(entry.id, 'Authentication system implemented and tested');
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
  'Explain what a devlog is in software development.'
);

// Advanced completion with custom configuration
const completion = await llmService.generateCompletion({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What are the benefits of TypeScript?' }
  ],
  model: {
    provider: 'openai',
    model: 'gpt-4',
    maxTokens: 500,
    temperature: 0.3,
  }
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
const embedding = await llmService.simpleEmbed(
  'Text to convert to vector embedding'
);

// Multiple text embeddings
const embeddings = await llmService.simpleEmbedMany([
  'First text to embed',
  'Second text to embed',
  'Third text to embed'
]);

// Advanced embedding with custom model
const response = await llmService.embed({
  text: 'Advanced text for embedding',
  model: 'text-embedding-3-large',
  metadata: { source: 'documentation' }
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
  }
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
