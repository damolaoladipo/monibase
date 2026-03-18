import { ParsedListQuery, ListQueryResult, ListQueryPagination } from './list-query.types';

/**
 * Pagination slice from parsed list query (skip, take).
 */
export function getSkipTake(parsed: ParsedListQuery): { skip: number; take: number } {
  const skip = (parsed.page - 1) * parsed.limit;
  return { skip, take: parsed.limit };
}

/**
 * TypeORM order object from parsed sort (e.g. { createdAt: 'DESC', name: 'ASC' }).
 */
export function buildOrder(parsed: ParsedListQuery): Record<string, 'ASC' | 'DESC'> {
  const order: Record<string, 'ASC' | 'DESC'> = {};
  for (const s of parsed.sort) {
    order[s.field] = s.order;
  }
  return order;
}

/**
 * Build list response shape (api res.customResults pattern).
 */
export function buildListResult<T>(
  data: T[],
  total: number,
  parsed: ParsedListQuery,
): ListQueryResult<T> {
  const startIndex = (parsed.page - 1) * parsed.limit;
  const endIndex = parsed.page * parsed.limit;
  const pagination: ListQueryPagination = {};
  if (endIndex < total) {
    pagination.next = { page: parsed.page + 1, limit: parsed.limit };
  }
  if (startIndex > 0) {
    pagination.prev = { page: parsed.page - 1, limit: parsed.limit };
  }
  return {
    success: true,
    count: data.length,
    total,
    pagination,
    data,
  };
}
