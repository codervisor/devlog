import { useMemo } from 'react';
import { DevlogApiClient, handleApiError } from '@/lib';
import { useProject } from '@/contexts/ProjectContext';

export interface DevlogHookOptions {
  /**
   * Project ID to use. If not provided, will use the current project from context.
   * If provided, will bypass context and use the explicit project ID.
   */
  projectId?: number;

  /**
   * Whether to use the DevlogContext for shared state management.
   * Only works when projectId is not provided.
   * @default true
   */
  useContext?: boolean;
}

/**
 * Resolves the project ID to use, either from explicit option or current project context
 */
export function useProjectId(explicitProjectId?: number): number | null {
  const { currentProject } = useProject();
  return explicitProjectId || currentProject?.projectId || null;
}

/**
 * Creates a DevlogApiClient instance for the resolved project ID
 */
export function useDevlogApiClient(projectId?: number): DevlogApiClient | null {
  const resolvedProjectId = useProjectId(projectId);

  return useMemo(() => {
    return resolvedProjectId ? new DevlogApiClient(resolvedProjectId.toString()) : null;
  }, [resolvedProjectId]);
}

/**
 * Determines if context should be used based on options
 */
export function shouldUseContext(options: DevlogHookOptions, contextData: any): boolean {
  const { projectId: explicitProjectId, useContext = true } = options;
  return useContext && !explicitProjectId && !!contextData;
}

/**
 * Common error handling for devlog operations
 */
export function handleDevlogError(err: unknown, operation: string): string {
  const errorMessage = handleApiError(err);
  console.error(`Failed to ${operation}:`, err);
  return errorMessage;
}

/**
 * Validates that required dependencies are available for an operation
 */
export function validateDevlogDependencies(
  projectId: number | null,
  devlogClient: DevlogApiClient | null,
): void {
  if (!projectId || !devlogClient) {
    throw new Error('No project ID available');
  }
}
