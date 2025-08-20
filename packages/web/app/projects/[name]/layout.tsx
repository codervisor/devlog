import React from 'react';
import { ProjectService } from '@codervisor/devlog-core/server';
import { generateSlugFromName } from '@codervisor/devlog-core';
import type { Project } from '@codervisor/devlog-core';
import { RouteParamParsers } from '@/lib';
import { ProjectNotFound } from '@/components/ProjectNotFound';
import { redirect } from 'next/navigation';
import { ProjectProvider } from './ProjectProvider';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

/**
 * Server layout that resolves project data and provides it to all child pages
 */
export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectIdentifier, identifierType } = RouteParamParsers.parseProjectParams(params);
  
  try {
    const projectService = ProjectService.getInstance();
    
    let project: Project | null = null;
    
    if (identifierType === 'name') {
      project = await projectService.getByName(projectIdentifier);
      
      // If project exists but identifier doesn't match canonical slug, redirect
      if (project) {
        const canonicalSlug = generateSlugFromName(project.name);
        if (projectIdentifier !== canonicalSlug) {
          // Redirect to canonical URL
          const currentPath = `/projects/${projectIdentifier}`;
          const newPath = `/projects/${canonicalSlug}`;
          redirect(newPath);
        }
      }
    } else {
      // For ID-based routing (fallback/legacy support)
      const projectId = parseInt(projectIdentifier, 10);
      if (!isNaN(projectId)) {
        project = await projectService.get(projectId);
      }
    }

    if (!project) {
      return <ProjectNotFound />;
    }

    return (
      <ProjectProvider project={project}>
        {children}
      </ProjectProvider>
    );
  } catch (error) {
    console.error('Error resolving project:', error);
    return <ProjectNotFound />;
  }
}