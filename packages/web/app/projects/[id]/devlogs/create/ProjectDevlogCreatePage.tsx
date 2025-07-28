'use client';

import React, { useEffect } from 'react';
import { Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { DevlogForm, PageLayout } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useProject } from '@/contexts/ProjectContext';
import { useRouter } from 'next/navigation';

interface ProjectDevlogCreatePageProps {
  projectId: string;
}

export function ProjectDevlogCreatePage({ projectId }: ProjectDevlogCreatePageProps) {
  const { currentProject, projects, setCurrentProject } = useProject();
  const { createDevlog } = useDevlogs();
  const router = useRouter();

  // Set the current project based on the route parameter
  useEffect(() => {
    const project = projects.find(p => p.id === projectId);
    if (project && (!currentProject || currentProject.projectId !== projectId)) {
      setCurrentProject({
        projectId: project.id,
        project,
        isDefault: project.id === 'default',
      });
    }
  }, [projectId, projects, currentProject, setCurrentProject]);

  const handleSubmit = async (data: any) => {
    try {
      await createDevlog(data);
      router.push(`/projects/${projectId}/devlogs`);
    } catch (error) {
      console.error('Failed to create devlog:', error);
    }
  };

  const handleCancel = () => {
    router.push(`/projects/${projectId}/devlogs`);
  };

  // Don't render until we have the correct project context
  if (!currentProject || currentProject.projectId !== projectId) {
    return (
      <PageLayout>
        <div>Loading project...</div>
      </PageLayout>
    );
  }

  const actions = (
    <Space>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={handleCancel}
      >
        Back to List
      </Button>
    </Space>
  );

  return (
    <PageLayout actions={actions}>
      <DevlogForm 
        onSubmit={handleSubmit} 
        onCancel={handleCancel} 
      />
    </PageLayout>
  );
}
