'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, Breadcrumb, Button, Popconfirm, Space, Tag, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { DevlogDetails, LoadingPage, PageLayout } from '@/components';
import { useDevlogDetails } from '@/hooks/useDevlogDetails';
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
  const { devlog, loading, error: fetchError, updateDevlog, deleteDevlog } = useDevlogDetails(id);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  // Use refs to store function references to avoid recreation on every render
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const discardHandlerRef = useRef<(() => void) | null>(null);

  const handleUpdate = async (data: any) => {
    try {
      await updateDevlog(data);
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

  if (fetchError) {
    return (
      <PageLayout>
        <Alert message="Error" description={fetchError} type="error" showIcon />
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
