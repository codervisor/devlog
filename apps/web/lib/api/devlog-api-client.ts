import type {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogNote,
  DevlogNoteCategory,
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

export interface BatchUpdateRequest {
  status?: DevlogStatus;
  priority?: DevlogPriority;
  type?: DevlogType;
  tags?: string[];
}

export interface CreateNoteRequest {
  content: string;
  category?: DevlogNoteCategory;
}

export interface UpdateNoteRequest {
  content?: string;
  category?: DevlogNoteCategory;
}

export interface BatchNoteRequest {
  content: string;
  category?: string;
}

export class DevlogApiClient {
  constructor(private projectName: string) {}

  /**
   * Get all devlog for the project
   */
  async list(
    filter?: DevlogFilter,
    pagination?: PaginationMeta,
    sortOptions?: SortOptions,
  ): Promise<PaginatedResult<DevlogEntry>> {
    const params = new URLSearchParams();

    if (filter?.status) {
      filter.status.forEach((status) => {
        params.append('status', status);
      });
    }
    if (filter?.priority) {
      filter.priority.forEach((priority) => {
        params.append('priority', priority);
      });
    }
    if (filter?.type) {
      filter.type.forEach((type) => {
        params.append('type', type);
      });
    }
    if (filter?.search) params.append('search', filter.search);
    if (filter?.assignee) params.append('assignee', filter.assignee);
    if (filter?.archived !== undefined) params.append('archived', filter.archived.toString());
    if (filter?.fromDate) params.append('fromDate', filter.fromDate);
    if (filter?.toDate) params.append('toDate', filter.toDate);
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (sortOptions?.sortBy) params.append('sortBy', sortOptions.sortBy);
    if (sortOptions?.sortOrder) params.append('sortOrder', sortOptions.sortOrder);

    const queryString = params.toString();
    const url = `/api/projects/${this.projectName}/devlogs${queryString ? `?${queryString}` : ''}`;

    return apiClient.getList<DevlogEntry>(url);
  }

  /**
   * Get a specific devlog by ID
   */
  async get(devlogId: DevlogId): Promise<DevlogEntry> {
    return apiClient.get<DevlogEntry>(`/api/projects/${this.projectName}/devlogs/${devlogId}`);
  }

  /**
   * Create a new devlog
   */
  async create(data: CreateDevlogRequest): Promise<DevlogEntry> {
    return apiClient.post<DevlogEntry>(`/api/projects/${this.projectName}/devlogs`, data);
  }

  /**
   * Update an existing devlog
   */
  async update(devlogId: DevlogId, data: UpdateDevlogRequest): Promise<DevlogEntry> {
    return apiClient.put<DevlogEntry>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}`,
      data,
    );
  }

  /**
   * Delete a devlog
   */
  async delete(devlogId: DevlogId): Promise<void> {
    return apiClient.delete<void>(`/api/projects/${this.projectName}/devlogs/${devlogId}`);
  }

  /**
   * Batch update multiple devlog
   */
  async batchUpdate(
    devlogIds: DevlogId[],
    updates: BatchUpdateRequest,
  ): Promise<{ updated: DevlogId[]; failed: DevlogId[] }> {
    return apiClient.post<{ updated: DevlogId[]; failed: DevlogId[] }>(
      `/api/projects/${this.projectName}/devlogs/batch/update`,
      { ids: devlogIds, updates },
    );
  }

  /**
   * Batch delete multiple devlog
   */
  async batchDelete(devlogIds: DevlogId[]): Promise<void> {
    return apiClient.post<void>(`/api/projects/${this.projectName}/devlogs/batch/delete`, {
      ids: devlogIds,
    });
  }

  /**
   * Get devlog statistics overview
   */
  async getStatsOverview(): Promise<DevlogStats> {
    return apiClient.get<DevlogStats>(`/api/projects/${this.projectName}/devlogs/stats/overview`);
  }

  /**
   * Get devlog timeseries statistics
   */
  async getStatsTimeseries(
    period?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<TimeSeriesStats> {
    const params = period ? `?period=${period}` : '';
    return apiClient.get<TimeSeriesStats>(
      `/api/projects/${this.projectName}/devlogs/stats/timeseries${params}`,
    );
  }

  /**
   * Add a note to a devlog
   */
  async addNote(devlogId: number, data: CreateNoteRequest): Promise<DevlogNote> {
    return apiClient.post<DevlogNote>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes`,
      data,
    );
  }

  /**
   * Get a specific note by ID
   */
  async getNote(devlogId: number, noteId: string): Promise<DevlogNote> {
    return apiClient.get<DevlogNote>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes/${noteId}`,
    );
  }

  /**
   * Update a specific note
   */
  async updateNote(devlogId: number, noteId: string, data: UpdateNoteRequest): Promise<DevlogNote> {
    return apiClient.put<DevlogNote>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes/${noteId}`,
      data,
    );
  }

  /**
   * Delete a specific note
   */
  async deleteNote(devlogId: number, noteId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes/${noteId}`,
    );
  }

  /**
   * Get all notes for a devlog
   */
  async getNotes(devlogId: number, limit?: number): Promise<DevlogNote[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get<{ devlogId: number; total: number; notes: DevlogNote[] }>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes${params}`,
    );
    return response.notes;
  }
}
