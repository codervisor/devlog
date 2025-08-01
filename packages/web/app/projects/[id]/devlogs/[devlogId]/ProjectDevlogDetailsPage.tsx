'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { DevlogDetails, PageLayout } from '@/components';
import { useDevlogContext } from '@/hooks/use-stores';
import { useProject } from '@/hooks/use-stores';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeftIcon,
  TrashIcon,
  SaveIcon,
  UndoIcon,
  AlertTriangleIcon,
  InfoIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectDevlogDetailsPageProps {
  projectId: number;
  devlogId: number;
}

export function ProjectDevlogDetailsPage({ projectId, devlogId }: ProjectDevlogDetailsPageProps) {
  const { currentProject, projects, setCurrentProject } = useProject();
  const router = useRouter();

  // Set the current project based on the route parameter when projects are available
  // This is essential for the context to work with the correct project
  useEffect(() => {
    const project = projects.find((p) => p.id === projectId);
    if (project && (!currentProject || currentProject.projectId !== projectId)) {
      setCurrentProject({
        projectId: project.id,
        project,
      });
    }
  }, [projectId, projects, currentProject, setCurrentProject]);

  const {
    selectedDevlog: devlog,
    selectedDevlogLoading: loading,
    selectedDevlogError: fetchError,
    fetchSelectedDevlog,
    updateSelectedDevlog,
    deleteDevlog: deleteDevlogFromList,
    clearSelectedDevlog,
  } = useDevlogContext();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Use refs to store function references to avoid recreation on every render
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const discardHandlerRef = useRef<(() => void) | null>(null);

  // Fetch the devlog when component mounts or devlogId changes
  useEffect(() => {
    if (currentProject) {
      fetchSelectedDevlog(devlogId);
    }

    // Clear selected devlog when component unmounts
    return () => {
      clearSelectedDevlog();
    };
  }, [devlogId, currentProject, fetchSelectedDevlog, clearSelectedDevlog]);

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
      await deleteDevlogFromList(devlogId);

      router.push(`/projects/${projectId}/devlogs`);
    } catch (error) {
      console.error('Failed to delete devlog:', error);
      toast.error('Failed to delete devlog');
    }
  };

  const handleBack = () => {
    router.push(`/projects/${projectId}/devlogs`);
  };

  if (loading) {
    return (
      <PageLayout>
        <DevlogDetails
          loading={true}
          hasUnsavedChanges={hasUnsavedChanges}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onUnsavedChangesChange={handleUnsavedChangesChange}
        />
      </PageLayout>
    );
  }

  if (fetchError) {
    return (
      <PageLayout>
        <Alert variant="destructive" className="flex items-center gap-2">
          <AlertTriangleIcon size={16} />
          <div>
            <div className="font-semibold">Error</div>
            <AlertDescription>{fetchError}</AlertDescription>
          </div>
        </Alert>
      </PageLayout>
    );
  }

  if (!devlog) {
    return (
      <PageLayout>
        <Alert className="flex items-center gap-2">
          <InfoIcon size={16} />
          <div>
            <div className="font-semibold">Not Found</div>
            <AlertDescription>Devlog not found</AlertDescription>
          </div>
        </Alert>
      </PageLayout>
    );
  }

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
        devlog={devlog}
        hasUnsavedChanges={hasUnsavedChanges}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUnsavedChangesChange={handleUnsavedChangesChange}
        actions={actions}
      />
    </PageLayout>
  );
}
