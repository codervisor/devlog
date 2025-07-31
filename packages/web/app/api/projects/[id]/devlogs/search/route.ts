import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { ApiValidator, ProjectIdParamSchema, DevlogSearchQuerySchema } from '@/schemas';
import { ApiErrors, createSuccessResponse, ResponseTransformer } from '@/lib';

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
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  searchMeta: {
    searchTime: number;
    totalMatches: number;
    appliedFilters?: Record<string, any>;
  };
}

// GET /api/projects/[id]/devlogs/search - Enhanced search for devlogs
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const searchStartTime = Date.now();

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

    // Build enhanced search options
    const searchOptions = {
      includeRelevance: true,
      includeMatchedFields: true,
      includeHighlights: true,
      searchMode: 'fuzzy' as const, // Use database-native fuzzy search when available
      minRelevance: 0.01, // Filter out very low relevance results
    };

    // Build filter for enhanced search
    const enhancedFilter: any = {
      searchOptions,
      pagination: {
        page,
        limit,
        sortBy: 'relevance',
        sortOrder: 'desc',
      },
    };

    // Apply validated filters
    if (queryData.status) enhancedFilter.status = [queryData.status];
    if (queryData.type) enhancedFilter.type = [queryData.type];
    if (queryData.priority) enhancedFilter.priority = [queryData.priority];
    if (queryData.assignee) enhancedFilter.assignee = queryData.assignee;
    if (queryData.archived !== undefined) enhancedFilter.archived = queryData.archived;
    if (queryData.fromDate) enhancedFilter.fromDate = queryData.fromDate;
    if (queryData.toDate) enhancedFilter.toDate = queryData.toDate;

    // Perform the enhanced search using DevlogService
    const result = await devlogService.searchWithRelevance(searchQuery, enhancedFilter);

    // Transform the response to match the expected interface
    const response: SearchResponse = {
      query: result.searchMeta.query,
      results: result.items.map((item) => ({
        entry: ResponseTransformer.transformDevlog(item.entry),
        relevance: item.relevance,
        matchedFields: item.matchedFields,
        highlights: item.highlights,
      })),
      pagination: result.pagination,
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
