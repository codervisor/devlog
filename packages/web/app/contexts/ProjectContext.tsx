'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectContext {
  projectId: string;
  project: ProjectMetadata;
  isDefault: boolean;
}

interface ProjectContextValue {
  currentProject: ProjectContext | null;
  projects: ProjectMetadata[];
  setCurrentProject: (project: ProjectContext | null) => void;
  refreshProjects: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ProjectContextInstance = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [currentProject, setCurrentProject] = useState<ProjectContext | null>(null);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects from API
  const refreshProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const data = await response.json();
      setProjects(data.projects || []);

      // If no current project is set, set the default project
      if (!currentProject && data.projects?.length > 0) {
        const defaultProject =
          data.projects.find((p: ProjectMetadata) => p.id === 'default') || data.projects[0];
        setCurrentProject({
          projectId: defaultProject.id,
          project: defaultProject,
          isDefault: defaultProject.id === 'default',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMessage);
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load projects on mount
  useEffect(() => {
    refreshProjects();
  }, []);

  // Load saved project from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProjectId = localStorage.getItem('devlog-current-project');
      if (savedProjectId && projects.length > 0) {
        const savedProject = projects.find((p) => p.id === savedProjectId);
        if (savedProject) {
          setCurrentProject({
            projectId: savedProject.id,
            project: savedProject,
            isDefault: savedProject.id === 'default',
          });
        }
      }
    }
  }, [projects]);

  // Save current project to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentProject) {
      localStorage.setItem('devlog-current-project', currentProject.projectId);
    }
  }, [currentProject]);

  const value: ProjectContextValue = {
    currentProject,
    projects,
    setCurrentProject,
    refreshProjects,
    loading,
    error,
  };

  return (
    <ProjectContextInstance.Provider value={value}>{children}</ProjectContextInstance.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContextInstance);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
