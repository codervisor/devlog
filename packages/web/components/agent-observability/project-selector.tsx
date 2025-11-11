/**
 * Project Selector Component
 *
 * Dropdown selector for filtering dashboard and sessions by project
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

interface Project {
  id: number;
  name: string;
  description?: string;
}

interface ProjectSelectorProps {
  className?: string;
}

export function ProjectSelector({ className }: ProjectSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Get selected project from URL, memoize to prevent infinite loops
  const selectedProject = searchParams.get('projectId') || 'all';

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setProjects(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const handleProjectChange = (value: string) => {
    // Update URL with the new project filter
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (value === 'all') {
      current.delete('projectId');
    } else {
      current.set('projectId', value);
    }

    // Construct the new URL
    const search = current.toString();
    const query = search ? `?${search}` : '';

    router.push(`${window.location.pathname}${query}`);
  };

  if (loading) {
    return (
      <div className={className}>
        <Select disabled>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Loading projects..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  if (projects.length === 0) {
    return null; // Don't show selector if no projects
  }

  return (
    <div className={className}>
      <Select value={selectedProject} onValueChange={handleProjectChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id.toString()}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
