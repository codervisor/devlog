# Database Schema Design

**Part of**: MVP Launch Plan  
**Status**: Design Complete  
**Priority**: CRITICAL - Week 1

---

## 🎯 Overview

Complete Prisma schema with PostgreSQL + TimescaleDB for the project hierarchy.

---

## 📊 Full Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// PROJECT HIERARCHY
// ============================================================================

// Projects - Repositories/codebases being worked on
model Project {
  id          Int      @id @default(autoincrement())
  name        String   // "devlog"
  fullName    String   @unique // "codervisor/devlog"
  repoUrl     String   @unique // "git@github.com:codervisor/devlog.git"
  repoOwner   String   // "codervisor"
  repoName    String   // "devlog"
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  machines      Machine[]
  workspaces    Workspace[]
  agentEvents   AgentEvent[]
  agentSessions AgentSession[]
  devlogEntries DevlogEntry[]

  @@index([fullName])
  @@index([repoUrl])
  @@map("projects")
}

// Machines - Physical or virtual machines where agents run
model Machine {
  id          Int      @id @default(autoincrement())
  machineId   String   @unique // "marv-macbook-pro-darwin"
  hostname    String   // "marv-macbook-pro"
  username    String   // "marvzhang"
  osType      String   // "darwin", "linux", "windows"
  osVersion   String?  // "14.5"
  machineType String   // "local", "remote", "cloud", "ci"
  ipAddress   String?
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  lastSeenAt  DateTime @updatedAt @map("last_seen_at") @db.Timestamptz

  // Relations
  projects   Project[]    @relation("MachineProjects")
  workspaces Workspace[]

  @@index([machineId])
  @@index([hostname])
  @@index([machineType])
  @@map("machines")
}

// Many-to-many: Machines can work on multiple projects
model MachineProject {
  machineId Int
  projectId Int

  machine Machine @relation("MachineProjects", fields: [machineId], references: [id], onDelete: Cascade)
  project Project @relation("MachineProjects", fields: [projectId], references: [id], onDelete: Cascade)

  @@id([machineId, projectId])
  @@map("machine_projects")
}

// Workspaces - VS Code windows/folders on specific machines
model Workspace {
  id            Int      @id @default(autoincrement())
  projectId     Int      @map("project_id")
  machineId     Int      @map("machine_id")
  workspaceId   String   @unique @map("workspace_id") // VS Code UUID
  workspacePath String   @map("workspace_path")
  workspaceType String   @map("workspace_type") // "folder", "multi-root"
  branch        String?
  commit        String?
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  lastSeenAt    DateTime @updatedAt @map("last_seen_at") @db.Timestamptz

  // Relations
  project      Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  machine      Machine       @relation(fields: [machineId], references: [id], onDelete: Cascade)
  chatSessions ChatSession[]

  @@unique([projectId, machineId, workspaceId])
  @@index([workspaceId])
  @@index([projectId])
  @@index([machineId])
  @@map("workspaces")
}

// Chat Sessions - Conversation threads within workspaces
model ChatSession {
  id           Int       @id @default(autoincrement())
  sessionId    String    @unique @db.Uuid // From chat session filename
  workspaceId  Int       @map("workspace_id")
  agentType    String    @map("agent_type") // "copilot", "claude", "cursor"
  modelId      String?   @map("model_id") // "gpt-4", "claude-sonnet-4.5"
  startedAt    DateTime  @map("started_at") @db.Timestamptz
  endedAt      DateTime? @map("ended_at") @db.Timestamptz
  messageCount Int       @default(0) @map("message_count")
  totalTokens  Int       @default(0) @map("total_tokens")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  workspace    Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  agentEvents  AgentEvent[]
  chatMessages ChatMessage[]

  @@index([sessionId])
  @@index([workspaceId])
  @@index([startedAt(sort: Desc)])
  @@index([agentType])
  @@map("chat_sessions")
}

// Chat Messages - Individual messages in chat sessions
model ChatMessage {
  id            String      @id @db.Uuid
  sessionId     String      @map("session_id") @db.Uuid
  role          String      // "user", "assistant"
  content       String      @db.Text
  timestamp     DateTime    @db.Timestamptz
  sequence      Int
  metadata      Json        @default("{}")
  searchContent String?     @map("search_content") @db.Text

  // Relations
  session ChatSession @relation(fields: [sessionId], references: [sessionId], onDelete: Cascade)

  @@index([sessionId])
  @@index([timestamp])
  @@index([sessionId, sequence])
  @@map("chat_messages")
}

// ============================================================================
// AGENT OBSERVABILITY - TIME-SERIES DATA
// ============================================================================

// Agent Events - Individual actions (TimescaleDB hypertable)
model AgentEvent {
  id           String   @id @default(uuid()) @db.Uuid
  timestamp    DateTime @db.Timestamptz
  eventType    String   @map("event_type") // "llm_request", "tool_use", etc.
  agentId      String   @map("agent_id") // Agent type
  agentVersion String   @map("agent_version")
  sessionId    String   @map("session_id") @db.Uuid
  projectId    Int      @map("project_id")

  // Event data (JSON)
  context Json @default("{}")
  data    Json @default("{}")
  metrics Json?

  // Relationships
  parentEventId   String?  @map("parent_event_id") @db.Uuid
  relatedEventIds String[] @map("related_event_ids")

  // Metadata
  tags     String[]
  severity String? // "info", "warning", "error"

  // Relations
  session ChatSession @relation(fields: [sessionId], references: [sessionId], onDelete: Cascade)
  project Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([timestamp(sort: Desc)])
  @@index([sessionId])
  @@index([projectId])
  @@index([agentId])
  @@index([eventType])
  @@index([tags])
  @@index([severity])
  @@map("agent_events") // This will be a TimescaleDB hypertable
}

// Agent Sessions - Aggregated session metadata
model AgentSession {
  id           String    @id @default(uuid()) @db.Uuid
  agentId      String    @map("agent_id")
  agentVersion String    @map("agent_version")
  projectId    Int       @map("project_id")
  startTime    DateTime  @map("start_time") @db.Timestamptz
  endTime      DateTime? @map("end_time") @db.Timestamptz
  duration     Int? // seconds

  // Context and metrics
  context Json @default("{}")
  metrics Json @default("{}")

  // Outcome
  outcome      String?  // "success", "failure", "partial", "cancelled"
  qualityScore Decimal? @map("quality_score") @db.Decimal(5, 2) // 0-100

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([startTime(sort: Desc)])
  @@index([agentId])
  @@index([projectId])
  @@index([outcome])
  @@index([qualityScore])
  @@map("agent_sessions")
}

// ============================================================================
// WORK ITEM MANAGEMENT (Secondary Feature)
// ============================================================================

model DevlogEntry {
  id          Int       @id @default(autoincrement())
  key         String    @unique @map("key_field")
  title       String
  type        String    @default("task")
  description String    @db.Text
  status      String    @default("new")
  priority    String    @default("medium")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  closedAt    DateTime? @map("closed_at") @db.Timestamptz
  archived    Boolean   @default(false)
  assignee    String?
  projectId   Int       @map("project_id")

  // Context fields
  businessContext  String? @map("business_context") @db.Text
  technicalContext String? @map("technical_context") @db.Text
  tags             String? @db.Text
  files            String? @db.Text
  dependencies     String? @db.Text

  // Relations
  project           Project            @relation(fields: [projectId], references: [id])
  notes             DevlogNote[]
  dependencies_from DevlogDependency[] @relation("DevlogDependencySource")
  dependencies_to   DevlogDependency[] @relation("DevlogDependencyTarget")
  documents         DevlogDocument[]

  @@index([status])
  @@index([type])
  @@index([priority])
  @@index([projectId])
  @@map("devlog_entries")
}

model DevlogNote {
  id        String   @id @db.Uuid
  devlogId  Int      @map("devlog_id")
  timestamp DateTime @db.Timestamptz
  category  String
  content   String   @db.Text

  devlogEntry DevlogEntry @relation(fields: [devlogId], references: [id], onDelete: Cascade)

  @@index([devlogId])
  @@index([timestamp])
  @@map("devlog_notes")
}

model DevlogDependency {
  id             String  @id @db.Uuid
  devlogId       Int     @map("devlog_id")
  type           String
  description    String  @db.Text
  externalId     String? @map("external_id")
  targetDevlogId Int?    @map("target_devlog_id")

  devlogEntry       DevlogEntry  @relation("DevlogDependencySource", fields: [devlogId], references: [id], onDelete: Cascade)
  targetDevlogEntry DevlogEntry? @relation("DevlogDependencyTarget", fields: [targetDevlogId], references: [id], onDelete: SetNull)

  @@index([devlogId])
  @@map("devlog_dependencies")
}

model DevlogDocument {
  id            String   @id @db.Uuid
  devlogId      Int      @map("devlog_id")
  filename      String
  originalName  String   @map("original_name")
  mimeType      String   @map("mime_type")
  size          Int
  type          String
  textContent   String?  @map("text_content") @db.Text
  binaryContent Bytes?   @map("binary_content")
  metadata      Json     @default("{}")
  uploadedBy    String?  @map("uploaded_by")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz

  devlogEntry DevlogEntry @relation(fields: [devlogId], references: [id], onDelete: Cascade)

  @@index([devlogId])
  @@map("devlog_documents")
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

model User {
  id              Int       @id @default(autoincrement())
  email           String    @unique
  name            String?
  avatarUrl       String?   @map("avatar_url")
  passwordHash    String    @map("password_hash")
  isEmailVerified Boolean   @default(false) @map("is_email_verified")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  lastLoginAt     DateTime? @map("last_login_at") @db.Timestamptz

  providers               UserProvider[]
  emailVerificationTokens EmailVerificationToken[]
  passwordResetTokens     PasswordResetToken[]

  @@map("users")
}

model UserProvider {
  id         Int    @id @default(autoincrement())
  userId     Int    @map("user_id")
  provider   String
  providerId String @map("provider_id")
  email      String
  name       String
  avatarUrl  String @map("avatar_url")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@index([userId])
  @@map("user_providers")
}

model EmailVerificationToken {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  used      Boolean  @default(false)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("email_verification_tokens")
}

model PasswordResetToken {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  used      Boolean  @default(false)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}
```

---

## 🔧 TimescaleDB Setup

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert agent_events to hypertable
SELECT create_hypertable('agent_events', 'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Enable compression (70-90% storage savings)
ALTER TABLE agent_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'project_id, agent_id, event_type',
  timescaledb.compress_orderby = 'timestamp DESC'
);

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('agent_events', INTERVAL '7 days');

-- Add retention policy (drop data older than 1 year)
SELECT add_retention_policy('agent_events', INTERVAL '1 year');

-- Create continuous aggregate for hourly stats
CREATE MATERIALIZED VIEW agent_events_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  project_id,
  agent_id,
  event_type,
  COUNT(*) as event_count,
  AVG((metrics->>'duration')::int) as avg_duration
FROM agent_events
GROUP BY bucket, project_id, agent_id, event_type;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('agent_events_hourly',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '10 minutes'
);
```

---

## 📋 Migration Steps

1. **Backup current database**

   ```bash
   pg_dump -Fc devlog > backup_$(date +%Y%m%d).dump
   ```

2. **Update Prisma schema**
   - Replace `prisma/schema.prisma` with schema above

3. **Generate migration**

   ```bash
   npx prisma migrate dev --name add_hierarchy_support
   ```

4. **Enable TimescaleDB**

   ```bash
   psql $DATABASE_URL -f scripts/enable-timescaledb.sql
   ```

5. **Verify migration**
   ```bash
   npx prisma migrate status
   npx prisma validate
   ```

---

## 🎯 Success Criteria

- ✅ Schema compiles without errors
- ✅ Migration runs successfully
- ✅ TimescaleDB hypertable created
- ✅ All foreign keys work correctly
- ✅ Sample data inserts successfully
- ✅ Queries return expected results

---

**Next**: [Week 1 Implementation Plan](./week1-foundation.md)
