interface PaginationInput {
  page?: string;
  limit?: string;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(query: PaginationInput): PaginationResult {
  const page = Math.max(1, parseInt(query.page ?? "") || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit ?? "") || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
