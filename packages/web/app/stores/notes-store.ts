'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { DevlogNote, NoteCategory } from '@codervisor/devlog-core';
import { NoteApiClient, CreateNoteRequest, UpdateNoteRequest } from '@/lib';
import { useProjectStore } from './project-store';

// Helper function to get NoteApiClient
const getNoteApiClient = () => {
  const currentProject = useProjectStore.getState().currentProject;
  return currentProject ? new NoteApiClient(currentProject.projectId.toString()) : null;
};

interface NotesState {
  // Notes state by devlog ID
  notesByDevlog: Record<string, DevlogNote[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Actions
  setNotes: (devlogId: string, notes: DevlogNote[]) => void;
  refreshNotes: (devlogId: string) => Promise<void>;
  addNote: (devlogId: string, data: CreateNoteRequest) => Promise<DevlogNote>;
  updateNote: (devlogId: string, noteId: string, data: UpdateNoteRequest) => Promise<DevlogNote>;
  deleteNote: (devlogId: string, noteId: string) => Promise<void>;
  clearError: (devlogId: string) => void;
  clearAllErrors: () => void;

  // Real-time event handlers
  handleNoteCreated: (devlogId: string, note: DevlogNote) => void;
  handleNoteUpdated: (devlogId: string, note: DevlogNote) => void;
  handleNoteDeleted: (devlogId: string, noteId: string) => void;
}

export const useNotesStore = create<NotesState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    notesByDevlog: {},
    loading: {},
    errors: {},

    // Actions
    setNotes: (devlogId: string, notes: DevlogNote[]) => {
      set((state) => ({
        notesByDevlog: {
          ...state.notesByDevlog,
          [devlogId]: notes,
        },
      }));
    },

    refreshNotes: async (devlogId: string) => {
      const apiClient = getNoteApiClient();
      if (!apiClient) return;

      try {
        set((state) => ({
          loading: { ...state.loading, [devlogId]: true },
          errors: { ...state.errors, [devlogId]: null },
        }));

        const notes = await apiClient.getNotes(devlogId);

        set((state) => ({
          notesByDevlog: {
            ...state.notesByDevlog,
            [devlogId]: notes,
          },
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to refresh notes';
        set((state) => ({
          errors: { ...state.errors, [devlogId]: errorMessage },
        }));
        console.error('Failed to refresh notes:', err);
      } finally {
        set((state) => ({
          loading: { ...state.loading, [devlogId]: false },
        }));
      }
    },

    addNote: async (devlogId: string, data: CreateNoteRequest): Promise<DevlogNote> => {
      const apiClient = getNoteApiClient();
      if (!apiClient) {
        throw new Error('No project selected');
      }

      try {
        set((state) => ({
          loading: { ...state.loading, [devlogId]: true },
          errors: { ...state.errors, [devlogId]: null },
        }));

        const newNote = await apiClient.addNote(devlogId, data);

        // Optimistically update local state
        set((state) => ({
          notesByDevlog: {
            ...state.notesByDevlog,
            [devlogId]: [newNote, ...(state.notesByDevlog[devlogId] || [])],
          },
        }));

        return newNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add note';
        set((state) => ({
          errors: { ...state.errors, [devlogId]: errorMessage },
        }));
        console.error('Failed to add note:', err);
        throw err;
      } finally {
        set((state) => ({
          loading: { ...state.loading, [devlogId]: false },
        }));
      }
    },

    updateNote: async (
      devlogId: string,
      noteId: string,
      data: UpdateNoteRequest,
    ): Promise<DevlogNote> => {
      const apiClient = getNoteApiClient();
      if (!apiClient) {
        throw new Error('No project selected');
      }

      try {
        set((state) => ({
          loading: { ...state.loading, [devlogId]: true },
          errors: { ...state.errors, [devlogId]: null },
        }));

        const updatedNote = await apiClient.updateNote(devlogId, noteId, data);

        // Optimistically update local state
        set((state) => {
          const currentNotes = state.notesByDevlog[devlogId] || [];
          const updatedNotes = currentNotes.map((note) =>
            note.id === noteId ? updatedNote : note,
          );

          return {
            notesByDevlog: {
              ...state.notesByDevlog,
              [devlogId]: updatedNotes,
            },
          };
        });

        return updatedNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
        set((state) => ({
          errors: { ...state.errors, [devlogId]: errorMessage },
        }));
        console.error('Failed to update note:', err);
        throw err;
      } finally {
        set((state) => ({
          loading: { ...state.loading, [devlogId]: false },
        }));
      }
    },

    deleteNote: async (devlogId: string, noteId: string): Promise<void> => {
      const apiClient = getNoteApiClient();
      if (!apiClient) {
        throw new Error('No project selected');
      }

      try {
        set((state) => ({
          loading: { ...state.loading, [devlogId]: true },
          errors: { ...state.errors, [devlogId]: null },
        }));

        await apiClient.deleteNote(devlogId, noteId);

        // Optimistically update local state
        set((state) => {
          const currentNotes = state.notesByDevlog[devlogId] || [];
          const filteredNotes = currentNotes.filter((note) => note.id !== noteId);

          return {
            notesByDevlog: {
              ...state.notesByDevlog,
              [devlogId]: filteredNotes,
            },
          };
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
        set((state) => ({
          errors: { ...state.errors, [devlogId]: errorMessage },
        }));
        console.error('Failed to delete note:', err);
        throw err;
      } finally {
        set((state) => ({
          loading: { ...state.loading, [devlogId]: false },
        }));
      }
    },

    clearError: (devlogId: string) => {
      set((state) => ({
        errors: { ...state.errors, [devlogId]: null },
      }));
    },

    clearAllErrors: () => {
      set({ errors: {} });
    },

    // Real-time event handlers
    handleNoteCreated: (devlogId: string, note: DevlogNote) => {
      set((state) => ({
        notesByDevlog: {
          ...state.notesByDevlog,
          [devlogId]: [note, ...(state.notesByDevlog[devlogId] || [])],
        },
      }));
    },

    handleNoteUpdated: (devlogId: string, note: DevlogNote) => {
      set((state) => {
        const currentNotes = state.notesByDevlog[devlogId] || [];
        const updatedNotes = currentNotes.map((existingNote) =>
          existingNote.id === note.id ? note : existingNote,
        );

        return {
          notesByDevlog: {
            ...state.notesByDevlog,
            [devlogId]: updatedNotes,
          },
        };
      });
    },

    handleNoteDeleted: (devlogId: string, noteId: string) => {
      set((state) => {
        const currentNotes = state.notesByDevlog[devlogId] || [];
        const filteredNotes = currentNotes.filter((note) => note.id !== noteId);

        return {
          notesByDevlog: {
            ...state.notesByDevlog,
            [devlogId]: filteredNotes,
          },
        };
      });
    },
  })),
);

// Hook to get notes for a specific devlog (replaces useNotes hook)
export const useDevlogNotes = (devlogId: string) => {
  const notes = useNotesStore((state) => state.notesByDevlog[devlogId] || []);
  const loading = useNotesStore((state) => state.loading[devlogId] || false);
  const error = useNotesStore((state) => state.errors[devlogId] || null);

  const { refreshNotes, addNote, updateNote, deleteNote, clearError } = useNotesStore();

  return {
    notes,
    loading,
    error,
    refreshNotes: () => refreshNotes(devlogId),
    addNote: (data: CreateNoteRequest) => addNote(devlogId, data),
    updateNote: (noteId: string, data: UpdateNoteRequest) => updateNote(devlogId, noteId, data),
    deleteNote: (noteId: string) => deleteNote(devlogId, noteId),
    clearError: () => clearError(devlogId),
  };
};
