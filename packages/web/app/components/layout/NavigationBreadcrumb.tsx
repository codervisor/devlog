'use client';

import React from 'react';
import { Breadcrumb } from 'antd';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HomeIcon } from 'lucide-react';

export function NavigationBreadcrumb() {
  const pathname = usePathname();

  const getBreadcrumbItems = () => {
    const items = [
      {
        title: (
          <Link href="/">
            <HomeIcon size={16} />
          </Link>
        ),
      },
    ];

    if (pathname === '/devlogs') {
      items.push({
        title: <span>Devlogs</span>,
      });
    } else if (pathname === '/devlogs/create') {
      items.push(
        {
          title: <Link href="/devlogs">Devlogs</Link>,
        },
        {
          title: <span>Create</span>,
        },
      );
    } else if (pathname.startsWith('/devlogs/') && pathname !== '/devlogs/create') {
      const id = pathname.split('/')[2];
      items.push(
        {
          title: <Link href="/devlogs">Devlogs</Link>,
        },
        {
          title: <span>Devlog #{id}</span>,
        },
      );
    }

    return items;
  };

  return (
    <Breadcrumb 
      className="navigation-breadcrumb" 
      items={getBreadcrumbItems()} 
    />
  );
}
