'use client';

import { useState, useMemo } from 'react';
import { DevlogEntry, DevlogFilter, DevlogStatus } from '@devlog/core';

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

    return filtered;
  }, [devlogs, filters]);

  const handleStatusFilter = (status: DevlogStatus | 'total') => {
    if (status === 'total') {
      // Clear all filters
      setFilters({});
    } else {
      // Toggle status filter
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

  const resetFilters = () => {
    setFilters({});
  };

  return {
    filters,
    filteredDevlogs,
    handleStatusFilter,
    setFilters,
    resetFilters,
  };
}
