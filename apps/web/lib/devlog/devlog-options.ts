import { DevlogStatus, DevlogPriority, DevlogType } from '@codervisor/devlog-core';

export interface SelectOption {
  label: string;
  value: string;
}

export const statusOptions: SelectOption[] = [
  { label: 'New', value: 'new' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'In Review', value: 'in-review' },
  { label: 'Testing', value: 'testing' },
  { label: 'Done', value: 'done' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const priorityOptions: SelectOption[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

export const typeOptions: SelectOption[] = [
  { label: 'Feature', value: 'feature' },
  { label: 'Bug Fix', value: 'bugfix' },
  { label: 'Task', value: 'task' },
  { label: 'Refactor', value: 'refactor' },
  { label: 'Documentation', value: 'docs' },
];

/**
 * Get the display label for a status value
 */
export const getStatusLabel = (status: DevlogStatus): string => {
  return statusOptions.find((option) => option.value === status)?.label || status;
};

/**
 * Get the display label for a priority value
 */
export const getPriorityLabel = (priority: DevlogPriority): string => {
  return priorityOptions.find((option) => option.value === priority)?.label || priority;
};

/**
 * Get the display label for a type value
 */
export const getTypeLabel = (type: DevlogType): string => {
  return typeOptions.find((option) => option.value === type)?.label || type;
};
