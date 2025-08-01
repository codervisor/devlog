// Updated hooks that use Zustand stores instead of React Context
export { useProjectStore as useProject } from '@/stores';
export { useDevlogStore as useDevlogContext } from '@/stores';
export { useFilteredDevlogs } from '@/stores';

// Note and real-time functionality now in stores
export { useDevlogNotes, useNotesStore } from '@/stores';
export { useRealtime, useRealtimeStore } from '@/stores';
