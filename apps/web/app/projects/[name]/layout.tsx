import React from 'react';
import { PrismaProjectService } from '@codervisor/devlog-core/server';
import { generateSlugFromName } from '@codervisor/devlog-core';
import { ProjectNotFound } from '@/components/custom/project/project-not-found';
import { redirect } from 'next/navigation';
import { ProjectProvider } from '@/components/provider/project-provider';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: {
    name: string; // The project name from the URL
  };
}

/**
 * Server layout that resolves project data and provides it to all child pages
 */
export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const projectName = params.name;
  try {
    const projectService = PrismaProjectService.getInstance();

    const project = await projectService.getByName(projectName);

    // If project exists but identifier doesn't match canonical slug, redirect
    if (project) {
      const canonicalSlug = generateSlugFromName(project.name);
      if (projectName !== canonicalSlug) {
        // Redirect to canonical URL
        const newPath = `/projects/${canonicalSlug}`;
        redirect(newPath);
      }
    }

    if (!project) {
      return <ProjectNotFound />;
    }

    return <ProjectProvider project={project}>{children}</ProjectProvider>;
  } catch (error) {
    console.error('Error resolving project:', error);
    return <ProjectNotFound />;
  }
}
