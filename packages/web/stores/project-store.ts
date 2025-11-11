'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { debounce, handleApiError } from '@/lib';
import { projectApiClient } from '@/lib/api';
import { Project } from '@codervisor/devlog-core';
import { DataContext, getDefaultDataContext } from '@/stores/base';

interface ProjectState {
  // State
  currentProjectName: string | null;
  currentProjectContext: DataContext<Project>;
  projectsContext: DataContext<Project[]>;

  // Actions
  setCurrentProjectName: (name: string | null) => void;
  fetchCurrentProject: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  updateProject: (name: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (name: string) => Promise<void>;
  clearErrors: () => void;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => {
    // Create debounced version of the actual fetch function
    const debouncedFetchCurrentProject = debounce(async () => {
      const { currentProjectName } = get();

      if (!currentProjectName) {
        set((state) => ({
          currentProjectContext: {
            ...state.currentProjectContext,
            loading: false,
            error: 'No project name selected',
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
        const currentProject = await projectApiClient.get(currentProjectName);
        set((state) => ({
          currentProjectContext: {
            ...state.currentProjectContext,
            data: currentProject,
            error: null,
          },
          // Update the name in case the API returns a canonical form
          currentProjectName: currentProject.name,
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
    });

    const debouncedFetchProjects = debounce(async () => {
      try {
        set((state) => ({
          projectsContext: {
            ...state.projectsContext,
            loading: true,
            error: null,
          },
        }));
        const projectsList = await projectApiClient.list();
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
    });

    return {
      // Initial state
      currentProjectName: null,
      currentProjectContext: getDefaultDataContext<Project>(),
      projectsContext: getDefaultDataContext<Project[]>(),

      // Actions
      setCurrentProjectName: (name: string | null) => {
        set({ currentProjectName: name });
      },

      fetchCurrentProject: async () => {
        debouncedFetchCurrentProject();
      },

      fetchProjects: async () => {
        debouncedFetchProjects();
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

      updateProject: async (name: string, updates: Partial<Project>) => {
        try {
          const updatedProject = await projectApiClient.update(name, updates);

          // Update current project if it's the one being updated
          const currentProjectName = get().currentProjectName;
          if (currentProjectName === name) {
            set((state) => ({
              currentProjectContext: {
                ...state.currentProjectContext,
                data: updatedProject,
                error: null,
              },
              currentProjectName: updatedProject.name, // Update name in case it changed
            }));
          }

          // Update projects list
          set((state) => ({
            projectsContext: {
              ...state.projectsContext,
              data: state.projectsContext.data
                ? state.projectsContext.data.map((project) =>
                    project.name === name ? updatedProject : project,
                  )
                : null,
              error: null,
            },
          }));

          return updatedProject;
        } catch (err) {
          const errorMessage = handleApiError(err);
          set((state) => ({
            currentProjectContext: {
              ...state.currentProjectContext,
              error: errorMessage,
            },
          }));
          throw err;
        }
      },

      deleteProject: async (name: string) => {
        try {
          await projectApiClient.delete(name);

          // Clear current project if it's the one being deleted
          const currentProjectName = get().currentProjectName;
          if (currentProjectName === name) {
            set({
              currentProjectName: null,
              currentProjectContext: getDefaultDataContext<Project>(),
            });
          }

          // Remove from projects list
          set((state) => ({
            projectsContext: {
              ...state.projectsContext,
              data: state.projectsContext.data
                ? state.projectsContext.data.filter((project) => project.name !== name)
                : null,
              error: null,
            },
          }));
        } catch (err) {
          const errorMessage = handleApiError(err);
          set((state) => ({
            currentProjectContext: {
              ...state.currentProjectContext,
              error: errorMessage,
            },
          }));
          throw err;
        }
      },
    };
  }),
);

// Initialize projects and restore from localStorage on store creation
let isInitialized = false;

export const initializeProjectStore = () => {
  if (isInitialized) return;
  isInitialized = true;

  const store = useProjectStore.getState();

  useProjectStore.subscribe(
    (state) => state.currentProjectName,
    async () => {
      await store.fetchCurrentProject();
    },
  );
};
