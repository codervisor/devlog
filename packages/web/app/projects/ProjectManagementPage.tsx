'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Spin,
  Alert,
  Typography,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  message,
} from 'antd';
import {
  PlusOutlined,
  SettingOutlined,
  ProjectOutlined,
  DatabaseOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useProject } from '@/contexts/ProjectContext';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/layout/PageLayout';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface ProjectFormData {
  name: string;
  description?: string;
}

export function ProjectManagementPage() {
  const { projects, currentProject, refreshProjects, loading, error } = useProject();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<ProjectFormData>();
  const router = useRouter();

  const handleCreateProject = async (values: ProjectFormData) => {
    try {
      setCreating(true);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const newProject = await response.json();
      message.success(`Project "${newProject.name}" created successfully`);

      setIsModalVisible(false);
      form.resetFields();
      await refreshProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      message.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const getProjectStatusColor = (projectId: string) => {
    if (projectId === 'default') return 'blue';
    if (currentProject?.projectId === projectId) return 'green';
    return 'default';
  };

  const getProjectStatusText = (projectId: string) => {
    if (projectId === 'default') return 'Default';
    if (currentProject?.projectId === projectId) return 'Active';
    return 'Available';
  };

  if (loading) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading projects...</div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Alert
          message="Error Loading Projects"
          description={error}
          type="error"
          showIcon
          style={{ margin: '20px' }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      actions={
        <Button 
          type="primary" 
          size="large"
          icon={<PlusOutlined />} 
          onClick={() => setIsModalVisible(true)}
        >
          New Project
        </Button>
      }
    >
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ margin: 0 }}>
            <ProjectOutlined style={{ marginRight: 8 }} />
            Projects
          </Title>
          <Paragraph type="secondary" style={{ margin: '8px 0 0 0', fontSize: '16px' }}>
            Manage your development projects and view their dashboards
          </Paragraph>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '24px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            marginBottom: '32px',
          }}
        >
        {projects.map((project) => (
          <Card
            key={project.id}
            title={
              <Space>
                <ProjectOutlined />
                {project.name}
                <Tag color={getProjectStatusColor(project.id)}>
                  {getProjectStatusText(project.id)}
                </Tag>
              </Space>
            }
            extra={
              <Button
                type="text"
                icon={<SettingOutlined />}
                size="small"
                onClick={() => {
                  // TODO: Implement project settings
                  message.info('Project settings coming soon');
                }}
              />
            }
            style={{
              border: currentProject?.projectId === project.id ? '2px solid #1890ff' : undefined,
              borderRadius: '8px',
              boxShadow: currentProject?.projectId === project.id 
                ? '0 4px 12px rgba(24, 144, 255, 0.15)' 
                : '0 2px 8px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            hoverable
            actions={[
              <Button
                key="view"
                type="link"
                icon={<EyeOutlined />}
                onClick={() => handleViewProject(project.id)}
              >
                View Dashboard
              </Button>,
              <Button
                key="stats"
                type="link"
                icon={<DatabaseOutlined />}
                onClick={() => {
                  // Navigate to project dashboard where stats are shown
                  handleViewProject(project.id);
                }}
              >
                View Stats
              </Button>,
            ]}
          >
            <div style={{ marginBottom: 16 }}>
              <Paragraph ellipsis={{ rows: 2 }}>
                {project.description || 'No description provided'}
              </Paragraph>
            </div>

            <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 16 }}>
              <div>
                <strong>ID:</strong> {project.id}
              </div>
              <div>
                <strong>Created:</strong> {new Date(project.createdAt).toLocaleDateString()}
              </div>
              <div>
                <strong>Updated:</strong> {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>

            {project.tags && project.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Space wrap>
                  {project.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </Card>
        ))}
      </div>

        {projects.length === 0 && (
          <Card 
            style={{ 
              textAlign: 'center', 
              padding: '60px 40px',
              border: '2px dashed #d9d9d9',
              borderRadius: '12px',
              background: '#fafafa'
            }}
          >
            <ProjectOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '24px' }} />
            <Title level={3} type="secondary" style={{ marginBottom: '12px' }}>
              No Projects Found
            </Title>
            <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: '32px' }}>
              Create your first project to get started with organizing your development work.
            </Paragraph>
            <Button 
              type="primary" 
              size="large"
              icon={<PlusOutlined />} 
              onClick={() => setIsModalVisible(true)}
            >
              Create First Project
            </Button>
          </Card>
        )}

      <Modal
        title="Create New Project"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateProject}>
          <Form.Item
            name="name"
            label="Project Name"
            rules={[
              { required: true, message: 'Please enter a project name' },
              { min: 3, message: 'Project name must be at least 3 characters' },
              { max: 50, message: 'Project name must be less than 50 characters' },
            ]}
          >
            <Input placeholder="e.g., My Development Project" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
            rules={[{ max: 200, message: 'Description must be less than 200 characters' }]}
          >
            <TextArea rows={3} placeholder="Describe what this project is about..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={creating}>
                Create Project
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </PageLayout>
  );
}
