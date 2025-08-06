'use client';

import React, { useEffect, useState } from 'react';
import { AppLayoutSkeleton, ErrorBoundary, NavigationSidebar, TopNavbar } from '@/components';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from 'sonner';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mounted, setMounted] = useState(false);

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
      <Toaster />
      <div className="min-h-screen bg-background w-full">
        <TopNavbar />
        <SidebarProvider>
          <div className="flex w-full h-screen-minus-nav">
            <NavigationSidebar />
            <SidebarInset>{children}</SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </ErrorBoundary>
  );
}
