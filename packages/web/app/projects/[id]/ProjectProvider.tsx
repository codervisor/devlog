'use client';

import React, { createContext, useContext } from 'react';
import type { Project } from '@codervisor/devlog-core';

interface ProjectContextValue {
  project: Project;
  projectName: string;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ 
  children, 
  project 
}: { 
  children: React.ReactNode;
  project: Project;
}) {
  const value: ProjectContextValue = {
    project,
    projectName: project.name,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

export function useProjectName(): string {
  const { projectName } = useProject();
  return projectName;
}