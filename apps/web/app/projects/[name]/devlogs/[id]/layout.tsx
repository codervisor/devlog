import React from 'react';
import { PrismaDevlogService, PrismaProjectService } from '@codervisor/devlog-core/server';
import { notFound } from 'next/navigation';
import { DevlogProvider } from '../../../../../components/provider/devlog-provider';

interface DevlogLayoutProps {
  children: React.ReactNode;
  params: {
    name: string; // The project name from the URL
    id: string; // The devlog ID from the URL
  };
}

/**
 * Server layout that resolves devlog data and provides it to all child pages
 */
export default async function DevlogLayout({ children, params }: DevlogLayoutProps) {
  const projectName = params.name;
  const devlogId = parseInt(params.id, 10);

  // Validate devlog ID
  if (isNaN(devlogId) || devlogId <= 0) {
    notFound();
  }

  try {
    // Get project to ensure it exists and get project ID
    const projectService = PrismaProjectService.getInstance();
    const project = await projectService.getByName(projectName);

    if (!project) {
      notFound();
    }

    // Get devlog service and fetch the devlog
    const devlogService = PrismaDevlogService.getInstance(project.id);
    const devlog = await devlogService.get(devlogId);

    if (!devlog) {
      notFound();
    }

    return <DevlogProvider devlog={devlog}>{children}</DevlogProvider>;
  } catch (error) {
    console.error('Error resolving devlog:', error);
    notFound();
  }
}
