---
status: planned
created: 2025-10-31
tags: [database, architecture, timescaledb, postgresql]
priority: high
---

# Database Architecture - PostgreSQL + TimescaleDB

**Created**: October 31, 2025  
**Status**: Design Phase  
**Priority**: HIGH  
**Purpose**: Define database architecture for AI agent observability with optimal performance, stability, and simplicity

---

## 🎯 Executive Summary

**Decision**: Use PostgreSQL with TimescaleDB extension as the primary database, with SQLite for client-side buffering.

**Rationale**:

- Single operational database to manage
- TimescaleDB is just a PostgreSQL extension (not a separate database)
- Proven at scale with billions of time-series events
- Strong relational integrity for project hierarchy
- Excellent JSON support for flexible event data
- Lower complexity than specialized databases

---

## 🏗️ Architecture Overview

```
Developer Machine (Go Collector)          Backend Server
┌─────────────────────────┐              ┌──────────────────────────┐
│  SQLite (temp buffer)   │   HTTP POST  │  PostgreSQL + TimescaleDB│
│  - Queue events         │ ───────────> │  - All persistent data   │
│  - Retry on failure     │              │  - Time-series events    │
│  - Auto-delete on sync  │              │  - Project hierarchy     │
└─────────────────────────┘              │  - User data             │
         ↓                                │  - Analytics             │
     Transparent to app                  └──────────────────────────┘
                                                    ↑
                                         Single source of truth
```

### Two-Database Strategy

| Database                     | Location        | Purpose                    | Visibility           |
| ---------------------------- | --------------- | -------------------------- | -------------------- |
| **PostgreSQL + TimescaleDB** | Backend server  | Primary persistent storage | All application code |
| **SQLite**                   | Client machines | Offline buffer/queue       | Go collector only    |

**Key Point**: From your application's perspective, you only have **one database** (PostgreSQL). SQLite is an implementation detail hidden inside the Go collector.

---

## 📊 Database Breakdown

### 1. PostgreSQL + TimescaleDB (Primary Database)

#### What Is TimescaleDB?

TimescaleDB is **not a separate database** - it's a PostgreSQL extension that adds time-series optimizations:

```sql
-- Install once
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert a table to hypertable
SELECT create_hypertable('agent_events', 'timestamp');

-- Everything else is normal PostgreSQL
SELECT * FROM agent_events WHERE timestamp > NOW() - INTERVAL '1 day';
```

**Same**:

- Connection string
- Prisma client
- SQL syntax
- Backup procedures
- Monitoring tools

**Added**:

- Automatic time-based partitioning
- 10-20x faster time-range queries
- 70-90% storage compression
- Automatic data retention policies

#### Use Cases

| Data Type                          | Table Type             | Why                                     |
| ---------------------------------- | ---------------------- | --------------------------------------- |
| **Agent Events**                   | TimescaleDB hypertable | High-volume time-series data            |
| **Agent Sessions**                 | PostgreSQL table       | Medium volume, needs JOINs with events  |
| **Projects, Machines, Workspaces** | PostgreSQL tables      | Low volume, strict relational hierarchy |
| **Chat Sessions & Messages**       | PostgreSQL tables      | Medium volume, relational structure     |
| **User Authentication**            | PostgreSQL tables      | Low volume, ACID requirements           |
| **Devlog Entries**                 | PostgreSQL tables      | Medium volume, complex relations        |

### 2. SQLite (Client-Side Buffer)

#### Purpose

Temporary queue for offline operation in Go collector.

#### Lifecycle

```
Event generated → Queued in SQLite → Batched → Sent to PostgreSQL → Deleted from SQLite
                                          ↓
                                    Retry on failure
```

#### Characteristics

- **Size**: ~10-50MB typical, self-cleaning
- **Lifetime**: Minutes to hours (until sync)
- **Visibility**: Encapsulated in `collector-go/internal/buffer`
- **Management**: Automatic, no admin needed

---

## 🗄️ Schema Design

### Time-Series Data (Agent Events)

```sql
-- Create hypertable for high-volume events
CREATE TABLE agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  session_id UUID NOT NULL,
  project_id INT NOT NULL,

  -- Flexible JSON fields
  context JSONB DEFAULT '{}',
  data JSONB DEFAULT '{}',
  metrics JSONB,

  -- Metadata
  tags TEXT[],
  severity TEXT,
  parent_event_id UUID,
  related_event_ids TEXT[]
);

-- Convert to TimescaleDB hypertable (automatic partitioning)
SELECT create_hypertable('agent_events', 'timestamp',
  chunk_time_interval => INTERVAL '1 day');

-- Indexes for common queries
CREATE INDEX idx_events_session_time ON agent_events(session_id, timestamp DESC);
CREATE INDEX idx_events_project_time ON agent_events(project_id, timestamp DESC);
CREATE INDEX idx_events_type ON agent_events(event_type);
CREATE INDEX idx_events_agent ON agent_events(agent_id);
CREATE INDEX idx_events_tags ON agent_events USING GIN(tags);
CREATE INDEX idx_events_data ON agent_events USING GIN(data);

-- Enable compression after 7 days
ALTER TABLE agent_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'project_id, agent_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('agent_events', INTERVAL '7 days');

-- Retention policy: drop data after 1 year
SELECT add_retention_policy('agent_events', INTERVAL '1 year');
```

### Relational Data (Project Hierarchy)

```sql
-- Projects (from project hierarchy redesign)
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT UNIQUE NOT NULL,
  repo_url TEXT UNIQUE NOT NULL,
  repo_owner TEXT,
  repo_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_full_name ON projects(full_name);
CREATE INDEX idx_projects_repo_url ON projects(repo_url);

-- Machines (from project hierarchy redesign)
CREATE TABLE machines (
  id SERIAL PRIMARY KEY,
  machine_id TEXT UNIQUE NOT NULL,
  hostname TEXT NOT NULL,
  username TEXT NOT NULL,
  os_type TEXT NOT NULL,
  os_version TEXT,
  machine_type TEXT NOT NULL CHECK(machine_type IN ('local', 'remote', 'cloud', 'ci')),
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_machines_machine_id ON machines(machine_id);

-- Workspaces (from project hierarchy redesign)
CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  machine_id INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  workspace_id TEXT UNIQUE NOT NULL,
  workspace_path TEXT NOT NULL,
  workspace_type TEXT NOT NULL CHECK(workspace_type IN ('folder', 'multi-root')),
  branch TEXT,
  commit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, machine_id, workspace_id)
);

CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_machine ON workspaces(machine_id);

-- Chat sessions (links to workspaces)
CREATE TABLE chat_sessions (
  id SERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  model_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id);
CREATE INDEX idx_chat_sessions_started_at ON chat_sessions(started_at DESC);

-- Agent sessions (aggregated session data)
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INT, -- seconds

  context JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',

  outcome TEXT CHECK(outcome IN ('success', 'failure', 'partial', 'cancelled')),
  quality_score DECIMAL(5,2), -- 0-100

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_sessions_project ON agent_sessions(project_id);
CREATE INDEX idx_agent_sessions_time ON agent_sessions(start_time DESC);
CREATE INDEX idx_agent_sessions_agent ON agent_sessions(agent_id);
```

### Continuous Aggregates (Dashboard Performance)

```sql
-- Pre-aggregated metrics for dashboard (updated automatically)
CREATE MATERIALIZED VIEW agent_events_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  project_id,
  agent_id,
  event_type,
  COUNT(*) as event_count,
  AVG((metrics->>'promptTokens')::int) as avg_prompt_tokens,
  AVG((metrics->>'responseTokens')::int) as avg_response_tokens,
  SUM((metrics->>'duration')::int) as total_duration
FROM agent_events
GROUP BY bucket, project_id, agent_id, event_type;

-- Refresh policy (update every 10 minutes)
SELECT add_continuous_aggregate_policy('agent_events_hourly',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '10 minutes');

-- Daily aggregates for longer-term analytics
CREATE MATERIALIZED VIEW agent_events_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', timestamp) AS bucket,
  project_id,
  agent_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as session_count,
  AVG((metrics->>'promptTokens')::int) as avg_tokens
FROM agent_events
GROUP BY bucket, project_id, agent_id;
```

---

## 🚀 Performance Optimization

### TimescaleDB Configuration

```sql
-- Compression settings (70-90% reduction)
ALTER TABLE agent_events SET (
  timescaledb.compress = true,
  timescaledb.compress_segmentby = 'project_id, agent_id, event_type',
  timescaledb.compress_orderby = 'timestamp DESC'
);

-- Automatic compression after 7 days
SELECT add_compression_policy('agent_events', INTERVAL '7 days');

-- Retention policy: auto-delete after 1 year
SELECT add_retention_policy('agent_events', INTERVAL '1 year');

-- Reorder policy for better compression
SELECT add_reorder_policy('agent_events', 'idx_events_session_time');
```

### Connection Pooling

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Use connection pooling in production
// DATABASE_URL="postgresql://user:pass@host:5432/devlog?connection_limit=20&pool_timeout=10"
```

### Query Optimization

```sql
-- Efficient time-range queries (use indexes)
SELECT * FROM agent_events
WHERE timestamp > NOW() - INTERVAL '1 day'
  AND project_id = 1
ORDER BY timestamp DESC
LIMIT 100;

-- Use continuous aggregates for dashboards
SELECT * FROM agent_events_hourly
WHERE bucket > NOW() - INTERVAL '7 days'
  AND project_id = 1;

-- JSON queries with indexes
SELECT * FROM agent_events
WHERE data @> '{"filePath": "src/auth/login.ts"}'::jsonb
  AND timestamp > NOW() - INTERVAL '1 hour';
```

---

## 📈 Expected Performance

Based on TimescaleDB benchmarks and your requirements:

| Metric                     | Target   | Expected      | Status     |
| -------------------------- | -------- | ------------- | ---------- |
| **Event write throughput** | >10K/sec | 50-100K/sec   | ✅ Exceeds |
| **Query latency (P95)**    | <100ms   | 30-50ms       | ✅ Exceeds |
| **Storage per event**      | <1KB     | 200-500 bytes | ✅ Exceeds |
| **Compression ratio**      | N/A      | 70-90%        | ✅ Bonus   |
| **Dashboard load time**    | <1s      | 200-500ms     | ✅ Exceeds |

### Scalability Estimates

| Events/Day | Storage/Month (Raw) | Storage/Month (Compressed) | Query Time |
| ---------- | ------------------- | -------------------------- | ---------- |
| 10K        | 300 MB              | 30-90 MB                   | <10ms      |
| 100K       | 3 GB                | 300-900 MB                 | 10-30ms    |
| 1M         | 30 GB               | 3-9 GB                     | 30-50ms    |
| 10M        | 300 GB              | 30-90 GB                   | 50-100ms   |

---

## 🔧 Implementation Plan

### Phase 1: Enable TimescaleDB (1-2 hours)

```sql
-- 1. Add extension to existing PostgreSQL
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Convert agent_events to hypertable
SELECT create_hypertable('agent_events', 'timestamp',
  migrate_data => true,
  chunk_time_interval => INTERVAL '1 day');

-- 3. Add compression and retention
ALTER TABLE agent_events SET (timescaledb.compress);
SELECT add_compression_policy('agent_events', INTERVAL '7 days');
SELECT add_retention_policy('agent_events', INTERVAL '1 year');

-- 4. Create continuous aggregates
-- (See schema section above)
```

**Non-breaking**: Existing queries continue to work unchanged.

### Phase 2: Update Prisma Schema (30 minutes)

```prisma
// prisma/schema.prisma
// Add comments to document TimescaleDB usage

model AgentEvent {
  id        String   @id @default(uuid()) @db.Uuid
  timestamp DateTime @db.Timestamptz
  // ... rest of fields

  @@index([timestamp(sort: Desc)])
  @@index([sessionId, timestamp(sort: Desc)])
  @@index([projectId, timestamp(sort: Desc)])
  @@map("agent_events")
  // Note: This is a TimescaleDB hypertable for time-series optimization
}
```

### Phase 3: Optimize Queries (2-3 hours)

Update existing queries to leverage TimescaleDB features:

```typescript
// Use time-bucket for aggregations
const hourlyStats = await prisma.$queryRaw`
  SELECT 
    time_bucket('1 hour', timestamp) as hour,
    COUNT(*) as event_count
  FROM agent_events
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY hour
  ORDER BY hour DESC
`;

// Use continuous aggregates for dashboards
const dashboardStats = await prisma.$queryRaw`
  SELECT * FROM agent_events_hourly
  WHERE bucket > NOW() - INTERVAL '7 days'
    AND project_id = ${projectId}
`;
```

**Status**: ✅ Complete  
**Implementation Date**: November 2, 2025  
**Implementation Summary**: [PHASE3_IMPLEMENTATION.md](./PHASE3_IMPLEMENTATION.md)

**Completed**:

- ✅ Time-bucket aggregation methods in AgentEventService
- ✅ Continuous aggregate query methods (hourly/daily)
- ✅ Optimized time-range queries in AgentSessionService
- ✅ Comprehensive type definitions for all queries
- ✅ Graceful fallback when aggregates don't exist
- ✅ Security through parameterized SQL queries
- ✅ Full test coverage for new methods

### Phase 4: Monitor & Tune (Ongoing)

```sql
-- Check chunk size and compression
SELECT * FROM timescaledb_information.hypertables;
SELECT * FROM timescaledb_information.chunks;
SELECT * FROM timescaledb_information.compression_settings;

-- Monitor query performance
SELECT * FROM timescaledb_information.continuous_aggregates;

-- Check storage savings
SELECT
  pg_size_pretty(before_compression_total_bytes) as before,
  pg_size_pretty(after_compression_total_bytes) as after,
  round(100 - (after_compression_total_bytes::numeric / before_compression_total_bytes::numeric * 100), 2) as compression_ratio
FROM timescaledb_information.compressed_chunk_stats;
```

---

## 🛠️ Operations Guide

### Backup Strategy

```bash
# PostgreSQL with TimescaleDB is just PostgreSQL
pg_dump -Fc devlog > devlog_backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d devlog devlog_backup_20251031.dump

# Continuous backups with WAL archiving
# (Standard PostgreSQL procedures apply)
```

### Monitoring

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('devlog'));

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active queries
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity
WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start;

-- TimescaleDB specific stats
SELECT * FROM timescaledb_information.job_stats;
```

### Maintenance

```sql
-- Manual compression (if needed)
SELECT compress_chunk(i) FROM show_chunks('agent_events', older_than => INTERVAL '7 days') i;

-- Manual vacuum (rarely needed with autovacuum)
VACUUM ANALYZE agent_events;

-- Reindex if needed
REINDEX TABLE agent_events;
```

---

## 🔄 Migration from Current State

### Current State Analysis

```sql
-- Check current table structure
\d agent_events

-- Check data volume
SELECT COUNT(*) FROM agent_events;
SELECT
  date_trunc('day', timestamp) as day,
  COUNT(*)
FROM agent_events
GROUP BY day
ORDER BY day DESC;
```

### Migration Steps

```sql
-- Step 1: Backup
pg_dump -Fc devlog > pre_migration_backup.dump

-- Step 2: Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Step 3: Convert table (handles existing data)
SELECT create_hypertable('agent_events', 'timestamp',
  migrate_data => true,
  chunk_time_interval => INTERVAL '1 day'
);

-- Step 4: Verify
SELECT * FROM timescaledb_information.hypertables;

-- Step 5: Add policies
SELECT add_compression_policy('agent_events', INTERVAL '7 days');
SELECT add_retention_policy('agent_events', INTERVAL '1 year');

-- Step 6: Test queries
SELECT COUNT(*) FROM agent_events;
SELECT * FROM agent_events WHERE timestamp > NOW() - INTERVAL '1 day' LIMIT 10;
```

**Rollback Plan**: Restore from backup if issues arise.

---

## ❌ What We're NOT Using

### MongoDB / NoSQL

**Why not:**

- Complex relational hierarchy requires ACID transactions
- Frequent JOINs between projects/machines/workspaces/sessions
- Foreign key constraints are critical
- No time-series optimizations

**Consider if:** You need schema-less documents (not the case here)

### Redis

**Why not:**

- Data needs persistence (not just caching)
- Complex queries and aggregations required
- In-memory storage expensive at scale

**Consider for:** Session caching, pub/sub for real-time updates (Phase 2+)

### ClickHouse

**Why not:**

- Overkill for current scale (<1M events/day)
- Higher operational complexity
- No UPDATE/DELETE support (GDPR issues)
- Less flexible for ad-hoc queries

**Consider if:** You reach 100M+ events/day and need sub-second analytics

### Cassandra / ScyllaDB

**Why not:**

- Complex distributed setup
- Eventual consistency conflicts with relational needs
- No JOINs (would require denormalization)
- Overkill for single-server deployment

**Consider if:** Multi-datacenter deployment with extreme scale

---

## 🔗 Related Documentation

- [Project Hierarchy Redesign](../20251031-project-hierarchy-redesign/README.md) - Uses PostgreSQL for relational structure
- [Agent Observability Core Features](../20251022-agent-observability-core-features/README.md) - API layer consuming this database
- [AI Agent Observability Overview](../20251021-ai-agent-observability/README.md) - Overall architecture
- [Go Collector Implementation](../20251021-ai-agent-observability/GO_COLLECTOR_ROADMAP.md) - Uses SQLite for client-side buffering

---

## 📋 Decision Log

| Date         | Decision                    | Rationale                                  |
| ------------ | --------------------------- | ------------------------------------------ |
| Oct 31, 2025 | PostgreSQL + TimescaleDB    | Time-series + relational in one database   |
| Oct 31, 2025 | SQLite for client buffer    | Offline-first, self-contained              |
| Oct 31, 2025 | No Redis/MongoDB/ClickHouse | Unnecessary complexity for current scale   |
| Oct 31, 2025 | 1-day chunk interval        | Balance between query speed and management |
| Oct 31, 2025 | 7-day compression delay     | Balance between write speed and storage    |
| Oct 31, 2025 | 1-year retention            | Compliance + cost optimization             |

---

## ✅ Success Criteria

### Performance

- [ ] Event writes: >50K/sec sustained
- [ ] Query latency: <50ms P95 for time-range queries
- [ ] Dashboard load: <500ms for last 24 hours
- [ ] Storage: <500 bytes per event after compression

### Reliability

- [ ] Zero data loss during collector offline periods
- [ ] Automatic failover in clustered setup (future)
- [ ] Point-in-time recovery with WAL archiving
- [ ] 99.9% uptime

### Operations

- [ ] Automated backups (daily)
- [ ] Compression running automatically
- [ ] Retention policies executing
- [ ] Monitoring alerts configured

---

**Status**: ✅ Phase 1, Phase 2, Phase 3 Complete  
**Implementation Dates**:

- Phase 1 (TimescaleDB Setup): November 1, 2025
- Phase 2 (Prisma Schema): November 1, 2025
- Phase 3 (Query Optimization): November 2, 2025

**Implementation Summaries**:

- [Phase 1 Summary](./IMPLEMENTATION_SUMMARY.md)
- [Phase 2 Summary](./PHASE2_IMPLEMENTATION.md)
- [Phase 3 Summary](./PHASE3_IMPLEMENTATION.md)

**Completed**:

- ✅ TimescaleDB setup script with daily + hourly aggregates
- ✅ Database initialization scripts updated for Prisma
- ✅ Comprehensive setup documentation and helper script
- ✅ Schema validated and matches specification
- ✅ Composite indexes for optimized time-series queries
- ✅ Time-bucket aggregation methods
- ✅ Continuous aggregate query methods with graceful fallback
- ✅ Optimized time-range queries using composite indexes

**Next Steps**:

1. Deploy to production environment with PostgreSQL + TimescaleDB
2. Run database setup scripts
3. Monitor performance metrics and validate improvements
4. Integrate optimized queries into dashboard and analytics APIs
