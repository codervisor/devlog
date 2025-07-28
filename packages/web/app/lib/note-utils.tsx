import React from 'react';
import { Tooltip } from 'antd';
import {
  BellOutlined,
  BugOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { NoteCategory } from '@codervisor/devlog-core';

/**
 * Note category configuration with metadata for each category
 */
export interface NoteCategoryConfig {
  /** The icon component to display */
  icon: React.ReactNode;
  /** The display label for the category */
  label: string;
  /** A brief description of when to use this category */
  description: string;
  /** The color hex code for the icon */
  color: string;
}

/**
 * Complete configuration for all note categories
 */
export const noteCategoryConfig: Record<NoteCategory, NoteCategoryConfig> = {
  progress: {
    icon: <TrophyOutlined style={{ color: '#52c41a' }} />,
    label: 'Progress',
    description: 'Work progress updates, milestones, and status changes',
    color: '#52c41a',
  },
  issue: {
    icon: <BugOutlined style={{ color: '#f5222d' }} />,
    label: 'Issue',
    description: 'Problems encountered, bugs found, or obstacles discovered',
    color: '#f5222d',
  },
  solution: {
    icon: <CheckCircleOutlined style={{ color: '#1890ff' }} />,
    label: 'Solution',
    description: 'Solutions implemented, fixes applied, or workarounds found',
    color: '#1890ff',
  },
  idea: {
    icon: <BulbOutlined style={{ color: '#faad14' }} />,
    label: 'Idea',
    description: 'New ideas, suggestions, or potential improvements',
    color: '#faad14',
  },
  reminder: {
    icon: <BellOutlined style={{ color: '#fa8c16' }} />,
    label: 'Reminder',
    description: 'Important reminders, action items, or follow-up tasks',
    color: '#fa8c16',
  },
  feedback: {
    icon: <CommentOutlined style={{ color: '#722ed1' }} />,
    label: 'Feedback',
    description: 'External feedback from users, customers, stakeholders, or usability testing',
    color: '#722ed1',
  },
  'acceptance-criteria': {
    icon: <CheckCircleOutlined style={{ color: '#13c2c2' }} />,
    label: 'Acceptance Criteria',
    description: 'Updates on acceptance criteria validation and completion status',
    color: '#13c2c2',
  },
};

/**
 * Get the icon for a note category with tooltip
 * @param category - The note category
 * @returns React node containing the appropriate icon with color and tooltip
 */
export const getCategoryIcon = (category: NoteCategory): React.ReactNode => {
  const config = noteCategoryConfig[category];
  const icon = config?.icon || <CommentOutlined style={{ color: '#8c8c8c' }} />;
  const label = config?.label || category;

  return (
    <Tooltip title={label} placement="left">
      {icon}
    </Tooltip>
  );
};

/**
 * Get the raw icon for a note category without tooltip
 * @param category - The note category
 * @returns React node containing the appropriate icon with color
 */
export const getCategoryIconRaw = (category: NoteCategory): React.ReactNode => {
  const config = noteCategoryConfig[category];
  return config?.icon || <CommentOutlined style={{ color: '#8c8c8c' }} />;
};

/**
 * Get the display label for a note category
 * @param category - The note category
 * @returns Human-readable label for the category
 */
export const getCategoryLabel = (category: NoteCategory): string => {
  return noteCategoryConfig[category]?.label || category;
};

/**
 * Get the description for a note category
 * @param category - The note category
 * @returns Description of when to use this category
 */
export const getCategoryDescription = (category: NoteCategory): string => {
  return noteCategoryConfig[category]?.description || '';
};

/**
 * Get the color for a note category
 * @param category - The note category
 * @returns Hex color code for the category
 */
export const getCategoryColor = (category: NoteCategory): string => {
  return noteCategoryConfig[category]?.color || '#8c8c8c';
};

/**
 * Get all available note categories with their configurations
 * @returns Array of category options suitable for select components
 */
export const getNoteCategoryOptions = () => {
  return Object.entries(noteCategoryConfig).map(([value, config]) => ({
    value: value as NoteCategory,
    label: config.label,
    description: config.description,
    icon: config.icon,
    color: config.color,
  }));
};
