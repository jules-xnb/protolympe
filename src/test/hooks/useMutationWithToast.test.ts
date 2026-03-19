import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMutationWithToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls mutationFn with correct variables', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1' });

    const { result } = renderHook(
      () => useMutationWithToast({ mutationFn }),
      { wrapper: createWrapper() },
    );

    await act(() => result.current.mutateAsync('test-var'));

    expect(mutationFn).toHaveBeenCalledWith('test-var');
  });

  it('shows toast.success with successMessage on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue('ok');

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          successMessage: 'Created!',
        }),
      { wrapper: createWrapper() },
    );

    await act(() => result.current.mutateAsync(undefined));

    expect(toast.success).toHaveBeenCalledWith('Created!');
  });

  it('shows toast.error with errorMessage on error', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Network fail'));

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          errorMessage: 'Custom error',
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync(undefined);
      } catch {
        // expected
      }
    });

    expect(toast.error).toHaveBeenCalledWith('Custom error');
  });

  it('shows toast.error with error.message when no errorMessage provided', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Something broke'));

    const { result } = renderHook(
      () => useMutationWithToast({ mutationFn }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      try {
        await result.current.mutateAsync(undefined);
      } catch {
        // expected
      }
    });

    expect(toast.error).toHaveBeenCalledWith('Erreur : Something broke');
  });

  it('invalidates specified query keys on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue('ok');
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          invalidateKeys: [['roles'], ['permissions']],
        }),
      { wrapper },
    );

    await act(() => result.current.mutateAsync(undefined));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['roles'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['permissions'] });
  });

  it('calls onSuccess callback on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '42' });
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          onSuccess,
        }),
      { wrapper: createWrapper() },
    );

    await act(() => result.current.mutateAsync('input'));

    expect(onSuccess).toHaveBeenCalledWith({ id: '42' }, 'input');
  });

  it('does NOT show success toast when successMessage is undefined', async () => {
    const mutationFn = vi.fn().mockResolvedValue('ok');

    const { result } = renderHook(
      () => useMutationWithToast({ mutationFn }),
      { wrapper: createWrapper() },
    );

    await act(() => result.current.mutateAsync(undefined));

    expect(toast.success).not.toHaveBeenCalled();
  });
});
