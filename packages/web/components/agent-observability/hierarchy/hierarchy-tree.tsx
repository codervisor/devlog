/**
 * Hierarchy Tree Component
 *
 * Displays a collapsible tree view of project hierarchy
 * (project → machines → workspaces → sessions)
 */

'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Monitor, Folder, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ProjectHierarchy } from '@/lib/types/hierarchy';

interface HierarchyTreeProps {
  hierarchy: ProjectHierarchy;
}

export function HierarchyTree({ hierarchy }: HierarchyTreeProps) {
  const [expandedMachines, setExpandedMachines] = useState<Set<number>>(new Set());
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<number>>(new Set());

  const toggleMachine = (machineId: number) => {
    setExpandedMachines((prev) => {
      const next = new Set(prev);
      if (next.has(machineId)) {
        next.delete(machineId);
      } else {
        next.add(machineId);
      }
      return next;
    });
  };

  const toggleWorkspace = (workspaceId: number) => {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(workspaceId)) {
        next.delete(workspaceId);
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {hierarchy.machines.map(({ machine, workspaces }) => {
        const isExpanded = expandedMachines.has(machine.id);
        const totalWorkspaces = workspaces.length;
        const totalSessions = workspaces.reduce((sum, w) => sum + w.sessions.length, 0);
        const totalEvents = workspaces.reduce((sum, w) => sum + w.eventCount, 0);

        return (
          <Card key={machine.id} className="p-4">
            <Button
              variant="ghost"
              onClick={() => toggleMachine(machine.id)}
              className="flex items-center gap-2 w-full justify-start hover:bg-accent p-2"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
              <Monitor className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-semibold">{machine.hostname}</div>
                <div className="text-sm text-muted-foreground">
                  {machine.machineType} • {machine.osType}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {totalWorkspaces} workspaces • {totalSessions} sessions •{' '}
                {totalEvents.toLocaleString()} events
              </div>
            </Button>

            {isExpanded && (
              <div className="ml-8 mt-2 space-y-2">
                {workspaces.map(({ workspace, sessions, eventCount }) => {
                  const isWsExpanded = expandedWorkspaces.has(workspace.id);

                  return (
                    <div key={workspace.id} className="border-l-2 pl-4">
                      <Button
                        variant="ghost"
                        onClick={() => toggleWorkspace(workspace.id)}
                        className="flex items-center gap-2 w-full justify-start hover:bg-accent p-2"
                      >
                        {isWsExpanded ? (
                          <ChevronDown className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        )}
                        <Folder className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{workspace.workspacePath}</div>
                          <div className="text-xs text-muted-foreground">
                            {workspace.branch && `Branch: ${workspace.branch}`}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sessions.length} sessions • {eventCount.toLocaleString()} events
                        </div>
                      </Button>

                      {isWsExpanded && (
                        <div className="ml-6 mt-2 space-y-1">
                          {sessions.length === 0 ? (
                            <div className="text-sm text-muted-foreground p-2">No sessions yet</div>
                          ) : (
                            sessions.map((session) => (
                              <a
                                key={session.id}
                                href={`/sessions/${session.sessionId}`}
                                className="flex items-center gap-2 p-2 hover:bg-accent rounded text-sm transition-colors"
                              >
                                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                <div className="flex-1">
                                  <div>{new Date(session.startedAt).toLocaleString()}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {session.agentType}
                                  </div>
                                </div>
                              </a>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
