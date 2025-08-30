-- CreateEnum
CREATE TYPE "public"."DevlogType" AS ENUM ('feature', 'bugfix', 'task', 'refactor', 'docs');

-- CreateEnum
CREATE TYPE "public"."DevlogStatus" AS ENUM ('new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."DevlogPriority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "public"."DevlogNoteCategory" AS ENUM ('progress', 'issue', 'solution', 'idea', 'reminder', 'feedback', 'acceptance-criteria');

-- CreateEnum
CREATE TYPE "public"."DevlogDependencyType" AS ENUM ('blocks', 'blocked-by', 'related-to', 'parent-of', 'child-of');

-- CreateEnum
CREATE TYPE "public"."AgentType" AS ENUM ('anthropic_claude', 'openai_gpt', 'google_gemini', 'github_copilot', 'cursor', 'vscode_copilot', 'jetbrains_ai', 'unknown');

-- CreateEnum
CREATE TYPE "public"."ChatStatus" AS ENUM ('imported', 'linked', 'processed', 'archived');

-- CreateEnum
CREATE TYPE "public"."ChatRole" AS ENUM ('user', 'assistant', 'system');

-- CreateTable
CREATE TABLE "public"."devlog_projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devlog_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devlog_entries" (
    "id" SERIAL NOT NULL,
    "key_field" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."DevlogType" NOT NULL DEFAULT 'task',
    "description" TEXT NOT NULL,
    "status" "public"."DevlogStatus" NOT NULL DEFAULT 'new',
    "priority" "public"."DevlogPriority" NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "closed_at" TIMESTAMPTZ,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "assignee" TEXT,
    "project_id" INTEGER NOT NULL,
    "business_context" TEXT,
    "technical_context" TEXT,
    "tags" TEXT,
    "files" TEXT,
    "dependencies" TEXT,

    CONSTRAINT "devlog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devlog_notes" (
    "id" TEXT NOT NULL,
    "devlog_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "category" "public"."DevlogNoteCategory" NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "devlog_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devlog_dependencies" (
    "id" TEXT NOT NULL,
    "devlog_id" INTEGER NOT NULL,
    "type" "public"."DevlogDependencyType" NOT NULL,
    "description" TEXT NOT NULL,
    "external_id" TEXT,
    "target_devlog_id" INTEGER,

    CONSTRAINT "devlog_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devlog_documents" (
    "id" TEXT NOT NULL,
    "devlog_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "devlog_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devlog_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "password_hash" TEXT NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "last_login_at" TIMESTAMPTZ,

    CONSTRAINT "devlog_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devlog_user_providers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL,

    CONSTRAINT "devlog_user_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devlog_email_verification_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "devlog_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devlog_password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "devlog_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_sessions" (
    "id" TEXT NOT NULL,
    "agent" "public"."AgentType" NOT NULL,
    "timestamp" TEXT NOT NULL,
    "workspace" TEXT,
    "workspace_path" TEXT,
    "title" TEXT,
    "status" "public"."ChatStatus" NOT NULL DEFAULT 'imported',
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "public"."ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "search_content" TEXT,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_devlog_links" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "devlog_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "link_reason" TEXT NOT NULL,

    CONSTRAINT "chat_devlog_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devlog_projects_name_key" ON "public"."devlog_projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "devlog_entries_key_field_key" ON "public"."devlog_entries"("key_field");

-- CreateIndex
CREATE INDEX "devlog_entries_status_idx" ON "public"."devlog_entries"("status");

-- CreateIndex
CREATE INDEX "devlog_entries_type_idx" ON "public"."devlog_entries"("type");

-- CreateIndex
CREATE INDEX "devlog_entries_priority_idx" ON "public"."devlog_entries"("priority");

-- CreateIndex
CREATE INDEX "devlog_entries_assignee_idx" ON "public"."devlog_entries"("assignee");

-- CreateIndex
CREATE INDEX "devlog_entries_key_field_idx" ON "public"."devlog_entries"("key_field");

-- CreateIndex
CREATE INDEX "devlog_entries_project_id_idx" ON "public"."devlog_entries"("project_id");

-- CreateIndex
CREATE INDEX "devlog_notes_devlog_id_idx" ON "public"."devlog_notes"("devlog_id");

-- CreateIndex
CREATE INDEX "devlog_notes_timestamp_idx" ON "public"."devlog_notes"("timestamp");

-- CreateIndex
CREATE INDEX "devlog_notes_category_idx" ON "public"."devlog_notes"("category");

-- CreateIndex
CREATE INDEX "devlog_dependencies_devlog_id_idx" ON "public"."devlog_dependencies"("devlog_id");

-- CreateIndex
CREATE INDEX "devlog_dependencies_type_idx" ON "public"."devlog_dependencies"("type");

-- CreateIndex
CREATE INDEX "devlog_dependencies_target_devlog_id_idx" ON "public"."devlog_dependencies"("target_devlog_id");

-- CreateIndex
CREATE INDEX "devlog_documents_devlog_id_idx" ON "public"."devlog_documents"("devlog_id");

-- CreateIndex
CREATE INDEX "devlog_documents_content_type_idx" ON "public"."devlog_documents"("content_type");

-- CreateIndex
CREATE UNIQUE INDEX "devlog_users_email_key" ON "public"."devlog_users"("email");

-- CreateIndex
CREATE INDEX "devlog_user_providers_user_id_idx" ON "public"."devlog_user_providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "devlog_user_providers_provider_provider_id_key" ON "public"."devlog_user_providers"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "devlog_email_verification_tokens_token_key" ON "public"."devlog_email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "devlog_email_verification_tokens_user_id_idx" ON "public"."devlog_email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "devlog_password_reset_tokens_token_key" ON "public"."devlog_password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "devlog_password_reset_tokens_user_id_idx" ON "public"."devlog_password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "chat_sessions_agent_idx" ON "public"."chat_sessions"("agent");

-- CreateIndex
CREATE INDEX "chat_sessions_timestamp_idx" ON "public"."chat_sessions"("timestamp");

-- CreateIndex
CREATE INDEX "chat_sessions_workspace_idx" ON "public"."chat_sessions"("workspace");

-- CreateIndex
CREATE INDEX "chat_sessions_status_idx" ON "public"."chat_sessions"("status");

-- CreateIndex
CREATE INDEX "chat_sessions_archived_idx" ON "public"."chat_sessions"("archived");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "public"."chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "chat_messages_timestamp_idx" ON "public"."chat_messages"("timestamp");

-- CreateIndex
CREATE INDEX "chat_messages_role_idx" ON "public"."chat_messages"("role");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_sequence_idx" ON "public"."chat_messages"("session_id", "sequence");

-- CreateIndex
CREATE INDEX "chat_devlog_links_session_id_idx" ON "public"."chat_devlog_links"("session_id");

-- CreateIndex
CREATE INDEX "chat_devlog_links_devlog_id_idx" ON "public"."chat_devlog_links"("devlog_id");

-- CreateIndex
CREATE INDEX "chat_devlog_links_timestamp_idx" ON "public"."chat_devlog_links"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."devlog_entries" ADD CONSTRAINT "devlog_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."devlog_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devlog_notes" ADD CONSTRAINT "devlog_notes_devlog_id_fkey" FOREIGN KEY ("devlog_id") REFERENCES "public"."devlog_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devlog_dependencies" ADD CONSTRAINT "devlog_dependencies_devlog_id_fkey" FOREIGN KEY ("devlog_id") REFERENCES "public"."devlog_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devlog_dependencies" ADD CONSTRAINT "devlog_dependencies_target_devlog_id_fkey" FOREIGN KEY ("target_devlog_id") REFERENCES "public"."devlog_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devlog_documents" ADD CONSTRAINT "devlog_documents_devlog_id_fkey" FOREIGN KEY ("devlog_id") REFERENCES "public"."devlog_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devlog_user_providers" ADD CONSTRAINT "devlog_user_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."devlog_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devlog_email_verification_tokens" ADD CONSTRAINT "devlog_email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."devlog_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devlog_password_reset_tokens" ADD CONSTRAINT "devlog_password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."devlog_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_devlog_links" ADD CONSTRAINT "chat_devlog_links_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_devlog_links" ADD CONSTRAINT "chat_devlog_links_devlog_id_fkey" FOREIGN KEY ("devlog_id") REFERENCES "public"."devlog_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
