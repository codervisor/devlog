'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppWindowIcon, FileTextIcon, LayoutDashboardIcon } from 'lucide-react';

interface NavigationSidebarProps {
  // No props needed - using built-in sidebar state
}

export function NavigationSidebar(_props: NavigationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { currentProject } = useProjectStore();

  // Handle client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if sidebar should be hidden
  const shouldHideSidebar = () => {
    if (!mounted) return false;
    // No pages currently hide the sidebar
    return false;
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

    // Projects page (/projects)
    if (pathname === '/projects') {
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
          label: 'Overview',
          icon: <LayoutDashboardIcon size={16} />,
        },
        {
          key: 'list',
          label: 'Devlogs',
          icon: <FileTextIcon size={16} />,
        },
      ];
    }

    // Project devlogs page (/projects/[id]/devlogs)
    if (pathParts.length === 3 && pathParts[0] === 'projects' && pathParts[2] === 'devlogs') {
      return [
        {
          key: 'dashboard',
          label: 'Overview',
          icon: <LayoutDashboardIcon size={16} />,
        },
        {
          key: 'list',
          label: 'Devlogs',
          icon: <FileTextIcon size={16} />,
        },
      ];
    }

    // Devlog detail page (/projects/[id]/devlogs/[devlogId])
    if (pathParts.length === 4 && pathParts[0] === 'projects' && pathParts[2] === 'devlogs') {
      return [
        {
          key: 'dashboard',
          label: 'Overview',
          icon: <LayoutDashboardIcon size={16} />,
        },
        {
          key: 'list',
          label: 'Devlogs',
          icon: <FileTextIcon size={16} />,
        },
      ];
    }

    // Default fallback
    return [
      {
        key: 'dashboard',
        label: 'Overview',
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

    if (pathname === '/' || pathname === '/projects') return 'projects';
    if (pathParts.length === 2 && pathParts[0] === 'projects') return 'dashboard';
    if (pathParts.length === 3 && pathParts[2] === 'devlogs') return 'list';
    if (pathParts.length === 4 && pathParts[2] === 'devlogs') return 'list';

    return 'dashboard';
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    if (!mounted) return;

    const pathParts = pathname.split('/').filter(Boolean);
    const isInProjectContext = pathParts.length >= 2 && pathParts[0] === 'projects' && pathParts[1];
    const projectId = isInProjectContext ? pathParts[1] : null;

    switch (key) {
      case 'dashboard':
        if (projectId) {
          // We're in a project context, go to the project dashboard
          router.push(`/projects/${projectId}`);
        } else {
          // We're not in a project context, go to the main dashboard (which redirects to projects)
          router.push('/');
        }
        break;
      case 'projects':
        router.push('/projects');
        break;
      case 'list':
        // If a project is selected, go to that project's devlogs
        // Otherwise, redirect to projects to select one first
        if (currentProject) {
          router.push(`/projects/${currentProject.projectId}/devlogs`);
        } else if (projectId) {
          // Use project from URL if currentProject is not available
          router.push(`/projects/${projectId}/devlogs`);
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
    <Sidebar className="border-r bg-background">
      <SidebarContent className="bg-background">
        <SidebarMenu className="space-y-2 px-4 py-2">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                onClick={() => handleMenuClick({ key: item.key })}
                isActive={getSelectedKey() === item.key}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium min-h-[44px] rounded-md"
              >
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-background border-t-0">
        <SidebarTrigger className="h-8 w-8 p-0" />
      </SidebarFooter>
    </Sidebar>
  );
}
