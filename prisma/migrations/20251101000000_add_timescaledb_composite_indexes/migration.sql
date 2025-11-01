-- Migration: Add TimescaleDB-optimized composite indexes for agent_events
-- Phase 2 of Database Architecture Specification (specs/20251031/001-database-architecture)
--
-- This migration adds composite indexes for optimal TimescaleDB query performance:
-- 1. session_id + timestamp (DESC) - for session timeline queries
-- 2. project_id + timestamp (DESC) - for project timeline queries
-- 3. GIN index on data JSONB field - for flexible JSON queries
--
-- These indexes complement the existing single-column indexes and improve
-- performance for time-range queries filtered by session or project.

-- Drop existing single-column indexes that will be replaced by composite indexes
DROP INDEX IF EXISTS "agent_events_session_id_idx";
DROP INDEX IF EXISTS "agent_events_project_id_idx";

-- Create composite index for session timeline queries
-- Optimizes: SELECT * FROM agent_events WHERE session_id = ? AND timestamp > ?
CREATE INDEX "agent_events_session_id_timestamp_idx" ON "agent_events"("session_id", "timestamp" DESC);

-- Create composite index for project timeline queries
-- Optimizes: SELECT * FROM agent_events WHERE project_id = ? AND timestamp > ?
CREATE INDEX "agent_events_project_id_timestamp_idx" ON "agent_events"("project_id", "timestamp" DESC);

-- Create GIN index for JSONB data field
-- Optimizes: SELECT * FROM agent_events WHERE data @> '{"key": "value"}'::jsonb
CREATE INDEX "agent_events_data_idx" ON "agent_events" USING GIN ("data");

-- Note: The `data` field uses the default GIN operator class (jsonb_ops),
-- which supports containment queries (@>, @?, etc.) but uses more storage.
-- Alternative: jsonb_path_ops uses less storage but only supports @> operator.
-- The default is chosen for maximum query flexibility.
