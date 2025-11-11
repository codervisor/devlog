'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { useDevlogStore, useProjectStore } from '@/stores';
import { useDevlogEvents, useNoteEvents } from '@/hooks/use-realtime';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SaveIcon, TrashIcon, UndoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useProjectName } from '@/components/provider/project-provider';
import { useDevlogId } from '@/components/provider/devlog-provider';
import { DevlogDetails } from '@/components/project-management/devlog/devlog-details';

export function DevlogDetailsPage() {
  const projectName = useProjectName();
  const devlogId = useDevlogId();
  const router = useRouter();

  const { setCurrentProjectName } = useProjectStore();

  const {
    currentDevlogId,
    setCurrentDevlogId,
    currentDevlogContext,
    currentDevlogNotesContext,
    fetchCurrentDevlog,
    fetchCurrentDevlogNotes,
    updateSelectedDevlog,
    deleteDevlog,
    clearCurrentDevlog,
  } = useDevlogStore();

  const { onDevlogUpdated, onDevlogDeleted } = useDevlogEvents();
  const { onNoteCreated, onNoteUpdated, onNoteDeleted } = useNoteEvents();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Use refs to store function references to avoid recreation on every render
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const discardHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribeUpdated = onDevlogUpdated((devlog: DevlogEntry) => {
      if (devlog.id === currentDevlogId) {
        fetchCurrentDevlog();
      }
    });

    const unsubscribeDeleted = onDevlogDeleted(({ id }: { id: number }) => {
      if (id === currentDevlogId) {
        router.push(`/projects/${projectName}/devlogs`);
      }
    });

    // Subscribe to note events
    const unsubscribeNoteCreated = onNoteCreated(fetchCurrentDevlogNotes);
    const unsubscribeNoteUpdated = onNoteUpdated(fetchCurrentDevlogNotes);
    const unsubscribeNoteDeleted = onNoteDeleted(fetchCurrentDevlogNotes);

    return () => {
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeNoteCreated();
      unsubscribeNoteUpdated();
      unsubscribeNoteDeleted();
    };
  }, [
    currentDevlogId,
    fetchCurrentDevlog,
    fetchCurrentDevlogNotes,
    onDevlogUpdated,
    onDevlogDeleted,
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
    router,
    projectName,
  ]);

  useEffect(() => {
    setCurrentProjectName(projectName);
  }, [projectName]);

  useEffect(() => {
    setCurrentDevlogId(devlogId);
  }, [devlogId]);

  // Fetch the devlog when currentDevlogId changes
  useEffect(() => {
    if (!currentDevlogId) return;

    try {
      fetchCurrentDevlog();
      fetchCurrentDevlogNotes();
    } catch (error) {
      console.warn('Failed to fetch work item:', error);
    }

    // Clear selected devlog when component unmounts
    return () => {
      clearCurrentDevlog();
    };
  }, [currentDevlogId]);

  const handleUpdate = async (data: any) => {
    try {
      setIsSaving(true);
      await updateSelectedDevlog({ ...data, id: devlogId });
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Failed to update work item:', error);
      throw error; // Re-throw so the component can handle the error
    } finally {
      setIsSaving(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleUnsavedChangesChange = useCallback(
    (hasChanges: boolean, save: () => Promise<void>, discard: () => void) => {
      setHasUnsavedChanges(hasChanges);
      saveHandlerRef.current = save;
      discardHandlerRef.current = discard;
    },
    [],
  );

  const handleDelete = async () => {
    try {
      // Delete the devlog (this will also clear selected devlog via context)
      await deleteDevlog(devlogId);

      router.push(`/projects/${projectName}/devlogs`);
    } catch (error) {
      console.error('Failed to delete work item:', error);
      toast.error('Failed to delete work item');
    }
  };

  const handleBack = () => {
    router.push(`/projects/${projectName}/devlogs`);
  };

  const actions = (
    <div className="flex flex-col gap-2 w-full">
      {hasUnsavedChanges && (
        <>
          <Button
            variant="outline"
            onClick={() => discardHandlerRef.current?.()}
            disabled={isSaving}
            className="flex items-center gap-2 w-full justify-start"
          >
            <UndoIcon size={16} />
            Discard Changes
          </Button>
          <Button
            onClick={() => saveHandlerRef.current?.()}
            disabled={isSaving}
            className="flex items-center gap-2 w-full justify-start"
          >
            <SaveIcon size={16} />
            Save Changes
          </Button>
        </>
      )}
      <Button
        variant="outline"
        onClick={handleBack}
        className="flex items-center gap-2 w-full justify-start"
      >
        <ArrowLeftIcon size={16} />
        Back to List
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="destructive" className="flex items-center gap-2 w-full justify-start">
            <TrashIcon size={16} />
            Delete
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <h4 className="font-semibold">Delete Devlog</h4>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this devlog? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm">
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <DevlogDetails
      devlogContext={currentDevlogContext}
      notesContext={currentDevlogNotesContext}
      hasUnsavedChanges={hasUnsavedChanges}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onUnsavedChangesChange={handleUnsavedChangesChange}
      actions={actions}
    />
  );
}
