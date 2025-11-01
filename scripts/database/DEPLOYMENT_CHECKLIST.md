# Database Deployment Checklist

Use this checklist when deploying the database to a new environment.

## 📋 Pre-Deployment

- [ ] PostgreSQL 14+ installed and running
- [ ] TimescaleDB extension available (optional but recommended)
- [ ] Database created: `createdb devlog`
- [ ] Database URL set in environment: `export DATABASE_URL="postgresql://..."`
- [ ] Database user has required permissions (CREATE, ALTER, DROP)
- [ ] Network connectivity verified: `psql $DATABASE_URL -c "SELECT version();"`

## 🚀 Deployment Steps

### 1. Initialize Database Extensions

```bash
psql $DATABASE_URL -f scripts/database/init-db.sql
```

**Expected output**: Extensions created

- [x] uuid-ossp
- [x] pg_trgm

### 2. Apply Prisma Migrations

```bash
npx prisma migrate deploy
```

**Expected output**: All migrations applied successfully

Verify:

```bash
npx prisma migrate status
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

**Expected output**: Prisma Client generated

### 4. Enable TimescaleDB (Optional)

```bash
psql $DATABASE_URL -f scripts/enable-timescaledb.sql
```

**Expected output**:

- [x] TimescaleDB extension created
- [x] agent_events converted to hypertable
- [x] Compression enabled
- [x] Retention policy set (1 year)
- [x] Continuous aggregates created (hourly, daily)

Verify:

```bash
psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.hypertables;"
```

## ✅ Post-Deployment Verification

### Database Health

```bash
# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# List all tables
psql $DATABASE_URL -c "\dt"

# Expected tables:
# - projects, machines, workspaces
# - chat_sessions, chat_messages
# - agent_events, agent_sessions
# - devlog_entries, devlog_notes, devlog_dependencies, devlog_documents
# - users, user_providers, email_verification_tokens, password_reset_tokens
```

### TimescaleDB (if enabled)

```bash
# Check hypertables
psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.hypertables;"

# Check continuous aggregates
psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.continuous_aggregates;"

# Expected views:
# - agent_events_hourly
# - agent_events_daily
```

### Application Test

```bash
# Test application startup
pnpm dev:web

# Check health endpoint (if available)
curl http://localhost:3000/api/health
```

## 🔍 Troubleshooting

### Issue: Permission denied

```bash
# Grant necessary permissions
psql $DATABASE_URL -c "GRANT CREATE ON DATABASE devlog TO your_user;"
```

### Issue: Extension not available

```bash
# Check available extensions
psql $DATABASE_URL -c "SELECT * FROM pg_available_extensions ORDER BY name;"

# For TimescaleDB, install separately
# See: https://docs.timescale.com/install/latest/
```

### Issue: Migration conflicts

```bash
# Check migration status
npx prisma migrate status

# If conflicts exist, resolve manually
npx prisma migrate resolve --applied migration_name
```

### Issue: Connection refused

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check if database exists
psql -l | grep devlog

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

## 📊 Performance Monitoring Setup

### Enable Query Logging

```sql
-- Edit postgresql.conf or set in psql
ALTER SYSTEM SET log_min_duration_statement = '1000'; -- Log queries > 1s
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
SELECT pg_reload_conf();
```

### Create Monitoring Views

```sql
-- Slow queries view
CREATE VIEW slow_queries AS
SELECT
  pid,
  now() - query_start as duration,
  usename,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < now() - interval '5 seconds'
ORDER BY duration DESC;

-- Table sizes view
CREATE VIEW table_sizes AS
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY bytes DESC;
```

## 🔐 Security Hardening

### Database User Permissions

```sql
-- Create limited application user
CREATE USER devlog_app WITH PASSWORD 'secure_password';

-- Grant minimal permissions
GRANT CONNECT ON DATABASE devlog TO devlog_app;
GRANT USAGE ON SCHEMA public TO devlog_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO devlog_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO devlog_app;

-- Update connection string to use limited user
-- DATABASE_URL="postgresql://devlog_app:secure_password@host:5432/devlog"
```

### Enable SSL

```bash
# Update connection string
DATABASE_URL="postgresql://user:password@host:5432/devlog?sslmode=require"
```

### Network Security

- [ ] Firewall rules configured (only allow necessary IPs)
- [ ] SSL/TLS enabled for remote connections
- [ ] Strong passwords for all database users
- [ ] Regular security updates applied

## 📦 Backup Setup

### Automated Backups

```bash
# Add to crontab (daily backup at 2 AM)
0 2 * * * pg_dump -Fc devlog > /backups/devlog_$(date +\%Y\%m\%d).dump

# Weekly full backup
0 2 * * 0 pg_dumpall > /backups/full_backup_$(date +\%Y\%m\%d).sql

# Retention: keep 30 days
find /backups -name "devlog_*.dump" -mtime +30 -delete
```

### Test Restore

```bash
# Test restore in separate database
createdb devlog_test
pg_restore -d devlog_test /backups/devlog_20251101.dump
dropdb devlog_test
```

## 📈 Monitoring Alerts

Set up alerts for:

- [ ] Database size > 80% capacity
- [ ] Slow queries (> 5 seconds)
- [ ] Connection pool exhaustion
- [ ] Failed backups
- [ ] Disk space < 20%
- [ ] Replication lag (if using replication)

## ✅ Deployment Complete

- [ ] All steps completed successfully
- [ ] Verification checks passed
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Security hardened
- [ ] Documentation updated with deployment details

**Date Deployed**: ******\_******  
**Deployed By**: ******\_******  
**Environment**: ******\_******  
**Database Version**: ******\_******  
**TimescaleDB Version**: ******\_****** (if applicable)

---

**Next Steps**:

1. Monitor application logs for database errors
2. Check query performance metrics
3. Verify continuous aggregates are refreshing
4. Test backup and restore procedures
5. Document any issues and resolutions

**Support Resources**:

- Database Setup Guide: `scripts/database/README.md`
- Quick Reference: `scripts/database/QUICK_REFERENCE.md`
- Troubleshooting: See README.md section
