'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient, handleApiError } from '@/lib';

export interface ProjectMetadata {
  id: number;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export interface ProjectContext {
  projectId: number;
  project: ProjectMetadata;
}

interface ProjectState {
  // State
  currentProject: ProjectContext | null;
  projects: ProjectMetadata[];
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentProject: (project: ProjectContext | null) => void;
  refreshProjects: () => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentProject: null,
    projects: [],
    loading: true,
    error: null,

    // Actions
    setCurrentProject: (project) => {
      set({ currentProject: project });

      // Save to localStorage
      if (typeof window !== 'undefined') {
        if (project) {
          localStorage.setItem('devlog-current-project', project.projectId.toString());
        } else {
          localStorage.removeItem('devlog-current-project');
        }
      }
    },

    refreshProjects: async () => {
      try {
        set({ loading: true, error: null });

        const projectsList = await apiClient.get<ProjectMetadata[]>('/api/projects');
        set({ projects: projectsList });

        // If no current project is set, set the first project as default
        const { currentProject } = get();
        if (!currentProject && projectsList?.length > 0) {
          const firstProject = projectsList[0];
          get().setCurrentProject({
            projectId: firstProject.id,
            project: firstProject,
          });
        }
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

  // Load projects
  store.refreshProjects();

  // Subscribe to projects changes to restore saved project from localStorage
  useProjectStore.subscribe(
    (state) => state.projects,
    (projects) => {
      if (typeof window !== 'undefined' && projects.length > 0) {
        const savedProjectId = localStorage.getItem('devlog-current-project');
        if (savedProjectId) {
          const savedProject = projects.find((p) => p.id === parseInt(savedProjectId, 10));
          if (savedProject && !useProjectStore.getState().currentProject) {
            useProjectStore.getState().setCurrentProject({
              projectId: savedProject.id,
              project: savedProject,
            });
          }
        }
      }
    },
  );
};
