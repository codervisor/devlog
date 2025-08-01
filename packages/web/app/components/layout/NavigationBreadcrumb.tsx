'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores';
import Link from 'next/link';
import { BookOpenIcon, CheckIcon, ChevronDownIcon, FolderIcon, Moon, Sun } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function NavigationBreadcrumb() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentProject, currentProjectId, projects } = useProjectStore();
  const [switchingProject, setSwitchingProject] = useState(false);

  const getProjectInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  const getProjectColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-cyan-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-lime-500',
      'bg-indigo-500',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const switchProject = async (projectId: number) => {
    if (switchingProject || currentProjectId === projectId) return;

    try {
      setSwitchingProject(true);

      const targetProject = projects.find((p) => p.id === projectId);
      if (!targetProject) {
        throw new Error('Project not found');
      }

      toast.success(`Switched to project: ${targetProject.name}`);

      // Navigate to the project dashboard
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error switching project:', error);
      toast.error('Failed to switch project');
    } finally {
      setSwitchingProject(false);
    }
  };

  const renderProjectDropdown = () => {
    if (!currentProject) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={switchingProject}
            className="flex items-center gap-2 px-2 h-auto text-inherit hover:bg-accent"
          >
            <BookOpenIcon size={14} />
            <span>{currentProject?.name}</span>
            <ChevronDownIcon size={10} className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {projects.map((project) => {
            const isCurrentProject = currentProjectId === project.id;

            return (
              <DropdownMenuItem
                key={project.id}
                disabled={isCurrentProject}
                onClick={() => !isCurrentProject && switchProject(project.id)}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${getProjectColor(project.name)}`}
                >
                  {getProjectInitials(project.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{project.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{project.id}</div>
                </div>
                {isCurrentProject && <CheckIcon size={14} className="text-primary flex-shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <Breadcrumb className="navigation-breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <FolderIcon size={14} />
                <span>{currentProject?.name}</span>
                <ChevronDownIcon size={10} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
          </DropdownMenu>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
