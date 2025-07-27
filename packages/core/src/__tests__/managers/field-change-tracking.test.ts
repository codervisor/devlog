/**
 * Test the comprehensive field change tracking system
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { WorkspaceDevlogManager } from '../../../src/managers/devlog/workspace-devlog-manager.js';
import type {
  CreateDevlogRequest,
  UpdateDevlogRequest,
  ChangeTrackingMetadata,
} from '../../../src/types/index.js';

describe('Comprehensive Field Change Tracking', () => {
  let manager: WorkspaceDevlogManager;

  beforeEach(async () => {
    manager = new WorkspaceDevlogManager({
      fallbackToEnvConfig: true,
    });
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  it('should track title changes with source attribution', async () => {
    // Create a test devlog entry
    const createRequest: CreateDevlogRequest = {
      title: 'Original Title',
      type: 'feature',
      description: 'Original description',
    };

    const entry = await manager.createDevlog(createRequest);
    const originalNotesCount = entry.notes?.length || 0;

    // Update the title with change tracking
    const updateRequest: UpdateDevlogRequest = {
      id: entry.id!,
      title: 'Updated Title',
      _changeSource: 'ai-agent',
      _changeReason: 'Improved clarity based on requirements analysis',
      _sourceDetails: 'Claude via MCP',
    };

    const updatedEntry = await manager.updateDevlog(entry.id!, updateRequest);

    // Verify the title was updated
    expect(updatedEntry.title).toBe('Updated Title');

    // Verify a change tracking note was created
    expect(updatedEntry.notes).toHaveLength(originalNotesCount + 1);

    const changeNote = updatedEntry.notes![updatedEntry.notes!.length - 1];
    expect(changeNote.category).toBe('progress');
    expect(changeNote.content).toContain('Field Changes');
    expect(changeNote.content).toContain('Title');
    expect(changeNote.content).toContain('Original Title');
    expect(changeNote.content).toContain('Updated Title');
    expect(changeNote.content).toContain('Improved clarity based on requirements analysis');
    expect(changeNote.content).toContain('Claude via MCP');

    // Verify change metadata
    const metadata = changeNote.metadata as ChangeTrackingMetadata;
    expect(metadata.changeSource).toBe('ai-agent');
    expect(metadata.changeReason).toBe('Improved clarity based on requirements analysis');
    expect(metadata.fieldChanges).toHaveLength(1);
    expect(metadata.fieldChanges![0].fieldName).toBe('title');
    expect(metadata.fieldChanges![0].previousValue).toBe('Original Title');
    expect(metadata.fieldChanges![0].newValue).toBe('Updated Title');
  });

  it('should track multiple field changes in bulk update', async () => {
    // Create a test devlog entry
    const createRequest: CreateDevlogRequest = {
      title: 'Test Entry',
      type: 'task',
      description: 'Original description',
      priority: 'medium',
    };

    const entry = await manager.createDevlog(createRequest);
    const originalNotesCount = entry.notes?.length || 0;

    // Update multiple fields at once
    const updateRequest: UpdateDevlogRequest = {
      id: entry.id!,
      title: 'Updated Test Entry',
      description: 'Updated description with more details',
      priority: 'high',
      status: 'in-progress',
      _changeSource: 'user',
      _changeReason: 'Refinement after stakeholder feedback',
    };

    const updatedEntry = await manager.updateDevlog(entry.id!, updateRequest);

    // Verify all fields were updated
    expect(updatedEntry.title).toBe('Updated Test Entry');
    expect(updatedEntry.description).toBe('Updated description with more details');
    expect(updatedEntry.priority).toBe('high');
    expect(updatedEntry.status).toBe('in-progress');

    // Verify a change tracking note was created
    expect(updatedEntry.notes).toHaveLength(originalNotesCount + 1);

    const changeNote = updatedEntry.notes![updatedEntry.notes!.length - 1];
    expect(changeNote.content).toContain('Field Changes');
    expect(changeNote.content).toContain('Title');
    expect(changeNote.content).toContain('Priority');
    expect(changeNote.content).toContain('Status');
    expect(changeNote.content).toContain('Description');

    // Verify it's categorized as a bulk update
    const metadata = changeNote.metadata as ChangeTrackingMetadata;
    expect(metadata.changeRecord!.changeType).toBe('bulk-update');
    expect(metadata.fieldChanges).toHaveLength(4); // title, description, priority, status
  });

  it('should track status transitions specially', async () => {
    // Create a test devlog entry
    const createRequest: CreateDevlogRequest = {
      title: 'Status Test',
      type: 'bugfix',
      description: 'Testing status transitions',
    };

    const entry = await manager.createDevlog(createRequest);

    // Update only the status
    const updateRequest: UpdateDevlogRequest = {
      id: entry.id!,
      status: 'done',
      _changeSource: 'system',
      _changeReason: 'Automatically marked complete after successful testing',
    };

    const updatedEntry = await manager.updateDevlog(entry.id!, updateRequest);

    // Verify status was updated and closedAt was set
    expect(updatedEntry.status).toBe('done');
    expect(updatedEntry.closedAt).toBeDefined();

    // Verify change tracking note categorizes this as status-transition
    const changeNote = updatedEntry.notes![updatedEntry.notes!.length - 1];
    const metadata = changeNote.metadata as ChangeTrackingMetadata;
    expect(metadata.changeRecord!.changeType).toBe('status-transition');
  });

  it('should allow disabling change tracking for specific updates', async () => {
    // Create a test devlog entry
    const createRequest: CreateDevlogRequest = {
      title: 'No Tracking Test',
      type: 'task',
      description: 'Testing disabled tracking',
    };

    const entry = await manager.createDevlog(createRequest);
    const originalNotesCount = entry.notes?.length || 0;

    // Update with tracking disabled
    const updateRequest: UpdateDevlogRequest = {
      id: entry.id!,
      title: 'Updated Without Tracking',
      _trackChanges: false,
    };

    const updatedEntry = await manager.updateDevlog(entry.id!, updateRequest);

    // Verify the title was updated
    expect(updatedEntry.title).toBe('Updated Without Tracking');

    // Verify no change tracking note was created (notes count should be the same)
    expect(updatedEntry.notes).toHaveLength(originalNotesCount);
  });

  it('should track acceptance criteria changes uniformly with other fields', async () => {
    // Create a test devlog entry
    const createRequest: CreateDevlogRequest = {
      title: 'AC Tracking Test',
      type: 'feature',
      description: 'Testing unified AC tracking',
      acceptanceCriteria: ['Initial criterion 1', 'Initial criterion 2'],
    };

    const entry = await manager.createDevlog(createRequest);
    const originalNotesCount = entry.notes?.length || 0;

    // Update acceptance criteria
    const updateRequest: UpdateDevlogRequest = {
      id: entry.id!,
      acceptanceCriteria: ['Initial criterion 1', 'Updated criterion 2', 'New criterion 3'],
      _changeSource: 'user',
      _changeReason: 'Refined requirements after stakeholder review',
    };

    const updatedEntry = await manager.updateDevlog(entry.id!, updateRequest);

    // Verify acceptance criteria were updated
    expect(updatedEntry.acceptanceCriteria).toEqual([
      'Initial criterion 1',
      'Updated criterion 2',
      'New criterion 3',
    ]);

    // Verify a change tracking note was created (unified with other fields)
    expect(updatedEntry.notes).toHaveLength(originalNotesCount + 1);

    const changeNote = updatedEntry.notes![updatedEntry.notes!.length - 1];
    expect(changeNote.category).toBe('progress'); // Same as other field changes
    expect(changeNote.content).toContain('Field Changes');
    expect(changeNote.content).toContain('Acceptance Criteria');
    expect(changeNote.content).toContain('Added:');
    expect(changeNote.content).toContain('+ Updated criterion 2');
    expect(changeNote.content).toContain('+ New criterion 3');
    expect(changeNote.content).toContain('Removed:');
    expect(changeNote.content).toContain('- Initial criterion 2');

    // Verify unified change metadata structure
    const metadata = changeNote.metadata as ChangeTrackingMetadata;
    expect(metadata.changeSource).toBe('user');
    expect(metadata.changeReason).toBe('Refined requirements after stakeholder review');
    expect(metadata.fieldChanges).toHaveLength(1);
    expect(metadata.fieldChanges![0].fieldName).toBe('acceptanceCriteria');
    expect(metadata.fieldChanges![0].category).toBe('criteria');
    expect(metadata.fieldChanges![0].changeType).toBe('modified');
  });
});
