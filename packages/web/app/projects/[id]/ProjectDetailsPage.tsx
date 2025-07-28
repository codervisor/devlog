'use client';

import React, { useEffect } from 'react';
import { Button, Space, Card, Statistic, Row, Col } from 'antd';
import { FolderOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { PageLayout, OverviewStats } from '@/components';
import { useProject } from '@/contexts/ProjectContext';
import { useStats } from '@/hooks/useStats';
import { useRouter } from 'next/navigation';

interface ProjectDetailsPageProps {
  projectId: string;
}

export function ProjectDetailsPage({ projectId }: ProjectDetailsPageProps) {
  const { currentProject, projects, setCurrentProject } = useProject();
  const { stats, loading: isLoadingStats } = useStats();
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

  const handleViewDevlogs = () => {
    router.push(`/projects/${projectId}/devlogs`);
  };

  const handleCreateDevlog = () => {
    router.push(`/projects/${projectId}/devlogs/create`);
  };

  const handleManageProject = () => {
    router.push('/projects');
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
    <Space size="large" wrap>
      <Button 
        type="primary" 
        icon={<FolderOutlined />} 
        onClick={handleViewDevlogs}
      >
        View Devlogs
      </Button>
      <Button 
        icon={<PlusOutlined />} 
        onClick={handleCreateDevlog}
      >
        Create Devlog
      </Button>
      <Button 
        icon={<SettingOutlined />} 
        onClick={handleManageProject}
      >
        Manage Projects
      </Button>
    </Space>
  );

  return (
    <PageLayout actions={actions}>
      <div className="space-y-6">
        {/* Project Header */}
        <Card>
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentProject.project.name}
              </h1>
              {currentProject.project.description && (
                <p className="text-gray-600 mt-2">
                  {currentProject.project.description}
                </p>
              )}
            </div>
            
            {currentProject.project.tags && currentProject.project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentProject.project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Created: {new Date(currentProject.project.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(currentProject.project.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>

        {/* Project Stats */}
        <Card title="Project Statistics">
          {stats ? (
            <OverviewStats
              stats={stats}
              loading={isLoadingStats}
              variant="detailed"
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {isLoadingStats ? 'Loading statistics...' : 'No statistics available'}
              </p>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <Row gutter={[16, 16]} className="text-center">
            <Col xs={24} sm={8}>
              <Card 
                hoverable 
                className="cursor-pointer" 
                onClick={handleViewDevlogs}
              >
                <Statistic
                  title="View All Devlogs"
                  value={stats?.total || 0}
                  prefix={<FolderOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card 
                hoverable 
                className="cursor-pointer" 
                onClick={handleCreateDevlog}
              >
                <div className="py-4">
                  <PlusOutlined className="text-2xl text-blue-500 mb-2" />
                  <div className="text-lg font-medium">Create New Devlog</div>
                  <div className="text-gray-500">Add a new development log entry</div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card 
                hoverable 
                className="cursor-pointer" 
                onClick={handleManageProject}
              >
                <div className="py-4">
                  <SettingOutlined className="text-2xl text-green-500 mb-2" />
                  <div className="text-lg font-medium">Manage Projects</div>
                  <div className="text-gray-500">Configure project settings</div>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      </div>
    </PageLayout>
  );
}
