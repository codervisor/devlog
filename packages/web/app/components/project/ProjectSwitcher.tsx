'use client';

import React, { useState, useEffect } from 'react';
import { Button, Dropdown, Tooltip, message } from 'antd';
import { DownOutlined, ProjectOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import styles from './ProjectSwitcher.module.css';

interface ProjectSwitcherProps {
  collapsed?: boolean;
  className?: string;
}

export function ProjectSwitcher({ collapsed = false, className = '' }: ProjectSwitcherProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, any>>({});

  const { currentProject, projects, setCurrentProject, refreshProjects } = useProject();

  // Load projects and connection statuses on component mount
  useEffect(() => {
    if (projects.length > 0) {
      loadConnectionStatuses(projects);
    }
  }, [projects]);

  const loadConnectionStatuses = async (projectList: any[]) => {
    const statuses: Record<string, any> = {};

    for (const project of projectList) {
      try {
        const response = await fetch(`/api/projects/${project.id}`);
        if (response.ok) {
          const data = await response.json();
          statuses[project.id] = { connected: true };
        } else {
          statuses[project.id] = { connected: false, error: 'Failed to check connection' };
        }
      } catch (error) {
        statuses[project.id] = { connected: false, error: 'Connection check failed' };
      }
    }

    setConnectionStatuses(statuses);
  };

  const getProjectInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const getProjectColor = (name: string) => {
    // Generate consistent color based on project name
    const colors = [
      '#1890ff',
      '#52c41a',
      '#faad14',
      '#f5222d',
      '#722ed1',
      '#13c2c2',
      '#eb2f96',
      '#fa8c16',
      '#a0d911',
      '#2f54eb',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const switchProject = async (projectId: string) => {
    try {
      // Find the project by ID to get its name
      const targetProject = projects.find((p) => p.id === projectId);
      if (!targetProject) {
        throw new Error('Project not found');
      }

      // Save project to localStorage for persistence (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.setItem('devlog-current-project', projectId);
      }

      // Update the current project
      setCurrentProject({
        projectId,
        project: targetProject,
        isDefault: projectId === 'default',
      });

      message.success(`Switched to project: ${targetProject.name}`);

      // Force immediate hard reload to ensure all components refresh with new project context
      window.location.reload();
    } catch (error) {
      console.error('Error switching project:', error);
      message.error('Failed to switch project');
    }
  };

  const renderConnectionStatus = (projectId: string) => {
    const status = connectionStatuses[projectId];
    if (!status) {
      return (
        <div className={styles.connectionStatus}>
          <div className={`${styles.connectionIndicator} ${styles.connectionIndicatorLoading}`} />
        </div>
      );
    }

    return (
      <div className={styles.connectionStatus}>
        <div
          className={`${styles.connectionIndicator} ${
            status.connected
              ? styles.connectionIndicatorConnected
              : styles.connectionIndicatorDisconnected
          }`}
        />
      </div>
    );
  };

  const dropdownContent = (
    <div className={styles.projectDropdownContent}>
      <div className={styles.projectDropdownHeader}>
        <div className={styles.projectDropdownTitle}>
          <ProjectOutlined style={{ marginRight: 8 }} />
          PROJECTS
        </div>
      </div>
      <div className={styles.projectList}>
        {projects.map((project) => {
          const isCurrentProject = currentProject?.project.id === project.id;
          return (
            <div
              key={project.id}
              className={`${styles.projectItem} ${isCurrentProject ? styles.projectItemCurrent : ''}`}
              onClick={() => !isCurrentProject && switchProject(project.id)}
            >
              <div
                className={styles.projectItemAvatar}
                style={{
                  backgroundColor: getProjectColor(project.name),
                }}
              >
                {getProjectInitials(project.name)}
              </div>
              <div className={styles.projectItemContent}>
                <div className={styles.projectItemMain}>
                  <div className={styles.projectItemName}>{project.name}</div>
                  <div className={styles.projectItemStatus}>
                    {renderConnectionStatus(project.id)}
                  </div>
                </div>
                <div className={styles.projectItemId}>{project.id}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.projectActions}>
        <Button
          type="text"
          icon={<PlusOutlined />}
          className={styles.projectActionButton}
          onClick={() => router.push('/projects')}
        >
          Create project
        </Button>
        <Button
          type="text"
          icon={<SettingOutlined />}
          className={styles.projectActionButton}
          onClick={() => router.push('/projects')}
        >
          Project settings
        </Button>
      </div>
    </div>
  );

  return (
    <div className={collapsed ? styles.projectSwitcherCollapsed : styles.projectSwitcher}>
      <Dropdown
        dropdownRender={() => dropdownContent}
        trigger={['click']}
        placement="topLeft"
        overlayClassName={styles.projectDropdown}
      >
        <Button type="text" className={styles.projectSwitcherButton} loading={loading}>
          <Tooltip title={collapsed ? 'Switch Project' : undefined} placement="top">
            <div className={styles.projectSwitcherButtonContent}>
              <div
                className={styles.projectSwitcherAvatar}
                style={{
                  backgroundColor: currentProject
                    ? getProjectColor(currentProject.project.name)
                    : '#d9d9d9',
                }}
              >
                {currentProject ? getProjectInitials(currentProject.project.name) : '?'}
              </div>
              {!collapsed && (
                <div className={styles.projectSwitcherText}>
                  {currentProject?.project.name || 'Select Project'}
                </div>
              )}
              <DownOutlined className={styles.projectSwitcherArrow} />
            </div>
          </Tooltip>
        </Button>
      </Dropdown>
    </div>
  );
}
