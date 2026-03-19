import { Plus, Pencil, Trash2, Undo2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Human-readable labels for entity fields
export const FIELD_LABELS: Record<string, string> = {
  name: 'Renommage',
  code: 'Code',
  description: 'Description',
  is_active: 'Activation/D\u00e9sactivation',
  parent_id: 'Reparentage',
};

// Translation keys for entity fields
export const FIELD_LABEL_KEYS: Record<string, string> = {
  name: 'history.rename',
  code: 'labels.code',
  description: 'labels.description',
  is_active: 'history.activation',
  parent_id: 'history.reparent',
};

export const IGNORED_DIFF_FIELDS = ['updated_at', 'path', 'slug', 'level'];

// Legacy system columns that were migrated to custom fields — ignore only for 'update' actions on the entity itself
export const LEGACY_SYSTEM_FIELDS = [
  'address_line1', 'address_line2', 'city', 'postal_code', 'country',
  'phone', 'email', 'website', 'manager_name', 'employee_count',
  'budget', 'cost_center', 'metadata', 'inherit_permissions',
];

export const ACTION_ICONS: Record<string, LucideIcon> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  restore: Undo2,
  field_update: Pencil,
  field_delete: Trash2,
};

export const ACTION_VARIANTS: Record<string, 'default' | 'error' | 'outline'> = {
  create: 'default',
  update: 'default',
  delete: 'error',
  restore: 'outline',
  field_update: 'default',
  field_delete: 'error',
};

export const ACTION_LABELS: Record<string, string> = {
  create: 'Cr\u00e9ation',
  update: 'Modification',
  delete: 'Suppression',
  restore: 'Restauration',
  field_update: 'Champ modifi\u00e9',
  field_delete: 'Champ supprim\u00e9',
};

// Translation keys for action labels
export const ACTION_LABEL_KEYS: Record<string, string> = {
  create: 'history.create',
  update: 'history.update',
  delete: 'history.delete',
  restore: 'history.restore',
  field_update: 'history.field_update',
  field_delete: 'history.field_delete',
};

// Labels for snapshot fields
export const SNAPSHOT_LABELS: Record<string, string> = {
  name: 'Nom',
  code: 'Code',
  description: 'Description',
  is_active: 'Actif',
  level: 'Niveau',
  parent_id: 'Parent',
  created_at: 'Date de cr\u00e9ation',
  updated_at: 'Date de modification',
};

// Translation keys for snapshot labels
export const SNAPSHOT_LABEL_KEYS: Record<string, string> = {
  name: 'snapshot.name',
  code: 'snapshot.code',
  description: 'snapshot.description',
  is_active: 'snapshot.is_active',
  level: 'snapshot.level',
  parent_id: 'snapshot.parent_id',
  created_at: 'snapshot.created_at',
  updated_at: 'snapshot.updated_at',
};

export const SNAPSHOT_HIDDEN_KEYS = ['id', 'client_id', 'path', 'slug', 'created_by'];

/** A single flattened action line */
export interface ActionLine {
  id: string;
  entityId: string;
  entityName: string;
  action: string;
  fieldKey: string | null;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
  date: string;
  user: string | null;
  canRevert: boolean;
}

export function formatDisplayValue(val: unknown, fieldKey: string | null, entityNameMap: Record<string, string>): string {
  if (val === null || val === undefined) return '\u2014';
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
  if (fieldKey === 'parent_id' && typeof val === 'string' && entityNameMap[val]) {
    return entityNameMap[val];
  }
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

// ── Log flattening ──────────────────────────────────────────────────────

interface AuditLogEntryForFlatten {
  id: string;
  entity_id: string;
  action: string;
  changed_fields: Record<string, { old?: unknown; new?: unknown; field_name?: string }>;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | null;
}

export function flattenLogsToActionLines(
  logs: AuditLogEntryForFlatten[],
  entityNameMap: Record<string, string>,
): ActionLine[] {
  const lines: ActionLine[] = [];

  logs.forEach((entry) => {
    const entityName = entityNameMap[entry.entity_id] || 'Entit\u00e9 inconnue';
    const userName = entry.profiles?.full_name || entry.profiles?.email || null;
    const date = entry.created_at;

    if (entry.action === 'create') {
      lines.push({
        id: `${entry.id}-create`,
        entityId: entry.entity_id,
        entityName,
        action: 'create',
        fieldKey: null,
        fieldLabel: 'Cr\u00e9ation',
        oldValue: null,
        newValue: entityName,
        date,
        user: userName,
        canRevert: false,
      });
    } else if (entry.action === 'delete') {
      lines.push({
        id: `${entry.id}-delete`,
        entityId: entry.entity_id,
        entityName,
        action: 'delete',
        fieldKey: null,
        fieldLabel: 'Suppression',
        oldValue: entityName,
        newValue: null,
        date,
        user: userName,
        canRevert: false,
      });
    } else if (entry.action === 'update' || entry.action === 'restore' || entry.action === 'field_update' || entry.action === 'field_delete') {
      const isSystemAction = entry.action === 'update' || entry.action === 'restore';
      const changedKeys = Object.keys(entry.changed_fields || {}).filter(
        k => !IGNORED_DIFF_FIELDS.includes(k) && (!isSystemAction || !LEGACY_SYSTEM_FIELDS.includes(k)),
      );

      changedKeys.forEach(key => {
        const change = entry.changed_fields[key];
        const fieldName = change?.field_name || FIELD_LABELS[key] || key;
        lines.push({
          id: `${entry.id}-${key}`,
          entityId: entry.entity_id,
          entityName,
          action: entry.action,
          fieldKey: key,
          fieldLabel: fieldName,
          oldValue: change?.old,
          newValue: change?.new,
          date,
          user: userName,
          canRevert: true,
        });
      });
    }
  });

  return lines;
}

// ── CSV export builder ──────────────────────────────────────────────────

export function buildAuditCsvContent(
  actionLines: ActionLine[],
  entityNameMap: Record<string, string>,
  formatDate: (date: Date) => string,
): string {
  const BOM = '\uFEFF';
  const sep = ';';
  const headers = ['Date', 'Entit\u00e9', 'Action', 'Champ modifi\u00e9', 'Ancienne valeur', 'Nouvelle valeur', 'Auteur'];

  const escapeCSV = (val: string) => {
    if (val.includes(sep) || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = actionLines.map(line => [
    formatDate(new Date(line.date)),
    line.entityName,
    ACTION_LABELS[line.action] || line.action,
    line.fieldLabel,
    formatDisplayValue(line.oldValue, line.fieldKey, entityNameMap),
    formatDisplayValue(line.newValue, line.fieldKey, entityNameMap),
    line.user || '\u2014',
  ].map(escapeCSV).join(sep));

  return BOM + [headers.join(sep), ...rows].join('\n');
}
