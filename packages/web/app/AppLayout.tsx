'use client';

import React, { useEffect, useState } from 'react';
import { AppLayoutSkeleton, ErrorBoundary, NavigationSidebar, TopNavbar } from '@/components';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useLayoutStore } from '@/stores';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mounted, setMounted] = useState(false);

  const { sidebarOpen, setSidebarOpen } = useLayoutStore();

  // Handle client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <AppLayoutSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background w-full">
        <TopNavbar />
        <SidebarProvider
          defaultOpen={sidebarOpen}
          open={sidebarOpen}
          onOpenChange={(open) => {
            setSidebarOpen(open);
          }}
        >
          <div className="flex w-full h-[calc(100vh-3rem)]">
            <NavigationSidebar />
            <div className="flex-1 flex flex-col w-full">
              <main className="flex-1 p-6 w-full overflow-auto">
                <div className="w-full">{children}</div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </ErrorBoundary>
  );
}
