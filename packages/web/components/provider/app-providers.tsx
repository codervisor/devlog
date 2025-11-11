'use client';

import { ThemeProvider } from '@/components/provider/theme-provider';
import { StoreProvider } from '@/components/provider/store-provider';
import { AuthProvider } from '@/components/auth';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>{children}</StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
