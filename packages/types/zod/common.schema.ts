// File: packages/types/zod/common.schema.ts
import { z } from 'zod';

/** A 24-character hex MongoDB ObjectId. */
export const ObjectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** ISO-8601 timestamp as serialised by the API. */
export const IsoDateSchema = z.string().datetime({ offset: true });

export const HexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format');

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const SortOrderEnum = z.enum(['asc', 'desc']);

export type ObjectId = z.infer<typeof ObjectIdSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SortOrder = z.infer<typeof SortOrderEnum>;

/** Envelope returned by every successful API call. */
export interface ApiResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
}

/** Envelope returned by the error middleware. */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}
