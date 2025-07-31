import type {
  DevlogEntry,
  DevlogStats,
  TimeSeriesStats,
  DevlogStatus,
  DevlogPriority,
  DevlogType,
  DevlogId,
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

export interface DevlogFilters {
  status?: DevlogStatus;
  priority?: DevlogPriority;
  type?: DevlogType;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
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
  constructor(private projectId: string) {}

  /**
   * Get all devlogs for the project
   */
  async list(filters?: DevlogFilters): Promise<DevlogEntry[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.tags?.length) {
      filters.tags.forEach((tag) => params.append('tags', tag));
    }

    const queryString = params.toString();
    const url = `/api/projects/${this.projectId}/devlogs${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<DevlogEntry[]>(url);
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
   * Batch add note to multiple devlogs
   */
  async batchAddNote(devlogIds: DevlogId[], noteData: BatchNoteRequest): Promise<any> {
    return apiClient.post<any>(`/api/projects/${this.projectId}/devlogs/batch/note`, {
      ids: devlogIds,
      content: noteData.content,
      category: noteData.category,
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
}
