export interface Result<T = unknown> {
  error: boolean;
  message: string;
  code: number;
  data?: T;
}

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
