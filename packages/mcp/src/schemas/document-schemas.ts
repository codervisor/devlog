/**
 * Document operation schemas for MCP tools - AI-friendly validation
 */

import { z } from 'zod';
import { DevlogIdSchema, LimitSchema } from './base.js';

// === BASE SCHEMAS ===

export const DocumentIdSchema = z.string().min(1, 'Document ID is required');

export const DocumentTypeSchema = z.enum([
  'text',
  'markdown', 
  'image',
  'pdf',
  'code',
  'json',
  'csv',
  'log',
  'config',
  'other'
]).describe('Type of document based on content and file extension');

export const FileContentSchema = z.string().describe('Base64-encoded file content for upload');

export const FilenameSchema = z.string()
  .min(1, 'Filename is required')
  .max(255, 'Filename must be 255 characters or less')
  .describe('Original filename with extension');

export const MimeTypeSchema = z.string()
  .min(1, 'MIME type is required')
  .describe('MIME type of the file (e.g., text/plain, application/pdf)');

export const FileSizeSchema = z.number()
  .int()
  .min(1, 'File size must be positive')
  .max(10 * 1024 * 1024, 'File size cannot exceed 10MB')
  .describe('File size in bytes');

export const DocumentMetadataSchema = z.record(z.any())
  .optional()
  .describe('Additional metadata for the document');

// === UPLOAD DOCUMENT ===
export const UploadDocumentSchema = z.object({
  devlogId: DevlogIdSchema,
  filename: FilenameSchema,
  content: FileContentSchema,
  mimeType: MimeTypeSchema,
  metadata: DocumentMetadataSchema,
});

// === LIST DOCUMENTS ===
export const ListDocumentsSchema = z.object({
  devlogId: DevlogIdSchema,
  limit: LimitSchema.optional(),
});

// === GET DOCUMENT ===
export const GetDocumentSchema = z.object({
  documentId: DocumentIdSchema,
});

// === DELETE DOCUMENT ===
export const DeleteDocumentSchema = z.object({
  documentId: DocumentIdSchema,
});

// === SEARCH DOCUMENTS ===
export const SearchDocumentsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  devlogId: DevlogIdSchema.optional(),
  limit: LimitSchema.optional(),
});

// === TYPE EXPORTS ===
export type UploadDocumentArgs = z.infer<typeof UploadDocumentSchema>;
export type ListDocumentsArgs = z.infer<typeof ListDocumentsSchema>;
export type GetDocumentArgs = z.infer<typeof GetDocumentSchema>;
export type DeleteDocumentArgs = z.infer<typeof DeleteDocumentSchema>;
export type SearchDocumentsArgs = z.infer<typeof SearchDocumentsSchema>;