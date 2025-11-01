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

-- Create continuous aggregate for daily stats (longer-term analytics)
CREATE MATERIALIZED VIEW agent_events_daily
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 day', timestamp) AS bucket,
  project_id,
  agent_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as session_count,
  AVG((metrics->>'promptTokens')::int) as avg_prompt_tokens,
  AVG((metrics->>'responseTokens')::int) as avg_response_tokens,
  SUM((metrics->>'duration')::int) as total_duration
FROM agent_events
GROUP BY bucket, project_id, agent_id;

-- Refresh policy for daily aggregate
SELECT add_continuous_aggregate_policy('agent_events_daily',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 hour'
);
