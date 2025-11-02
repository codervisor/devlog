-- Fix agent_events.session_id foreign key to reference agent_sessions instead of chat_sessions
-- This was incorrectly pointing to chat_sessions.sessionId

-- Drop the incorrect foreign key
ALTER TABLE "agent_events" DROP CONSTRAINT IF EXISTS "agent_events_session_id_fkey";

-- Add the correct foreign key pointing to agent_sessions
ALTER TABLE "agent_events" 
ADD CONSTRAINT "agent_events_session_id_fkey" 
FOREIGN KEY ("session_id") 
REFERENCES "agent_sessions"("id") 
ON UPDATE CASCADE 
ON DELETE CASCADE;
