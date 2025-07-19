import type { Metadata } from 'next';
import { ConfigProvider } from 'antd';
import { AppLayout } from './AppLayout';
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
    <html lang="en">
      <body className="font-inter">
        <ConfigProvider>
          <AppLayout>{children}</AppLayout>
        </ConfigProvider>
      </body>
    </html>
  );
}
