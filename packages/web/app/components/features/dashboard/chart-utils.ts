/**
 * Chart utility functions for dashboard components
 */

import { TimeSeriesStats } from '@devlog/core';

export interface FormattedChartData {
  date: string;
  fullDate: string;
  totalCreated: number;
  totalClosed: number;
  open: number;
  // Add other fields that might be used
  [key: string]: any;
}

/**
 * Format time series data for chart consumption
 * Converts TimeSeriesStats to chart-ready data with proper date formatting
 */
export function formatTimeSeriesData(timeSeriesData: TimeSeriesStats | null): FormattedChartData[] {
  if (!timeSeriesData) return [];

  return timeSeriesData.dataPoints.map((point) => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: point.date,
  }));
}

/**
 * Chart color palette for consistent theming
 */
export const CHART_COLORS = {
  primary: '#1890ff',
  success: '#52c41a', 
  warning: '#fa8c16',
  error: '#ff4d4f',
  purple: '#722ed1',
  cyan: '#13c2c2',
  grey: '#595959',
} as const;

/**
 * Chart transparency levels for better visual hierarchy
 */
export const CHART_OPACITY = {
  area: 0.4,
  bar: 0.7,
  solid: 1.0,
} as const;

/**
 * Common tooltip formatter for time series charts
 */
export function formatTooltipValue(value: number, name: string): [number, string] {
  const nameMap: Record<string, string> = {
    totalCreated: 'Total Created',
    totalClosed: 'Total Closed', 
    open: 'Open',
  };
  
  return [value, nameMap[name] || name];
}

/**
 * Format tooltip label to show full date
 */
export function formatTooltipLabel(label: string, payload: any[]): string {
  const data = payload[0]?.payload;
  return data ? data.fullDate : label;
}
