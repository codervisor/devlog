'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import Link from 'next/link';
import { FolderIcon, BookOpenIcon, CheckIcon, ChevronDownIcon } from 'lucide-react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbSeparator
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
  const { currentProject, projects, setCurrentProject } = useProject();
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
      '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
      '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const switchProject = async (projectId: string) => {
    if (switchingProject || currentProject?.projectId === projectId) return;

    try {
      setSwitchingProject(true);
      
      const targetProject = projects.find((p) => p.id === projectId);
      if (!targetProject) {
        throw new Error('Project not found');
      }

      // Save project to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('devlog-current-project', projectId);
      }

      // Update the current project
      setCurrentProject({
        projectId,
        project: targetProject,
        isDefault: projectId === 'default',
      });

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
    if (!currentProject || projects.length <= 1) return null;

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
            <span>{currentProject.project.name}</span>
            <ChevronDownIcon size={10} className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {projects.map((project) => {
            const isCurrentProject = currentProject.projectId === project.id;
            
            return (
              <DropdownMenuItem
                key={project.id}
                disabled={isCurrentProject}
                onClick={() => !isCurrentProject && switchProject(project.id)}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: getProjectColor(project.name) }}
                >
                  {getProjectInitials(project.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {project.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {project.id}
                  </div>
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

  const getBreadcrumbItems = () => {
    const items = [];

    // Handle hierarchical project-based routes
    if (pathname.startsWith('/projects/')) {
      const pathParts = pathname.split('/').filter(Boolean);
      
      if (pathParts.length >= 2) {
        // Add Projects breadcrumb (always linkable)
        items.push({
          href: '/projects',
          label: 'Projects',
          icon: <FolderIcon size={14} />,
        });
        
        // Add project selector dropdown (instead of simple project name)
        if (currentProject?.project) {
          items.push({
            component: renderProjectDropdown(),
          });
        }
        
        // Remove all sub-path items (devlogs, create, etc.) - these are now handled by sidebar
        // The sidebar will show contextual navigation items based on the current route
      }
    } else if (pathname === '/projects') {
      // Only show Projects breadcrumb when on the projects listing page
      items.push({
        label: 'Projects',
        icon: <FolderIcon size={14} />,
      });
    }

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <Breadcrumb className="navigation-breadcrumb">
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {item.component ? (
                item.component
              ) : item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </BreadcrumbLink>
              ) : (
                <span className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              )}
            </BreadcrumbItem>
            {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
