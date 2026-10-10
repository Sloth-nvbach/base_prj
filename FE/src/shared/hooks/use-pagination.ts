import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Current page kept in the URL (`?page=2`), so reload and the back button keep
 * the user's place. Page 1 is left out of the URL.
 */
export const usePagination = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = Number(searchParams.get('page'));
  const page = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;

  const setPage = useCallback(
    (next: number) => {
      setSearchParams((params) => {
        if (next <= 1) params.delete('page');
        else params.set('page', String(next));
        return params;
      });
    },
    [setSearchParams],
  );

  return { page, setPage };
};
