-- AlterTable: Rename devlog_projects to projects and update schema
ALTER TABLE "devlog_projects" RENAME TO "projects";
ALTER TABLE "projects" ADD COLUMN "full_name" TEXT;
ALTER TABLE "projects" ADD COLUMN "repo_url" TEXT;
ALTER TABLE "projects" ADD COLUMN "repo_owner" TEXT;
ALTER TABLE "projects" ADD COLUMN "repo_name" TEXT;
ALTER TABLE "projects" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "projects" DROP COLUMN "last_accessed_at";
ALTER TABLE "projects" DROP CONSTRAINT "devlog_projects_name_key";

-- Update existing projects with placeholder data
UPDATE "projects" SET 
  "full_name" = CONCAT('unknown/', "name"),
  "repo_url" = CONCAT('git@github.com:unknown/', "name", '.git'),
  "repo_owner" = 'unknown',
  "repo_name" = "name"
WHERE "full_name" IS NULL;

-- Make columns not null after updating
ALTER TABLE "projects" ALTER COLUMN "full_name" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "repo_url" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "repo_owner" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "repo_name" SET NOT NULL;

-- CreateTable: Machines
CREATE TABLE "machines" (
    "id" SERIAL NOT NULL,
    "machine_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "os_type" TEXT NOT NULL,
    "os_version" TEXT,
    "machine_type" TEXT NOT NULL,
    "ip_address" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Workspaces
CREATE TABLE "workspaces" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "workspace_path" TEXT NOT NULL,
    "workspace_type" TEXT NOT NULL,
    "branch" TEXT,
    "commit" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Update chat_sessions to new structure
-- First, create new chat_sessions table
CREATE TABLE "chat_sessions_new" (
    "id" SERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "agent_type" TEXT NOT NULL,
    "model_id" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_new_pkey" PRIMARY KEY ("id")
);

-- Note: Data migration from old chat_sessions to new structure would go here
-- This is complex as we need to match workspaces, so we'll handle it separately

-- Rename old table and swap
ALTER TABLE "chat_sessions" RENAME TO "chat_sessions_old";
ALTER TABLE "chat_sessions_new" RENAME TO "chat_sessions";

-- AlterTable: Update chat_messages
ALTER TABLE "chat_messages" ALTER COLUMN "id" TYPE UUID USING "id"::UUID;
ALTER TABLE "chat_messages" ALTER COLUMN "session_id" TYPE UUID USING "session_id"::UUID;
ALTER TABLE "chat_messages" ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING "timestamp"::TIMESTAMPTZ;

-- Drop old chat_devlog_links table
DROP TABLE IF EXISTS "chat_devlog_links";

-- AlterTable: Update agent_events to reference chat_sessions
ALTER TABLE "agent_events" DROP CONSTRAINT IF EXISTS "agent_events_session_id_fkey";
-- Note: The session_id now refers to chat_sessions.session_id (UUID) instead of agent_sessions.id

-- AlterTable: Update agent_sessions - remove events relation (it's inverse)
-- No schema change needed, just relationship change

-- Rename user tables to follow new convention
ALTER TABLE "devlog_users" RENAME TO "users";
ALTER TABLE "devlog_user_providers" RENAME TO "user_providers";
ALTER TABLE "devlog_email_verification_tokens" RENAME TO "email_verification_tokens";
ALTER TABLE "devlog_password_reset_tokens" RENAME TO "password_reset_tokens";

-- CreateIndex
CREATE UNIQUE INDEX "machines_machine_id_key" ON "machines"("machine_id");
CREATE INDEX "machines_machine_id_idx" ON "machines"("machine_id");
CREATE INDEX "machines_hostname_idx" ON "machines"("hostname");
CREATE INDEX "machines_machine_type_idx" ON "machines"("machine_type");

CREATE UNIQUE INDEX "workspaces_workspace_id_key" ON "workspaces"("workspace_id");
CREATE INDEX "workspaces_workspace_id_idx" ON "workspaces"("workspace_id");
CREATE INDEX "workspaces_project_id_idx" ON "workspaces"("project_id");
CREATE INDEX "workspaces_machine_id_idx" ON "workspaces"("machine_id");
CREATE UNIQUE INDEX "workspaces_project_id_machine_id_workspace_id_key" ON "workspaces"("project_id", "machine_id", "workspace_id");

CREATE UNIQUE INDEX "chat_sessions_session_id_key" ON "chat_sessions"("session_id");
CREATE INDEX "chat_sessions_session_id_idx" ON "chat_sessions"("session_id");
CREATE INDEX "chat_sessions_workspace_id_idx" ON "chat_sessions"("workspace_id");
CREATE INDEX "chat_sessions_started_at_idx" ON "chat_sessions"("started_at" DESC);
CREATE INDEX "chat_sessions_agent_type_idx" ON "chat_sessions"("agent_type");

CREATE UNIQUE INDEX "projects_full_name_key" ON "projects"("full_name");
CREATE UNIQUE INDEX "projects_repo_url_key" ON "projects"("repo_url");
CREATE INDEX "projects_full_name_idx" ON "projects"("full_name");
CREATE INDEX "projects_repo_url_idx" ON "projects"("repo_url");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
