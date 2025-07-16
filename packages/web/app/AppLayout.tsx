'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Layout } from 'antd';
import { NavigationSidebar, ErrorBoundary, AppLayoutSkeleton } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useStats } from '@/hooks/useStats';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { devlogs, error, connected } = useDevlogs();
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
      <Layout className="app-layout">
        <NavigationSidebar
          stats={stats}
          statsLoading={isLoadingStats}
          collapsed={sidebarCollapsed}
          connected={connected}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <Layout>
          <Content className="app-content">
            <div className="app-content-wrapper">
              {error && (
                <Alert
                  message="Error"
                  description={error}
                  type="error"
                  showIcon
                  closable
                  className="app-error-alert"
                />
              )}
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </ErrorBoundary>
  );
}
