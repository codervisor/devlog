-- Rollback script for add_hierarchy_support migration

-- WARNING: This will drop the new hierarchy tables and revert to the old schema
-- Make sure you have a backup before running this!

-- Drop foreign keys first
ALTER TABLE "agent_events" DROP CONSTRAINT IF EXISTS "agent_events_session_id_fkey";
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_session_id_fkey";
ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "chat_sessions_workspace_id_fkey";
ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "workspaces_machine_id_fkey";
ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "workspaces_project_id_fkey";

-- Drop new tables
DROP TABLE IF EXISTS "workspaces";
DROP TABLE IF EXISTS "machines";

-- Restore old chat_sessions if backed up
DROP TABLE IF EXISTS "chat_sessions";
ALTER TABLE IF EXISTS "chat_sessions_old" RENAME TO "chat_sessions";

-- Revert chat_messages alterations (if possible with data preservation)
-- Note: This may not be fully reversible if data types have changed

-- Revert projects table changes
ALTER TABLE "projects" DROP COLUMN IF EXISTS "updated_at";
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "last_accessed_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE "projects" DROP COLUMN IF EXISTS "full_name";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "repo_url";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "repo_owner";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "repo_name";

-- Rename tables back
ALTER TABLE "projects" RENAME TO "devlog_projects";
ALTER TABLE "users" RENAME TO "devlog_users";
ALTER TABLE "user_providers" RENAME TO "devlog_user_providers";
ALTER TABLE "email_verification_tokens" RENAME TO "devlog_email_verification_tokens";
ALTER TABLE "password_reset_tokens" RENAME TO "devlog_password_reset_tokens";

-- Recreate old constraints
ALTER TABLE "devlog_projects" ADD CONSTRAINT "devlog_projects_name_key" UNIQUE ("name");

-- Recreate chat_devlog_links if needed
CREATE TABLE IF NOT EXISTS "chat_devlog_links" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "devlog_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "link_reason" TEXT NOT NULL,

    CONSTRAINT "chat_devlog_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_devlog_links_session_id_idx" ON "chat_devlog_links"("session_id");
CREATE INDEX IF NOT EXISTS "chat_devlog_links_devlog_id_idx" ON "chat_devlog_links"("devlog_id");
CREATE INDEX IF NOT EXISTS "chat_devlog_links_timestamp_idx" ON "chat_devlog_links"("timestamp");

-- Re-add foreign keys for chat_devlog_links
ALTER TABLE "chat_devlog_links" ADD CONSTRAINT "chat_devlog_links_session_id_fkey" 
    FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_devlog_links" ADD CONSTRAINT "chat_devlog_links_devlog_id_fkey" 
    FOREIGN KEY ("devlog_id") REFERENCES "devlog_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: Data migration back would be complex and is not included here
-- This rollback primarily handles schema structure
