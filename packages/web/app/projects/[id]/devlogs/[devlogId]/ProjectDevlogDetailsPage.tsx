'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  DevlogDetails,
  PageLayout,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components';
import { useDevlogStore, useProjectStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SaveIcon, TrashIcon, UndoIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectDevlogDetailsPageProps {
  projectId: number;
  devlogId: number;
}

export function ProjectDevlogDetailsPage({ projectId, devlogId }: ProjectDevlogDetailsPageProps) {
  const router = useRouter();

  const { setCurrentProjectId } = useProjectStore();

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Use refs to store function references to avoid recreation on every render
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const discardHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setCurrentProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    setCurrentDevlogId(devlogId);
  }, [devlogId]);

  // Fetch the devlog when currentDevlogId changes
  useEffect(() => {
    if (!currentDevlogId) return;

    fetchCurrentDevlog();
    fetchCurrentDevlogNotes();

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
      console.error('Failed to update devlog:', error);
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

      router.push(`/projects/${projectId}/devlogs`);
    } catch (error) {
      console.error('Failed to delete devlog:', error);
      toast.error('Failed to delete devlog');
    }
  };

  const handleBack = () => {
    router.push(`/projects/${projectId}/devlogs`);
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
    <PageLayout>
      <DevlogDetails
        devlogContext={currentDevlogContext}
        notesContext={currentDevlogNotesContext}
        hasUnsavedChanges={hasUnsavedChanges}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUnsavedChangesChange={handleUnsavedChangesChange}
        actions={actions}
      />
    </PageLayout>
  );
}
