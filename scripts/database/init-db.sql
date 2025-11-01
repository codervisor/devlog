-- PostgreSQL initialization for devlog application
-- Includes essential extensions required for the application
-- Tables are created via Prisma migrations

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable trigram matching for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable TimescaleDB for time-series optimization (optional but recommended)
-- Uncomment the following line if TimescaleDB is available
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Note: Table schema is created via Prisma migrations
-- Run: npx prisma migrate deploy
-- For TimescaleDB setup, run: psql $DATABASE_URL -f scripts/enable-timescaledb.sql
