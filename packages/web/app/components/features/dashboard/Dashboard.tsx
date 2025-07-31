'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DevlogEntry, DevlogStats, TimeSeriesStats } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';
import { formatTimeAgoWithTooltip, getColorHex, getStatusColor } from '@/lib';
import { DevlogPriorityTag, DevlogStatusTag, DevlogTypeTag } from '@/components';
import {
  CHART_COLORS,
  CHART_OPACITY,
  formatTimeSeriesData,
  formatTooltipLabel,
  formatTooltipValue,
} from './chart-utils';
import { useStickyHeaders } from '@/hooks/useStickyHeaders';

interface DashboardProps {
  stats: DevlogStats | null;
  timeSeriesData: TimeSeriesStats | null;
  isLoadingTimeSeries: boolean;
  recentDevlogs: DevlogEntry[];
  isLoadingDevlogs: boolean;
  onViewDevlog: (devlog: DevlogEntry) => void;
}

export function Dashboard({
  stats,
  timeSeriesData,
  isLoadingTimeSeries,
  recentDevlogs,
  isLoadingDevlogs,
  onViewDevlog,
}: DashboardProps) {
  const router = useRouter();

  // Format data for charts using utility function
  const chartData = React.useMemo(() => formatTimeSeriesData(timeSeriesData), [timeSeriesData]);

  // Format pie chart data for current status distribution using centralized color system
  const pieChartData = React.useMemo(() => {
    if (!stats) return [];

    return [
      { name: 'New', value: stats.byStatus['new'] || 0, color: getColorHex(getStatusColor('new')) },
      {
        name: 'In Progress',
        value: stats.byStatus['in-progress'] || 0,
        color: getColorHex(getStatusColor('in-progress')),
      },
      {
        name: 'Blocked',
        value: stats.byStatus['blocked'] || 0,
        color: getColorHex(getStatusColor('blocked')),
      },
      {
        name: 'In Review',
        value: stats.byStatus['in-review'] || 0,
        color: getColorHex(getStatusColor('in-review')),
      },
      {
        name: 'Testing',
        value: stats.byStatus['testing'] || 0,
        color: getColorHex(getStatusColor('testing')),
      },
      {
        name: 'Done',
        value: stats.byStatus['done'] || 0,
        color: getColorHex(getStatusColor('done')),
      },
      {
        name: 'Cancelled',
        value: stats.byStatus['cancelled'] || 0,
        color: getColorHex(getStatusColor('cancelled')),
      },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Setup sticky header detection
  useStickyHeaders({
    selectorClass: 'section-header',
    stickyClass: 'is-sticky',
    topOffset: 0,
    dependencies: [],
  });

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Charts Section */}
        <div className="space-y-6">
          {isLoadingTimeSeries ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Development Activity (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Current Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : chartData.length === 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Progress & Current Workload</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-muted-foreground mb-2">📊</div>
                    <p className="text-sm text-muted-foreground">
                      No development activity data available yet
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Current Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-muted-foreground mb-2">📈</div>
                    <p className="text-sm text-muted-foreground">
                      No status distribution data available yet
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Progress & Current Workload</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} />

                      {/* Primary Y-axis for cumulative data */}
                      <YAxis
                        yAxisId="cumulative"
                        fontSize={12}
                        tickLine={false}
                        label={{ value: 'Total Items', angle: -90, position: 'insideLeft' }}
                      />

                      {/* Secondary Y-axis for current workload */}
                      <YAxis
                        yAxisId="current"
                        orientation="right"
                        fontSize={12}
                        tickLine={false}
                        label={{ value: 'Current Open', angle: 90, position: 'insideRight' }}
                      />

                      <Tooltip labelFormatter={formatTooltipLabel} formatter={formatTooltipValue} />
                      <Legend />

                      {/* Cumulative data on primary axis with transparency */}
                      <Area
                        yAxisId="cumulative"
                        type="monotone"
                        dataKey="totalCreated"
                        stackId="1"
                        stroke={CHART_COLORS.primary}
                        fill={CHART_COLORS.primary}
                        fillOpacity={CHART_OPACITY.area}
                        strokeWidth={2}
                        name="Total Created"
                      />
                      <Area
                        yAxisId="cumulative"
                        type="monotone"
                        dataKey="totalClosed"
                        stackId="2"
                        stroke={CHART_COLORS.success}
                        fill={CHART_COLORS.success}
                        fillOpacity={CHART_OPACITY.area}
                        strokeWidth={2}
                        name="Total Closed"
                      />

                      {/* Current workload on secondary axis using bar chart */}
                      <Bar
                        yAxisId="current"
                        dataKey="open"
                        fill={CHART_COLORS.warning}
                        fillOpacity={CHART_OPACITY.bar}
                        name="Open"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Current Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value, percent }) =>
                          value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                        }
                        labelLine={false}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        labelFormatter={() => ''}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string) => <span className="text-sm">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Recent Devlogs Section */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="section-header">
            <CardTitle>Recent Devlogs</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {isLoadingDevlogs ? (
                <div className="space-y-4">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="flex items-start space-x-4 p-4 border-b border-border"
                    >
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Skeleton className="w-6 h-6" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <div className="flex space-x-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              ) : recentDevlogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-muted-foreground mb-2 text-2xl">📝</div>
                  <p className="text-sm text-muted-foreground">No devlogs found</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {recentDevlogs.map((devlog) => (
                    <div
                      key={devlog.id}
                      className="flex items-start space-x-4 p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onViewDevlog(devlog)}
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center text-primary font-bold text-sm">
                        {devlog.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1 truncate">{devlog.title}</h4>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {devlog.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <DevlogStatusTag status={devlog.status} />
                              <DevlogPriorityTag priority={devlog.priority} />
                              <DevlogTypeTag type={devlog.type} />
                            </div>
                          </div>
                          <span
                            className="text-xs text-muted-foreground ml-4 flex-shrink-0"
                            title={formatTimeAgoWithTooltip(devlog.updatedAt).fullDate}
                          >
                            {formatTimeAgoWithTooltip(devlog.updatedAt).timeAgo}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
