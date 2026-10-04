// apps/api/src/utils/pagination.ts
export interface PaginationParams {
  offset: number;
  pagination: {
    page: number;
    limit: number;
    hasPrev: boolean;
  };
}

export const MAX_PAGE_SIZE = 100;

/** Normalises page/limit from a query string into a Mongo skip offset. */
export const getPaginationParams = (page = 1, limit = 20): PaginationParams => {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(limit)));
  return {
    offset: (normalizedPage - 1) * normalizedLimit,
    pagination: { page: normalizedPage, limit: normalizedLimit, hasPrev: normalizedPage > 1 },
  };
};
