'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient, handleApiError } from '@/lib';
import { Project } from '@codervisor/devlog-core';

interface ProjectState {
  // State
  currentProjectId: number | null;
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentProjectId: (id: number | null) => void;
  fetchCurrentProject: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentProjectId: null,
    currentProject: null,
    projects: [],
    loading: true,
    error: null,

    // Actions
    setCurrentProjectId: (id: number | null) => {
      set({ currentProjectId: id });
    },
    fetchCurrentProject: async () => {
      const currentProjectId = get().currentProjectId;
      try {
        const currentProject = await apiClient.get<Project>(`/api/projects/${currentProjectId}`);
        set({ currentProject });
      } catch (e) {
        const errorMessage = handleApiError(e);
        set({ error: errorMessage });
        console.error('Error fetching current project:', e);
      }
    },

    fetchProjects: async () => {
      try {
        set({ loading: true, error: null });
        const projectsList = await apiClient.get<Project[]>('/api/projects');
        set({ projects: projectsList });
      } catch (err) {
        const errorMessage = handleApiError(err);
        set({ error: errorMessage });
        console.error('Error loading projects:', err);
      } finally {
        set({ loading: false });
      }
    },

    clearError: () => set({ error: null }),
  })),
);

// Initialize projects and restore from localStorage on store creation
let isInitialized = false;

export const initializeProjectStore = () => {
  if (isInitialized) return;
  isInitialized = true;

  const store = useProjectStore.getState();

  useProjectStore.subscribe(
    (state) => state.currentProjectId,
    async () => {
      await store.fetchCurrentProject();
    },
  );
};
