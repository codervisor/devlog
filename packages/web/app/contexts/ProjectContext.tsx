'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ProjectMetadata {
  id: number; // Changed from string to number to match API
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectContext {
  projectId: number; // Changed from string to number to match API
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
      // Handle both old and new response formats for backward compatibility
      const projectsList = data.success ? data.data : data.projects || data || [];
      setProjects(projectsList);

      // If no current project is set, set the first project as default
      if (!currentProject && projectsList?.length > 0) {
        const firstProject = projectsList[0];
        setCurrentProject({
          projectId: firstProject.id,
          project: firstProject,
          isDefault: firstProject.id === 1, // Assume project with ID 1 is the default
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
        const savedProject = projects.find((p) => p.id === parseInt(savedProjectId, 10));
        if (savedProject) {
          setCurrentProject({
            projectId: savedProject.id,
            project: savedProject,
            isDefault: savedProject.id === 1, // Assume project with ID 1 is the default
          });
        }
      }
    }
  }, [projects]);

  // Save current project to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentProject) {
      localStorage.setItem('devlog-current-project', currentProject.projectId.toString());
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
