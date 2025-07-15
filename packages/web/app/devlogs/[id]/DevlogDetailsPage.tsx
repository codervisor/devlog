'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, Breadcrumb, Button, Popconfirm, Space, Tag, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { DevlogDetails, LoadingPage, PageLayout } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { DevlogEntry } from '@devlog/core';
import { useRouter } from 'next/navigation';
import {
  getPriorityColor,
  getPriorityIcon,
  getStatusColor,
  getStatusIcon,
  getTypeIcon,
} from '@/lib/devlog-ui-utils';

interface DevlogDetailsPageProps {
  id: string;
}

export function DevlogDetailsPage({ id }: DevlogDetailsPageProps) {
  const { devlogs, updateDevlog, deleteDevlog } = useDevlogs();
  const [devlog, setDevlog] = useState<DevlogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  // Use refs to store function references to avoid recreation on every render
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const discardHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const foundDevlog = devlogs.find((d: DevlogEntry) => d.id === parseInt(id));
    if (foundDevlog) {
      setDevlog(foundDevlog);
      setLoading(false);
    } else if (devlogs.length > 0) {
      // If devlogs are loaded but no match found
      setError('Devlog not found');
      setLoading(false);
    }
    // If devlogs are still loading, keep loading state
  }, [devlogs, id]);

  const handleUpdate = async (data: any) => {
    try {
      await updateDevlog(data);
      // The devlogs array will be updated automatically by fetchDevlogs() in updateDevlog
      // The useEffect will update the local devlog state when devlogs changes
      message.success('Changes saved successfully');
    } catch (error) {
      console.error('Failed to update devlog:', error);
      throw error; // Re-throw so the component can handle the error
    }
  };

  const handleUnsavedChangesChange = useCallback(
    (
      hasChanges: boolean,
      save: () => Promise<void>,
      discard: () => void,
      saving: boolean,
      error: string | null,
    ) => {
      setHasUnsavedChanges(hasChanges);
      saveHandlerRef.current = save;
      discardHandlerRef.current = discard;
      setIsSaving(saving);
      setSaveError(error);

      // Show error message if save failed
      if (error) {
        message.error(`Failed to save changes: ${error}`);
      }
    },
    [],
  );

  const handleDelete = async () => {
    try {
      await deleteDevlog(parseInt(id));
      router.push('/devlogs');
    } catch (error) {
      console.error('Failed to delete devlog:', error);
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
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onUnsavedChangesChange={handleUnsavedChangesChange}
        />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Alert message="Error" description={error} type="error" showIcon />
      </PageLayout>
    );
  }

  if (!devlog) {
    return (
      <PageLayout>
        <Alert message="Not Found" description="Devlog not found" type="warning" showIcon />
      </PageLayout>
    );
  }

  const actions = (
    <Space>
      {hasUnsavedChanges && (
        <>
          <Button
            onClick={() => discardHandlerRef.current?.()}
            icon={<UndoOutlined />}
            disabled={isSaving}
          >
            Discard Changes
          </Button>
          <Button
            type="primary"
            onClick={() => saveHandlerRef.current?.()}
            loading={isSaving}
            icon={<SaveOutlined />}
          >
            Save Changes
          </Button>
        </>
      )}
      <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
        Back to List
      </Button>
      <Popconfirm
        title="Delete Devlog"
        description="Are you sure you want to delete this devlog?"
        onConfirm={handleDelete}
        okText="Yes"
        cancelText="No"
      >
        <Button danger icon={<DeleteOutlined />}>
          Delete
        </Button>
      </Popconfirm>
    </Space>
  );

  return (
    <PageLayout actions={actions}>
      <DevlogDetails
        devlog={devlog}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUnsavedChangesChange={handleUnsavedChangesChange}
      />
    </PageLayout>
  );
}
