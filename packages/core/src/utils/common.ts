export function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1';
  }
  return false;
}

/**
 * Create a paginated result from an array of items
 */
export function createPaginatedResult<T>(
  items: T[], 
  pagination: { page?: number; limit?: number; offset?: number } = {}
): { items: T[], pagination: { page: number, limit: number, total: number, totalPages: number, hasPreviousPage: boolean, hasNextPage: boolean } } {
  const page = pagination.page || 1;
  const limit = pagination.limit || 100;
  const offset = pagination.offset || (page - 1) * limit;
  
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedItems = items.slice(offset, offset + limit);
  
  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    }
  };
}
