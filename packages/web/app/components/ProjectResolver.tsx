import React from 'react';
import { redirect } from 'next/navigation';
import { ProjectService } from '@codervisor/devlog-core/server';
import { generateSlugFromName } from '@codervisor/devlog-core';
import type { Project } from '@codervisor/devlog-core';
import { ProjectNotFound } from './ProjectNotFound';

interface ProjectResolverProps {
  identifier: string;
  identifierType: 'id' | 'name';
  children: (projectName: string, project: Project) => React.ReactNode;
}

/**
 * Server component that resolves a project identifier to project data
 * Handles URL redirects when using name-based routing
 */
export async function ProjectResolver({
  identifier,
  identifierType,
  children,
}: ProjectResolverProps) {
  try {
    const projectService = ProjectService.getInstance();
    
    let project: Project | null = null;
    
    if (identifierType === 'name') {
      project = await projectService.getByName(identifier);
      
      // If project exists but identifier doesn't match canonical slug, redirect
      if (project) {
        const canonicalSlug = generateSlugFromName(project.name);
        if (identifier !== canonicalSlug) {
          // Redirect to canonical URL
          redirect(`/projects/${canonicalSlug}`);
        }
      }
    } else {
      // For ID-based routing (fallback/legacy support)
      const projectId = parseInt(identifier, 10);
      if (!isNaN(projectId)) {
        project = await projectService.get(projectId);
      }
    }

    if (!project) {
      return <ProjectNotFound />;
    }

    return <>{children(project.name, project)}</>;
  } catch (error) {
    console.error('Error resolving project:', error);
    return <ProjectNotFound />;
  }
}
