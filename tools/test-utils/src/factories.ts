/**
 * Test factories for creating mock data
 */

import type {
  DevlogEntry,
  DevlogStatus,
  DevlogType,
  DevlogPriority,
  Project,
  AgentSession,
  AgentEvent,
  ObservabilityAgentType,
  AgentEventType,
} from '@codervisor/devlog-shared';

let idCounter = 1;

/**
 * Reset the ID counter (useful for test isolation)
 */
export function resetIdCounter(): void {
  idCounter = 1;
}

/**
 * Generate a unique ID
 */
function nextId(): number {
  return idCounter++;
}

/**
 * Create a mock devlog entry
 */
export function createMockDevlogEntry(
  overrides?: Partial<DevlogEntry>
): DevlogEntry {
  const id = overrides?.id ?? nextId();
  const status: DevlogStatus = overrides?.status ?? 'new';
  const type: DevlogType = overrides?.type ?? 'task';
  const priority: DevlogPriority = overrides?.priority ?? 'medium';

  return {
    id,
    key: `DEVLOG-${id}`,
    title: `Test Devlog Entry ${id}`,
    type,
    description: 'This is a test devlog entry',
    status,
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: 1,
    archived: false,
    ...overrides,
  };
}

/**
 * Create a mock project
 */
export function createMockProject(overrides?: Partial<Project>): Project {
  const id = overrides?.id ?? nextId();

  return {
    id,
    name: `test-project-${id}`,
    description: 'A test project',
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock agent session
 */
export function createMockAgentSession(
  overrides?: Partial<AgentSession>
): AgentSession {
  const agentId: ObservabilityAgentType =
    overrides?.agentId ?? 'github-copilot';

  return {
    id: `session-${nextId()}`,
    agentId,
    agentVersion: '1.0.0',
    projectId: 1,
    startTime: new Date(),
    context: {
      branch: 'main',
      initialCommit: 'abc123',
      triggeredBy: 'user',
    },
    metrics: {
      eventsCount: 0,
      filesModified: 0,
      linesAdded: 0,
      linesRemoved: 0,
      tokensUsed: 0,
      commandsExecuted: 0,
      errorsEncountered: 0,
      testsRun: 0,
      testsPassed: 0,
      buildAttempts: 0,
      buildSuccesses: 0,
    },
    ...overrides,
  };
}

/**
 * Create a mock agent event
 */
export function createMockAgentEvent(
  overrides?: Partial<AgentEvent>
): AgentEvent {
  const agentId: ObservabilityAgentType =
    overrides?.agentId ?? 'github-copilot';
  const type: AgentEventType = overrides?.type ?? 'file_write';

  return {
    id: `event-${nextId()}`,
    timestamp: new Date(),
    type,
    agentId,
    agentVersion: '1.0.0',
    sessionId: 'session-1',
    projectId: 1,
    context: {
      workingDirectory: '/test/project',
      filePath: 'src/test.ts',
      branch: 'main',
      commit: 'abc123',
    },
    data: {},
    ...overrides,
  };
}

/**
 * Create multiple mock devlog entries
 */
export function createMockDevlogEntries(
  count: number,
  overrides?: Partial<DevlogEntry>
): DevlogEntry[] {
  return Array.from({ length: count }, () =>
    createMockDevlogEntry(overrides)
  );
}

/**
 * Create multiple mock projects
 */
export function createMockProjects(
  count: number,
  overrides?: Partial<Project>
): Project[] {
  return Array.from({ length: count }, () => createMockProject(overrides));
}

/**
 * Create multiple mock agent events
 */
export function createMockAgentEvents(
  count: number,
  overrides?: Partial<AgentEvent>
): AgentEvent[] {
  return Array.from({ length: count }, () => createMockAgentEvent(overrides));
}

// ============================================================================
// DATABASE FACTORIES (Prisma-based)
// ============================================================================

import type { PrismaClient, Project as PrismaProject, User as PrismaUser, Machine as PrismaMachine } from '@prisma/client';

/**
 * Factory for creating test data in the database
 * Uses PrismaClient to create actual database records
 */
export class TestDataFactory {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a test project
   */
  async createProject(data?: Partial<Omit<PrismaProject, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PrismaProject> {
    const timestamp = Date.now();
    return this.prisma.project.create({
      data: {
        name: data?.name || `test-project-${timestamp}`,
        fullName: data?.fullName || `test/project-${timestamp}`,
        repoUrl: data?.repoUrl || `git@github.com:test/project-${timestamp}.git`,
        repoOwner: data?.repoOwner || 'test',
        repoName: data?.repoName || `project-${timestamp}`,
        description: data?.description || 'Test project',
      },
    });
  }

  /**
   * Create a test user
   */
  async createUser(data?: Partial<Omit<PrismaUser, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PrismaUser> {
    const timestamp = Date.now();
    return this.prisma.user.create({
      data: {
        email: data?.email || `test-${timestamp}@example.com`,
        name: data?.name || `Test User ${timestamp}`,
        passwordHash: data?.passwordHash || '$2a$10$test.hash.value',
        isEmailVerified: data?.isEmailVerified ?? true,
        avatarUrl: data?.avatarUrl,
        lastLoginAt: data?.lastLoginAt,
      },
    });
  }

  /**
   * Create a test machine
   */
  async createMachine(data?: Partial<Omit<PrismaMachine, 'id' | 'createdAt' | 'lastSeenAt'>>): Promise<PrismaMachine> {
    const timestamp = Date.now();
    return this.prisma.machine.create({
      data: {
        machineId: data?.machineId || `test-machine-${timestamp}`,
        hostname: data?.hostname || `test-host-${timestamp}`,
        username: data?.username || 'testuser',
        osType: data?.osType || 'linux',
        machineType: data?.machineType || 'local',
        ...(data?.osVersion && { osVersion: data.osVersion }),
        ...(data?.ipAddress && { ipAddress: data.ipAddress }),
        ...(data?.metadata && { metadata: data.metadata as any }),
      },
    });
  }

  /**
   * Create a test workspace
   */
  async createWorkspace(projectId: number, machineId: number, data?: {
    workspaceId?: string;
    workspacePath?: string;
    workspaceType?: string;
    branch?: string;
    commit?: string;
  }) {
    const timestamp = Date.now();
    return this.prisma.workspace.create({
      data: {
        projectId,
        machineId,
        workspaceId: data?.workspaceId || `test-workspace-${timestamp}`,
        workspacePath: data?.workspacePath || `/test/workspace-${timestamp}`,
        workspaceType: data?.workspaceType || 'folder',
        branch: data?.branch || 'main',
        commit: data?.commit || 'abc123',
        ...data,
      },
    });
  }

  /**
   * Create a test devlog entry
   */
  async createDevlogEntry(projectId: number, data?: {
    key?: string;
    title?: string;
    type?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee?: string;
  }) {
    const id = nextId();
    return this.prisma.devlogEntry.create({
      data: {
        projectId,
        key: data?.key || `DEVLOG-${id}`,
        title: data?.title || `Test Devlog Entry ${id}`,
        type: data?.type || 'task',
        description: data?.description || 'Test devlog entry',
        status: data?.status || 'new',
        priority: data?.priority || 'medium',
        assignee: data?.assignee,
        ...data,
      },
    });
  }

  /**
   * Create a test chat session
   */
  async createChatSession(workspaceId: number, data?: {
    sessionId?: string;
    agentType?: string;
    modelId?: string;
    startedAt?: Date;
    endedAt?: Date;
  }) {
    return this.prisma.chatSession.create({
      data: {
        workspaceId,
        sessionId: data?.sessionId || crypto.randomUUID(),
        agentType: data?.agentType || 'copilot',
        modelId: data?.modelId || 'gpt-4',
        startedAt: data?.startedAt || new Date(),
        endedAt: data?.endedAt,
        ...data,
      },
    });
  }

  /**
   * Create a test agent session
   */
  async createAgentSession(projectId: number, data?: {
    id?: string;
    agentId?: string;
    agentVersion?: string;
    startTime?: Date;
    endTime?: Date;
    outcome?: string;
  }) {
    return this.prisma.agentSession.create({
      data: {
        projectId,
        id: data?.id || crypto.randomUUID(),
        agentId: data?.agentId || 'github-copilot',
        agentVersion: data?.agentVersion || '1.0.0',
        startTime: data?.startTime || new Date(),
        endTime: data?.endTime,
        outcome: data?.outcome,
        ...data,
      },
    });
  }

  /**
   * Create a complete test setup with project, machine, and workspace
   */
  async createCompleteSetup() {
    const project = await this.createProject();
    const machine = await this.createMachine();
    const workspace = await this.createWorkspace(project.id, machine.id);

    return { project, machine, workspace };
  }
}
