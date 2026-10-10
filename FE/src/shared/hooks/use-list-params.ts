import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * State of a list page kept in the URL: `?q=lan&role=admin&sort=-createdAt&page=2`.
 * Reload, back button and shared links keep the same view. Changing anything
 * except the page goes back to page 1. Default values are left out of the URL.
 *
 *   const list = useListParams({ sort: '-createdAt' });
 *   list.get('role')            // '' when not set
 *   list.set('role', 'admin')   // '' removes it
 */
export const useListParams = (defaults: { sort: string }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const parsedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const sort = searchParams.get('sort') || defaults.sort;
  const q = searchParams.get('q') ?? '';

  const get = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams]);

  const set = useCallback(
    (key: string, value: string) => {
      setSearchParams((params) => {
        const isDefault = value === '' || (key === 'sort' && value === defaults.sort) || (key === 'page' && value === '1');
        if (isDefault) params.delete(key);
        else params.set(key, value);
        if (key !== 'page') params.delete('page');
        return params;
      });
    },
    [setSearchParams, defaults.sort],
  );

  const setPage = useCallback((next: number) => set('page', String(next)), [set]);

  return { page, sort, q, get, set, setPage };
};
