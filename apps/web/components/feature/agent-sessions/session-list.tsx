/**
 * Session List Component
 * 
 * Displays a list of agent sessions with filtering and pagination
 */

'use client';

import { useState, useEffect } from 'react';
import { SessionCard } from './session-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AgentSession } from '@codervisor/devlog-core';

interface SessionListProps {
  projectName: string;
}

export function SessionList({ projectName }: SessionListProps) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterAgent !== 'all') params.set('agentId', filterAgent);
        if (filterOutcome !== 'all') params.set('outcome', filterOutcome);

        const response = await fetch(`/api/projects/${projectName}/agent-sessions?${params}`);
        const data = await response.json();
        
        if (data.success) {
          setSessions(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [projectName, filterAgent, filterOutcome]);

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      session.agentId.toLowerCase().includes(searchLower) ||
      session.outcome?.toLowerCase().includes(searchLower) ||
      session.id.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        
        <Select value={filterAgent} onValueChange={setFilterAgent}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            <SelectItem value="github-copilot">GitHub Copilot</SelectItem>
            <SelectItem value="claude-code">Claude Code</SelectItem>
            <SelectItem value="cursor">Cursor</SelectItem>
            <SelectItem value="gemini-cli">Gemini CLI</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterOutcome} onValueChange={setFilterOutcome}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-32 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No sessions found</p>
          <p className="text-sm mt-2">Agent sessions will appear here once they are tracked</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} projectName={projectName} />
          ))}
        </div>
      )}
    </div>
  );
}
