import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { usePagination } from './use-pagination';

const renderAt = (url: string) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(() => ({ ...usePagination(), location: useLocation() }), { wrapper });
};

describe('usePagination', () => {
  it('reads the page from the URL', () => {
    expect(renderAt('/notes?page=3').result.current.page).toBe(3);
  });

  it('falls back to page 1 for a missing or invalid value', () => {
    expect(renderAt('/notes').result.current.page).toBe(1);
    expect(renderAt('/notes?page=abc').result.current.page).toBe(1);
    expect(renderAt('/notes?page=-2').result.current.page).toBe(1);
  });

  it('writes the page to the URL, keeping other params and dropping page 1', () => {
    const { result } = renderAt('/notes?q=math');

    act(() => result.current.setPage(2));
    expect(result.current.location.search).toBe('?q=math&page=2');

    act(() => result.current.setPage(1));
    expect(result.current.location.search).toBe('?q=math');
  });
});
