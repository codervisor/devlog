import type { Metadata } from 'next';
import { AppLayout } from './AppLayout';
import { ProjectProvider } from './contexts/ProjectContext';
import { DevlogProvider } from './contexts/DevlogContext';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.css';
import './fonts.css';

export const metadata: Metadata = {
  title: 'Devlog Management',
  description: 'Development log tracking and management dashboard',
  icons: {
    icon: '/devlog-logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-inter">
        <ThemeProvider>
          <ProjectProvider>
            <DevlogProvider>
              <AppLayout>{children}</AppLayout>
            </DevlogProvider>
          </ProjectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
