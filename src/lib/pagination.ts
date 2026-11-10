import { z } from "zod";

export const MAX_PAGE_SIZE = 48;

export const paginationQuery = (defaultSize = 12) => ({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(defaultSize),
});

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const toPage = <T>(items: T[], total: number, page: number, pageSize: number): Page<T> => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

export const skipTake = (page: number, pageSize: number) => ({ skip: (page - 1) * pageSize, take: pageSize });
