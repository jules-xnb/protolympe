import { useState, useCallback } from 'react';

export function useDialogState<T = undefined>() {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<T | null>(null);

  const open = useCallback((item?: T) => {
    setItem(item ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setItem(null);
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    if (!open) {
      close();
    } else {
      setIsOpen(true);
    }
  }, [close]);

  return { isOpen, item, open, close, onOpenChange };
}
