import React from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { NavigationBreadcrumb } from './NavigationBreadcrumb';

export function TopNavbar() {
  return (
    <header className="flex items-center justify-between h-12 flex-none bg-white text-gray-800 px-3 border-b border-gray-200 z-[100] static md:px-4">
      <div className="flex items-center gap-6 flex-1 md:gap-4">
        <Link href="/" className="flex items-center no-underline">
          <Image src="/devlog-logo-text.svg" alt="Devlog Logo" width={120} height={32} />
        </Link>
        <div className="flex items-center hidden md:flex">
          <NavigationBreadcrumb />
        </div>
      </div>
      <div className="flex items-center gap-4 justify-end">
        {/* TODO: Replace with real user info/menu */}
        <div className="bg-gray-100 rounded-2xl px-4 py-1.5 text-sm text-gray-600 border border-gray-300">
          User
        </div>
      </div>
    </header>
  );
}
