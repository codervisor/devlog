/**
 * Devlog operation schemas - simplified and AI-friendly
 */

import { z } from 'zod';
import {
  AcceptanceCriteriaSchema,
  BusinessContextSchema,
  DescriptionSchema,
  DevlogIdSchema,
  DevlogNoteCategorySchema,
  DevlogNoteContentSchema,
  DevlogPrioritySchema,
  DevlogsSortBySchema,
  DevlogStatusSchema,
  DevlogTypeSchema,
  KeywordsSchema,
  LimitSchema,
  PageSchema,
  SortOrderSchema,
  TechnicalContextSchema,
  TitleSchema,
} from './base.js';

// === CREATE DEVLOG ===
export const CreateDevlogSchema = z.object({
  title: TitleSchema,
  description: DescriptionSchema,
  type: DevlogTypeSchema,
  priority: DevlogPrioritySchema,
  businessContext: BusinessContextSchema.optional(),
  technicalContext: TechnicalContextSchema.optional(),
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
  businessContext: BusinessContextSchema.optional(),
  technicalContext: TechnicalContextSchema.optional(),
  acceptanceCriteria: AcceptanceCriteriaSchema.optional(),
  note: z
    .object({
      content: DevlogNoteContentSchema,
      category: DevlogNoteCategorySchema,
    })
    .optional(),
});

// === LIST/SEARCH DEVLOGS ===
export const ListDevlogSchema = z.object({
  status: DevlogStatusSchema.optional(),
  type: DevlogTypeSchema.optional(),
  priority: DevlogPrioritySchema.optional(),
  page: PageSchema,
  limit: LimitSchema,
  sortBy: DevlogsSortBySchema,
  sortOrder: SortOrderSchema,
});

// === ADD DEVLOG NOTE ===
export const AddDevlogNoteSchema = z.object({
  id: DevlogIdSchema,
  content: DevlogNoteContentSchema,
  category: DevlogNoteCategorySchema,
});

// === FIND RELATED DEVLOGS ===
export const FindRelatedDevlogsSchema = z.object({
  description: DescriptionSchema,
  type: DevlogTypeSchema.optional(),
  keywords: KeywordsSchema,
  limit: LimitSchema,
});

// === TYPE EXPORTS ===
export type CreateDevlogArgs = z.infer<typeof CreateDevlogSchema>;
export type GetDevlogArgs = z.infer<typeof GetDevlogSchema>;
export type UpdateDevlogArgs = z.infer<typeof UpdateDevlogSchema>;
export type ListDevlogArgs = z.infer<typeof ListDevlogSchema>;
export type AddDevlogNoteArgs = z.infer<typeof AddDevlogNoteSchema>;
export type FindRelatedDevlogsArgs = z.infer<typeof FindRelatedDevlogsSchema>;
