/**
 * Session Details Page
 * 
 * Displays complete information about a specific agent session including
 * metrics, timeline, and full event history
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionHeader, SessionMetrics, EventTimeline } from '@/components/agent-observability/session-details';
import type { AgentSession, AgentEvent } from '@codervisor/devlog-core';

interface SessionDetailsPageProps {
  params: { id: string };
}

async function fetchSession(id: string): Promise<AgentSession | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';
    const response = await fetch(`${baseUrl}/api/sessions/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

async function fetchSessionEvents(id: string): Promise<AgentEvent[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';
    const response = await fetch(`${baseUrl}/api/sessions/${id}/events`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching session events:', error);
    return [];
  }
}

export default async function SessionDetailsPage({ params }: SessionDetailsPageProps) {
  const { id } = params;

  // Fetch session and events in parallel
  const [session, events] = await Promise.all([
    fetchSession(id),
    fetchSessionEvents(id),
  ]);

  // If session not found, show 404
  if (!session) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Navigation */}
      <div>
        <Link href="/sessions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
        </Link>
      </div>

      {/* Session Header */}
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <SessionHeader session={session} />
      </Suspense>

      {/* Session Metrics */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <SessionMetrics session={session} />
      </Suspense>

      {/* Event Timeline */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EventTimeline events={events} />
      </Suspense>
    </div>
  );
}
