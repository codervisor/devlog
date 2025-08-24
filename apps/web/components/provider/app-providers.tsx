'use client';

import { ThemeProvider } from '@/components/provider/theme-provider';
import { AppLayout } from '@/components/layout/app-layout';
import { StoreProvider } from '@/components/provider/store-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>
        <AppLayout>{children}</AppLayout>
      </StoreProvider>
    </ThemeProvider>
  );
}
