import React from 'react';
import { DevlogPriority, DevlogStatus, DevlogType } from '@codervisor/devlog-core';
import {
  BookIcon,
  BugIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
  InfoIcon,
  MinusCircleIcon,
  PlusIcon,
  StarIcon,
  StopCircleIcon,
  LoaderIcon,
  WrenchIcon,
  AlertTriangleIcon,
} from 'lucide-react';

/**
 * Maps status colors to Tailwind CSS color classes that work with themes
 * These classes automatically adapt to light/dark themes
 */
const antColorToTailwindMap: Record<string, string> = {
  blue: 'blue-500',
  orange: 'orange-500',
  red: 'red-500',
  purple: 'purple-500',
  cyan: 'cyan-500',
  green: 'green-500',
  geekblue: 'indigo-500',
  magenta: 'pink-500',
  volcano: 'red-600',
  gold: 'amber-500',
  lime: 'lime-500',
  default: 'muted-foreground',
};

/**
 * Converts an Ant Design color name to its Tailwind CSS class
 */
export const getColorClass = (antColorName: string): string => {
  return antColorToTailwindMap[antColorName] || antColorToTailwindMap['default'];
};

/**
 * Maps status colors to hex values for charts (Recharts, etc.)
 * These are theme-neutral colors that work well in both light and dark themes
 */
const statusToChartColorMap: Record<string, string> = {
  blue: '#1890ff', // New
  orange: '#fa8c16', // In Progress
  red: '#ff4d4f', // Blocked
  purple: '#722ed1', // In Review
  cyan: '#13c2c2', // Testing
  green: '#52c41a', // Done
  default: '#8c8c8c', // Cancelled/Default
};

/**
 * Gets chart-compatible hex color for status
 */
export const getStatusChartColor = (status: DevlogStatus): string => {
  const antColor = getStatusColor(status);
  return statusToChartColorMap[antColor] || statusToChartColorMap['default'];
};

/**
 * Gets the Ant Design tag color for a devlog status
 * Improved color scheme with better semantic meaning and visual hierarchy
 */
export const getStatusColor = (status: DevlogStatus): string => {
  switch (status) {
    case 'new':
      return 'blue'; // Fresh, ready to start
    case 'in-progress':
      return 'orange'; // Active work, attention needed
    case 'blocked':
      return 'red'; // Critical attention required
    case 'in-review':
      return 'purple'; // Under evaluation
    case 'testing':
      return 'cyan'; // Verification phase
    case 'done':
      return 'green'; // Completed successfully
    case 'cancelled':
      return 'default'; // Neutral/inactive
    default:
      return 'default';
  }
};

/**
 * Gets the appropriate icon component for a devlog status
 * Improved icons with consistent visual weight and clearer meaning
 */
export const getStatusIcon = (status: DevlogStatus): React.ReactNode => {
  switch (status) {
    case 'new':
      return <PlusIcon size={16} />; // Ready to start
    case 'in-progress':
      return <LoaderIcon size={16} className="animate-spin" />; // Active work (spinning for movement)
    case 'blocked':
      return <StopCircleIcon size={16} />; // Blocked/stopped
    case 'in-review':
      return <EyeIcon size={16} />; // Under review/examination
    case 'testing':
      return <ShieldCheckIcon size={16} />; // Testing/verification
    case 'done':
      return <CheckCircleIcon size={16} />; // Completed
    case 'cancelled':
      return <MinusCircleIcon size={16} />; // Cancelled/inactive
    default:
      return <ClockIcon size={16} />; // Default fallback
  }
};

/**
 * Gets the Ant Design tag color for a devlog priority
 * Improved color scheme with clear severity indication
 */
export const getPriorityColor = (priority: DevlogPriority): string => {
  switch (priority) {
    case 'critical':
      return 'red'; // Urgent/critical attention
    case 'high':
      return 'volcano'; // High importance, warm orange-red
    case 'medium':
      return 'gold'; // Moderate importance, balanced yellow
    case 'low':
      return 'lime'; // Low priority, calm green
    default:
      return 'default';
  }
};

/**
 * Gets the appropriate icon component for a devlog priority
 * Consistent icons with clear priority hierarchy
 */
export const getPriorityIcon = (priority: string): React.ReactNode => {
  switch (priority) {
    case 'critical':
      return <AlertCircleIcon size={16} />; // Critical alert
    case 'high':
      return <AlertTriangleIcon size={16} />; // Warning/high importance
    case 'medium':
      return <InfoIcon size={16} />; // Information/medium
    case 'low':
      return <MinusCircleIcon size={16} />; // Low/minimal indicator
    default:
      return <MinusCircleIcon size={16} />;
  }
};

/**
 * Gets the Ant Design tag color for a devlog type
 * Distinctive colors for different work types
 */
export const getTypeColor = (type: DevlogType): string => {
  switch (type) {
    case 'feature':
      return 'geekblue'; // New functionality, blue theme
    case 'bugfix':
      return 'magenta'; // Bug fixes, attention-getting
    case 'task':
      return 'purple'; // General tasks, neutral but distinct
    case 'refactor':
      return 'cyan'; // Code improvement, technical
    case 'docs':
      return 'green'; // Documentation, knowledge-based
    default:
      return 'default';
  }
};

export const getTypeIcon = (type: DevlogType): React.ReactNode => {
  switch (type) {
    case 'feature':
      return <StarIcon size={16} />;
    case 'bugfix':
      return <BugIcon size={16} />;
    case 'task':
      return <CheckCircleIcon size={16} />;
    case 'refactor':
      return <WrenchIcon size={16} />;
    case 'docs':
      return <BookIcon size={16} />;
    default:
      return <MinusCircleIcon size={16} />;
  }
};
