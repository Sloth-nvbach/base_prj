/** Body of every backend list endpoint (see `BE/src/utils/pagination.ts`). */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
