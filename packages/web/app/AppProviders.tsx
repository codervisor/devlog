'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppLayout } from './AppLayout';
import { StoreProvider } from '@/components/providers/store-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>
        <AppLayout>{children}</AppLayout>
      </StoreProvider>
    </ThemeProvider>
  );
}
