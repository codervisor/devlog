'use client';

import { useState, useMemo } from 'react';
import { DevlogEntry, DevlogFilter, DevlogStatus } from '@devlog/core';

export type FilterType = DevlogStatus | 'total' | 'open' | 'closed';

export function useDevlogFilters(devlogs: DevlogEntry[]) {
  const [filters, setFilters] = useState<DevlogFilter>({});

  const filteredDevlogs = useMemo(() => {
    let filtered = [...devlogs];

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(devlog => 
        filters.status!.includes(devlog.status)
      );
    }

    // Type filter
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(devlog => 
        filters.type!.includes(devlog.type)
      );
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(devlog => 
        filters.priority!.includes(devlog.priority)
      );
    }

    // Assignee filter
    if (filters.assignee) {
      const assigneeQuery = filters.assignee.toLowerCase().trim();
      filtered = filtered.filter(devlog => 
        devlog.assignee?.toLowerCase().includes(assigneeQuery)
      );
    }

    // Date range filter (based on createdAt)
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      filtered = filtered.filter(devlog => 
        new Date(devlog.createdAt) >= fromDate
      );
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      // Include the entire end date by setting time to end of day
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(devlog => 
        new Date(devlog.createdAt) <= toDate
      );
    }

    // Search filter (client-side fallback for when backend search isn't used)
    if (filters.search) {
      const searchQuery = filters.search.toLowerCase().trim();
      filtered = filtered.filter(devlog => {
        const titleMatch = devlog.title.toLowerCase().includes(searchQuery);
        const descriptionMatch = devlog.description.toLowerCase().includes(searchQuery);
        const notesMatch = devlog.notes?.some(note => 
          note.content.toLowerCase().includes(searchQuery)
        ) || false;
        return titleMatch || descriptionMatch || notesMatch;
      });
    }

    return filtered;
  }, [devlogs, filters]);

  const handleStatusFilter = (status: FilterType) => {
    if (status === 'total') {
      // Clear all filters except search
      setFilters(prev => ({ search: prev.search }));
    } else if (status === 'open') {
      // Open includes: new, in-progress, blocked, in-review, testing
      const openStatuses: DevlogStatus[] = ['new', 'in-progress', 'blocked', 'in-review', 'testing'];
      setFilters({
        ...filters,
        status: openStatuses,
      });
    } else if (status === 'closed') {
      // Closed includes: done, cancelled
      const closedStatuses: DevlogStatus[] = ['done', 'cancelled'];
      setFilters({
        ...filters,
        status: closedStatuses,
      });
    } else {
      // Individual status - toggle behavior for direct status selection
      const currentStatuses = filters.status || [];
      if (currentStatuses.includes(status)) {
        // Remove this status
        const newStatuses = currentStatuses.filter(s => s !== status);
        setFilters({
          ...filters,
          status: newStatuses.length > 0 ? newStatuses : undefined,
        });
      } else {
        // Add this status (replace existing for single selection)
        setFilters({
          ...filters,
          status: [status],
        });
      }
    }
  };

  const handleSearchFilter = (searchQuery: string) => {
    setFilters({
      ...filters,
      search: searchQuery.trim() || undefined,
    });
  };

  const resetFilters = () => {
    setFilters({});
  };

  return {
    filters,
    filteredDevlogs,
    handleStatusFilter,
    handleSearchFilter,
    setFilters,
    resetFilters,
  };
}
