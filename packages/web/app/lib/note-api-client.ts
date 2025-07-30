import type { DevlogNote, NoteCategory } from '@codervisor/devlog-core';
import { apiClient } from './api-client';

export interface CreateNoteRequest {
  content: string;
  category?: NoteCategory;
}

export interface UpdateNoteRequest {
  content?: string;
  category?: NoteCategory;
}

export class NoteApiClient {
  constructor(private projectId: string) {}

  /**
   * Add a note to a devlog
   */
  async addNote(devlogId: string, data: CreateNoteRequest): Promise<DevlogNote> {
    return apiClient.post<DevlogNote>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes`,
      data,
    );
  }

  /**
   * Get a specific note by ID
   */
  async getNote(devlogId: string, noteId: string): Promise<DevlogNote> {
    return apiClient.get<DevlogNote>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
    );
  }

  /**
   * Update a specific note
   */
  async updateNote(devlogId: string, noteId: string, data: UpdateNoteRequest): Promise<DevlogNote> {
    return apiClient.put<DevlogNote>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
      data,
    );
  }

  /**
   * Delete a specific note
   */
  async deleteNote(devlogId: string, noteId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
    );
  }

  /**
   * Get all notes for a devlog
   */
  async getNotes(devlogId: string, limit?: number): Promise<DevlogNote[]> {
    const params = limit ? `?limit=${limit}` : '';
    return apiClient.get<DevlogNote[]>(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes${params}`,
    );
  }

  /**
   * Batch add notes to multiple devlogs
   */
  async batchAddNote(devlogIds: string[], content: string, category?: NoteCategory): Promise<any> {
    return apiClient.post<any>(`/api/projects/${this.projectId}/devlogs/batch/note`, {
      ids: devlogIds,
      content,
      category,
    });
  }
}
