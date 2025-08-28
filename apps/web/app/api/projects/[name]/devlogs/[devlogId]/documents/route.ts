import { NextRequest } from 'next/server';
import { DocumentService, DevlogService } from '@codervisor/devlog-core/server';
import { ApiErrors, createSuccessResponse, RouteParams, ServiceHelper, createSimpleCollectionResponse } from '@/lib/api/api-utils';
import { RealtimeEventType } from '@/lib/realtime';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[name]/devlogs/[devlogId]/documents - List documents for a devlog
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectNameAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName, devlogId } = paramResult.data;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Verify devlog exists
    const devlogService = DevlogService.getInstance(project.id);
    const devlog = await devlogService.get(devlogId, false);
    if (!devlog) {
      return ApiErrors.devlogNotFound();
    }

    // Get documents using document service
    const documentService = DocumentService.getInstance(project.id);
    const documents = await documentService.listDocuments(devlogId);

    return createSimpleCollectionResponse(documents);
  } catch (error) {
    console.error('Error fetching devlog documents:', error);
    return ApiErrors.internalError('Failed to fetch documents');
  }
}

// POST /api/projects/[name]/devlogs/[devlogId]/documents - Upload a document
export async function POST(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectNameAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName, devlogId } = paramResult.data;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Verify devlog exists
    const devlogService = DevlogService.getInstance(project.id);
    const devlog = await devlogService.get(devlogId, false);
    if (!devlog) {
      return ApiErrors.devlogNotFound();
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;

    if (!file) {
      return ApiErrors.invalidRequest('File is required');
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return ApiErrors.invalidRequest('File size exceeds 10MB limit');
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse metadata if provided
    let parsedMetadata: Record<string, any> | undefined;
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        return ApiErrors.invalidRequest('Invalid metadata JSON');
      }
    }

    // Upload document
    const documentService = DocumentService.getInstance(project.id);
    const document = await documentService.uploadDocument(
      devlogId,
      {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        content: buffer,
      },
      {
        metadata: parsedMetadata,
        // TODO: Add uploadedBy from authentication context
      }
    );

    return createSuccessResponse(document, {
      status: 201,
      sseEventType: RealtimeEventType.DEVLOG_UPDATED,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return ApiErrors.internalError('Failed to upload document');
  }
}