'use client';

import React, { useCallback, useRef, useState } from 'react';
import { DevlogDetails, PageLayout } from '@/components';
import { useDevlogDetails } from '@/hooks/useDevlogDetails';
import { useDevlogs } from '@/hooks/useDevlogs';
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

interface DevlogDetailsPageProps {
  id: number;
}

export function DevlogDetailsPage({ id }: DevlogDetailsPageProps) {
  const {
    devlog,
    loading,
    error: fetchError,
    updateDevlog,
    deleteDevlog: deleteDevlogFromDetails,
  } = useDevlogDetails(id);
  const { deleteDevlog: deleteDevlogFromList } = useDevlogs();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // Use refs to store function references to avoid recreation on every render
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const discardHandlerRef = useRef<(() => void) | null>(null);

  const handleUpdate = async (data: any) => {
    try {
      setIsSaving(true);
      await updateDevlog(data);
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
      // Call both delete functions to ensure proper state synchronization:
      // 1. Delete from details hook (updates local state immediately)
      await deleteDevlogFromDetails(id);

      // 2. Delete from list context (ensures list state is updated even if SSE is delayed)
      // Note: This is a safety measure in case there are timing issues with real-time events
      try {
        await deleteDevlogFromList(id);
      } catch (error) {
        // This might fail if the item is already deleted, which is fine
        console.debug('List deletion failed (likely already removed by SSE):', error);
      }

      router.push('/devlogs');
    } catch (error) {
      console.error('Failed to delete devlog:', error);
      toast.error('Failed to delete devlog');
    }
  };

  const handleBack = () => {
    router.push('/devlogs');
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
    <div className="flex items-center gap-3">
      {hasUnsavedChanges && (
        <>
          <Button
            variant="outline"
            onClick={() => discardHandlerRef.current?.()}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <UndoIcon size={16} />
            Discard Changes
          </Button>
          <Button
            onClick={() => saveHandlerRef.current?.()}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <SaveIcon size={16} />
            Save Changes
          </Button>
        </>
      )}
      <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
        <ArrowLeftIcon size={16} />
        Back to List
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="destructive" className="flex items-center gap-2">
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
    <PageLayout actions={actions}>
      <DevlogDetails
        devlog={devlog}
        hasUnsavedChanges={hasUnsavedChanges}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUnsavedChangesChange={handleUnsavedChangesChange}
      />
    </PageLayout>
  );
}
