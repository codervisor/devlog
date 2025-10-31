/**
 * Hierarchy Filter Component
 * 
 * Provides cascading filters for project → machine → workspace
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Project, Machine, Workspace } from '@prisma/client';

interface HierarchyFilterProps {
  className?: string;
}

export function HierarchyFilter({ className }: HierarchyFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [machines, setMachines] = useState<(Machine & { _count: { workspaces: number } })[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  
  const [loading, setLoading] = useState({
    projects: true,
    machines: false,
    workspaces: false,
  });
  
  const selectedProject = searchParams.get('projectId');
  const selectedMachine = searchParams.get('machineId');
  const selectedWorkspace = searchParams.get('workspaceId');
  
  // Load projects on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(prev => ({ ...prev, projects: true }));
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.success ? data.data : data);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(prev => ({ ...prev, projects: false }));
      }
    }
    
    fetchProjects();
  }, []);
  
  // Load machines when project selected
  useEffect(() => {
    async function fetchMachines() {
      if (!selectedProject) {
        setMachines([]);
        return;
      }
      
      try {
        setLoading(prev => ({ ...prev, machines: true }));
        const res = await fetch(`/api/machines?projectId=${selectedProject}`);
        if (res.ok) {
          const data = await res.json();
          setMachines(data.success ? data.data : data);
        }
      } catch (error) {
        console.error('Failed to load machines:', error);
      } finally {
        setLoading(prev => ({ ...prev, machines: false }));
      }
    }
    
    fetchMachines();
  }, [selectedProject]);
  
  // Load workspaces when machine selected
  useEffect(() => {
    async function fetchWorkspaces() {
      if (!selectedMachine) {
        setWorkspaces([]);
        return;
      }
      
      try {
        setLoading(prev => ({ ...prev, workspaces: true }));
        const res = await fetch(`/api/workspaces?machineId=${selectedMachine}`);
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data.success ? data.data : data);
        }
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      } finally {
        setLoading(prev => ({ ...prev, workspaces: false }));
      }
    }
    
    fetchWorkspaces();
  }, [selectedMachine]);
  
  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Clear child filters when parent changes
    if (key === 'projectId') {
      params.delete('machineId');
      params.delete('workspaceId');
    } else if (key === 'machineId') {
      params.delete('workspaceId');
    }
    
    router.push(`?${params.toString()}`);
  };
  
  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {/* Project Filter */}
      <Select
        value={selectedProject || undefined}
        onValueChange={value => updateFilter('projectId', value)}
        disabled={loading.projects}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={loading.projects ? 'Loading...' : 'Select project'} />
        </SelectTrigger>
        <SelectContent>
          {projects.map(project => (
            <SelectItem key={project.id} value={project.id.toString()}>
              {project.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Machine Filter (only shown when project selected) */}
      {selectedProject && (
        <Select
          value={selectedMachine || undefined}
          onValueChange={value => updateFilter('machineId', value)}
          disabled={loading.machines}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={loading.machines ? 'Loading...' : 'Select machine'} />
          </SelectTrigger>
          <SelectContent>
            {machines.map(machine => (
              <SelectItem key={machine.id} value={machine.id.toString()}>
                {machine.hostname} ({machine._count.workspaces})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {/* Workspace Filter (only shown when machine selected) */}
      {selectedMachine && (
        <Select
          value={selectedWorkspace || undefined}
          onValueChange={value => updateFilter('workspaceId', value)}
          disabled={loading.workspaces}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder={loading.workspaces ? 'Loading...' : 'Select workspace'} />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map(workspace => (
              <SelectItem key={workspace.id} value={workspace.id.toString()}>
                {workspace.workspacePath}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {/* Clear button (only shown when filters active) */}
      {(selectedProject || selectedMachine || selectedWorkspace) && (
        <button
          onClick={() => router.push('?')}
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
