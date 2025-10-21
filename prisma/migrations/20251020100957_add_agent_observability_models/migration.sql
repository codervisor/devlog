-- CreateTable: AgentSession
CREATE TABLE "agent_sessions" (
    "id" UUID NOT NULL,
    "agent_id" TEXT NOT NULL,
    "agent_version" TEXT NOT NULL,
    "project_id" INTEGER NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ,
    "duration" INTEGER,
    "context" JSONB NOT NULL DEFAULT '{}',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "outcome" TEXT,
    "quality_score" DECIMAL(5,2),

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AgentEvent
CREATE TABLE "agent_events" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "event_type" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "agent_version" TEXT NOT NULL,
    "session_id" UUID NOT NULL,
    "project_id" INTEGER NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "data" JSONB NOT NULL DEFAULT '{}',
    "metrics" JSONB,
    "parent_event_id" UUID,
    "related_event_ids" TEXT[],
    "tags" TEXT[],
    "severity" TEXT,

    CONSTRAINT "agent_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_sessions_start_time_idx" ON "agent_sessions"("start_time" DESC);
CREATE INDEX "agent_sessions_agent_id_idx" ON "agent_sessions"("agent_id");
CREATE INDEX "agent_sessions_project_id_idx" ON "agent_sessions"("project_id");
CREATE INDEX "agent_sessions_outcome_idx" ON "agent_sessions"("outcome");
CREATE INDEX "agent_sessions_quality_score_idx" ON "agent_sessions"("quality_score");

CREATE INDEX "agent_events_timestamp_idx" ON "agent_events"("timestamp" DESC);
CREATE INDEX "agent_events_session_id_idx" ON "agent_events"("session_id");
CREATE INDEX "agent_events_agent_id_idx" ON "agent_events"("agent_id");
CREATE INDEX "agent_events_event_type_idx" ON "agent_events"("event_type");
CREATE INDEX "agent_events_project_id_idx" ON "agent_events"("project_id");
CREATE INDEX "agent_events_tags_idx" ON "agent_events"("tags");
CREATE INDEX "agent_events_severity_idx" ON "agent_events"("severity");

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "devlog_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "devlog_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
