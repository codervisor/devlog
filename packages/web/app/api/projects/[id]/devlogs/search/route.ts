import { NextRequest } from 'next/server';
import {
  DevlogFilter,
  DevlogService,
  PaginationMeta,
  ProjectService,
} from '@codervisor/devlog-core';
import {
  ApiValidator,
  ProjectIdParamSchema,
  DevlogSearchQuerySchema,
  DevlogSearchQuery,
  DevlogListQuerySchema,
} from '@/schemas';
import { ApiErrors, createSuccessResponse } from '@/lib';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * Enhanced search interface for relevance scoring
 */
interface SearchResult {
  entry: any;
  relevance: number;
  matchedFields: string[];
  highlights?: Record<string, string>;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  pagination: PaginationMeta;
  searchMeta: {
    searchTime: number;
    totalMatches: number;
    appliedFilters?: Record<string, any>;
  };
}

// GET /api/projects/[id]/devlogs/search - Enhanced search for devlogs
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate project ID parameter
    const paramValidation = ApiValidator.validateParams(params, ProjectIdParamSchema);
    if (!paramValidation.success) {
      return paramValidation.response;
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryValidation = ApiValidator.validateQuery(url.searchParams, DevlogSearchQuerySchema);
    if (!queryValidation.success) {
      return queryValidation.response;
    }

    const projectService = ProjectService.getInstance();
    const project = await projectService.get(paramValidation.data.id);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(paramValidation.data.id);

    const queryData = queryValidation.data;
    const searchQuery = queryData.q;

    // Pagination configuration
    const page = queryData.page || 1;
    const limit = queryData.limit || 20;

    // Build filter for enhanced search
    const filter: DevlogFilter = {};

    // Apply validated filters
    if (queryData.status) filter.status = [queryData.status];
    if (queryData.type) filter.type = [queryData.type];
    if (queryData.priority) filter.priority = [queryData.priority];
    if (queryData.assignee) filter.assignee = queryData.assignee;
    if (queryData.archived !== undefined) filter.archived = queryData.archived;
    if (queryData.fromDate) filter.fromDate = queryData.fromDate;
    if (queryData.toDate) filter.toDate = queryData.toDate;

    // Perform the enhanced search using DevlogService
    const result = await devlogService.searchWithRelevance(searchQuery, filter);

    // Transform the response to match the expected interface
    const response: SearchResponse = {
      query: result.searchMeta.query,
      results: result.items.map((item) => ({
        entry: item.entry,
        relevance: item.relevance,
        matchedFields: item.matchedFields,
        highlights: item.highlights,
      })),
      pagination: {
        ...result.pagination,
        total: result.pagination.total ?? 0,
        totalPages: result.pagination.totalPages ?? 0,
      },
      searchMeta: {
        searchTime: result.searchMeta.searchTime,
        totalMatches: result.searchMeta.totalMatches,
        appliedFilters: result.searchMeta.appliedFilters,
      },
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error performing search:', error);
    return ApiErrors.internalError('Failed to perform search');
  }
}
