import { useCallback, useEffect, useRef } from 'react';
import { useSaveNodeSections } from '@/hooks/useNodeSections';
import { useSaveNodeFields, type NodeFieldConfig } from '@/hooks/useNodeFields';
import type { NodeSection } from '@/hooks/useNodeSections';

interface UseAutoSaveParams {
  selectedNodeId: string;
  localSections: NodeSection[];
  localFieldConfigs: NodeFieldConfig[];
  initialized: boolean;
}

export function useAutoSave({
  selectedNodeId,
  localSections,
  localFieldConfigs,
  initialized,
}: UseAutoSaveParams) {
  const saveNodeSections = useSaveNodeSections();
  const saveNodeFields = useSaveNodeFields();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const initializedRef = useRef(false);
  initializedRef.current = initialized;

  // Refs to read latest values inside the debounced save
  const localSectionsRef = useRef(localSections);
  localSectionsRef.current = localSections;
  const localFieldConfigsRef = useRef(localFieldConfigs);
  localFieldConfigsRef.current = localFieldConfigs;
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;
  const saveNodeSectionsRef = useRef(saveNodeSections);
  saveNodeSectionsRef.current = saveNodeSections;
  const saveNodeFieldsRef = useRef(saveNodeFields);
  saveNodeFieldsRef.current = saveNodeFields;

  const doSave = useCallback((overrideNodeId?: string) => {
    if (!initializedRef.current) return;

    const sections = localSectionsRef.current;
    const configs = localFieldConfigsRef.current;
    const nodeId = overrideNodeId || selectedNodeIdRef.current;

    const snapshot = JSON.stringify({ sections, fields: configs });
    if (snapshot === lastSavedRef.current) return;
    lastSavedRef.current = snapshot;

    const sectionsToSave = sections.map(({ id, name, display_order }) => ({
      id,
      name,
      display_order,
    }));
    saveNodeSectionsRef.current.mutate({ nodeId, sections: sectionsToSave });

    const fieldsToSave = configs.map(({
      id, field_definition_id, is_visible, is_editable, is_required_override,
      display_order, settings, visibility_condition,
    }) => ({
      id,
      field_definition_id,
      is_visible,
      is_editable,
      is_required_override,
      display_order,
      settings: toJson(settings),
      visibility_condition: toJson(visibility_condition),
    }));
    saveNodeFieldsRef.current.mutate({ nodeId, fields: fieldsToSave });
  }, []);

  const triggerSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(doSave, 1000);
  }, [doSave]);

  const flushSave = useCallback((overrideNodeId?: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    doSave(overrideNodeId);
  }, [doSave]);

  // Trigger save when local state changes (but not on initial load)
  useEffect(() => {
    if (initialized) {
      triggerSave();
    }
  }, [localSections, localFieldConfigs, initialized, triggerSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const resetLastSaved = useCallback(() => {
    lastSavedRef.current = '';
  }, []);

  return { flushSave, resetLastSaved };
}
