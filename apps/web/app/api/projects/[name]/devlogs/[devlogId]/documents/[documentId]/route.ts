import { NextRequest } from 'next/server';
import { DocumentService, DevlogService } from '@codervisor/devlog-core/server';
import { ApiErrors, createSuccessResponse, RouteParams, ServiceHelper } from '@/lib/api/api-utils';
import { RealtimeEventType } from '@/lib/realtime';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[name]/devlogs/[devlogId]/documents/[documentId] - Get specific document
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string; documentId: string } },
) {
  try {
    // Parse and validate parameters
    const projectResult = RouteParams.parseProjectName(params);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const { projectName } = projectResult.data;
    const { devlogId, documentId } = params;

    if (!devlogId || !documentId) {
      return ApiErrors.invalidRequest('Missing devlogId or documentId');
    }

    // Parse devlogId as number
    const parsedDevlogId = parseInt(devlogId);
    if (isNaN(parsedDevlogId)) {
      return ApiErrors.invalidRequest('Invalid devlogId');
    }

    // Get project using helper
    const projectHelperResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectHelperResult.success) {
      return projectHelperResult.response;
    }

    const project = projectHelperResult.data.project;

    // Verify devlog exists
    const devlogService = DevlogService.getInstance(project.id);
    const devlog = await devlogService.get(parsedDevlogId, false);
    if (!devlog) {
      return ApiErrors.devlogNotFound();
    }

    // Get document
    const documentService = DocumentService.getInstance(project.id);
    const document = await documentService.getDocument(documentId);

    if (!document) {
      return ApiErrors.notFound('Document not found');
    }

    // Verify document belongs to the specified devlog
    if (document.devlogId !== parsedDevlogId) {
      return ApiErrors.notFound('Document not found');
    }

    return createSuccessResponse(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return ApiErrors.internalError('Failed to fetch document');
  }
}

// DELETE /api/projects/[name]/devlogs/[devlogId]/documents/[documentId] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string; documentId: string } },
) {
  try {
    // Parse and validate parameters
    const projectResult = RouteParams.parseProjectName(params);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const { projectName } = projectResult.data;
    const { devlogId, documentId } = params;

    if (!devlogId || !documentId) {
      return ApiErrors.invalidRequest('Missing devlogId or documentId');
    }

    // Parse devlogId as number
    const parsedDevlogId = parseInt(devlogId);
    if (isNaN(parsedDevlogId)) {
      return ApiErrors.invalidRequest('Invalid devlogId');
    }

    // Get project using helper
    const projectHelperResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectHelperResult.success) {
      return projectHelperResult.response;
    }

    const project = projectHelperResult.data.project;

    // Verify devlog exists
    const devlogService = DevlogService.getInstance(project.id);
    const devlog = await devlogService.get(parsedDevlogId, false);
    if (!devlog) {
      return ApiErrors.devlogNotFound();
    }

    // Verify document exists and belongs to the devlog
    const documentService = DocumentService.getInstance(project.id);
    const document = await documentService.getDocument(documentId);

    if (!document || document.devlogId !== parsedDevlogId) {
      return ApiErrors.notFound('Document not found');
    }

    // Delete document
    const deleted = await documentService.deleteDocument(documentId);

    if (!deleted) {
      return ApiErrors.internalError('Failed to delete document');
    }

    return createSuccessResponse(
      { message: 'Document deleted successfully' },
      {
        sseEventType: RealtimeEventType.DEVLOG_UPDATED,
      }
    );
  } catch (error) {
    console.error('Error deleting document:', error);
    return ApiErrors.internalError('Failed to delete document');
  }
}