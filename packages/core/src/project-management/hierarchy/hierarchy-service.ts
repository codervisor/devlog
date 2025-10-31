/**
 * Hierarchy Service
 * 
 * Manages the project-machine-workspace hierarchy and provides
 * resolution and navigation capabilities across the organizational structure.
 * 
 * @module project-management/hierarchy/hierarchy-service
 * @category Project Management
 */

import { PrismaClient, Project, Machine, Workspace, ChatSession } from '@prisma/client';
import { PrismaServiceBase } from '../../services/prisma-service-base.js';

/**
 * Workspace context with full hierarchy information
 */
export interface WorkspaceContext {
  projectId: number;
  machineId: number;
  workspaceId: number;
  projectName: string;
  machineName: string;
}

/**
 * Machine input data for upsert operations
 */
export interface MachineCreateInput {
  machineId: string;
  hostname: string;
  username: string;
  osType: string;
  osVersion?: string;
  machineType: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Workspace input data for upsert operations
 */
export interface WorkspaceCreateInput {
  projectId: number;
  machineId: number;
  workspaceId: string;
  workspacePath: string;
  workspaceType: string;
  branch?: string;
  commit?: string;
}

/**
 * Project hierarchy with machines and workspaces
 */
export interface ProjectHierarchy {
  project: Project;
  machines: Array<{
    machine: Machine;
    workspaces: Array<{
      workspace: Workspace;
      sessions: ChatSession[];
      eventCount: number;
    }>;
  }>;
}

interface HierarchyServiceInstance {
  service: HierarchyService;
  createdAt: number;
}

export class HierarchyService extends PrismaServiceBase {
  private static instances: Map<string, HierarchyServiceInstance> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): HierarchyService {
    const key = 'default';
    return this.getOrCreateInstance(this.instances, key, () => new HierarchyService());
  }

  /**
   * Hook called when Prisma client is successfully connected
   */
  protected async onPrismaConnected(): Promise<void> {
    console.log('[HierarchyService] Service initialized with database connection');
  }

  /**
   * Hook called when service is running in fallback mode
   */
  protected async onFallbackMode(): Promise<void> {
    console.log('[HierarchyService] Service initialized in fallback mode');
  }

  /**
   * Hook called during disposal for cleanup
   */
  protected async onDispose(): Promise<void> {
    // Remove from instances map
    for (const [key, instance] of HierarchyService.instances.entries()) {
      if (instance.service === this) {
        HierarchyService.instances.delete(key);
        break;
      }
    }
  }

  /**
   * Resolve workspace to full context
   * 
   * @param workspaceId - VS Code workspace ID
   * @returns Full workspace context with hierarchy information
   * @throws Error if workspace not found
   */
  async resolveWorkspace(workspaceId: string): Promise<WorkspaceContext> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      throw new Error('HierarchyService is in fallback mode - database not available');
    }

    const workspace = await this.prismaClient!.workspace.findUnique({
      where: { workspaceId },
      include: {
        project: true,
        machine: true,
      },
    });

    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    return {
      projectId: workspace.project.id,
      machineId: workspace.machine.id,
      workspaceId: workspace.id,
      projectName: workspace.project.fullName,
      machineName: workspace.machine.hostname,
    };
  }

  /**
   * Get full hierarchy tree for a project
   * 
   * @param projectId - Project ID
   * @returns Project hierarchy with machines and workspaces
   * @throws Error if project not found
   */
  async getProjectHierarchy(projectId: number): Promise<ProjectHierarchy> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      throw new Error('HierarchyService is in fallback mode - database not available');
    }

    const project = await this.prismaClient!.project.findUnique({
      where: { id: projectId },
      include: {
        workspaces: {
          include: {
            machine: true,
            chatSessions: {
              include: {
                _count: {
                  select: { agentEvents: true },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Group workspaces by machine
    const machineMap = new Map<number, typeof project.workspaces>();
    for (const workspace of project.workspaces) {
      const machineId = workspace.machine.id;
      if (!machineMap.has(machineId)) {
        machineMap.set(machineId, []);
      }
      machineMap.get(machineId)!.push(workspace);
    }

    // Transform to hierarchy structure
    const machines = Array.from(machineMap.entries()).map(([machineId, workspaces]) => ({
      machine: workspaces[0].machine,
      workspaces: workspaces.map((ws) => ({
        workspace: ws,
        sessions: ws.chatSessions,
        eventCount: ws.chatSessions.reduce(
          (sum, s) => sum + s._count.agentEvents,
          0
        ),
      })),
    }));

    return { project, machines };
  }

  /**
   * Upsert machine
   * 
   * @param data - Machine creation data
   * @returns Upserted machine
   */
  async upsertMachine(data: MachineCreateInput): Promise<Machine> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      throw new Error('HierarchyService is in fallback mode - database not available');
    }

    return this.prismaClient!.machine.upsert({
      where: { machineId: data.machineId },
      create: {
        machineId: data.machineId,
        hostname: data.hostname,
        username: data.username,
        osType: data.osType,
        osVersion: data.osVersion,
        machineType: data.machineType,
        ipAddress: data.ipAddress,
        metadata: data.metadata || {},
      },
      update: {
        lastSeenAt: new Date(),
        osVersion: data.osVersion,
        ipAddress: data.ipAddress,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Upsert workspace
   * 
   * @param data - Workspace creation data
   * @returns Upserted workspace
   */
  async upsertWorkspace(data: WorkspaceCreateInput): Promise<Workspace> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      throw new Error('HierarchyService is in fallback mode - database not available');
    }

    return this.prismaClient!.workspace.upsert({
      where: { workspaceId: data.workspaceId },
      create: {
        projectId: data.projectId,
        machineId: data.machineId,
        workspaceId: data.workspaceId,
        workspacePath: data.workspacePath,
        workspaceType: data.workspaceType,
        branch: data.branch,
        commit: data.commit,
      },
      update: {
        lastSeenAt: new Date(),
        branch: data.branch,
        commit: data.commit,
      },
    });
  }

  /**
   * Resolve or create project from git URL
   * 
   * @param repoUrl - Git repository URL
   * @returns Resolved or created project
   */
  async resolveProject(repoUrl: string): Promise<Project> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      throw new Error('HierarchyService is in fallback mode - database not available');
    }

    const normalized = this.normalizeGitUrl(repoUrl);
    const { owner, repo } = this.parseGitUrl(normalized);

    return this.prismaClient!.project.upsert({
      where: { repoUrl: normalized },
      create: {
        name: repo,
        fullName: `${owner}/${repo}`,
        repoUrl: normalized,
        repoOwner: owner,
        repoName: repo,
      },
      update: {
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get machine by ID
   * 
   * @param id - Machine ID
   * @returns Machine or null if not found
   */
  async getMachine(id: number): Promise<Machine | null> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      return null;
    }

    return this.prismaClient!.machine.findUnique({
      where: { id },
    });
  }

  /**
   * List all machines
   * 
   * @returns Array of machines
   */
  async listMachines(): Promise<Machine[]> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      return [];
    }

    return this.prismaClient!.machine.findMany({
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * Get workspace by VS Code workspace ID
   * 
   * @param workspaceId - VS Code workspace ID
   * @returns Workspace or null if not found
   */
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      return null;
    }

    return this.prismaClient!.workspace.findUnique({
      where: { workspaceId },
    });
  }

  /**
   * Normalize git URL to standard format
   * 
   * @param url - Git URL
   * @returns Normalized URL
   */
  private normalizeGitUrl(url: string): string {
    // Convert SSH to HTTPS and normalize
    url = url.replace(/^git@github\.com:/, 'https://github.com/');
    url = url.replace(/\.git$/, '');
    return url;
  }

  /**
   * Parse git URL to extract owner and repo
   * 
   * @param url - Normalized git URL
   * @returns Owner and repo name
   * @throws Error if URL is invalid
   */
  private parseGitUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }
    return { owner: match[1], repo: match[2] };
  }
}
