/**
 * Hierarchy Filter Component Tests
 * 
 * Basic unit tests for the HierarchyFilter component
 */

import { describe, it, expect, vi } from 'vitest';

describe('HierarchyFilter', () => {
  it('should export HierarchyFilter component', async () => {
    const { HierarchyFilter } = await import('@/components/agent-observability/hierarchy');
    expect(HierarchyFilter).toBeDefined();
  });

  it('should export HierarchyTree component', async () => {
    const { HierarchyTree } = await import('@/components/agent-observability/hierarchy');
    expect(HierarchyTree).toBeDefined();
  });
});

describe('Hierarchy Types', () => {
  it('should export hierarchy types', async () => {
    const types = await import('@/lib/types/hierarchy.js');
    expect(types).toBeDefined();
  });
});

describe('Hierarchy API Client', () => {
  it('should export HierarchyApiClient', async () => {
    const { HierarchyApiClient, hierarchyApi } = await import('@/lib/api/hierarchy-api-client.js');
    expect(HierarchyApiClient).toBeDefined();
    expect(hierarchyApi).toBeDefined();
  });

  it('should have correct methods', async () => {
    const { hierarchyApi } = await import('@/lib/api/hierarchy-api-client.js');
    expect(hierarchyApi.getProjectHierarchy).toBeDefined();
    expect(hierarchyApi.listMachines).toBeDefined();
    expect(hierarchyApi.getMachine).toBeDefined();
    expect(hierarchyApi.listWorkspaces).toBeDefined();
    expect(hierarchyApi.getWorkspace).toBeDefined();
  });
});

describe('Machine Activity Widget', () => {
  it('should export MachineActivityWidget component', async () => {
    const { MachineActivityWidget } = await import('@/components/agent-observability/widgets');
    expect(MachineActivityWidget).toBeDefined();
  });
});
