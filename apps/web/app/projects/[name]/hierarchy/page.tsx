/**
 * Project Hierarchy Page
 * 
 * Displays the complete project hierarchy with machines, workspaces, and sessions
 */

import { notFound } from 'next/navigation';
import { HierarchyTree } from '@/components/agent-observability/hierarchy';
import { Card } from '@/components/ui/card.js';
import { ProjectService } from '@codervisor/devlog-core';
import { HierarchyService } from '@codervisor/devlog-core';

interface ProjectHierarchyPageProps {
  params: { name: string };
}

export default async function ProjectHierarchyPage({
  params,
}: ProjectHierarchyPageProps) {
  // Initialize services
  const projectService = ProjectService.getInstance();
  const hierarchyService = HierarchyService.getInstance();
  
  await projectService.initialize();
  await hierarchyService.initialize();

  // Fetch project by full name
  const project = await projectService.getProjectByFullName(params.name);
  
  if (!project) {
    notFound();
  }

  // Fetch hierarchy data
  const hierarchy = await hierarchyService.getProjectHierarchy(project.id);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{hierarchy.project.fullName}</h1>
        {hierarchy.project.description && (
          <p className="text-muted-foreground mt-2">{hierarchy.project.description}</p>
        )}
        
        {/* Project metadata */}
        <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
          {hierarchy.project.repoUrl && (
            <a 
              href={hierarchy.project.repoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              View Repository →
            </a>
          )}
          <span>
            {hierarchy.machines.length} {hierarchy.machines.length === 1 ? 'machine' : 'machines'}
          </span>
          <span>
            {hierarchy.machines.reduce((sum, m) => sum + m.workspaces.length, 0)} workspaces
          </span>
        </div>
      </div>

      {/* Hierarchy Tree */}
      {hierarchy.machines.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No machines or workspaces detected yet.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Install the devlog collector to start tracking activity for this project.
          </p>
        </Card>
      ) : (
        <HierarchyTree hierarchy={hierarchy} />
      )}
    </div>
  );
}
