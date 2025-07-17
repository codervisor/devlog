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
    
    // Create end-of-day timestamp for accurate comparisons
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

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

    // Calculate cumulative totals up to end of this date
    const totalCreated = allDevlogs.filter(devlog => 
      new Date(devlog.createdAt) <= endOfDay
    ).length;

    const totalClosed = allDevlogs.filter(devlog => 
      devlog.closedAt && new Date(devlog.closedAt) <= endOfDay
    ).length;

    // Calculate open entries as simple delta (this is the accurate historical view)
    const open = totalCreated - totalClosed;

      dataPoints.push({
        date: dateStr,
        
        // Cumulative data (primary Y-axis)
        totalCreated,
        totalClosed,
        
        // Snapshot data (secondary Y-axis)
        open,
        
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
