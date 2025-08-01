'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient, handleApiError } from '@/lib';
import { Project } from '@codervisor/devlog-core';
import { DataContext, getDefaultDataContext } from '@/stores/base';

interface ProjectState {
  // State
  currentProjectId: number | null;
  currentProjectContext: DataContext<Project>;
  projectsContext: DataContext<Project[]>;

  // Actions
  setCurrentProjectId: (id: number | null) => void;
  fetchCurrentProject: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  clearErrors: () => void;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentProjectId: null,
    currentProjectContext: getDefaultDataContext<Project>(),
    projectsContext: getDefaultDataContext<Project[]>(),

    // Actions
    setCurrentProjectId: (id: number | null) => {
      set({ currentProjectId: id });
    },
    fetchCurrentProject: async () => {
      const currentProjectId = get().currentProjectId;
      if (!currentProjectId) {
        set((state) => ({
          currentProjectContext: {
            ...state.currentProjectContext,
            loading: false,
            error: 'No project ID selected',
          },
        }));
        return;
      }

      try {
        set((state) => ({
          currentProjectContext: {
            ...state.currentProjectContext,
            loading: true,
            error: null,
          },
        }));
        const currentProject = await apiClient.get<Project>(`/api/projects/${currentProjectId}`);
        set((state) => ({
          currentProjectContext: {
            ...state.currentProjectContext,
            data: currentProject,
            error: null,
          },
        }));
      } catch (e) {
        const errorMessage = handleApiError(e);
        set((state) => ({
          currentProjectContext: {
            ...state.currentProjectContext,
            error: errorMessage,
          },
        }));
        console.error('Error fetching current project:', e);
      } finally {
        set((state) => ({
          currentProjectContext: {
            ...state.currentProjectContext,
            loading: false,
          },
        }));
      }
    },

    fetchProjects: async () => {
      try {
        set((state) => ({
          projectsContext: {
            ...state.projectsContext,
            loading: true,
            error: null,
          },
        }));
        const projectsList = await apiClient.get<Project[]>('/api/projects');
        set((state) => ({
          projectsContext: {
            ...state.projectsContext,
            data: projectsList,
            error: null,
          },
        }));
      } catch (err) {
        const errorMessage = handleApiError(err);
        set((state) => ({
          projectsContext: {
            ...state.projectsContext,
            error: errorMessage,
          },
        }));
        console.error('Error loading projects:', err);
      } finally {
        set((state) => ({
          projectsContext: {
            ...state.projectsContext,
            loading: false,
          },
        }));
      }
    },

    clearErrors: () => {
      set((state) => ({
        currentProjectContext: {
          ...state.currentProjectContext,
          error: null,
        },
        projectsContext: {
          ...state.projectsContext,
          error: null,
        },
      }));
    },
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
