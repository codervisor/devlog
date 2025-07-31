/**
 * Devlog operation schemas - simplified and AI-friendly
 */

import { z } from 'zod';
import {
  DevlogIdSchema,
  TitleSchema,
  DescriptionSchema,
  DevlogTypeSchema,
  DevlogPrioritySchema,
  DevlogStatusSchema,
  NoteCategorySchema,
  NoteContentSchema,
  FilesSchema,
  KeywordsSchema,
  LimitSchema,
  BusinessContextSchema,
  TechnicalContextSchema,
  AcceptanceCriteriaSchema,
} from './base.js';

// === CREATE DEVLOG ===
export const CreateDevlogSchema = z.object({
  title: TitleSchema,
  description: DescriptionSchema,
  type: DevlogTypeSchema,
  priority: DevlogPrioritySchema,
  businessContext: BusinessContextSchema,
  technicalContext: TechnicalContextSchema,
  acceptanceCriteria: AcceptanceCriteriaSchema,
});

// === GET DEVLOG ===
export const GetDevlogSchema = z.object({
  id: DevlogIdSchema,
});

// === UPDATE DEVLOG ===
export const UpdateDevlogSchema = z.object({
  id: DevlogIdSchema,
  status: DevlogStatusSchema.optional(),
  priority: DevlogPrioritySchema.optional(),
  note: z.string().optional(),
  files: FilesSchema,
  businessContext: BusinessContextSchema,
  technicalContext: TechnicalContextSchema,
  acceptanceCriteria: AcceptanceCriteriaSchema,
});

// === LIST/SEARCH DEVLOGS ===
export const ListDevlogSchema = z.object({
  query: z.string().optional(),
  status: DevlogStatusSchema.optional(),
  type: DevlogTypeSchema.optional(),
  priority: DevlogPrioritySchema.optional(),
  limit: LimitSchema,
});

// === ADD NOTE ===
export const AddNoteSchema = z.object({
  id: DevlogIdSchema,
  note: NoteContentSchema,
  category: NoteCategorySchema,
  files: FilesSchema,
});

// === COMPLETE DEVLOG ===
export const CompleteDevlogSchema = z.object({
  id: DevlogIdSchema,
  summary: z.string().optional(),
});

// === FIND RELATED ===
export const FindRelatedSchema = z.object({
  description: DescriptionSchema,
  type: DevlogTypeSchema.optional(),
  keywords: KeywordsSchema,
});

// === TYPE EXPORTS ===
export type CreateDevlogArgs = z.infer<typeof CreateDevlogSchema>;
export type GetDevlogArgs = z.infer<typeof GetDevlogSchema>;
export type UpdateDevlogArgs = z.infer<typeof UpdateDevlogSchema>;
export type ListDevlogArgs = z.infer<typeof ListDevlogSchema>;
export type AddNoteArgs = z.infer<typeof AddNoteSchema>;
export type CompleteDevlogArgs = z.infer<typeof CompleteDevlogSchema>;
export type FindRelatedArgs = z.infer<typeof FindRelatedSchema>;
