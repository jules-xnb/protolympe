import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

export interface EoCardView {
  id: string;
  name: string;
  config: Record<string, unknown>;
  moduleName: string | null;
  roles: string[];
}

export interface ViewSelections {
  [viewId: string]: { columns: boolean; visibility: boolean };
}

export function useEoCardViews(clientId: string, shouldFetch: boolean) {
  const [views, setViews] = useState<EoCardView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [selections, setSelections] = useState<ViewSelections>({});

  useEffect(() => {
    if (!shouldFetch || !clientId) return;
    const fetchViews = async () => {
      setViewsLoading(true);
      try {
        // Fetch view configs with eo_card blocks, enriched with module & role info
        const enrichedViews = await api.get<EoCardView[]>(
          `/api/view-configs/eo-card-views?client_id=${clientId}`
        );

        setViews(enrichedViews);
        const initSelections: ViewSelections = {};
        enrichedViews.forEach((v) => {
          initSelections[v.id] = { columns: false, visibility: false };
        });
        setSelections(initSelections);
      } catch (e: unknown) {
        console.error('Failed to fetch views:', e);
        toast.error('Erreur lors du chargement des vues');
      } finally {
        setViewsLoading(false);
      }
    };
    fetchViews();
  }, [shouldFetch, clientId]);

  const toggleSelection = (viewId: string, type: 'columns' | 'visibility') => {
    setSelections((prev) => ({
      ...prev,
      [viewId]: { ...prev[viewId], [type]: !prev[viewId]?.[type] },
    }));
  };

  const allColumnsChecked = useMemo(
    () => views.length > 0 && views.every((v) => selections[v.id]?.columns),
    [views, selections],
  );
  const allVisibilityChecked = useMemo(
    () => views.length > 0 && views.every((v) => selections[v.id]?.visibility),
    [views, selections],
  );

  const toggleAllColumns = () => {
    const newVal = !allColumnsChecked;
    setSelections((prev) => {
      const next = { ...prev };
      views.forEach((v) => { next[v.id] = { ...next[v.id], columns: newVal }; });
      return next;
    });
  };
  const toggleAllVisibility = () => {
    const newVal = !allVisibilityChecked;
    setSelections((prev) => {
      const next = { ...prev };
      views.forEach((v) => { next[v.id] = { ...next[v.id], visibility: newVal }; });
      return next;
    });
  };

  const hasAnySelection = useMemo(
    () => Object.values(selections).some((s) => s.columns || s.visibility),
    [selections],
  );

  const reset = () => {
    setViews([]);
    setSelections({});
  };

  return {
    views,
    viewsLoading,
    selections,
    toggleSelection,
    allColumnsChecked,
    allVisibilityChecked,
    toggleAllColumns,
    toggleAllVisibility,
    hasAnySelection,
    reset,
  };
}
