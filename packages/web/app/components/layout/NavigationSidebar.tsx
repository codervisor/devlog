'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { DevlogStats } from '@codervisor/devlog-core';
import { OverviewStats } from '@/components';
import { useProject } from '@/contexts/ProjectContext';
import styles from './NavigationSidebar.module.css';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AppWindowIcon,
  LayoutDashboardIcon,
  FileTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  WifiIcon,
} from 'lucide-react';

interface NavigationSidebarProps {
  stats?: DevlogStats | null;
  statsLoading?: boolean;
  collapsed?: boolean;
  connected: boolean;
  onToggle?: () => void;
}

export function NavigationSidebar({
  stats,
  statsLoading = false,
  collapsed = false,
  connected,
  onToggle,
}: NavigationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { currentProject } = useProject();

  // Handle client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if sidebar should be hidden
  const shouldHideSidebar = () => {
    if (!mounted) return false;
    // Hide sidebar on /projects page
    return pathname === '/projects';
  };

  // Get contextual menu items based on current path
  const getMenuItems = () => {
    if (!mounted) return [];
    
    const pathParts = pathname.split('/').filter(Boolean);
    
    // Dashboard page (/)
    if (pathname === '/') {
      return [
        {
          key: 'projects',
          label: 'Projects',
          icon: <AppWindowIcon size={16} />,
        },
      ];
    }
    
    // Project detail page (/projects/[id])
    if (pathParts.length === 2 && pathParts[0] === 'projects') {
      return [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboardIcon size={16} />,
        },
        {
          key: 'list',
          label: 'Devlogs',
          icon: <FileTextIcon size={16} />,
        },
        {
          key: 'create',
          label: 'New Devlog',
          icon: <PlusIcon size={16} />,
        },
      ];
    }
    
    // Project devlogs page (/projects/[id]/devlogs)
    if (pathParts.length === 3 && pathParts[0] === 'projects' && pathParts[2] === 'devlogs') {
      return [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboardIcon size={16} />,
        },
        {
          key: 'create',
          label: 'New Devlog',
          icon: <PlusIcon size={16} />,
        },
      ];
    }
    
    // Devlog detail page (/projects/[id]/devlogs/[devlogId])
    if (pathParts.length === 4 && pathParts[0] === 'projects' && pathParts[2] === 'devlogs') {
      return [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboardIcon size={16} />,
        },
        {
          key: 'list',
          label: 'Back to Devlogs',
          icon: <FileTextIcon size={16} />,
        },
        {
          key: 'create',
          label: 'New Devlog',
          icon: <PlusIcon size={16} />,
        },
      ];
    }
    
    // Devlog create page (/projects/[id]/devlogs/create)
    if (pathParts.length === 4 && pathParts[0] === 'projects' && pathParts[3] === 'create') {
      return [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboardIcon size={16} />,
        },
        {
          key: 'list',
          label: 'Back to Devlogs',
          icon: <FileTextIcon size={16} />,
        },
      ];
    }
    
    // Default fallback
    return [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboardIcon size={16} />,
      },
      {
        key: 'projects',
        label: 'Projects',
        icon: <AppWindowIcon size={16} />,
      },
    ];
  };

  // Determine selected key based on current pathname and menu items
  const getSelectedKey = () => {
    if (!mounted) return 'dashboard';
    
    const pathParts = pathname.split('/').filter(Boolean);
    
    if (pathname === '/') return 'projects';
    if (pathParts.length === 2 && pathParts[0] === 'projects') return 'dashboard';
    if (pathParts.length === 3 && pathParts[2] === 'devlogs') return 'list';
    if (pathParts.length === 4 && pathParts[3] === 'create') return 'create';
    if (pathParts.length === 4 && pathParts[2] === 'devlogs') return 'list';
    
    return 'dashboard';
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    if (!mounted) return;

    switch (key) {
      case 'dashboard':
        router.push('/');
        break;
      case 'projects':
        router.push('/projects');
        break;
      case 'list':
        // If a project is selected, go to that project's devlogs
        // Otherwise, redirect to projects to select one first
        if (currentProject) {
          router.push(`/projects/${currentProject.projectId}/devlogs`);
        } else {
          router.push('/projects');
        }
        break;
      case 'create':
        // If a project is selected, create within that project
        // Otherwise, redirect to projects to select one first
        if (currentProject) {
          router.push(`/projects/${currentProject.projectId}/devlogs/create`);
        } else {
          router.push('/projects');
        }
        break;
    }
  };

  // Don't render menu items until mounted to prevent hydration issues
  if (!mounted || shouldHideSidebar()) {
    return null;
  }

  const menuItems = getMenuItems();

  return (
    <Sidebar className="w-72 border-r bg-background">
      <SidebarContent>
        <SidebarMenu className="space-y-1 px-2">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                onClick={() => handleMenuClick({ key: item.key })}
                isActive={getSelectedKey() === item.key}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium"
              >
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-default">
                  <WifiIcon
                    size={16}
                    className={connected ? 'text-green-500' : 'text-red-500'}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {connected ? 'Connected to MCP server' : 'Disconnected from MCP server'}
              </TooltipContent>
            </Tooltip>

            {(stats || statsLoading) && (
              <OverviewStats stats={stats || null} loading={statsLoading} variant="icon" />
            )}
          </div>

          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
