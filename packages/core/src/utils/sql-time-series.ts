/**
 * Shared SQL utilities for time series calculations across database storage providers
 * Eliminates code duplication between SQLite, MySQL, and PostgreSQL implementations
 */

import { TimeSeriesDataPoint, TimeSeriesRequest } from '../types/core.js';

/**
 * Generate the common SQL query structure for time series statistics
 * This works across SQLite, MySQL, and PostgreSQL with minor dialect differences
 */
export function generateTimeSeriesSQL(dialect: 'sqlite' | 'mysql' | 'postgresql' = 'sqlite'): string {
  // Date series generation varies by SQL dialect
  const dateSeriesSQL = dialect === 'postgresql' 
    ? `date_series AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS date
      )`
    : `date_series AS (
        SELECT DATE(?) AS date
        UNION ALL
        SELECT DATE(date, '+1 day')
        FROM date_series
        WHERE date < DATE(?)
      )`;

  // Parameter placeholders vary by dialect
  const params = dialect === 'postgresql' ? '$3 AND $4' : '? AND ?';
  const closedParams = dialect === 'postgresql' ? '$5 AND $6' : '? AND ?';

  return `
    WITH ${dialect === 'sqlite' ? 'RECURSIVE ' : ''}${dateSeriesSQL},
    daily_stats AS (
      SELECT 
        DATE(created_at) as created_date,
        COUNT(*) as daily_created
      FROM devlog_entries
      WHERE DATE(created_at) BETWEEN ${params}
      GROUP BY DATE(created_at)
    ),
    daily_closed AS (
      SELECT 
        DATE(closed_at) as closed_date,
        COUNT(*) as daily_closed
      FROM devlog_entries
      WHERE DATE(closed_at) BETWEEN ${closedParams} AND closed_at IS NOT NULL
      GROUP BY DATE(closed_at)
    ),
    cumulative_stats AS (
      SELECT 
        ds.date,
        COALESCE(dc.daily_created, 0) as daily_created,
        COALESCE(closed.daily_closed, 0) as daily_closed,
        (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date) as total_created,
        (SELECT COUNT(*) FROM devlog_entries WHERE DATE(closed_at) <= ds.date AND closed_at IS NOT NULL) as total_closed
      FROM date_series ds
      LEFT JOIN daily_stats dc ON ds.date = dc.created_date
      LEFT JOIN daily_closed closed ON ds.date = closed.closed_date
      ORDER BY ds.date
    )
    SELECT * FROM cumulative_stats;
  `;
}

/**
 * Generate parameter array for the SQL query based on date range
 */
export function generateTimeSeriesParams(
  request: TimeSeriesRequest = {},
  dialect: 'sqlite' | 'mysql' | 'postgresql' = 'sqlite'
): string[] {
  // Set defaults
  const days = request.days || 30;
  const endDate = request.to ? new Date(request.to) : new Date();
  const startDate = request.from ? new Date(request.from) : new Date(endDate);
  if (!request.from) {
    startDate.setDate(endDate.getDate() - days + 1);
  }

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  return [
    startDateStr,
    endDateStr, // date_series parameters
    startDateStr,
    endDateStr, // daily_stats parameters
    startDateStr,
    endDateStr, // daily_closed parameters
  ];
}

/**
 * Map SQL result rows to TimeSeriesDataPoint objects
 */
export function mapSQLRowsToDataPoints(rows: Array<{
  date: string;
  daily_created: number;
  daily_closed: number;
  total_created: number;
  total_closed: number;
}>): TimeSeriesDataPoint[] {
  return rows.map((row) => {
    // Calculate open as simple delta
    const open = row.total_created - row.total_closed;

    return {
      date: row.date,

      // Cumulative data (primary Y-axis)
      totalCreated: row.total_created,
      totalClosed: row.total_closed,

      // Snapshot data (secondary Y-axis)
      open,

      // Daily activity
      dailyCreated: row.daily_created,
      dailyClosed: row.daily_closed,
    };
  });
}

/**
 * Generate date range info for the response
 */
export function generateDateRange(request: TimeSeriesRequest = {}): { from: string; to: string } {
  const days = request.days || 30;
  const endDate = request.to ? new Date(request.to) : new Date();
  const startDate = request.from ? new Date(request.from) : new Date(endDate);
  if (!request.from) {
    startDate.setDate(endDate.getDate() - days + 1);
  }

  return {
    from: startDate.toISOString().split('T')[0],
    to: endDate.toISOString().split('T')[0],
  };
}
