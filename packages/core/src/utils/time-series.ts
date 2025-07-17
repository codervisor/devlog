/**
 * Shared time series calculation utilities for storage providers
 * Eliminates code duplication across JSON, SQLite, PostgreSQL, MySQL, and GitHub storage
 */

import {
  DevlogEntry,
  DevlogStatus,
  TimeSeriesRequest,
  TimeSeriesStats,
  TimeSeriesDataPoint,
} from '../types/core.js';

/**
 * Calculate time series statistics from a collection of devlog entries
 * This is the core logic shared across all storage providers
 */
export function calculateTimeSeriesStats(
  allDevlogs: DevlogEntry[],
  request: TimeSeriesRequest = {}
): TimeSeriesStats {
  const days = request.days || 30;
  
  // Calculate date range
  const endDate = request.to ? new Date(request.to) : new Date();
  const startDate = request.from ? new Date(request.from) : new Date(endDate);
  if (!request.from) {
    startDate.setDate(endDate.getDate() - days + 1);
  }
  
  const dataPoints: TimeSeriesDataPoint[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Daily activity: count devlogs created on this specific date
    const dailyCreated = allDevlogs.filter((devlog) => {
      const createdDate = new Date(devlog.createdAt).toISOString().split('T')[0];
      return createdDate === dateStr;
    }).length;

    // Daily activity: count devlogs closed on this specific date (done + cancelled)
    const dailyClosed = allDevlogs.filter((devlog) => {
      // Use closedAt field for reliable closure detection
      if (!devlog.closedAt || (devlog.status !== 'done' && devlog.status !== 'cancelled')) return false;
      
      const closedDate = new Date(devlog.closedAt).toISOString().split('T')[0];
      return closedDate === dateStr;
    }).length;

    // Count status distribution as of this date (cumulative approach)
    // This gives us the state of all devlogs that existed by this date
    const statusCounts = allDevlogs.reduce(
      (acc: Record<DevlogStatus, number>, devlog: DevlogEntry) => {
        const createdDate = new Date(devlog.createdAt);
        // Only include devlogs that were created by this date
        if (createdDate <= currentDate) {
          acc[devlog.status] = (acc[devlog.status] || 0) + 1;
        }
        return acc;
      },
      {} as Record<DevlogStatus, number>,
    );

    // Calculate cumulative totals up to this date
    const totalCreated = allDevlogs.filter(devlog => 
      new Date(devlog.createdAt) <= currentDate
    ).length;

    const totalClosed = allDevlogs.filter(devlog => 
      devlog.closedAt && new Date(devlog.closedAt) <= currentDate
    ).length;

    // Calculate current open devlogs (all statuses except 'done' and 'cancelled')
    const currentOpen = (statusCounts['new'] || 0) +
                       (statusCounts['in-progress'] || 0) +
                       (statusCounts['blocked'] || 0) +
                       (statusCounts['in-review'] || 0) +
                       (statusCounts['testing'] || 0);

      dataPoints.push({
        date: dateStr,
        
        // Cumulative data (primary Y-axis)
        totalCreated,
        totalClosed,
        
        // Snapshot data (secondary Y-axis)
        currentOpen,
        currentNew: statusCounts['new'] || 0,
        currentInProgress: statusCounts['in-progress'] || 0,
        currentBlocked: statusCounts['blocked'] || 0,
        currentInReview: statusCounts['in-review'] || 0,
        currentTesting: statusCounts['testing'] || 0,
        
        // Daily activity
        dailyCreated,
        dailyClosed,
      });    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    dataPoints,
    dateRange: {
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
    },
  };
}
