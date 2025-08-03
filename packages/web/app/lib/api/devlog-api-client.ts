import type {
  DevlogEntry,
  DevlogId,
  DevlogNote,
  DevlogPriority,
  DevlogStats,
  DevlogStatus,
  DevlogType,
  PaginatedResult,
  PaginationMeta,
  SortOptions,
  TimeSeriesStats,
} from '@codervisor/devlog-core';
import { apiClient } from './api-client';
import { CreateNoteRequest, UpdateNoteRequest } from '@/lib';

export interface CreateDevlogRequest {
  title: string;
  description: string;
  type?: DevlogType;
  priority?: DevlogPriority;
  status?: DevlogStatus;
  tags?: string[];
}

export interface UpdateDevlogRequest {
  title?: string;
  description?: string;
  type?: DevlogType;
  priority?: DevlogPriority;
  status?: DevlogStatus;
  tags?: string[];
}

export interface DevlogFilters {
  status?: DevlogStatus;
  priority?: DevlogPriority;
  type?: DevlogType;
  tags?: string[];
  search?: string;
  assignee?: string;
  archived?: boolean;
  fromDate?: string;
  toDate?: string;
  filterType?: 'total' | 'open' | 'closed';
  limit?: number;
  offset?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BatchUpdateRequest {
  status?: DevlogStatus;
  priority?: DevlogPriority;
  type?: DevlogType;
  tags?: string[];
}

export interface BatchNoteRequest {
  content: string;
  category?: string;
}

export class DevlogApiClient {
  constructor(private projectId: number) {}

  /**
   * Get all devlogs for the project
   */
  async list(
    filters?: DevlogFilters,
    pagination?: PaginationMeta,
    sortOptions?: SortOptions,
  ): Promise<PaginatedResult<DevlogEntry>> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.assignee) params.append('assignee', filters.assignee);
    if (filters?.archived !== undefined) params.append('archived', filters.archived.toString());
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.filterType) params.append('filterType', filters.filterType);
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (sortOptions?.sortBy) params.append('sortBy', sortOptions.sortBy);
    if (sortOptions?.sortOrder) params.append('sortOrder', sortOptions.sortOrder);

    const queryString = params.toString();
    const url = `/api/projects/${this.projectId}/devlogs${queryString ? `?${queryString}` : ''}`;

    return apiClient.getList<DevlogEntry>(url);
  }

  /**
   * Get a specific devlog by ID
   */
  async get(devlogId: DevlogId): Promise<DevlogEntry> {
    return apiClient.get<DevlogEntry>(`/api/projects/${this.projectId}/devlogs/${devlogId}`);
  }

  /**
   * Create a new devlog
   */
  async create(data: CreateDevlogRequest): Promise<DevlogEntry> {
    return apiClient.post<DevlogEntry>(`/api/projects/${this.projectId}/devlogs`, data);
  }

  /**
   * Update an existing devlog
   */
  async update(devlogId: DevlogId, data: UpdateDevlogRequest): Promise<DevlogEntry> {
    return apiClient.put<DevlogEntry>(`/api/projects/${this.projectId}/devlogs/${devlogId}`, data);
  }

  /**
   * Delete a devlog
   */
  async delete(devlogId: DevlogId): Promise<void> {
    return apiClient.delete<void>(`/api/projects/${this.projectId}/devlogs/${devlogId}`);
  }

  /**
   * Archive a devlog
   */
  async archive(devlogId: DevlogId): Promise<DevlogEntry> {
    return apiClient.post<DevlogEntry>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/archive`,
    );
  }

  /**
   * Unarchive a devlog
   */
  async unarchive(devlogId: DevlogId): Promise<DevlogEntry> {
    return apiClient.post<DevlogEntry>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/unarchive`,
    );
  }

  /**
   * Batch update multiple devlogs
   */
  async batchUpdate(
    devlogIds: DevlogId[],
    updates: BatchUpdateRequest,
  ): Promise<{ updated: DevlogId[]; failed: DevlogId[] }> {
    return apiClient.post<{ updated: DevlogId[]; failed: DevlogId[] }>(
      `/api/projects/${this.projectId}/devlogs/batch/update`,
      { ids: devlogIds, updates },
    );
  }

  /**
   * Batch delete multiple devlogs
   */
  async batchDelete(devlogIds: DevlogId[]): Promise<void> {
    return apiClient.post<void>(`/api/projects/${this.projectId}/devlogs/batch/delete`, {
      ids: devlogIds,
    });
  }

  /**
   * Get devlog statistics overview
   */
  async getStatsOverview(): Promise<DevlogStats> {
    return apiClient.get<DevlogStats>(`/api/projects/${this.projectId}/devlogs/stats/overview`);
  }

  /**
   * Get devlog timeseries statistics
   */
  async getStatsTimeseries(
    period?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<TimeSeriesStats> {
    const params = period ? `?period=${period}` : '';
    return apiClient.get<TimeSeriesStats>(
      `/api/projects/${this.projectId}/devlogs/stats/timeseries${params}`,
    );
  }

  /**
   * Add a note to a devlog
   */
  async addNote(devlogId: number, data: CreateNoteRequest): Promise<DevlogNote> {
    return apiClient.post<DevlogNote>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes`,
      data,
    );
  }

  /**
   * Get a specific note by ID
   */
  async getNote(devlogId: number, noteId: string): Promise<DevlogNote> {
    return apiClient.get<DevlogNote>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
    );
  }

  /**
   * Update a specific note
   */
  async updateNote(devlogId: number, noteId: string, data: UpdateNoteRequest): Promise<DevlogNote> {
    return apiClient.put<DevlogNote>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
      data,
    );
  }

  /**
   * Delete a specific note
   */
  async deleteNote(devlogId: number, noteId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
    );
  }

  /**
   * Get all notes for a devlog
   */
  async getNotes(devlogId: number, limit?: number): Promise<DevlogNote[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get<{ devlogId: number; total: number; notes: DevlogNote[] }>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes${params}`,
    );
    return response.notes;
  }
}
