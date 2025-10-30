'use client';

import React, { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDevlogStore, useProjectStore } from '@/stores';
import { Check, ChevronsUpDown, NotepadText, Package, Search } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function NavigationBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();

  // State for devlog search
  const [devlogSearchText, setDevlogSearchText] = useState('');

  // Parse project name and devlog ID from URL instead of using context hooks
  // since this component is rendered at app level, outside of the provider hierarchy
  const pathSegments = pathname.split('/').filter(Boolean);
  let projectName: string | null = null;
  let devlogId: number | null = null;

  // Check if we're in a project path: /projects/[name] or /projects/[name]/devlog/[id]
  if (pathSegments[0] === 'projects' && pathSegments[1]) {
    projectName = pathSegments[1];

    // Check if we're in a devlog path
    if (pathSegments[2] === 'devlogs' && pathSegments[3]) {
      const parsedDevlogId = parseInt(pathSegments[3], 10);
      if (!isNaN(parsedDevlogId)) {
        devlogId = parsedDevlogId;
      }
    }
  }

  const { currentProjectContext, currentProjectName, projectsContext, fetchProjects } =
    useProjectStore();
  const { currentDevlogContext, navigationDevlogsContext, fetchNavigationDevlogs } =
    useDevlogStore();

  // Filter devlog for search
  const filteredDevlogs = useMemo(() => {
    const devlogs = navigationDevlogsContext.data || [];
    const sorted = devlogs.sort((a, b) => {
      // Sort by ID descending (most recent first)
      return (b.id ?? 0) - (a.id ?? 0);
    });

    // Apply search filter
    if (!devlogSearchText.trim()) {
      return sorted;
    }

    return sorted.filter(
      (devlog) =>
        devlog.title?.toLowerCase().includes(devlogSearchText.toLowerCase()) ||
        devlog.id?.toString().includes(devlogSearchText) ||
        devlog.status?.toLowerCase().includes(devlogSearchText.toLowerCase()) ||
        devlog.type?.toLowerCase().includes(devlogSearchText.toLowerCase()),
    );
  }, [navigationDevlogsContext.data, devlogSearchText]);

  // If we are not in a project context, do not render the breadcrumb
  if (!projectName) {
    return null;
  }

  const switchProject = async (projectName: string) => {
    if (currentProjectName === projectName) return;

    try {
      const targetProject = projectsContext.data?.find((p) => p.name === projectName);
      if (!targetProject) {
        throw new Error('Project not found');
      }

      toast.success(`Switched to project: ${targetProject.name}`);

      // Navigate to the project dashboard using project name
      router.push(`/projects/${projectName}`);
    } catch (error) {
      console.error('Error switching project:', error);
      toast.error('Failed to switch project');
    }
  };

  const switchDevlog = async (devlogId: number) => {
    if (!projectName) return;

    try {
      toast.success(`Switched to devlog: #${devlogId}`);

      // Navigate to the devlog detail page
      router.push(`/projects/${projectName}/devlogs/${devlogId}`);
    } catch (error) {
      console.error('Error switching work item:', error);
      toast.error('Failed to switch work item');
    }
  };

  const dropdownSkeletons = Array.from({ length: 3 }).map((_, index) => (
    <DropdownMenuItem key={index} disabled className="flex items-center gap-3 p-3">
      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-8" />
      </div>
    </DropdownMenuItem>
  ));

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
      <DropdownMenu
        onOpenChange={async (open) => {
          if (open) await fetchProjects();
        }}
      >
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer rounded">
            <Package size={14} />
            <span>{projectName}</span>
            <ChevronsUpDown size={14} className="text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* Show skeleton items if projects list is loading */}
          {projectsContext.loading
            ? dropdownSkeletons
            : projectsContext.data?.map((project) => {
                const isCurrentProject = projectName === project.name;
                return (
                  <DropdownMenuItem
                    key={project.id}
                    disabled={isCurrentProject}
                    onClick={() => !isCurrentProject && switchProject(project.name)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{project.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {project.description}
                      </div>
                    </div>
                    {isCurrentProject && <Check size={14} className="text-primary flex-shrink-0" />}
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
      <DropdownMenu
        onOpenChange={async (open) => {
          if (open) {
            // Fetch devlog when opening the dropdown
            await fetchNavigationDevlogs();
            // Reset search when opening
            setDevlogSearchText('');
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer rounded hover:bg-accent px-2 py-1">
            <NotepadText size={14} />
            <span>#{currentDevlogContext.data?.id || devlogId}</span>
            <ChevronsUpDown size={14} className="text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[400px]">
          {/* Search Input */}
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search work items..."
                value={devlogSearchText}
                onChange={(e) => setDevlogSearchText(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Loading State */}
          {navigationDevlogsContext.loading ? (
            <>
              {Array.from({ length: 5 }).map((_, index) => (
                <DropdownMenuItem key={index} disabled className="flex items-center gap-3 p-3">
                  <Skeleton className="w-8 h-4" />
                  <Skeleton className="w-full h-4" />
                </DropdownMenuItem>
              ))}
            </>
          ) : (
            <>
              {/* No Results */}
              {filteredDevlogs.length === 0 && (
                <DropdownMenuItem disabled className="p-3 text-center text-muted-foreground">
                  {devlogSearchText ? 'No work items found' : 'No work items available'}
                </DropdownMenuItem>
              )}

              {/* Devlog Items */}
              {filteredDevlogs.map((devlog) => {
                const isCurrentDevlog = devlogId === devlog.id;
                return (
                  <DropdownMenuItem
                    key={devlog.id}
                    disabled={isCurrentDevlog}
                    onClick={() => !isCurrentDevlog && switchDevlog(devlog.id!)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      #{devlog.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{devlog.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {devlog.status} • {devlog.type}
                      </div>
                    </div>
                    {isCurrentDevlog && <Check size={14} className="text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <Breadcrumb className="navigation-breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>{renderProjectDropdown()}</BreadcrumbItem>
        {devlogId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>{renderDevlogDropdown()}</BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
