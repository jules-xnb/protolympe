import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MutationWithToastOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: readonly (readonly unknown[])[];
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVariables) => void;
}

/**
 * Strip trailing empty/falsy elements from a query key so it acts as a
 * broad prefix matcher.  e.g. `['profile_templates', '']` → `['profile_templates']`
 * This lets `invalidateQueries` match all queries starting with the prefix
 * regardless of the actual clientId / entityId at that position.
 */
function toPrefix(key: readonly unknown[]): unknown[] {
  const arr = [...key];
  while (
    arr.length > 0 &&
    (arr[arr.length - 1] === '' ||
      arr[arr.length - 1] === undefined ||
      arr[arr.length - 1] === null ||
      (Array.isArray(arr[arr.length - 1]) && (arr[arr.length - 1] as unknown[]).length === 0))
  ) {
    arr.pop();
  }
  return arr;
}

export function useMutationWithToast<TData = unknown, TVariables = void>({
  mutationFn,
  invalidateKeys = [] as readonly (readonly unknown[])[],
  successMessage,
  errorMessage,
  onSuccess,
}: MutationWithToastOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      invalidateKeys.forEach(key =>
        queryClient.invalidateQueries({ queryKey: toPrefix(key) })
      );
      if (successMessage) toast.success(successMessage);
      onSuccess?.(data, variables);
    },
    onError: (error: Error) => {
      toast.error(errorMessage || `Erreur : ${error.message}`);
    },
  });
}
