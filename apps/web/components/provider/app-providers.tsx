'use client';

import { ThemeProvider } from '@/components/provider/theme-provider';
import { AppLayout } from '@/components/layout/app-layout';
import { StoreProvider } from '@/components/provider/store-provider';
import { AuthProvider } from '@/components/auth';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <AppLayout>{children}</AppLayout>
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
