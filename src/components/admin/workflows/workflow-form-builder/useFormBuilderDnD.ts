import { useState, useCallback } from 'react';
import {
  pointerWithin,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { generateId } from '@/lib/utils';
import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';
import type { NodeFieldConfig } from '@/hooks/useNodeFields';
import type { NodeSection } from '@/hooks/useNodeSections';

interface UseFormBuilderDnDParams {
  selectedNodeId: string;
  nodeType: 'respondent' | 'validation' | 'validated';
  fieldDefinitions: FieldDefinitionWithRelations[];
  localSections: NodeSection[];
  localFieldConfigs: NodeFieldConfig[];
  setLocalSections: React.Dispatch<React.SetStateAction<NodeSection[]>>;
  setLocalFieldConfigs: React.Dispatch<React.SetStateAction<NodeFieldConfig[]>>;
  selectedAvailableFieldIds: Set<string>;
  setSelectedAvailableFieldIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useFormBuilderDnD({
  selectedNodeId,
  nodeType,
  fieldDefinitions: _fieldDefinitions,
  localSections,
  localFieldConfigs,
  setLocalSections,
  setLocalFieldConfigs,
  selectedAvailableFieldIds: _selectedAvailableFieldIds,
  setSelectedAvailableFieldIds,
}: UseFormBuilderDnDParams) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCenter(args);
  }, []);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  // Helper: resolve a section ID from an over target
  const resolveTargetSectionId = (overId: string, overData: Record<string, unknown> | undefined): string | null => {
    if (overData?.type === 'section') return overData.sectionId as string;
    if (overData?.type === 'field') return overData.sectionId as string;
    if (String(overId).startsWith('section-')) return String(overId).replace('section-', '');
    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const overId = String(over.id);

    // --- Case 1: Drag from available fields panel -> add to form ---
    if (activeData?.type === 'available-field') {
      const droppedFields = (activeData.fields as FieldDefinitionWithRelations[]) || [activeData.field as FieldDefinitionWithRelations];

      const targetSectionId = resolveTargetSectionId(overId, overData) || localSections[0]?.id;
      if (!targetSectionId) return;

      let insertIndex = localFieldConfigs.filter(c => c.settings?.section_id === targetSectionId).length;
      if (overData?.type === 'field') {
        const overConfigId = overId.replace('field-', '');
        const fieldsInTarget = localFieldConfigs
          .filter(c => c.settings?.section_id === targetSectionId)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        const overIdx = fieldsInTarget.findIndex(c => c.id === overConfigId);
        if (overIdx >= 0) insertIndex = overIdx + 1;
      }

      const newConfigs: NodeFieldConfig[] = droppedFields.map((field, i) => ({
        id: generateId(),
        node_id: selectedNodeId,
        field_definition_id: field.id,
        is_visible: true,
        is_editable: field.is_readonly ? false : nodeType === 'respondent',
        is_required_override: null,
        display_order: insertIndex + i,
        settings: { section_id: targetSectionId },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility_condition: null,
      }));

      const updated = localFieldConfigs.map(c => {
        if (c.settings?.section_id === targetSectionId && (c.display_order || 0) >= insertIndex) {
          return { ...c, display_order: (c.display_order || 0) + droppedFields.length };
        }
        return c;
      });

      setLocalFieldConfigs([...updated, ...newConfigs]);
      setSelectedAvailableFieldIds(new Set());
      return;
    }

    // --- Case 2: Reorder sections ---
    if (activeData?.type === 'sortable-section') {
      const activeSectionId = activeData.sectionId as string;
      const overSectionId = overData?.type === 'sortable-section'
        ? overData.sectionId as string
        : null;
      if (!overSectionId || activeSectionId === overSectionId) return;

      const sorted = [...localSections].sort((a, b) => a.display_order - b.display_order);
      const oldIndex = sorted.findIndex(s => s.id === activeSectionId);
      const newIndex = sorted.findIndex(s => s.id === overSectionId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(sorted, oldIndex, newIndex);
      setLocalSections(reordered.map((s, i) => ({ ...s, display_order: i })));
      return;
    }

    // --- Case 3: Reorder / cross-section move of existing fields ---
    if (activeData?.type === 'field') {
      const activeConfigId = String(active.id).replace('field-', '');
      const sourceSectionId = activeData.sectionId as string;

      const targetSectionId = resolveTargetSectionId(overId, overData) || sourceSectionId;

      if (sourceSectionId === targetSectionId) {
        const fieldsInSection = localFieldConfigs
          .filter(c => c.settings?.section_id === sourceSectionId)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        const oldIndex = fieldsInSection.findIndex(c => c.id === activeConfigId);
        let newIndex = oldIndex;

        if (overData?.type === 'field') {
          const overConfigId = overId.replace('field-', '');
          newIndex = fieldsInSection.findIndex(c => c.id === overConfigId);
        }

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(fieldsInSection, oldIndex, newIndex);
        const reorderedIds = new Set(reordered.map(c => c.id));

        const updatedConfigs = localFieldConfigs.map(c => {
          if (reorderedIds.has(c.id)) {
            const idx = reordered.findIndex(r => r.id === c.id);
            return { ...c, display_order: idx };
          }
          return c;
        });

        setLocalFieldConfigs(updatedConfigs);
      } else {
        let insertIndex = localFieldConfigs.filter(c => c.settings?.section_id === targetSectionId).length;
        if (overData?.type === 'field') {
          const overConfigId = overId.replace('field-', '');
          const fieldsInTarget = localFieldConfigs
            .filter(c => c.settings?.section_id === targetSectionId)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
          const overIdx = fieldsInTarget.findIndex(c => c.id === overConfigId);
          if (overIdx >= 0) insertIndex = overIdx;
        }

        const updatedConfigs = localFieldConfigs.map(c => {
          if (c.id === activeConfigId) {
            return {
              ...c,
              display_order: insertIndex,
              settings: { ...c.settings, section_id: targetSectionId },
            };
          }
          if (c.settings?.section_id === targetSectionId && (c.display_order || 0) >= insertIndex) {
            return { ...c, display_order: (c.display_order || 0) + 1 };
          }
          return c;
        });

        setLocalFieldConfigs(updatedConfigs);
      }
    }
  };

  return {
    sensors,
    collisionDetection,
    activeDragId,
    handleDragStart,
    handleDragEnd,
  };
}
