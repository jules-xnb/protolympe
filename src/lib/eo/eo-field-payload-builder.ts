import type {
  EoFieldSettings,
  EoValidationRules,
} from '@/hooks/useEoFieldDefinitions';
import type { CrossFieldRule } from '@/lib/eo/eo-cross-field-validation';

export interface EoFieldFormData {
  name: string;
  slug: string;
  description: string;
  field_type: string;
  is_required: boolean;
  is_unique: boolean;
  options: string[];
  default_value: string | null;
  referential_id: string | null;
  max_length: number | null;
  comment_enabled: boolean;
  comment_required: boolean;
  comment_transitions: { from: string; to: string }[];
  auto_generate_enabled: boolean;
  auto_generate_mode: 'counter' | 'prefix_counter' | 'uuid' | 'date' | 'fixed_value';
  auto_generate_prefix: string;
  auto_generate_padding: number;
  auto_generate_date_format: string;
  auto_generate_fixed_value: string;
  cross_field_rules: CrossFieldRule[];
  format_enabled: boolean;
  format_type: 'zero_pad';
  format_length: number;
  boolean_true_label: string;
  boolean_false_label: string;
}

export interface FieldPayloadResult {
  options: { value: string; label: string }[];
  validation_rules: EoValidationRules;
  settings: EoFieldSettings;
  default_value: string | null;
}

/**
 * Builds the mutation payload from form data.
 * Pure function -- no React, no hooks, no side effects.
 */
export function buildFieldPayload(
  formData: EoFieldFormData,
  field: { settings?: EoFieldSettings | null } | null | undefined,
  showOptions: boolean,
  isSystemIsActive: boolean,
): FieldPayloadResult {
  const isTextType = ['text', 'textarea', 'email', 'phone', 'url'].includes(formData.field_type);

  const options = formData.options.map((o) => ({ value: o, label: o }));
  const validation_rules: EoValidationRules = {};
  if (isTextType && formData.max_length && formData.max_length > 0) {
    validation_rules.max_length = formData.max_length;
  }
  if (formData.cross_field_rules.length > 0) {
    validation_rules.cross_field_rules = formData.cross_field_rules;
  }

  const settings: EoFieldSettings = {
    ...(field?.settings || {}),
  };

  // Persist referential_id in settings
  if (formData.referential_id) {
    settings.referential_id = formData.referential_id;
  } else {
    delete settings.referential_id;
  }
  if ((showOptions || isSystemIsActive) && formData.comment_enabled) {
    settings.comment_rules = {
      enabled: true,
      required: formData.comment_required,
      transitions: formData.comment_transitions.length > 0 ? formData.comment_transitions : null,
    };
  } else if (!isSystemIsActive || !formData.comment_enabled) {
    delete settings.comment_rules;
  }

  if (formData.auto_generate_enabled) {
    const agConfig: Record<string, unknown> = {};
    if (formData.auto_generate_mode === 'date') {
      agConfig.date_format = formData.auto_generate_date_format;
    } else if (formData.auto_generate_mode === 'fixed_value') {
      agConfig.fixed_value = formData.auto_generate_fixed_value;
    }
    settings.auto_generate = {
      enabled: true,
      mode: formData.auto_generate_mode,
      config: agConfig,
    };
  } else {
    delete settings.auto_generate;
  }

  if (formData.format_enabled) {
    settings.format = {
      type: formData.format_type,
      length: formData.format_length,
    };
  } else {
    delete settings.format;
  }

  if (isSystemIsActive) {
    settings.boolean_labels = {
      true_label: formData.boolean_true_label || 'Oui',
      false_label: formData.boolean_false_label || 'Non',
    };
  }

  const default_value = isSystemIsActive
    ? (formData.default_value === 'true' ? 'true' : 'false')
    : showOptions && formData.default_value ? formData.default_value : null;

  return { options, validation_rules, settings, default_value };
}

export interface ViewForUpdate {
  id: string;
  config: Record<string, unknown>;
}

export interface ViewFieldUpdate {
  viewId: string;
  config: Record<string, unknown>;
}

/**
 * Builds the view config updates to apply when adding a field to views.
 * Returns only the views that were actually modified.
 * Pure function -- no React, no hooks, no side effects.
 */
export function buildViewFieldUpdates(
  views: ViewForUpdate[],
  createdField: { id: string; name: string },
  selectedColumns: Set<string>,
  selectedVisibility: Set<string>,
): ViewFieldUpdate[] {
  const updates: ViewFieldUpdate[] = [];

  for (const view of views) {
    if (!selectedColumns.has(view.id) && !selectedVisibility.has(view.id)) continue;

    const config = structuredClone(view.config) as Record<string, unknown>;
    const blocks = config?.blocks;
    if (!Array.isArray(blocks)) continue;

    let modified = false;
    for (const block of blocks as Array<Record<string, unknown>>) {
      if (block.type !== 'eo_card') continue;
      const blockConfig = block.config as Record<string, unknown> | undefined;
      if (!blockConfig) continue;

      if (selectedColumns.has(view.id)) {
        const listColumns = (blockConfig.list_columns || []) as Array<Record<string, unknown>>;
        if (!listColumns.some((c) => c.field_id === createdField.id)) {
          listColumns.push({ field_id: createdField.id, field_name: createdField.name, is_custom: true });
          blockConfig.list_columns = listColumns;
          modified = true;
        }
      }

      if (selectedVisibility.has(view.id)) {
        const fieldVisibility = (blockConfig.field_visibility || []) as Array<Record<string, unknown>>;
        if (!fieldVisibility.some((f) => f.field === createdField.id)) {
          fieldVisibility.push({
            field: createdField.id,
            label: createdField.name,
            visible: true,
            editable: true,
            is_custom: true,
          });
          blockConfig.field_visibility = fieldVisibility;
          modified = true;
        }
      }
    }

    if (modified) {
      updates.push({ viewId: view.id, config });
    }
  }

  return updates;
}
