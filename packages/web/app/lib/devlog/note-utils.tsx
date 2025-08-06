import React from 'react';
import { DevlogNoteCategory } from '@codervisor/devlog-core';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BellIcon,
  BugIcon,
  LightbulbIcon,
  CheckCircleIcon,
  MessageCircleIcon,
  TrophyIcon,
} from 'lucide-react';

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
export const noteCategoryConfig: Record<DevlogNoteCategory, NoteCategoryConfig> = {
  progress: {
    icon: <TrophyIcon size={16} className="text-green-600" />,
    label: 'Progress',
    description: 'Work progress updates, milestones, and status changes',
    color: 'green-600',
  },
  issue: {
    icon: <BugIcon size={16} className="text-red-600" />,
    label: 'Issue',
    description: 'Problems encountered, bugs found, or obstacles discovered',
    color: 'red-600',
  },
  solution: {
    icon: <CheckCircleIcon size={16} className="text-blue-600" />,
    label: 'Solution',
    description: 'Solutions implemented, fixes applied, or workarounds found',
    color: 'blue-600',
  },
  idea: {
    icon: <LightbulbIcon size={16} className="text-yellow-600" />,
    label: 'Idea',
    description: 'New ideas, suggestions, or potential improvements',
    color: 'yellow-600',
  },
  reminder: {
    icon: <BellIcon size={16} className="text-orange-600" />,
    label: 'Reminder',
    description: 'Important reminders, action items, or follow-up tasks',
    color: 'orange-600',
  },
  feedback: {
    icon: <MessageCircleIcon size={16} className="text-purple-600" />,
    label: 'Feedback',
    description: 'External feedback from users, customers, stakeholders, or usability testing',
    color: 'purple-600',
  },
  'acceptance-criteria': {
    icon: <CheckCircleIcon size={16} className="text-cyan-600" />,
    label: 'Acceptance Criteria',
    description: 'Updates on acceptance criteria validation and completion status',
    color: 'cyan-600',
  },
}; /**
 * Get the icon for a note category with tooltip
 * @param category - The note category
 * @returns React node containing the appropriate icon with color and tooltip
 */
export const getCategoryIcon = (category: DevlogNoteCategory): React.ReactNode => {
  const config = noteCategoryConfig[category];
  const icon = config?.icon || <MessageCircleIcon size={16} className="text-gray-500" />;
  const label = config?.label || category;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-default">{icon}</div>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
};

/**
 * Get the raw icon for a note category without tooltip
 * @param category - The note category
 * @returns React node containing the appropriate icon with color
 */
export const getCategoryIconRaw = (category: DevlogNoteCategory): React.ReactNode => {
  const config = noteCategoryConfig[category];
  return config?.icon || <MessageCircleIcon size={16} className="text-muted-foreground" />;
};

/**
 * Get the display label for a note category
 * @param category - The note category
 * @returns Human-readable label for the category
 */
export const getCategoryLabel = (category: DevlogNoteCategory): string => {
  return noteCategoryConfig[category]?.label || category;
};

/**
 * Get the description for a note category
 * @param category - The note category
 * @returns Description of when to use this category
 */
export const getCategoryDescription = (category: DevlogNoteCategory): string => {
  return noteCategoryConfig[category]?.description || '';
};

/**
 * Get the color for a note category
 * @param category - The note category
 * @returns Tailwind color class for the category
 */
export const getCategoryColor = (category: DevlogNoteCategory): string => {
  return noteCategoryConfig[category]?.color || 'muted-foreground';
};

/**
 * Get all available note categories with their configurations
 * @returns Array of category options suitable for select components
 */
export const getNoteCategoryOptions = () => {
  return Object.entries(noteCategoryConfig).map(([value, config]) => ({
    value: value as DevlogNoteCategory,
    label: config.label,
    description: config.description,
    icon: config.icon,
    color: config.color,
  }));
};
