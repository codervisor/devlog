'use client';

import React, { useState } from 'react';
import { Breadcrumb, Dropdown, Button, message } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import Link from 'next/link';
import { FolderIcon, BookOpenIcon, CheckIcon } from 'lucide-react';

export function NavigationBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentProject, projects, setCurrentProject } = useProject();
  const [switchingProject, setSwitchingProject] = useState(false);

  const getProjectInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const getProjectColor = (name: string) => {
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
      '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const switchProject = async (projectId: string) => {
    if (switchingProject || currentProject?.projectId === projectId) return;

    try {
      setSwitchingProject(true);
      
      const targetProject = projects.find((p) => p.id === projectId);
      if (!targetProject) {
        throw new Error('Project not found');
      }

      // Save project to localStorage for persistence
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
      
      // Navigate to the project dashboard
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error switching project:', error);
      message.error('Failed to switch project');
    } finally {
      setSwitchingProject(false);
    }
  };

  const renderProjectDropdown = () => {
    if (!currentProject || projects.length <= 1) return null;

    const dropdownItems = projects.map((project) => {
      const isCurrentProject = currentProject.projectId === project.id;
      
      return {
        key: project.id,
        label: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 4px',
              color: isCurrentProject ? '#1890ff' : '#262626',
              fontWeight: isCurrentProject ? 500 : 400,
            }}
            onClick={() => !isCurrentProject && switchProject(project.id)}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: getProjectColor(project.name),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '10px',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {getProjectInitials(project.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                fontSize: '14px',
              }}>
                {project.name}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#8c8c8c',
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
              }}>
                {project.id}
              </div>
            </div>
            {isCurrentProject && (
              <CheckIcon size={14} style={{ color: '#1890ff', flexShrink: 0 }} />
            )}
          </div>
        ),
        disabled: isCurrentProject,
      };
    });

    return (
      <Dropdown
        menu={{ items: dropdownItems }}
        placement="bottomLeft"
        trigger={['click']}
        disabled={switchingProject}
      >
        <Button
          type="text"
          loading={switchingProject}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 8px',
            height: 'auto',
            border: 'none',
            boxShadow: 'none',
            color: 'inherit',
          }}
        >
          <BookOpenIcon size={14} />
          <span>{currentProject.project.name}</span>
          <DownOutlined style={{ fontSize: '10px', color: '#8c8c8c' }} />
        </Button>
      </Dropdown>
    );
  };

  const getBreadcrumbItems = () => {
    const items = [];

    // Handle hierarchical project-based routes
    if (pathname.startsWith('/projects/')) {
      const pathParts = pathname.split('/').filter(Boolean);
      
      if (pathParts.length >= 2) {
        // Add Projects breadcrumb (always linkable)
        items.push({
          title: (
            <Link href="/projects" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderIcon size={14} />
              <span>Projects</span>
            </Link>
          ),
        });
        
        // Add project selector dropdown (instead of simple project name)
        if (currentProject?.project) {
          items.push({
            title: renderProjectDropdown(),
          });
        }
        
        // Remove all sub-path items (devlogs, create, etc.) - these are now handled by sidebar
        // The sidebar will show contextual navigation items based on the current route
      }
    } else if (pathname === '/projects') {
      // Only show Projects breadcrumb when on the projects listing page
      items.push({
        title: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderIcon size={14} />
            <span>Projects</span>
          </span>
        ),
      });
    }

    return items;
  };

  return (
    <Breadcrumb 
      className="navigation-breadcrumb" 
      items={getBreadcrumbItems()} 
    />
  );
}
