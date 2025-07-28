'use client';

import React, { useEffect, useState } from 'react';
import { NavigationSidebar, ErrorBoundary, AppLayoutSkeleton, TopNavbar } from '@/components';
import { useDevlogContext } from './contexts/DevlogContext';
import { useStats } from '@/hooks/useStats';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { error, connected } = useDevlogContext();
  const { stats, loading: isLoadingStats } = useStats();

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
      <div className="min-h-screen bg-background">
        <TopNavbar />
        <div className="flex flex-1">
          <NavigationSidebar
            stats={stats}
            statsLoading={isLoadingStats}
            collapsed={sidebarCollapsed}
            connected={connected}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 p-6">
              <div className="max-w-full">
                {error && (
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
