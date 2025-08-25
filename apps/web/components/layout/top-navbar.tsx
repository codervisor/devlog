import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NavigationBreadcrumb } from './navigation-breadcrumb';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function TopNavbar() {
  return (
    <header className="flex items-center justify-between h-12 flex-none bg-background text-foreground px-3 border-b border-border z-[100] static md:px-4">
      <div className="flex items-center gap-6 flex-1 md:gap-4">
        <Link href="/projects" className="flex items-center no-underline">
          <Image src="/devlog-logo-text.svg" alt="Devlog Logo" width={120} height={32} />
        </Link>
        <div className="flex items-center hidden md:flex">
          <NavigationBreadcrumb />
        </div>
      </div>
      <div className="flex items-center gap-4 justify-end">
        <ThemeToggle />
        {/* TODO: Replace with real user info/menu */}
        <div className="bg-muted rounded-2xl px-4 py-1.5 text-sm text-muted-foreground border border-border">
          User
        </div>
      </div>
    </header>
  );
}
