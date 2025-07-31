'use client';

import { useState, useCallback, useMemo } from 'react';
import { DevlogNote, NoteCategory } from '@codervisor/devlog-core';
import { NoteApiClient, CreateNoteRequest, UpdateNoteRequest } from '@/lib';
import { useProject } from '@/contexts/ProjectContext';

export interface UseNotesOptions {
  devlogId: string;
  initialNotes?: DevlogNote[];
  onNoteAdded?: (note: DevlogNote) => void;
  onNoteUpdated?: (note: DevlogNote) => void;
  onNoteDeleted?: (noteId: string) => void;
}

export interface UseNotesReturn {
  notes: DevlogNote[];
  loading: boolean;
  error: string | null;

  // Actions
  addNote: (data: CreateNoteRequest) => Promise<DevlogNote>;
  updateNote: (noteId: string, data: UpdateNoteRequest) => Promise<DevlogNote>;
  deleteNote: (noteId: string) => Promise<void>;
  refreshNotes: () => Promise<void>;

  // State management
  clearError: () => void;
}

export function useNotes({
  devlogId,
  initialNotes = [],
  onNoteAdded,
  onNoteUpdated,
  onNoteDeleted,
}: UseNotesOptions): UseNotesReturn {
  const { currentProject } = useProject();
  const [notes, setNotes] = useState<DevlogNote[]>(initialNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create API client
  const apiClient = useMemo(() => {
    return currentProject ? new NoteApiClient(currentProject.projectId.toString()) : null;
  }, [currentProject]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshNotes = useCallback(async () => {
    if (!apiClient) return;

    try {
      setLoading(true);
      setError(null);
      const fetchedNotes = await apiClient.getNotes(devlogId);
      setNotes(fetchedNotes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh notes';
      setError(errorMessage);
      console.error('Failed to refresh notes:', err);
    } finally {
      setLoading(false);
    }
  }, [apiClient, devlogId]);

  const addNote = useCallback(
    async (data: CreateNoteRequest): Promise<DevlogNote> => {
      if (!apiClient) {
        throw new Error('No project selected');
      }

      try {
        setLoading(true);
        setError(null);

        const newNote = await apiClient.addNote(devlogId, data);

        // Optimistically update local state
        setNotes((prevNotes) => [newNote, ...prevNotes]);

        // Notify parent component
        onNoteAdded?.(newNote);

        return newNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add note';
        setError(errorMessage);
        console.error('Failed to add note:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, devlogId, onNoteAdded],
  );

  const updateNote = useCallback(
    async (noteId: string, data: UpdateNoteRequest): Promise<DevlogNote> => {
      if (!apiClient) {
        throw new Error('No project selected');
      }

      try {
        setLoading(true);
        setError(null);

        const updatedNote = await apiClient.updateNote(devlogId, noteId, data);

        // Optimistically update local state
        setNotes((prevNotes) => prevNotes.map((note) => (note.id === noteId ? updatedNote : note)));

        // Notify parent component
        onNoteUpdated?.(updatedNote);

        return updatedNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
        setError(errorMessage);
        console.error('Failed to update note:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, devlogId, onNoteUpdated],
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<void> => {
      if (!apiClient) {
        throw new Error('No project selected');
      }

      try {
        setLoading(true);
        setError(null);

        await apiClient.deleteNote(devlogId, noteId);

        // Optimistically update local state
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));

        // Notify parent component
        onNoteDeleted?.(noteId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
        setError(errorMessage);
        console.error('Failed to delete note:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, devlogId, onNoteDeleted],
  );

  return {
    notes,
    loading,
    error,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes,
    clearError,
  };
}
