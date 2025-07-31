import { describe, beforeEach, afterEach, it, expect, beforeAll, afterAll } from 'vitest';
import type { DevlogEntry } from '../../types/index.js';
import {
  createIsolatedTestEnvironment,
  type IsolatedTestEnvironment,
} from '../utils/isolated-services.js';
import { createTestProject, createTestDevlog } from '../utils/test-env.js';

// Skipped as SQLite is not fully implemented and tested yet
describe.skip('DevlogService - Note CRUD Operations', () => {
  let testEnv: IsolatedTestEnvironment;
  let testProject: any;
  let testDevlog: DevlogEntry;

  beforeAll(async () => {
    // Create isolated test environment
    testEnv = await createIsolatedTestEnvironment('notes-crud-test');
  });

  afterAll(async () => {
    // Clean up test environment
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Create test project using isolated service
    const projectEntity = await createTestProject(testEnv.database, {
      name: `Test Project - Notes CRUD - ${Date.now()}`,
      description: 'Test project for note CRUD operations',
    });

    testProject = {
      id: projectEntity.id,
      name: projectEntity.name,
      description: projectEntity.description,
    };

    // Create test devlog entry using isolated service
    const devlogEntity = await createTestDevlog(testEnv.database, testProject.id, {
      title: 'Test Devlog for Notes',
      description: 'Test devlog entry for testing note CRUD operations',
    });

    testDevlog = {
      id: devlogEntity.id,
      title: devlogEntity.title,
      type: devlogEntity.type,
      description: devlogEntity.description,
      status: devlogEntity.status,
      priority: devlogEntity.priority,
      projectId: devlogEntity.projectId,
      createdAt: devlogEntity.createdAt.toISOString(),
      updatedAt: devlogEntity.updatedAt.toISOString(),
      notes: [],
    };
  });

  afterEach(async () => {
    // Clear test data between tests (but keep the isolated database)
    const { clearTestDatabase } = await import('../utils/test-env.js');
    await clearTestDatabase(testEnv.database);
  });

  describe('addNote', () => {
    it('should add a note to a devlog entry', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
      const noteData = {
        content: 'This is a test note',
        category: 'progress' as const,
      };

      const note = await devlogService.addNote(testDevlog.id!, noteData);

      expect(note).toBeDefined();
      expect(note.id).toMatch(/^note-\d+-\d+-[a-z0-9]+$/);
      expect(note.content).toBe(noteData.content);
      expect(note.category).toBe(noteData.category);
      expect(note.timestamp).toBeDefined();
    });

    it('should throw error for non-existent devlog', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
      const noteData = {
        content: 'Test note',
        category: 'progress' as const,
      };

      await expect(devlogService.addNote(99999, noteData)).rejects.toThrow(
        "Devlog with ID '99999' not found",
      );
    });

    it('should handle minimal note data', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
      const noteData = {
        content: 'Minimal note',
        category: 'idea' as const,
      };

      const note = await devlogService.addNote(testDevlog.id!, noteData);

      expect(note.content).toBe(noteData.content);
      expect(note.category).toBe(noteData.category);
    });
  });

  describe('getNotes', () => {
    it('should return empty array for devlog with no notes', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
      const notes = await devlogService.getNotes(testDevlog.id!);
      expect(notes).toEqual([]);
    });

    it('should return notes in reverse chronological order', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
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
      const devlogService = testEnv.devlogService(testProject.id);
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
      const devlogService = testEnv.devlogService(testProject.id);
      const addedNote = await devlogService.addNote(testDevlog.id!, {
        content: 'Specific note',
        category: 'solution',
      });

      const retrievedNote = await devlogService.getNote(addedNote.id);

      expect(retrievedNote).toBeDefined();
      expect(retrievedNote!.id).toBe(addedNote.id);
      expect(retrievedNote!.content).toBe(addedNote.content);
      expect(retrievedNote!.category).toBe(addedNote.category);
    });

    it('should return null for non-existent note', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
      const note = await devlogService.getNote('non-existent-note-id');
      expect(note).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('should update note content', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
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
      const devlogService = testEnv.devlogService(testProject.id);
      const originalNote = await devlogService.addNote(testDevlog.id!, {
        content: 'Original content',
        category: 'progress',
      });

      const updatedNote = await devlogService.updateNote(originalNote.id, {
        content: 'New content',
        category: 'solution',
      });

      expect(updatedNote.content).toBe('New content');
      expect(updatedNote.category).toBe('solution');
    });

    it('should throw error for non-existent note', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
      await expect(
        devlogService.updateNote('non-existent-note-id', { content: 'New content' }),
      ).rejects.toThrow("Note with ID 'non-existent-note-id' not found");
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
      const note = await devlogService.addNote(testDevlog.id!, {
        content: 'Note to delete',
        category: 'progress',
      });

      await devlogService.deleteNote(note.id);

      const retrievedNote = await devlogService.getNote(note.id);
      expect(retrievedNote).toBeNull();
    });

    it('should throw error for non-existent note', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
      await expect(devlogService.deleteNote('non-existent-note-id')).rejects.toThrow(
        "Note with ID 'non-existent-note-id' not found",
      );
    });

    it('should not affect other notes', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
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
      const devlogService = testEnv.devlogService(testProject.id);
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
      const devlogService = testEnv.devlogService(testProject.id);
      await devlogService.addNote(testDevlog.id!, {
        content: 'Should not be loaded',
        category: 'progress',
      });

      const devlogWithoutNotes = await devlogService.get(testDevlog.id!, false);
      expect(devlogWithoutNotes!.notes).toEqual([]);
    });

    it('should cascade delete notes when devlog is deleted', async () => {
      const devlogService = testEnv.devlogService(testProject.id);
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
