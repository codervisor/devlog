import { PaginationMeta, SortOptions } from '@codervisor/devlog-core';

export interface DataContext<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function getDefaultDataContext<T>(): DataContext<T> {
  return {
    data: null,
    loading: false,
    error: null,
  };
}

export interface TableDataContext<T, F = any> extends DataContext<T> {
  pagination: PaginationMeta;
  filters: F;
  sortOptions: SortOptions;
}

export function getDefaultTableDataContext<T, F>(): TableDataContext<T, F> {
  return {
    ...getDefaultDataContext<T>(),
    pagination: getDefaultPagination(),
    filters: getDefaultFilters() as F,
    sortOptions: getDefaultSortOptions(),
  };
}

export function getDefaultPagination(): PaginationMeta {
  return {
    page: 1,
    limit: 10,
  };
}

export function getDefaultFilters(): Record<string, any> {
  return {};
}

export function getDefaultSortOptions(): SortOptions {
  return {
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  };
}
