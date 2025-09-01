// apps/api/src/utils/pagination.ts
export interface PaginationParams {
  offset: number;
  pagination: {
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const getPaginationParams = (page: number = 1, limit: number = 20): PaginationParams => {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const offset = (normalizedPage - 1) * normalizedLimit;

  return {
    offset,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      hasNext: false, // Will be calculated after query
      hasPrev: normalizedPage > 1,
    },
  };
};

export const buildPaginationResult = (
  page: number,
  limit: number,
  total: number
): PaginationResult => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const getPaginationMeta = (
  page: number,
  limit: number,
  total: number,
  items: any[]
): PaginationResult & { count: number } => {
  const result = buildPaginationResult(page, limit, total);
  
  return {
    ...result,
    count: items.length,
  };
};

export interface CursorPaginationParams {
  limit: number;
  cursor?: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

export const buildCursorQuery = (
  cursor: string | undefined,
  sortField: string,
  sortOrder: 'asc' | 'desc'
): any => {
  if (!cursor) return {};
  
  try {
    const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
    const operator = sortOrder === 'asc' ? '$gt' : '$lt';
    
    return {
      [sortField]: { [operator]: decodedCursor[sortField] }
    };
  } catch {
    return {};
  }
};

export const encodeCursor = (item: any, sortField: string): string => {
  return Buffer.from(JSON.stringify({ [sortField]: item[sortField] })).toString('base64');
};

export interface OffsetLimitParams {
  offset?: number;
  limit?: number;
}

export const normalizeOffsetLimit = (params: OffsetLimitParams) => {
  const offset = Math.max(0, params.offset || 0);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  
  return { offset, limit };
};