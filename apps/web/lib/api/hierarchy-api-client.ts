/**
 * Hierarchy API client for fetching hierarchy data
 */

import { ApiClient } from './api-client';
import type { ProjectHierarchy } from '@/lib/types/hierarchy';
import type { Machine, Workspace } from '@prisma/client';

/**
 * Client for hierarchy-related API calls
 */
export class HierarchyApiClient {
  private client: ApiClient;

  constructor(baseUrl = '') {
    this.client = new ApiClient({ baseUrl });
  }

  /**
   * Get complete project hierarchy (machines, workspaces, sessions)
   */
  async getProjectHierarchy(projectId: number): Promise<ProjectHierarchy> {
    return this.client.get<ProjectHierarchy>(`/api/projects/${projectId}/hierarchy`);
  }

  /**
   * List all machines with workspace counts
   */
  async listMachines(params?: {
    projectId?: number;
  }): Promise<Array<Machine & { _count: { workspaces: number } }>> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) {
      searchParams.set('projectId', params.projectId.toString());
    }
    
    const url = `/api/machines${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.client.get<Array<Machine & { _count: { workspaces: number } }>>(url);
  }

  /**
   * Get machine details with workspaces
   */
  async getMachine(machineId: number): Promise<Machine & { workspaces: Workspace[] }> {
    return this.client.get<Machine & { workspaces: Workspace[] }>(`/api/machines/${machineId}`);
  }

  /**
   * List workspaces for a machine
   */
  async listWorkspaces(params?: {
    machineId?: number;
    projectId?: number;
  }): Promise<Workspace[]> {
    const searchParams = new URLSearchParams();
    if (params?.machineId) {
      searchParams.set('machineId', params.machineId.toString());
    }
    if (params?.projectId) {
      searchParams.set('projectId', params.projectId.toString());
    }
    
    const url = `/api/workspaces${searchParams.toString() ? `?${searchParams}` : ''}`;
    return this.client.get<Workspace[]>(url);
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return this.client.get<Workspace>(`/api/workspaces/${workspaceId}`);
  }
}

/**
 * Default hierarchy API client instance
 */
export const hierarchyApi = new HierarchyApiClient();
