/**
 * Machine Activity Widget
 *
 * Displays activity statistics by machine with bar chart visualization
 */

'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MachineActivityData {
  hostname: string;
  machineType: string;
  sessionCount: number;
  eventCount: number;
  workspaceCount: number;
}

interface MachineActivityWidgetProps {
  projectId?: number;
  className?: string;
}

export function MachineActivityWidget({ projectId, className }: MachineActivityWidgetProps) {
  const [data, setData] = useState<MachineActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const query = projectId ? `?projectId=${projectId}` : '';
        const res = await fetch(`/api/stats/machine-activity${query}`);

        if (!res.ok) {
          throw new Error('Failed to fetch machine activity data');
        }

        const json = await res.json();
        setData(json.success ? json.data : json);
      } catch (err) {
        console.error('Error fetching machine activity:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity by Machine</CardTitle>
          <CardDescription>Sessions and events across different machines</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity by Machine</CardTitle>
          <CardDescription>Sessions and events across different machines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load machine activity data</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity by Machine</CardTitle>
          <CardDescription>Sessions and events across different machines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No machine activity data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity by Machine</CardTitle>
        <CardDescription>
          Sessions and events across {data.length} {data.length === 1 ? 'machine' : 'machines'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis
              dataKey="hostname"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;

                const data = payload[0].payload as MachineActivityData;
                return (
                  <div className="bg-popover border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold">{data.hostname}</p>
                    <p className="text-sm text-muted-foreground capitalize">{data.machineType}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span>Sessions:</span>
                        <span className="font-medium">{data.sessionCount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Events:</span>
                        <span className="font-medium">{data.eventCount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Workspaces:</span>
                        <span className="font-medium">{data.workspaceCount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend />
            <Bar dataKey="sessionCount" fill="#8884d8" name="Sessions" />
            <Bar dataKey="eventCount" fill="#82ca9d" name="Events" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
