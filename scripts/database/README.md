# Database Setup Scripts

This directory contains scripts for initializing and configuring the PostgreSQL database for the devlog application.

## Overview

The devlog application uses:

- **PostgreSQL** as the primary database
- **Prisma** as the ORM and migration tool
- **TimescaleDB** (optional) for time-series optimization of agent events

## Quick Start

### 1. Initialize PostgreSQL Database

```bash
# Create the database (if not exists)
createdb devlog

# Run initialization script to enable required extensions
psql $DATABASE_URL -f scripts/database/init-db.sql
```

### 2. Run Prisma Migrations

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Or for development (generates migration files)
npx prisma migrate dev
```

### 3. Enable TimescaleDB (Optional but Recommended)

TimescaleDB provides significant performance improvements for time-series data (agent events):

```bash
# Enable TimescaleDB extension and configure hypertables
psql $DATABASE_URL -f scripts/enable-timescaledb.sql
```

**Benefits of TimescaleDB:**

- 10-20x faster time-range queries
- 70-90% storage compression
- Automatic data retention policies
- Continuous aggregates for dashboard performance

## Files

### `init-db.sql`

Initial database setup script that enables essential PostgreSQL extensions:

- `uuid-ossp`: UUID generation
- `pg_trgm`: Trigram matching for text search

**Usage:**

```bash
psql $DATABASE_URL -f scripts/database/init-db.sql
```

### `../enable-timescaledb.sql`

Configures TimescaleDB optimizations for the `agent_events` table:

- Converts `agent_events` to a hypertable with 1-day chunks
- Enables compression (70-90% storage savings)
- Sets up compression policy (compress data older than 7 days)
- Sets up retention policy (drop data older than 1 year)
- Creates continuous aggregates for hourly and daily statistics

**Usage:**

```bash
psql $DATABASE_URL -f scripts/enable-timescaledb.sql
```

**Note:** This script should be run AFTER Prisma migrations have created the tables.

## Database Schema

The database schema is managed by Prisma and defined in `prisma/schema.prisma`.

Key models:

- **Projects**: Repositories/codebases being worked on
- **Machines**: Physical or virtual machines where agents run
- **Workspaces**: VS Code windows/folders on specific machines
- **ChatSessions**: Conversation threads within workspaces
- **ChatMessages**: Individual messages in chat sessions
- **AgentEvents**: Time-series events from agents (optimized with TimescaleDB)
- **AgentSessions**: Complete agent working sessions
- **DevlogEntry**: Work items and tasks
- **User**: User accounts and authentication

## Environment Variables

Required environment variables:

```bash
# PostgreSQL connection URL
DATABASE_URL="postgresql://username:password@host:5432/devlog"
```

For local development with Docker:

```bash
DATABASE_URL="postgresql://devlog:devlog@localhost:5432/devlog"
```

## Migration Workflow

### Development

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name descriptive_name

# Generate Prisma Client
npx prisma generate
```

### Production

```bash
# Apply migrations without prompts
npx prisma migrate deploy
```

## Monitoring and Maintenance

### Check Database Size

```sql
SELECT pg_size_pretty(pg_database_size('devlog'));
```

### Check Table Sizes

```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### TimescaleDB Stats (if enabled)

```sql
-- Check hypertables
SELECT * FROM timescaledb_information.hypertables;

-- Check compression stats
SELECT
  pg_size_pretty(before_compression_total_bytes) as before,
  pg_size_pretty(after_compression_total_bytes) as after,
  round(100 - (after_compression_total_bytes::numeric / before_compression_total_bytes::numeric * 100), 2) as compression_ratio
FROM timescaledb_information.compressed_chunk_stats;

-- Check continuous aggregates
SELECT * FROM timescaledb_information.continuous_aggregates;
```

## Backup and Restore

### Backup

```bash
# Full database backup
pg_dump -Fc devlog > devlog_backup_$(date +%Y%m%d).dump

# Schema only
pg_dump -s devlog > devlog_schema.sql

# Data only
pg_dump -a devlog > devlog_data.sql
```

### Restore

```bash
# Restore from custom format backup
pg_restore -d devlog devlog_backup_20251101.dump

# Restore from SQL file
psql devlog < devlog_backup.sql
```

## Troubleshooting

### Prisma Client Not Generated

```bash
npx prisma generate
```

### Migration Conflicts

```bash
# Reset database (development only!)
npx prisma migrate reset

# Or manually resolve conflicts
npx prisma migrate resolve --applied <migration_name>
```

### TimescaleDB Not Available

If TimescaleDB is not available, the application will still work with standard PostgreSQL. You'll just miss out on the time-series optimizations.

To check if TimescaleDB is available:

```sql
SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';
```

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Database Architecture Spec](../../specs/20251031/001-database-architecture/README.md)
