import type { DevlogNote, NoteCategory } from '@codervisor/devlog-core';

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
    const response = await fetch(`/api/projects/${this.projectId}/devlogs/${devlogId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add note: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get a specific note by ID
   */
  async getNote(devlogId: string, noteId: string): Promise<DevlogNote> {
    const response = await fetch(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Note not found');
      }
      const error = await response.text();
      throw new Error(`Failed to get note: ${error}`);
    }

    return await response.json();
  }

  /**
   * Update a specific note
   */
  async updateNote(devlogId: string, noteId: string, data: UpdateNoteRequest): Promise<DevlogNote> {
    const response = await fetch(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Note not found');
      }
      const error = await response.text();
      throw new Error(`Failed to update note: ${error}`);
    }

    return await response.json();
  }

  /**
   * Delete a specific note
   */
  async deleteNote(devlogId: string, noteId: string): Promise<void> {
    const response = await fetch(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes/${noteId}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Note not found');
      }
      const error = await response.text();
      throw new Error(`Failed to delete note: ${error}`);
    }
  }

  /**
   * Get all notes for a devlog
   */
  async getNotes(devlogId: string, limit?: number): Promise<DevlogNote[]> {
    const url = new URL(
      `/api/projects/${this.projectId}/devlogs/${devlogId}/notes`,
      window.location.origin,
    );
    if (limit) {
      url.searchParams.set('limit', limit.toString());
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get notes: ${error}`);
    }

    return await response.json();
  }

  /**
   * Batch add notes to multiple devlogs
   */
  async batchAddNote(devlogIds: string[], content: string, category?: NoteCategory): Promise<any> {
    const response = await fetch(`/api/projects/${this.projectId}/devlogs/batch/note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: devlogIds, content, category }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to batch add notes: ${error}`);
    }

    return await response.json();
  }
}
