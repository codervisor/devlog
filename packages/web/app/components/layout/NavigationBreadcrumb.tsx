'use client';

import React from 'react';
import { Breadcrumb } from 'antd';
import { usePathname } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import Link from 'next/link';
import { HomeIcon } from 'lucide-react';

export function NavigationBreadcrumb() {
  const pathname = usePathname();
  const { currentProject } = useProject();

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

    // Handle hierarchical project-based routes
    if (pathname.startsWith('/projects/')) {
      const pathParts = pathname.split('/').filter(Boolean);
      
      if (pathParts.length >= 2) {
        const projectId = pathParts[1];
        const project = currentProject?.project;
        
        // Add Projects breadcrumb
        items.push({
          title: <Link href="/projects">Projects</Link>,
        });
        
        // Add specific project breadcrumb
        if (project) {
          items.push({
            title: <Link href={`/projects/${projectId}`}>{project.name}</Link>,
          });
        }
        
        // Handle devlogs routes within project
        if (pathParts.length >= 3 && pathParts[2] === 'devlogs') {
          if (pathParts.length === 3) {
            // /projects/[id]/devlogs
            items.push({
              title: <span>Devlogs</span>,
            });
          } else if (pathParts.length === 4 && pathParts[3] === 'create') {
            // /projects/[id]/devlogs/create
            items.push(
              {
                title: <Link href={`/projects/${projectId}/devlogs`}>Devlogs</Link>,
              },
              {
                title: <span>Create</span>,
              }
            );
          } else if (pathParts.length === 4) {
            // /projects/[id]/devlogs/[devlogId]
            const devlogId = pathParts[3];
            items.push(
              {
                title: <Link href={`/projects/${projectId}/devlogs`}>Devlogs</Link>,
              },
              {
                title: <span>Devlog #{devlogId}</span>,
              }
            );
          }
        }
      }
    } else if (pathname === '/projects') {
      items.push({
        title: <span>Projects</span>,
      });
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
