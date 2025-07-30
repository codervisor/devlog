/**
 * Project operation schemas
 */

import { z } from 'zod';
import { ProjectIdSchema } from './base.js';

// === LIST PROJECTS ===
export const ListProjectsSchema = z.object({
  // No parameters needed
});

// === GET CURRENT PROJECT ===
export const GetCurrentProjectSchema = z.object({
  // No parameters needed
});

// === SWITCH PROJECT ===
export const SwitchProjectSchema = z.object({
  projectId: ProjectIdSchema,
});

// === TYPE EXPORTS ===
export type ListProjectsArgs = z.infer<typeof ListProjectsSchema>;
export type GetCurrentProjectArgs = z.infer<typeof GetCurrentProjectSchema>;
export type SwitchProjectArgs = z.infer<typeof SwitchProjectSchema>;
