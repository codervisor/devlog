/**
 * URL generation utilities for name-based project routing
 */

import { generateSlugFromName } from '@codervisor/devlog-core';
import { apiClient } from '@/lib';

/**
 * Generate project URLs using name-based routing
 * Falls back to ID-based routing if name is not available
 */
export class ProjectUrls {
  /**
   * Generate URL for project main page
   */
  static project(projectId: number, projectName?: string): string {
    if (projectName) {
      return `/projects/${generateSlugFromName(projectName)}`;
    }
    return `/projects/${projectId}`;
  }

  /**
   * Generate URL for project devlogs list
   */
  static devlogs(projectId: number, projectName?: string): string {
    return `${this.project(projectId, projectName)}/devlogs`;
  }

  /**
   * Generate URL for specific devlog
   */
  static devlog(projectId: number, devlogId: number, projectName?: string): string {
    return `${this.devlogs(projectId, projectName)}/${devlogId}`;
  }

  /**
   * Generate URL for project settings
   */
  static settings(projectId: number, projectName?: string): string {
    return `${this.project(projectId, projectName)}/settings`;
  }

  /**
   * Generate URL for creating a new devlog in project
   */
  static createDevlog(projectId: number, projectName?: string): string {
    return `${this.devlogs(projectId, projectName)}/create`;
  }
}

/**
 * Legacy support - helper to get project name from current context
 * This can be used when we have projectId but need to fetch the name
 */
export async function getProjectName(projectId: number): Promise<string | null> {
  try {
    const project = await apiClient.get<{ name: string }>(`/api/projects/${projectId}`);
    return project.name;
  } catch (error) {
    console.error('Failed to fetch project name:', error);
    return null;
  }
}
