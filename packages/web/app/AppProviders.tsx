'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { ProjectProvider } from './contexts/ProjectContext';
import { DevlogProvider } from './contexts/DevlogContext';
import { AppLayout } from './AppLayout';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <DevlogProvider>
          <AppLayout>{children}</AppLayout>
        </DevlogProvider>
      </ProjectProvider>
    </ThemeProvider>
  );
}
