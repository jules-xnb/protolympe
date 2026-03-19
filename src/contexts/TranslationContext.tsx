import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';
import { UI_DEFAULTS } from '@/i18n/defaults';

// ── Types ────────────────────────────────────────────────────────────────

interface TranslationContextType {
  /** Translate a UI key with optional parameter interpolation */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Translate a data (DB) value: table.id.column */
  td: (table: string, id: string, column: string, fallback: string) => string;
  /** Current resolved language */
  language: string;
  /** Whether translations are still loading */
  isLoading: boolean;
}

// ── Default / fallback context ───────────────────────────────────────────

function fallbackT(key: string, params?: Record<string, string | number>): string {
  let value = UI_DEFAULTS[key] ?? key;
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }
  return value;
}

function fallbackTd(_table: string, _id: string, _column: string, fallback: string): string {
  return fallback;
}

const FALLBACK_CONTEXT: TranslationContextType = {
  t: fallbackT,
  td: fallbackTd,
  language: 'fr',
  isLoading: false,
};

export const TranslationContext = createContext<TranslationContextType>(FALLBACK_CONTEXT);

// ── Row shape ─────────────────────────────────────────────────────────

interface TranslationRow {
  scope: string;
  key: string;
  value: string;
  language: string;
}

// ── Provider ─────────────────────────────────────────────────────────────

export function TranslationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { selectedClient } = useViewMode();

  const clientId = selectedClient?.id;

  // ── Resolve user language ────────────────────────────────────────────
  // preferred_language → client.default_language → 'fr'

  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPreferredLanguage(null);
      return;
    }

    let cancelled = false;
    api.get<{ preferred_language: string | null }>(`/api/profiles/${user.id}/language`)
      .then((data) => {
        if (!cancelled) {
          setPreferredLanguage(data?.preferred_language ?? null);
        }
      })
      .catch(() => {
        // Silently ignore — fallback to default language
      });

    return () => { cancelled = true; };
  }, [user]);

  const clientDefaultLanguage = (selectedClient as Record<string, unknown> | null)?.default_language as string | undefined;
  const userLanguage = preferredLanguage || clientDefaultLanguage || 'fr';
  const defaultLanguage = clientDefaultLanguage || 'fr';

  // ── Fetch translations ───────────────────────────────────────────────
  // Load all translations for the client in the user's language and the client default language.

  const languagesToFetch = useMemo(() => {
    const langs = new Set<string>();
    langs.add(userLanguage);
    if (defaultLanguage !== userLanguage) {
      langs.add(defaultLanguage);
    }
    return Array.from(langs);
  }, [userLanguage, defaultLanguage]);

  const { data: translationRows, isLoading } = useQuery({
    queryKey: queryKeys.translations.byClientAndLang(clientId, languagesToFetch.join(',')),
    queryFn: async () => {
      if (!clientId) return [] as TranslationRow[];

      const data = await api.get<TranslationRow[]>(
        `/api/translations?client_id=${clientId}&language=${languagesToFetch.join(',')}`
      );

      return (data ?? []) as TranslationRow[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // ── Build lookup maps ────────────────────────────────────────────────

  const { userLangMap, defaultLangMap } = useMemo(() => {
    const uMap = new Map<string, string>();
    const dMap = new Map<string, string>();

    if (!translationRows) return { userLangMap: uMap, defaultLangMap: dMap };

    for (const row of translationRows) {
      const compositeKey = `${row.scope}:${row.key}`;
      if (row.language === userLanguage) {
        uMap.set(compositeKey, row.value);
      }
      if (row.language === defaultLanguage) {
        dMap.set(compositeKey, row.value);
      }
    }

    return { userLangMap: uMap, defaultLangMap: dMap };
  }, [translationRows, userLanguage, defaultLanguage]);

  // ── t(key, params?) ──────────────────────────────────────────────────
  // Resolution: userLang override → defaultLang override → UI_DEFAULTS → key

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value =
        userLangMap.get(`ui:${key}`) ??
        defaultLangMap.get(`ui:${key}`) ??
        UI_DEFAULTS[key] ??
        key;

      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        }
      }

      return value;
    },
    [userLangMap, defaultLangMap],
  );

  // ── td(table, id, col, fallback) ─────────────────────────────────────
  // Resolution: userLang data override → defaultLang data override → fallback

  const td = useCallback(
    (table: string, id: string, column: string, fallback: string): string => {
      const compositeKey = `data:${table}.${id}.${column}`;
      return (
        userLangMap.get(compositeKey) ??
        defaultLangMap.get(compositeKey) ??
        fallback
      );
    },
    [userLangMap, defaultLangMap],
  );

  // ── Context value ────────────────────────────────────────────────────

  const contextValue = useMemo<TranslationContextType>(
    () => ({
      t,
      td,
      language: userLanguage,
      isLoading,
    }),
    [t, td, userLanguage, isLoading],
  );

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}
