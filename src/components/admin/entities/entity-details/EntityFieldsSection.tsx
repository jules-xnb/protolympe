import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { useResolvedEoOptions } from '@/hooks/useResolvedEoOptions';
import type { DrawerEntity } from './EntityInfoSection';

interface EntityFieldsSectionProps {
  entity: DrawerEntity;
  enableReparent: boolean;
  parentEntity: DrawerEntity | null;
  parentCandidates: DrawerEntity[];
  editingParent: boolean;
  setEditingParent: (editing: boolean) => void;
  activeCustomFields: EoFieldDefinition[];
  customFieldValues: Record<string, unknown>;
  saveCoreField: (field: string, value: unknown) => Promise<void>;
  saveCustomField: (fieldId: string, value: string) => Promise<void>;
  handleSelectChange: (field: EoFieldDefinition, newValue: string) => void;
  updateEntityParent: (parentId: string | null) => Promise<void>;
  flashSaved: () => void;
}

export function EntityFieldsSection({
  entity,
  enableReparent,
  parentEntity,
  parentCandidates,
  editingParent,
  setEditingParent,
  activeCustomFields,
  customFieldValues,
  saveCoreField,
  saveCustomField,
  handleSelectChange,
  updateEntityParent,
  flashSaved,
}: EntityFieldsSectionProps) {
  const { getOptions } = useResolvedEoOptions(activeCustomFields);

  return (
    <div className="space-y-5">
      {/* Custom fields */}
      {activeCustomFields.filter(f => !f.slug?.startsWith('__system_')).map((field) => {
        const raw = customFieldValues[field.id];
        const displayVal = raw != null ? String(raw) : '';

        // Select fields → floating label select
        if (['select', 'multiselect'].includes(field.field_type)) {
          const options = getOptions(field).map(o => o.label);
          return (
            <div key={field.id} className="relative">
              <fieldset className="rounded-[8px] border px-3 pt-1 pb-2">
                <legend className="text-xs text-muted-foreground px-1">
                  {field.name}{field.is_required && <span className="text-destructive">*</span>}
                </legend>
                <Select
                  value={displayVal}
                  onValueChange={(v) => handleSelectChange(field, v)}
                >
                  <SelectTrigger className="h-8 border-0 shadow-none p-0 text-sm focus:ring-0">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o: string) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </fieldset>
            </div>
          );
        }

        // Boolean / checkbox
        if (['checkbox', 'boolean'].includes(field.field_type)) {
          const checked = displayVal === 'true' || displayVal === '1';
          const boolLabels = (field.settings as Record<string, unknown> | null)?.boolean_labels as { true_label?: string; false_label?: string } | undefined;
          const trueLabel = boolLabels?.true_label || 'Oui';
          const falseLabel = boolLabels?.false_label || 'Non';
          return (
            <div key={field.id} className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={checked}
                  onCheckedChange={(v) => saveCustomField(field.id, String(v))}
                />
                <span className="text-sm font-medium">{field.name}</span>
              </div>
              <p className="text-sm text-muted-foreground pl-11">
                {checked ? trueLabel : falseLabel}
              </p>
            </div>
          );
        }

        // Text / number / etc → floating label input
        return (
          <FloatingLabelField
            key={field.id}
            label={field.name + (field.is_required ? ' *' : '')}
            value={displayVal}
            onSave={(v) => saveCustomField(field.id, v)}
          />
        );
      })}

      {/* Metadata */}
      <div className="pt-2 space-y-1 text-xs text-muted-foreground">
        <p>Créée le {format(new Date(entity.created_at!), 'dd MMMM yyyy', { locale: fr })}</p>
        <p>Modifiée le {format(new Date(entity.updated_at!), 'dd MMMM yyyy', { locale: fr })}</p>
      </div>
    </div>
  );
}

/* ── Floating Label Field ── */

function FloatingLabelField({
  label,
  value,
  onSave,
  readOnly = false,
  mono = false,
}: {
  label: string;
  value: string;
  onSave?: (val: string) => void;
  readOnly?: boolean;
  mono?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value && onSave) onSave(draft);
  };

  if (readOnly || !onSave) {
    return (
      <fieldset className="rounded-[8px] border px-3 pt-1 pb-2">
        <legend className="text-xs text-muted-foreground px-1">{label}</legend>
        <p className={`text-sm ${mono ? 'font-mono select-all' : ''}`}>
          {value || '—'}
        </p>
      </fieldset>
    );
  }

  if (editing) {
    return (
      <fieldset className="rounded-[8px] border border-primary px-3 pt-1 pb-2">
        <legend className="text-xs text-primary px-1">{label}</legend>
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setDraft(value); setEditing(false); }
            }}
            onBlur={commit}
            className="flex-1 h-auto p-0 text-sm bg-transparent border-none shadow-none focus-visible:border-none focus-visible:ring-0"
          />
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset
      className="rounded-[8px] border px-3 pt-1 pb-2 cursor-text hover:border-foreground/30 transition-colors"
      onClick={() => setEditing(true)}
    >
      <legend className="text-xs text-muted-foreground px-1">{label}</legend>
      <p className="text-sm">{value || '—'}</p>
    </fieldset>
  );
}

/* ── Floating Label Select wrapper ── */

function FloatingLabelSelect({
  label,
  value,
  editing,
  onEditStart,
  onEditEnd: _onEditEnd,
  children,
}: {
  label: string;
  value: string;
  editing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  children: React.ReactNode;
}) {
  if (editing) {
    return (
      <div>
        <fieldset className="rounded-[8px] border border-primary px-3 pt-1 pb-2">
          <legend className="text-xs text-primary px-1">{label}</legend>
          {children}
        </fieldset>
      </div>
    );
  }

  return (
    <fieldset
      className="rounded-[8px] border px-3 pt-1 pb-2 cursor-pointer hover:border-foreground/30 transition-colors"
      onClick={onEditStart}
    >
      <legend className="text-xs text-muted-foreground px-1">{label}</legend>
      <div className="flex items-center justify-between">
        <p className="text-sm">{value || '—'}</p>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </fieldset>
  );
}
