/**
 * Base schemas and reusable components for MCP tools
 */

import { z } from 'zod';

// === BASE ID SCHEMAS ===
export const DevlogIdSchema = z.number().int().min(0);
export const ProjectIdSchema = z.string().regex(/^\d+$/, 'Project ID must be a number');

// === ENUM SCHEMAS WITH SMART DEFAULTS ===
export const DevlogTypeSchema = z
  .enum(['task', 'feature', 'bugfix', 'refactor', 'docs'])
  .default('task');

export const DevlogStatusSchema = z.enum([
  'new',
  'in-progress',
  'blocked',
  'in-review',
  'testing',
  'done',
  'cancelled',
]);

export const DevlogPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']).default('medium');

export const NoteCategorySchema = z
  .enum(['progress', 'issue', 'solution', 'idea', 'reminder'])
  .default('progress');

// === FIELD SCHEMAS ===
export const TitleSchema = z.string().min(1, 'Title is required').max(200, 'Title too long');

export const DescriptionSchema = z.string().min(1, 'Description is required');

export const NoteContentSchema = z.string().min(1, 'Note content is required');

export const FilesSchema = z.array(z.string()).optional();

export const KeywordsSchema = z.array(z.string()).optional();

// === CONTEXT FIELD SCHEMAS ===
export const BusinessContextSchema = z.string().optional();

export const TechnicalContextSchema = z.string().optional();

export const AcceptanceCriteriaSchema = z.array(z.string()).optional();

// === PAGINATION SCHEMAS ===
export const LimitSchema = z.number().int().min(1).max(50).default(10).optional();

export const PageSchema = z.number().int().min(1).optional();

export const SortBySchema = z
  .enum(['createdAt', 'updatedAt', 'priority', 'status', 'title'])
  .optional();

export const SortOrderSchema = z.enum(['asc', 'desc']).optional();

// === TYPE EXPORTS ===
export type DevlogId = z.infer<typeof DevlogIdSchema>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type DevlogType = z.infer<typeof DevlogTypeSchema>;
export type DevlogStatus = z.infer<typeof DevlogStatusSchema>;
export type DevlogPriority = z.infer<typeof DevlogPrioritySchema>;
export type NoteCategory = z.infer<typeof NoteCategorySchema>;
