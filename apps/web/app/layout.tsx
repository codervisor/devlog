import type { Metadata } from 'next';
import { AppProviders } from '@/components/provider/app-providers';
import '@/styles/globals.css';
import '@/styles/fonts.css';
import { AppLayout } from '@/components/layout/app-layout';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'Devlog - AI Agent Observability Platform',
  description: 'Monitor, analyze, and improve AI coding agent performance. Track sessions, events, and work items in real-time.',
  icons: {
    icon: '/devlog-logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  console.log('pathname:', pathname);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-inter">
        <AppProviders>
          {pathname.match(/^\/(login|register)/) ? children : <AppLayout>{children}</AppLayout>}
        </AppProviders>
      </body>
    </html>
  );
}
