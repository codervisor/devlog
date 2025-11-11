/**
 * Custom tooltip component for charts that properly handles dark theme
 */

import React from 'react';
import { formatTooltipValue, formatTooltipLabel } from './chart-utils';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

/**
 * Custom tooltip component that properly handles dark theme
 */
export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-foreground mb-2">
        {formatTooltipLabel(label || '', payload)}
      </p>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => {
          const [value, name] = formatTooltipValue(entry.value, entry.dataKey);
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{name}:</span>
              </div>
              <span className="font-medium text-foreground">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Custom pie chart tooltip with simpler styling
 */
export function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  if (!data) return null;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2 text-sm">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: data.color }} />
        <span className="text-muted-foreground">{data.name}:</span>
        <span className="font-medium text-foreground">{data.value}</span>
      </div>
    </div>
  );
}
