import type { DevlogNote, DevlogNoteCategory } from '@codervisor/devlog-core';
import { apiClient } from './api-client';

export interface CreateNoteRequest {
  content: string;
  category?: DevlogNoteCategory;
}

export interface UpdateNoteRequest {
  content?: string;
  category?: DevlogNoteCategory;
}

export class NoteApiClient {
  constructor(private projectName: string) {}

  /**
   * Add a note to a devlog
   */
  async addNote(devlogId: string, data: CreateNoteRequest): Promise<DevlogNote> {
    return apiClient.post<DevlogNote>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes`,
      data,
    );
  }

  /**
   * Get a specific note by ID
   */
  async getNote(devlogId: string, noteId: string): Promise<DevlogNote> {
    return apiClient.get<DevlogNote>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes/${noteId}`,
    );
  }

  /**
   * Update a specific note
   */
  async updateNote(devlogId: string, noteId: string, data: UpdateNoteRequest): Promise<DevlogNote> {
    return apiClient.put<DevlogNote>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes/${noteId}`,
      data,
    );
  }

  /**
   * Delete a specific note
   */
  async deleteNote(devlogId: string, noteId: string): Promise<void> {
    return apiClient.delete<void>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes/${noteId}`,
    );
  }

  /**
   * Get all notes for a devlog
   */
  async getNotes(devlogId: string, limit?: number): Promise<DevlogNote[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get<{ devlogId: number; total: number; notes: DevlogNote[] }>(
      `/api/projects/${this.projectName}/devlogs/${devlogId}/notes${params}`,
    );
    return response.notes;
  }
}
