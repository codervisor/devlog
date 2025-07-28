'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import styles from './ProjectSwitcher.module.css';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronDownIcon, 
  FolderIcon, 
  PlusIcon, 
  SettingsIcon,
  CheckIcon 
} from 'lucide-react';
import { toast } from 'sonner';

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

      toast.success(`Switched to project: ${targetProject.name}`);

      // Force immediate hard reload to ensure all components refresh with new project context
      window.location.reload();
    } catch (error) {
      console.error('Error switching project:', error);
      toast.error('Failed to switch project');
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

  return (
    <div className={collapsed ? styles.projectSwitcherCollapsed : styles.projectSwitcher}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={styles.projectSwitcherButton} disabled={loading}>
            <Tooltip>
              <TooltipTrigger asChild>
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
                  <ChevronDownIcon className={styles.projectSwitcherArrow} size={16} />
                </div>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent>
                  Switch Project
                </TooltipContent>
              )}
            </Tooltip>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="start">
          <div className="px-3 py-2 border-b">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <FolderIcon size={16} />
              PROJECTS
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {projects.map((project) => {
              const isCurrentProject = currentProject?.project.id === project.id;
              return (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => !isCurrentProject && switchProject(project.id)}
                  className="flex items-center gap-3 p-3 cursor-pointer"
                  disabled={isCurrentProject}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{
                      backgroundColor: getProjectColor(project.name),
                    }}
                  >
                    {getProjectInitials(project.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{project.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderConnectionStatus(project.id)}
                    {isCurrentProject && (
                      <CheckIcon size={16} className="text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator />
          
          <div className="p-2">
            <DropdownMenuItem onClick={() => router.push('/projects')} className="flex items-center gap-2">
              <PlusIcon size={16} />
              Create project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/projects')} className="flex items-center gap-2">
              <SettingsIcon size={16} />
              Project settings
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
