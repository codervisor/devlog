'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib';

// Local type definition to avoid importing from core package in client component
interface Project {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Local utility function to avoid importing from core package
function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ProjectResolverProps {
  identifier: string;
  identifierType: 'id' | 'name';
  children: (projectId: number, project?: Project) => React.ReactNode;
  onNotFound?: () => void;
}

/**
 * Resolves a project identifier (ID or name) to a project ID and project data
 * Handles URL redirects when using name-based routing
 */
export function ProjectResolver({ 
  identifier, 
  identifierType, 
  children, 
  onNotFound 
}: ProjectResolverProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function resolveProject() {
      try {
        setLoading(true);
        setError(null);

        // For numeric IDs, we can direct fetch, but for names we need to resolve
        const projectData = await apiClient.get<Project>(`/api/projects/${identifier}`);
        setProject(projectData);

        // If we're using name-based routing but the URL doesn't match the canonical slug,
        // redirect to the canonical URL
        if (identifierType === 'name') {
          const canonicalSlug = generateSlugFromName(projectData.name);
          if (identifier !== canonicalSlug) {
            // Redirect to canonical URL
            const currentPath = window.location.pathname;
            const newPath = currentPath.replace(`/projects/${identifier}`, `/projects/${canonicalSlug}`);
            router.replace(newPath);
            return;
          }
        }

      } catch (error) {
        console.error('Error resolving project:', error);
        
        // Handle specific API errors
        if (error instanceof ApiError && error.status === 404) {
          onNotFound?.();
          setError('Project not found');
        } else {
          setError('Failed to load project');
        }
      } finally {
        setLoading(false);
      }
    }

    resolveProject();
  }, [identifier, identifierType, router, onNotFound]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested project could not be found.'}</p>
          <button 
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return <>{children(project.id, project)}</>;
}
