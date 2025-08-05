'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDevlogStore, useProjectStore } from '@/stores';
import { CheckIcon, ChevronsUpDown, NotepadText, Package } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function NavigationBreadcrumb() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentProjectContext, currentProjectId, projectsContext, fetchProjects } =
    useProjectStore();
  const { currentDevlogContext, currentDevlogId } = useDevlogStore();

  // Don't show breadcrumb on the home or project list page
  if (['/', '/projects'].includes(pathname)) {
    return null;
  }

  const switchProject = async (projectId: number) => {
    if (currentProjectId === projectId) return;

    try {
      const targetProject = projectsContext.data?.find((p) => p.id === projectId);
      if (!targetProject) {
        throw new Error('Project not found');
      }

      toast.success(`Switched to project: ${targetProject.name}`);

      // Navigate to the project dashboard
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error switching project:', error);
      toast.error('Failed to switch project');
    }
  };

  const handleDropdownOpenChange = (open: boolean) => {
    if (open) {
      // Load projects when dropdown is opened
      fetchProjects();
    }
  };

  const renderProjectDropdown = () => {
    // Show skeleton if current project is loading
    if (currentProjectContext.loading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
        </div>
      );
    }

    return (
      <DropdownMenu onOpenChange={handleDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer rounded">
            <Package size={14} />
            <span>{currentProjectContext.data?.name}</span>
            <ChevronsUpDown size={14} className="text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* Show skeleton items if projects list is loading */}
          {projectsContext.loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <DropdownMenuItem key={index} disabled className="flex items-center gap-3 p-3">
                  <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                </DropdownMenuItem>
              ))
            : projectsContext.data?.map((project) => {
                const isCurrentProject = currentProjectId === project.id;

                return (
                  <DropdownMenuItem
                    key={project.id}
                    disabled={isCurrentProject}
                    onClick={() => !isCurrentProject && switchProject(project.id)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{project.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{project.id}</div>
                    </div>
                    {isCurrentProject && (
                      <CheckIcon size={14} className="text-primary flex-shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderDevlogDropdown = () => {
    if (currentDevlogContext.loading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 cursor-pointer rounded">
        <NotepadText size={14} />
        <span>{currentDevlogContext.data?.id}</span>
        <ChevronsUpDown size={14} className="text-muted-foreground" />
      </div>
    );
  };

  return (
    <Breadcrumb className="navigation-breadcrumb">
      <BreadcrumbList>
        {currentProjectId && <BreadcrumbItem>{renderProjectDropdown()}</BreadcrumbItem>}
        {currentDevlogId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>{renderDevlogDropdown()}</BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
