/**
 * Event Timeline Component
 * 
 * Displays chronological list of events for a session with filtering
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Terminal, Code, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { AgentEvent } from '@codervisor/devlog-core';

interface EventTimelineProps {
  events: AgentEvent[];
}

function getEventIcon(type: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    file_write: FileText,
    file_read: FileText,
    command_execute: Terminal,
    llm_request: Code,
    error: AlertCircle,
    success: CheckCircle,
    info: Info,
  };
  return iconMap[type] || Info;
}

function getSeverityBadge(severity?: string) {
  if (!severity) return null;

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    critical: 'destructive',
    error: 'destructive',
    warning: 'secondary',
    info: 'outline',
    debug: 'outline',
  };

  const colors: Record<string, string> = {
    critical: 'bg-red-600',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    debug: 'bg-gray-500',
  };

  return (
    <Badge variant={variants[severity] || 'outline'}>
      {severity.toUpperCase()}
    </Badge>
  );
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EventTimeline({ events }: EventTimelineProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Get unique event types and severities for filters
  const eventTypes = Array.from(new Set(events.map(e => e.type)));
  const severities = Array.from(new Set(events.map(e => e.severity).filter(Boolean)));

  // Apply filters
  const filteredEvents = events.filter(event => {
    // Search filter
    const searchMatch = searchTerm === '' || 
      event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(event.data).toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(event.context).toLowerCase().includes(searchTerm.toLowerCase());

    // Type filter
    const typeMatch = typeFilter === 'all' || event.type === typeFilter;

    // Severity filter
    const severityMatch = severityFilter === 'all' || event.severity === severityFilter;

    return searchMatch && typeMatch && severityMatch;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Timeline</CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {eventTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {severities.map(severity => (
                <SelectItem key={severity} value={severity!}>{severity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No events found matching your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const Icon = getEventIcon(event.type);
              return (
                <div
                  key={event.id}
                  className="flex gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{event.type}</span>
                        {getSeverityBadge(event.severity)}
                        {event.tags && event.tags.length > 0 && (
                          <div className="flex gap-1">
                            {event.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>

                    {/* Context */}
                    {event.context?.filePath && (
                      <p className="text-sm text-muted-foreground">
                        📁 {event.context.filePath}
                      </p>
                    )}
                    
                    {event.context?.workingDirectory && (
                      <p className="text-sm text-muted-foreground">
                        📂 {event.context.workingDirectory}
                      </p>
                    )}

                    {/* Data preview */}
                    {Object.keys(event.data).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View data
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </details>
                    )}

                    {/* Metrics */}
                    {event.metrics && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {event.metrics.tokenCount && (
                          <span>⚡ {event.metrics.tokenCount} tokens</span>
                        )}
                        {event.metrics.duration && (
                          <span>⏱️ {event.metrics.duration}ms</span>
                        )}
                        {event.metrics.linesChanged && (
                          <span>📝 {event.metrics.linesChanged} lines</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Results count */}
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </CardContent>
    </Card>
  );
}
