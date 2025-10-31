/**
 * Validation schemas for hierarchy-related API endpoints
 * 
 * Provides Zod schemas for machines, workspaces, and hierarchy operations.
 */

import { z } from 'zod';

/**
 * Machine creation/update schema
 */
export const MachineCreateSchema = z.object({
  machineId: z.string().min(1, 'Machine ID is required'),
  hostname: z.string().min(1, 'Hostname is required'),
  username: z.string().min(1, 'Username is required'),
  osType: z.enum(['darwin', 'linux', 'windows'], {
    errorMap: () => ({ message: 'OS type must be darwin, linux, or windows' }),
  }),
  osVersion: z.string().optional(),
  machineType: z.enum(['local', 'remote', 'cloud', 'ci'], {
    errorMap: () => ({ message: 'Machine type must be local, remote, cloud, or ci' }),
  }),
  ipAddress: z.string().ip().optional().or(z.literal('')),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Workspace creation/update schema
 */
export const WorkspaceCreateSchema = z.object({
  projectId: z.number().int().positive('Project ID must be positive'),
  machineId: z.number().int().positive('Machine ID must be positive'),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  workspacePath: z.string().min(1, 'Workspace path is required'),
  workspaceType: z.enum(['folder', 'multi-root'], {
    errorMap: () => ({ message: 'Workspace type must be folder or multi-root' }),
  }),
  branch: z.string().optional(),
  commit: z.string().optional(),
});

/**
 * Chat session creation/update schema
 */
export const ChatSessionCreateSchema = z.object({
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  workspaceId: z.number().int().positive('Workspace ID must be positive'),
  agentType: z.string().min(1, 'Agent type is required'),
  modelId: z.string().optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  messageCount: z.number().int().nonnegative().default(0),
  totalTokens: z.number().int().nonnegative().default(0),
});

/**
 * Agent event creation schema
 */
export const AgentEventCreateSchema = z.object({
  timestamp: z.coerce.date(),
  eventType: z.string().min(1, 'Event type is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  agentVersion: z.string().min(1, 'Agent version is required'),
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
  projectId: z.number().int().positive('Project ID must be positive'),
  context: z.record(z.unknown()).default({}),
  data: z.record(z.unknown()).default({}),
  metrics: z.record(z.unknown()).optional(),
  parentEventId: z.string().uuid().optional(),
  relatedEventIds: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  severity: z.enum(['info', 'warning', 'error']).optional(),
});

/**
 * Batch events creation schema
 */
export const BatchEventsCreateSchema = z.array(AgentEventCreateSchema).max(
  1000,
  'Cannot create more than 1000 events at once'
);

/**
 * Query parameters for event filtering
 */
export const EventFilterSchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  machineId: z.coerce.number().int().positive().optional(),
  workspaceId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  eventType: z.string().optional(),
  agentId: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error']).optional(),
});

/**
 * Project resolution from git URL schema
 */
export const ProjectResolveSchema = z.object({
  repoUrl: z.string().url('Repository URL must be valid').or(
    z.string().regex(
      /^git@github\.com:.+\/.+\.git$/,
      'Repository URL must be a valid GitHub URL'
    )
  ),
});

export type MachineCreateInput = z.infer<typeof MachineCreateSchema>;
export type WorkspaceCreateInput = z.infer<typeof WorkspaceCreateSchema>;
export type ChatSessionCreateInput = z.infer<typeof ChatSessionCreateSchema>;
export type AgentEventCreateInput = z.infer<typeof AgentEventCreateSchema>;
export type EventFilterInput = z.infer<typeof EventFilterSchema>;
export type ProjectResolveInput = z.infer<typeof ProjectResolveSchema>;
