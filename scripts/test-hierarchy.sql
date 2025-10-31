-- Test hierarchy queries

-- 1. Insert sample project
INSERT INTO projects (name, full_name, repo_url, repo_owner, repo_name, description)
VALUES (
  'devlog',
  'codervisor/devlog',
  'git@github.com:codervisor/devlog.git',
  'codervisor',
  'devlog',
  'AI Agent Observability Platform'
) ON CONFLICT (full_name) DO UPDATE SET updated_at = NOW()
RETURNING id;

-- 2. Insert sample machine
INSERT INTO machines (machine_id, hostname, username, os_type, os_version, machine_type)
VALUES (
  'test-machine-darwin',
  'test-macbook-pro',
  'testuser',
  'darwin',
  '14.5',
  'local'
) ON CONFLICT (machine_id) DO UPDATE SET last_seen_at = NOW()
RETURNING id;

-- 3. Insert sample workspace
-- Note: Replace project_id and machine_id with actual IDs from above
INSERT INTO workspaces (project_id, machine_id, workspace_id, workspace_path, workspace_type, branch, commit)
VALUES (
  (SELECT id FROM projects WHERE full_name = 'codervisor/devlog'),
  (SELECT id FROM machines WHERE machine_id = 'test-machine-darwin'),
  'test-workspace-uuid',
  '/Users/testuser/projects/devlog',
  'folder',
  'main',
  'abc123'
) ON CONFLICT (workspace_id) DO UPDATE SET last_seen_at = NOW()
RETURNING id;

-- 4. Insert sample chat session
INSERT INTO chat_sessions (session_id, workspace_id, agent_type, model_id, started_at, message_count, total_tokens)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM workspaces WHERE workspace_id = 'test-workspace-uuid'),
  'copilot',
  'gpt-4',
  NOW(),
  10,
  1500
)
RETURNING id, session_id;

-- 5. Query full hierarchy
SELECT 
  p.full_name as project,
  m.hostname as machine,
  m.os_type,
  w.workspace_path,
  w.branch,
  cs.session_id,
  cs.agent_type,
  cs.message_count
FROM chat_sessions cs
JOIN workspaces w ON cs.workspace_id = w.id
JOIN machines m ON w.machine_id = m.id
JOIN projects p ON w.project_id = p.id
ORDER BY cs.started_at DESC
LIMIT 10;

-- 6. Test time-series query performance
EXPLAIN ANALYZE
SELECT 
  time_bucket('1 hour', timestamp) AS hour,
  COUNT(*) as event_count,
  AVG((metrics->>'duration')::int) as avg_duration
FROM agent_events
WHERE timestamp > NOW() - INTERVAL '7 days'
  AND project_id = (SELECT id FROM projects WHERE full_name = 'codervisor/devlog')
GROUP BY hour
ORDER BY hour DESC;
