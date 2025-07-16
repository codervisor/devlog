import React from 'react';
import {
  BookOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileProtectOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  StarOutlined,
  StopOutlined,
  SyncOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { DevlogPriority, DevlogStatus, DevlogType } from '@devlog/core';

/**
 * Maps Ant Design color names to their corresponding hex values
 * Based on Ant Design's default color palette
 */
const antColorMap: Record<string, string> = {
  'blue': '#1890ff',
  'orange': '#fa8c16', 
  'red': '#ff4d4f',
  'purple': '#722ed1',
  'cyan': '#13c2c2',
  'green': '#52c41a',
  'geekblue': '#2f54eb',
  'magenta': '#eb2f96',
  'volcano': '#fa541c',
  'gold': '#faad14',
  'lime': '#a0d911',
  'default': '#8c8c8c',
};

/**
 * Converts an Ant Design color name to its hex value
 */
export const getColorHex = (antColorName: string): string => {
  return antColorMap[antColorName] || antColorMap['default'];
};

/**
 * Gets the Ant Design tag color for a devlog status
 * Improved color scheme with better semantic meaning and visual hierarchy
 */
export const getStatusColor = (status: DevlogStatus): string => {
  switch (status) {
    case 'new':
      return 'blue';        // Fresh, ready to start
    case 'in-progress':
      return 'orange';      // Active work, attention needed
    case 'blocked':
      return 'red';         // Critical attention required
    case 'in-review':
      return 'purple';      // Under evaluation
    case 'testing':
      return 'cyan';        // Verification phase
    case 'done':
      return 'green';       // Completed successfully
    case 'cancelled':
      return 'default';     // Neutral/inactive
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
      return <PlusOutlined />;           // Ready to start
    case 'in-progress':
      return <SyncOutlined spin />;      // Active work (spinning for movement)
    case 'blocked':
      return <StopOutlined />;           // Blocked/stopped
    case 'in-review':
      return <EyeOutlined />;            // Under review/examination
    case 'testing':
      return <FileProtectOutlined />;    // Testing/verification
    case 'done':
      return <CheckCircleOutlined />;    // Completed
    case 'cancelled':
      return <MinusCircleOutlined />;    // Cancelled/inactive
    default:
      return <ClockCircleOutlined />;    // Default fallback
  }
};

/**
 * Gets the Ant Design tag color for a devlog priority
 * Improved color scheme with clear severity indication
 */
export const getPriorityColor = (priority: DevlogPriority): string => {
  switch (priority) {
    case 'critical':
      return 'red';         // Urgent/critical attention
    case 'high':
      return 'volcano';     // High importance, warm orange-red
    case 'medium':
      return 'gold';        // Moderate importance, balanced yellow
    case 'low':
      return 'lime';        // Low priority, calm green
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
      return <ExclamationCircleOutlined />;  // Critical alert
    case 'high':
      return <WarningOutlined />;            // Warning/high importance
    case 'medium':
      return <InfoCircleOutlined />;         // Information/medium
    case 'low':
      return <MinusCircleOutlined />;        // Low/minimal indicator
    default:
      return <MinusCircleOutlined />;
  }
};

/**
 * Gets the Ant Design tag color for a devlog type
 * Distinctive colors for different work types
 */
export const getTypeColor = (type: DevlogType): string => {
  switch (type) {
    case 'feature':
      return 'geekblue';    // New functionality, blue theme
    case 'bugfix':
      return 'magenta';     // Bug fixes, attention-getting
    case 'task':
      return 'purple';      // General tasks, neutral but distinct
    case 'refactor':
      return 'cyan';        // Code improvement, technical
    case 'docs':
      return 'green';       // Documentation, knowledge-based
    default:
      return 'default';
  }
};

export const getTypeIcon = (type: DevlogType): React.ReactNode => {
  switch (type) {
    case 'feature':
      return <StarOutlined />;
    case 'bugfix':
      return <BugOutlined />;
    case 'task':
      return <CheckCircleOutlined />;
    case 'refactor':
      return <ToolOutlined />;
    case 'docs':
      return <BookOutlined />;
    default:
      return <MinusCircleOutlined />;
  }
};
