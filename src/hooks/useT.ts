import { useContext } from 'react';
import { TranslationContext } from '@/contexts/TranslationContext';

export function useT() {
  return useContext(TranslationContext);
}
