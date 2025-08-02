'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface LayoutState {
  // State
  sidebarOpen: boolean;

  // Actions
  setSidebarOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  subscribeWithSelector((set) => ({
    sidebarOpen: false,

    // Action to set sidebar open state
    setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  })),
);
