# Database Quick Reference

Quick reference for common database operations in the devlog project.

## 🚀 Quick Setup

```bash
# Set your database URL
export DATABASE_URL="postgresql://username:password@localhost:5432/devlog"

# Run the interactive setup script
./scripts/database/setup.sh

# Or manually step-by-step:
psql $DATABASE_URL -f scripts/database/init-db.sql      # 1. Extensions
npx prisma migrate deploy                                # 2. Schema
npx prisma generate                                      # 3. Client
psql $DATABASE_URL -f scripts/enable-timescaledb.sql    # 4. TimescaleDB (optional)
```

## 📋 Common Commands

### Prisma Operations

```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations (production)
npx prisma migrate deploy

# Create new migration (development)
npx prisma migrate dev --name descriptive_name

# Check migration status
npx prisma migrate status

# Open Prisma Studio (GUI)
npx prisma studio

# Validate schema
npx prisma validate

# Format schema file
npx prisma format
```

### Database Operations

```bash
# Connect to database
psql $DATABASE_URL

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# List all tables
psql $DATABASE_URL -c "\dt"

# Describe a table
psql $DATABASE_URL -c "\d table_name"

# Backup database
pg_dump -Fc devlog > backup_$(date +%Y%m%d).dump

# Restore database
pg_restore -d devlog backup.dump
```

### TimescaleDB Operations

```bash
# Check if TimescaleDB is enabled
psql $DATABASE_URL -c "SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';"

# Check hypertables
psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.hypertables;"

# Check compression stats
psql $DATABASE_URL -c "
  SELECT
    pg_size_pretty(before_compression_total_bytes) as before,
    pg_size_pretty(after_compression_total_bytes) as after,
    round(100 - (after_compression_total_bytes::numeric / before_compression_total_bytes::numeric * 100), 2) as compression_ratio
  FROM timescaledb_information.compressed_chunk_stats;
"

# Check continuous aggregates
psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.continuous_aggregates;"
```

## 🔍 Monitoring Queries

### Database Health

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Table sizes (top 10)
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

### Application Data

```sql
-- Count records by table
SELECT 'projects' as table, COUNT(*) FROM projects
UNION ALL SELECT 'machines', COUNT(*) FROM machines
UNION ALL SELECT 'workspaces', COUNT(*) FROM workspaces
UNION ALL SELECT 'chat_sessions', COUNT(*) FROM chat_sessions
UNION ALL SELECT 'agent_events', COUNT(*) FROM agent_events
UNION ALL SELECT 'devlog_entries', COUNT(*) FROM devlog_entries;

-- Recent agent events (last 24 hours)
SELECT
  event_type,
  COUNT(*) as count,
  AVG((metrics->>'duration')::int) as avg_duration_ms
FROM agent_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- Active projects
SELECT
  p.name,
  p.full_name,
  COUNT(DISTINCT w.id) as workspace_count,
  MAX(w.last_seen_at) as last_activity
FROM projects p
LEFT JOIN workspaces w ON w.project_id = p.id
GROUP BY p.id, p.name, p.full_name
ORDER BY last_activity DESC NULLS LAST;
```

## 🐛 Troubleshooting

### Issue: Prisma Client not found

```bash
# Solution: Generate Prisma Client
npx prisma generate
```

### Issue: Migration conflicts

```bash
# Development only - reset database
npx prisma migrate reset

# Or mark migration as applied
npx prisma migrate resolve --applied migration_name
```

### Issue: Connection refused

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

### Issue: TimescaleDB not available

TimescaleDB is optional. The application works fine with standard PostgreSQL, but you'll miss out on time-series optimizations.

To check availability:

```sql
SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';
```

If not available, install from [TimescaleDB Installation Guide](https://docs.timescale.com/install/latest/).

## 📊 Performance Tips

### For Queries

- Use indexes for WHERE clauses
- Use continuous aggregates for dashboards
- Limit result sets with LIMIT
- Use prepared statements for repeated queries

### For TimescaleDB

```sql
-- Force compression of old chunks
SELECT compress_chunk(i)
FROM show_chunks('agent_events', older_than => INTERVAL '7 days') i;

-- Manually refresh continuous aggregate
CALL refresh_continuous_aggregate('agent_events_hourly', NULL, NULL);

-- Check chunk statistics
SELECT * FROM timescaledb_information.chunks
WHERE hypertable_name = 'agent_events'
ORDER BY range_start DESC;
```

## 🔐 Security Best Practices

1. **Never commit DATABASE_URL** to git
2. **Use strong passwords** for database users
3. **Limit database user permissions** to what's needed
4. **Enable SSL** for remote connections
5. **Regular backups** are essential
6. **Monitor access logs** for suspicious activity

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Manual](https://www.postgresql.org/docs/current/)
- [TimescaleDB Docs](https://docs.timescale.com/)
- [Database Setup Guide](./README.md)
- [Database Architecture Spec](../../specs/20251031/001-database-architecture/README.md)

---

**Last Updated**: November 1, 2025
