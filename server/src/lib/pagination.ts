import { count } from 'drizzle-orm';

export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export function parsePaginationParams(query: { page?: string; per_page?: string }): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page || '20', 10) || 20));
  return { page, perPage };
}

export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page: params.page,
      per_page: params.perPage,
      total,
      total_pages: Math.ceil(total / params.perPage),
    },
  };
}

export { count };
