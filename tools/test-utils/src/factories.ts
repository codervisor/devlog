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
