/**
 * URL generation utilities for name-based project routing
 */

import { generateSlugFromName } from '@codervisor/devlog-core';

/**
 * Generate project URLs using name-based routing only
 */
export class ProjectUrls {
  /**
   * Generate URL for project main page
   */
  static project(projectName: string): string {
    return `/projects/${generateSlugFromName(projectName)}`;
  }

  /**
   * Generate URL for project devlogs list
   */
  static devlogs(projectName: string): string {
    return `${this.project(projectName)}/devlogs`;
  }

  /**
   * Generate URL for specific devlog
   */
  static devlog(projectName: string, devlogId: number): string {
    return `${this.devlogs(projectName)}/${devlogId}`;
  }

  /**
   * Generate URL for project settings
   */
  static settings(projectName: string): string {
    return `${this.project(projectName)}/settings`;
  }

  /**
   * Generate URL for creating a new devlog in project
   */
  static createDevlog(projectName: string): string {
    return `${this.devlogs(projectName)}/create`;
  }
}
