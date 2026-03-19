import { useState, useCallback } from 'react';
import type { NodeSection } from '@/hooks/useNodeSections';
import type { NodeFieldConfig } from '@/hooks/useNodeFields';
import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';
import type { FieldVisibilityCondition } from '@/components/builder/page-builder/types';

interface UseSectionOperationsParams {
  nodeType: 'respondent' | 'validation' | 'validated';
  sections: NodeSection[];
  fieldConfigs: NodeFieldConfig[];
  fieldDefinitions: FieldDefinitionWithRelations[];
  requiredFieldIds: Set<string>;
  onSectionsChange: (sections: NodeSection[]) => void;
  onFieldConfigsChange: (configs: NodeFieldConfig[]) => void;
}

export function useSectionOperations({
  nodeType,
  sections,
  fieldConfigs,
  fieldDefinitions,
  requiredFieldIds,
  onSectionsChange,
  onFieldConfigsChange,
}: UseSectionOperationsParams) {
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // -- Helpers ---------------------------------------------------------------

  const getFieldsInSection = useCallback(
    (sectionId: string) => {
      return fieldConfigs
        .filter((c) => c.settings?.section_id === sectionId)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    [fieldConfigs],
  );

  // -- Field-level handlers --------------------------------------------------

  const handleRemoveField = useCallback(
    (config: NodeFieldConfig) => {
      onFieldConfigsChange(fieldConfigs.filter((c) => c.id !== config.id));
    },
    [fieldConfigs, onFieldConfigsChange],
  );

  const handleToggleEditable = useCallback(
    (config: NodeFieldConfig) => {
      onFieldConfigsChange(
        fieldConfigs.map((c) =>
          c.id === config.id ? { ...c, is_editable: !c.is_editable } : c,
        ),
      );
    },
    [fieldConfigs, onFieldConfigsChange],
  );

  const handleToggleRequired = useCallback(
    (config: NodeFieldConfig) => {
      onFieldConfigsChange(
        fieldConfigs.map((c) =>
          c.id === config.id
            ? { ...c, is_required_override: !c.is_required_override }
            : c,
        ),
      );
    },
    [fieldConfigs, onFieldConfigsChange],
  );

  // -- Section-level toggle handlers -----------------------------------------

  const handleToggleSectionEditable = useCallback(
    (sectionId: string) => {
      const fieldsInSection = getFieldsInSection(sectionId);
      if (fieldsInSection.length === 0) return;
      const allEditable = fieldsInSection.every((c) => c.is_editable);
      const newValue = !allEditable;
      const sectionFieldIds = new Set(fieldsInSection.map((c) => c.id));
      onFieldConfigsChange(
        fieldConfigs.map((c) =>
          sectionFieldIds.has(c.id) ? { ...c, is_editable: newValue } : c,
        ),
      );
    },
    [fieldConfigs, onFieldConfigsChange, getFieldsInSection],
  );

  const handleToggleSectionRequired = useCallback(
    (sectionId: string) => {
      const fieldsInSection = getFieldsInSection(sectionId);
      if (fieldsInSection.length === 0) return;
      // Only toggle fields that are not already required by the BO definition
      const toggleableFields = fieldsInSection.filter(
        (c) => !requiredFieldIds.has(c.field_definition_id),
      );
      if (toggleableFields.length === 0) return;
      const allRequired = toggleableFields.every(
        (c) => c.is_required_override,
      );
      const newValue = !allRequired;
      const toggleableIds = new Set(toggleableFields.map((c) => c.id));
      onFieldConfigsChange(
        fieldConfigs.map((c) =>
          toggleableIds.has(c.id)
            ? { ...c, is_required_override: newValue }
            : c,
        ),
      );
    },
    [fieldConfigs, onFieldConfigsChange, getFieldsInSection, requiredFieldIds],
  );

  // -- Section CRUD ----------------------------------------------------------

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      const remainingSections = sections.filter((s) => s.id !== sectionId);
      // Cannot delete the last section
      if (remainingSections.length === 0) return;

      const targetSectionId = remainingSections[0].id;

      const updatedConfigs = fieldConfigs
        .map((c) => {
          if (c.settings?.section_id === sectionId) {
            const fieldDef = fieldDefinitions.find(
              (f) => f.id === c.field_definition_id,
            );
            const isLocked =
              nodeType === 'respondent' &&
              fieldDef &&
              requiredFieldIds.has(fieldDef.id);

            if (isLocked) {
              return {
                ...c,
                settings: { ...c.settings, section_id: targetSectionId },
              };
            }
            return null;
          }
          return c;
        })
        .filter(Boolean) as NodeFieldConfig[];

      onFieldConfigsChange(updatedConfigs);
      onSectionsChange(remainingSections);
    },
    [
      sections,
      fieldConfigs,
      fieldDefinitions,
      nodeType,
      requiredFieldIds,
      onFieldConfigsChange,
      onSectionsChange,
    ],
  );

  const handleStartRename = useCallback(
    (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;
      setEditingSectionId(sectionId);
      setEditingSectionName(section.name);
    },
    [sections],
  );

  const handleFinishRename = useCallback(() => {
    if (editingSectionId && editingSectionName.trim()) {
      onSectionsChange(
        sections.map((s) =>
          s.id === editingSectionId
            ? { ...s, name: editingSectionName.trim() }
            : s,
        ),
      );
    }
    setEditingSectionId(null);
    setEditingSectionName('');
  }, [editingSectionId, editingSectionName, sections, onSectionsChange]);

  const handleCancelRename = useCallback(() => {
    setEditingSectionId(null);
    setEditingSectionName('');
  }, []);

  // -- Variation threshold ---------------------------------------------------

  const handleVariationChange = useCallback(
    (config: NodeFieldConfig, value: number | undefined, direction?: '+' | '+-' | '-') => {
      onFieldConfigsChange(
        fieldConfigs.map((c) =>
          c.id === config.id
            ? {
                ...c,
                settings: {
                  ...c.settings,
                  variation_threshold: value,
                  variation_direction: direction,
                },
              }
            : c,
        ),
      );
    },
    [fieldConfigs, onFieldConfigsChange],
  );

  // -- Visibility conditions -------------------------------------------------

  const handleSaveConditions = useCallback(
    (
      configId: string,
      conditions: FieldVisibilityCondition[],
      logic: 'AND' | 'OR',
    ) => {
      onFieldConfigsChange(
        fieldConfigs.map((c) =>
          c.id === configId
            ? {
                ...c,
                visibility_condition:
                  conditions.length > 0
                    ? { conditions, logic } as NodeFieldConfig['visibility_condition']
                    : null,
              }
            : c,
        ),
      );
    },
    [fieldConfigs, onFieldConfigsChange],
  );

  return {
    // Editing state
    editingSectionId,
    editingSectionName,
    setEditingSectionName,

    // Helpers
    getFieldsInSection,

    // Field-level handlers
    handleRemoveField,
    handleToggleEditable,
    handleToggleRequired,

    // Section-level toggle handlers
    handleToggleSectionEditable,
    handleToggleSectionRequired,

    // Section CRUD
    handleDeleteSection,
    handleStartRename,
    handleFinishRename,
    handleCancelRename,

    // Conditions
    handleSaveConditions,

    // Variation
    handleVariationChange,
  };
}
