import {
  LIST_QUERY_CONTROL_KEYS,
  ParsedListQuery,
  SortItem,
} from './list-query.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const OPERATOR_KEYS = ['gt', 'gte', 'lt', 'lte', 'in'];

/**
 * Convert sort string to SortItem[] (api: "-createdAt,name" -> DESC createdAt, ASC name).
 */
function parseSort(sortStr: string | undefined): SortItem[] {
  if (!sortStr || typeof sortStr !== 'string') {
    return [{ field: 'createdAt', order: 'DESC' }];
  }
  return sortStr.split(',').map((part) => {
    const trimmed = part.trim();
    if (trimmed.startsWith('-')) {
      return { field: trimmed.slice(1), order: 'DESC' as const };
    }
    return { field: trimmed, order: 'ASC' as const };
  });
}

/**
 * Process filter object: replace gt|gte|lt|lte|in keys with $gt|$gte|$lt|$lte|$in (api processFilter pattern).
 */
function processFilter(filter: Record<string, unknown>): Record<string, unknown> {
  if (Object.keys(filter).length === 0) return filter;
  const str = JSON.stringify(filter);
  const withOperators = str.replace(/\b(gt|gte|lt|lte|in)\b/g, (m) => `$${m}`);
  return JSON.parse(withOperators) as Record<string, unknown>;
}

/**
 * Parse raw query (e.g. from req.query) into ParsedListQuery.
 * Control params: select, sort, page, limit. Everything else is filter (with operator conversion).
 */
export function parseListQuery(raw: Record<string, unknown>): ParsedListQuery {
  const reqQuery = { ...raw };
  LIST_QUERY_CONTROL_KEYS.forEach((k) => delete reqQuery[k]);

  const selectStr = raw.select as string | undefined;
  const select = selectStr
    ? (typeof selectStr === 'string' ? selectStr.split(',').map((s) => s.trim()).filter(Boolean) : [])
    : [];

  const sort = parseSort(raw.sort as string | undefined);

  const page = Math.max(1, parseInt(String(raw.page), 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(raw.limit), 10) || DEFAULT_LIMIT),
  );

  const filter = processFilter(reqQuery as Record<string, unknown>);

  return {
    select,
    sort,
    page,
    limit,
    filter,
  };
}
