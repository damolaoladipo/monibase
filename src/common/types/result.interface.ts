/**
 * Result type for service responses (troott-api IResult pattern).
 * Use for success/failure without throwing; code typically matches HTTP status.
 */
export interface IResult<T = unknown> {
  error: boolean;
  message: string;
  code: number;
  data: T;
}

/** Alias for IResult (backward compatibility). */
export type Result<T = unknown> = IResult<T>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
