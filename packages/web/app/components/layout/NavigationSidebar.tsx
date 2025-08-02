'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Home, SquareKanban } from 'lucide-react';

interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

export function NavigationSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { open, toggleSidebar } = useSidebar();

  // Handle client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const getProjectId = () => {
    const matched = pathname.match(/\/projects\/(\w+)/);
    if (matched) {
      return matched[1];
    }
    return null;
  };

  const projectsMenuItems = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <Home />,
      onClick: () => router.push('/projects'),
    },
  ];
  const projectDetailMenuItems = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <Home />,
      onClick: () => router.push(`/projects/${getProjectId()}`),
    },
    {
      key: 'list',
      label: 'Devlogs',
      icon: <SquareKanban />,
      onClick: () => router.push(`/projects/${getProjectId()}/devlogs`),
    },
  ];

  // Get contextual menu items based on current path
  const getMenuItems = (): SidebarItem[] => {
    if (!mounted) return [];

    const pathParts = pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      return projectsMenuItems;
    } else {
      return projectDetailMenuItems;
    }
  };

  // Determine selected key based on current pathname and menu items
  const getSelectedKey = () => {
    if (!mounted) return 'overview';

    const pathParts = pathname.split('/').filter(Boolean);

    if (pathname === '/' || pathname === '/projects') return 'projects';
    if (pathParts.length === 2 && pathParts[0] === 'projects') return 'overview';
    if (pathParts.length === 3 && pathParts[2] === 'devlogs') return 'list';
    if (pathParts.length === 4 && pathParts[2] === 'devlogs') return 'list';

    return 'overview';
  };

  // Don't render menu items until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  const menuItems = getMenuItems();

  return (
    <Sidebar collapsible="icon" className="py-1 border-r bg-background">
      <SidebarContent className="bg-background">
        <SidebarMenu className="space-y-2 p-2">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton isActive={getSelectedKey() === item.key} onClick={item.onClick}>
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 bg-background border-t-0">
        <SidebarTrigger className="h-8 w-8 p-0" onClick={toggleSidebar} />
      </SidebarFooter>
    </Sidebar>
  );
}
