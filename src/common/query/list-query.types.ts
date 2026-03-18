/**
 * List query types (api query.mdw / repository.service pattern).
 * Consistent select, sort, page, limit, and filter with operator support (gt, gte, lt, lte, in).
 */

export const LIST_QUERY_CONTROL_KEYS = ['select', 'sort', 'page', 'limit'] as const;

export type SortOrder = 'ASC' | 'DESC';

export interface SortItem {
  field: string;
  order: SortOrder;
}

export interface ParsedListQuery {
  select: string[];
  sort: SortItem[];
  page: number;
  limit: number;
  filter: Record<string, unknown>;
}

export interface ListQueryPagination {
  next?: { page: number; limit: number };
  prev?: { page: number; limit: number };
}

export interface ListQueryResult<T> {
  success: boolean;
  count: number;
  total: number;
  pagination: ListQueryPagination;
  data: T[];
}
