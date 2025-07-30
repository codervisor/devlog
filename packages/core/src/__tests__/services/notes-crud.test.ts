import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { DevlogService, ProjectService } from '../../index.js';
import type { DevlogEntry } from '../../types/index.js';

describe('DevlogService - Note CRUD Operations', () => {
  let devlogService: DevlogService;
  let projectService: ProjectService;
  let testProject: any;
  let testDevlog: DevlogEntry;

  beforeEach(async () => {
    // Initialize services
    projectService = ProjectService.getInstance();

    // Create test project with unique name
    const uniqueName = `Test Project - Notes CRUD - ${Date.now()}`;
    testProject = await projectService.create({
      name: uniqueName,
      description: 'Test project for note CRUD operations',
    });

    devlogService = DevlogService.getInstance(testProject.id);

    // Create test devlog entry using the service's save method
    const testEntry: DevlogEntry = {
      title: 'Test Devlog for Notes',
      type: 'task',
      description: 'Test devlog entry for testing note CRUD operations',
      status: 'new',
      priority: 'medium',
      projectId: testProject.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
    };

    await devlogService.save(testEntry);
    const entries = await devlogService.list();
    testDevlog = entries.items[0];
  });

  afterEach(async () => {
    // Clean up - service should handle cascade deletion of notes
    if (testDevlog?.id) {
      try {
        await devlogService.delete(testDevlog.id);
      } catch (error) {
        // Ignore if already deleted
      }
    }
  });

  describe('addNote', () => {
    it('should add a note to a devlog entry', async () => {
      const noteData = {
        content: 'This is a test note',
        category: 'progress' as const,
        files: ['test-file.ts'],
        codeChanges: 'Added test functionality',
      };

      const note = await devlogService.addNote(testDevlog.id!, noteData);

      expect(note).toBeDefined();
      expect(note.id).toMatch(/^note-\d+-\d+-[a-z0-9]+$/);
      expect(note.content).toBe(noteData.content);
      expect(note.category).toBe(noteData.category);
      expect(note.files).toEqual(noteData.files);
      expect(note.codeChanges).toBe(noteData.codeChanges);
      expect(note.timestamp).toBeDefined();
    });

    it('should throw error for non-existent devlog', async () => {
      const noteData = {
        content: 'Test note',
        category: 'progress' as const,
      };

      await expect(devlogService.addNote(99999, noteData)).rejects.toThrow(
        "Devlog with ID '99999' not found",
      );
    });

    it('should handle minimal note data', async () => {
      const noteData = {
        content: 'Minimal note',
        category: 'idea' as const,
      };

      const note = await devlogService.addNote(testDevlog.id!, noteData);

      expect(note.content).toBe(noteData.content);
      expect(note.category).toBe(noteData.category);
      expect(note.files).toEqual([]);
      expect(note.codeChanges).toBeUndefined();
    });
  });

  describe('getNotes', () => {
    it('should return empty array for devlog with no notes', async () => {
      const notes = await devlogService.getNotes(testDevlog.id!);
      expect(notes).toEqual([]);
    });

    it('should return notes in reverse chronological order', async () => {
      // Add multiple notes with delays to ensure different timestamps
      const note1 = await devlogService.addNote(testDevlog.id!, {
        content: 'First note',
        category: 'progress',
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const note2 = await devlogService.addNote(testDevlog.id!, {
        content: 'Second note',
        category: 'issue',
      });

      const notes = await devlogService.getNotes(testDevlog.id!);

      expect(notes).toHaveLength(2);
      expect(notes[0].content).toBe('Second note'); // Most recent first
      expect(notes[1].content).toBe('First note');
    });

    it('should respect limit parameter', async () => {
      // Add 3 notes
      await devlogService.addNote(testDevlog.id!, { content: 'Note 1', category: 'progress' });
      await devlogService.addNote(testDevlog.id!, { content: 'Note 2', category: 'progress' });
      await devlogService.addNote(testDevlog.id!, { content: 'Note 3', category: 'progress' });

      const notes = await devlogService.getNotes(testDevlog.id!, 2);
      expect(notes).toHaveLength(2);
    });
  });

  describe('getNote', () => {
    it('should return specific note by ID', async () => {
      const addedNote = await devlogService.addNote(testDevlog.id!, {
        content: 'Specific note',
        category: 'solution',
        files: ['solution.ts'],
      });

      const retrievedNote = await devlogService.getNote(addedNote.id);

      expect(retrievedNote).toBeDefined();
      expect(retrievedNote!.id).toBe(addedNote.id);
      expect(retrievedNote!.content).toBe(addedNote.content);
      expect(retrievedNote!.category).toBe(addedNote.category);
      expect(retrievedNote!.files).toEqual(addedNote.files);
    });

    it('should return null for non-existent note', async () => {
      const note = await devlogService.getNote('non-existent-note-id');
      expect(note).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('should update note content', async () => {
      const originalNote = await devlogService.addNote(testDevlog.id!, {
        content: 'Original content',
        category: 'progress',
      });

      const updatedNote = await devlogService.updateNote(originalNote.id, {
        content: 'Updated content',
      });

      expect(updatedNote.content).toBe('Updated content');
      expect(updatedNote.category).toBe('progress'); // Unchanged
      expect(updatedNote.id).toBe(originalNote.id);
      expect(updatedNote.timestamp).toBe(originalNote.timestamp); // Should not change
    });

    it('should update multiple fields', async () => {
      const originalNote = await devlogService.addNote(testDevlog.id!, {
        content: 'Original content',
        category: 'progress',
        files: ['old-file.ts'],
      });

      const updatedNote = await devlogService.updateNote(originalNote.id, {
        content: 'New content',
        category: 'solution',
        files: ['new-file.ts', 'another-file.ts'],
        codeChanges: 'Refactored implementation',
      });

      expect(updatedNote.content).toBe('New content');
      expect(updatedNote.category).toBe('solution');
      expect(updatedNote.files).toEqual(['new-file.ts', 'another-file.ts']);
      expect(updatedNote.codeChanges).toBe('Refactored implementation');
    });

    it('should throw error for non-existent note', async () => {
      await expect(
        devlogService.updateNote('non-existent-note-id', { content: 'New content' }),
      ).rejects.toThrow("Note with ID 'non-existent-note-id' not found");
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      const note = await devlogService.addNote(testDevlog.id!, {
        content: 'Note to delete',
        category: 'progress',
      });

      await devlogService.deleteNote(note.id);

      const retrievedNote = await devlogService.getNote(note.id);
      expect(retrievedNote).toBeNull();
    });

    it('should throw error for non-existent note', async () => {
      await expect(devlogService.deleteNote('non-existent-note-id')).rejects.toThrow(
        "Note with ID 'non-existent-note-id' not found",
      );
    });

    it('should not affect other notes', async () => {
      const note1 = await devlogService.addNote(testDevlog.id!, {
        content: 'Note 1',
        category: 'progress',
      });
      const note2 = await devlogService.addNote(testDevlog.id!, {
        content: 'Note 2',
        category: 'progress',
      });

      await devlogService.deleteNote(note1.id);

      const remainingNotes = await devlogService.getNotes(testDevlog.id!);
      expect(remainingNotes).toHaveLength(1);
      expect(remainingNotes[0].id).toBe(note2.id);
    });
  });

  describe('integration with devlog operations', () => {
    it('should load notes when getting devlog with includeNotes=true', async () => {
      // Add some notes
      await devlogService.addNote(testDevlog.id!, {
        content: 'Integration test note 1',
        category: 'progress',
      });
      await devlogService.addNote(testDevlog.id!, {
        content: 'Integration test note 2',
        category: 'issue',
      });

      const devlogWithNotes = await devlogService.get(testDevlog.id!, true);
      expect(devlogWithNotes!.notes).toHaveLength(2);
      expect(devlogWithNotes!.notes![0].content).toBe('Integration test note 2'); // Most recent first
    });

    it('should not load notes when getting devlog with includeNotes=false', async () => {
      await devlogService.addNote(testDevlog.id!, {
        content: 'Should not be loaded',
        category: 'progress',
      });

      const devlogWithoutNotes = await devlogService.get(testDevlog.id!, false);
      expect(devlogWithoutNotes!.notes).toEqual([]);
    });

    it('should cascade delete notes when devlog is deleted', async () => {
      const note = await devlogService.addNote(testDevlog.id!, {
        content: 'Will be cascade deleted',
        category: 'progress',
      });

      await devlogService.delete(testDevlog.id!);

      const retrievedNote = await devlogService.getNote(note.id);
      expect(retrievedNote).toBeNull();

      // Mark testDevlog as deleted so cleanup doesn't try to delete again
      testDevlog.id = undefined;
    });
  });
});
