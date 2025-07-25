'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Alert, Button, message, Popconfirm, Space } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { DevlogDetails, PageLayout } from '@/components';
import { useDevlogDetails } from '@/hooks/useDevlogDetails';
import { useRouter } from 'next/navigation';

interface DevlogDetailsPageProps {
  id: string;
}

export function DevlogDetailsPage({ id }: DevlogDetailsPageProps) {
  const { devlog, loading, error: fetchError, updateDevlog, deleteDevlog } = useDevlogDetails(id);
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
      message.success('Changes saved successfully');
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
        hasUnsavedChanges={hasUnsavedChanges}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUnsavedChangesChange={handleUnsavedChangesChange}
      />
    </PageLayout>
  );
}
