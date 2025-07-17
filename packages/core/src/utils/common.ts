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
 * Extract error message with consistent fallback pattern
 * Replaces repeated pattern: error instanceof Error ? error.message : String(error)
 */
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Create standardized error response format for MCP tools and APIs
 */
export function createErrorResponse(operation: string, error: unknown): { 
  success: false; 
  error: string; 
  operation: string; 
  timestamp: string;
} {
  return {
    success: false,
    error: extractErrorMessage(error),
    operation,
    timestamp: new Date().toISOString(),
  };
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

/**
 * Type-safe way to check if an object has a specific property
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

/**
 * Safely get nested property from object with dot notation
 */
export function getNestedProperty(obj: any, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Create a deep copy of an object (for small objects)
 */
export function deepCopy<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item)) as unknown as T;
  }
  
  const copy = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }
  
  return copy;
}
