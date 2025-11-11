import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from '../../utils/schema-converter.js';
import {
  UploadDocumentSchema,
  ListDocumentsSchema,
  GetDocumentSchema,
  DeleteDocumentSchema,
  SearchDocumentsSchema,
} from '../../schemas/index.js';

/**
 * Document tools for AI agents to manage files and attachments
 *
 * DESIGN PRINCIPLES:
 * - Clear document-specific naming (upload_document, list_documents, etc.)
 * - Support for various file types with automatic type detection
 * - Content extraction for searchable document types
 * - Association with devlog entries for context
 */
export const documentTools: Tool[] = [
  {
    name: 'upload_devlog_document',
    description:
      'Upload and attach a document to a devlog entry (supports text, images, PDFs, code files, etc.)',
    inputSchema: zodToJsonSchema(UploadDocumentSchema),
  },

  {
    name: 'list_devlog_documents',
    description: 'List all documents attached to a specific devlog entry',
    inputSchema: zodToJsonSchema(ListDocumentsSchema),
  },

  {
    name: 'get_devlog_document',
    description:
      'Get detailed information about a specific document including content if available',
    inputSchema: zodToJsonSchema(GetDocumentSchema),
  },

  {
    name: 'delete_devlog_document',
    description: 'Delete a document attachment from a devlog entry',
    inputSchema: zodToJsonSchema(DeleteDocumentSchema),
  },

  {
    name: 'search_devlog_documents',
    description: 'Search through document content and filenames across devlog entries',
    inputSchema: zodToJsonSchema(SearchDocumentsSchema),
  },
];
