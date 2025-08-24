import type { Metadata } from 'next';
import { AppProviders } from '@/components/provider/app-providers';
import '@/styles/globals.css';
import '@/styles/fonts.css';

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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
