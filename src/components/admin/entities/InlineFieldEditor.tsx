import { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Check, X, CalendarIcon, MessageSquare } from 'lucide-react';
import { format, parse, isValid, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EoFieldDefinition, EoFieldOption } from '@/hooks/useEoFieldDefinitions';
import { useReferentialValues } from '@/hooks/useReferentialValues';
import { validateCrossFieldRules } from '@/lib/eo/eo-cross-field-validation';
import { getFieldFormat, applyFieldFormat } from '@/lib/eo/eo-field-format';

interface ChangeComment {
  id: string;
  field_definition_id: string;
  comment: string;
}

interface InlineFieldEditorProps {
  field: EoFieldDefinition;
  value: unknown;
  isEditable: boolean;
  onSave: (value: unknown) => void;
  changeComments?: ChangeComment[];
  onSelectChange?: (field: EoFieldDefinition, newValue: string) => void;
  /** All field values keyed by field_definition_id — needed for cross-field validation */
  allFieldValues?: Record<string, unknown>;
  /** All field definitions — needed for cross-field validation */
  allFieldDefinitions?: EoFieldDefinition[];
  /** Label style variant */
  labelClassName?: string;
}

/* ── Helpers ── */

function getMaxLength(field: EoFieldDefinition): number | undefined {
  if (['text', 'textarea', 'email', 'phone', 'url'].includes(field.field_type)) {
    return field.validation_rules?.max_length;
  }
  return undefined;
}

/** Parse a date string that could be ISO (yyyy-MM-dd), dd/MM/yyyy, or a full ISO timestamp */
function parseDateValue(str: string): Date | undefined {
  if (!str) return undefined;
  // Try ISO first (yyyy-MM-dd or full ISO timestamp)
  const iso = parseISO(str);
  if (isValid(iso)) return iso;
  // Try dd/MM/yyyy (backfill legacy format)
  const ddmm = parse(str, 'dd/MM/yyyy', new Date());
  if (isValid(ddmm)) return ddmm;
  // Fallback
  const fallback = new Date(str);
  return isValid(fallback) ? fallback : undefined;
}

function formatDisplayValue(value: unknown, field: EoFieldDefinition): React.ReactNode {
  if (value == null || value === '') return '';
  const str = String(value);
  const fieldFormat = getFieldFormat(field.settings);
  if (fieldFormat) return applyFieldFormat(str, fieldFormat);
  switch (field.field_type) {
    case 'date': {
      const d = parseDateValue(str);
      return d ? format(d, 'dd/MM/yyyy') : str;
    }
    case 'checkbox':
    case 'boolean':
      return str === 'true' || str === '1' ? 'Oui' : 'Non';
    case 'url':
      return (
        <a href={str} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline break-all">
          {str}
        </a>
      );
    default:
      return str;
  }
}

function inputTypeFor(fieldType: string): string {
  switch (fieldType) {
    case 'number': return 'number';
    case 'email': return 'email';
    case 'phone': return 'tel';
    case 'url': return 'url';
    default: return 'text';
  }
}

/* ── Component ── */

export function InlineFieldEditor({
  field,
  value,
  isEditable,
  onSave,
  changeComments,
  onSelectChange,
  allFieldValues,
  allFieldDefinitions,
  labelClassName,
}: InlineFieldEditorProps) {
  const displayVal = value != null ? String(value) : '';
  const maxLength = getMaxLength(field);
  const isRequired = field.is_required;
  const fieldType = field.field_type;
  const [crossFieldError, setCrossFieldError] = useState<string | null>(null);

  const isSelectType = ['select', 'multiselect'].includes(fieldType);
  const isCheckbox = fieldType === 'checkbox' || fieldType === 'boolean';
  const isDate = fieldType === 'date';
  const isTextarea = fieldType === 'textarea';

  /** Validate cross-field rules before calling onSave */
  const validatedSave = useCallback((newValue: unknown): string | null => {
    if (allFieldValues && allFieldDefinitions) {
      const error = validateCrossFieldRules(field, newValue, allFieldValues, allFieldDefinitions);
      if (error) {
        setCrossFieldError(error);
        return error;
      }
    }
    setCrossFieldError(null);
    onSave(newValue);
    return null;
  }, [field, allFieldValues, allFieldDefinitions, onSave]);

  // Resolve referential options for select fields
  const refId = field.settings?.referential_id as string | undefined;
  const { data: refValues } = useReferentialValues(refId || null);

  // Select fields
  if (isSelectType) {
    const options = refValues && refId
      ? refValues.map(rv => rv.label)
      : (field.options || []).map((o: EoFieldOption) =>
          typeof o === 'string' ? o : o.label || o.value
        );
    const commentRulesEnabled = field.settings?.comment_rules?.enabled;
    const latestComment = commentRulesEnabled
      ? changeComments?.find(c => c.field_definition_id === field.id)
      : null;

    const isMulti = fieldType === 'multiselect';

    // Parse current multiselect values (stored as JSON array string or comma-separated)
    const parseMultiValues = (val: string): string[] => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not JSON */ }
      return val.split(',').map(s => s.trim()).filter(Boolean);
    };

    if (isMulti) {
      const selectedValues = parseMultiValues(displayVal);
      const toggleValue = (opt: string) => {
        const next = selectedValues.includes(opt)
          ? selectedValues.filter(v => v !== opt)
          : [...selectedValues, opt];
        const serialized = JSON.stringify(next);
        if (onSelectChange) onSelectChange(field, serialized);
        else validatedSave(serialized);
      };

      return (
        <div className="space-y-1">
          <FieldLabel name={field.name} isRequired={isRequired} className={labelClassName} />
          {isEditable ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-auto min-h-[2rem] w-full justify-start text-left text-sm font-normal flex-wrap gap-1">
                  {selectedValues.length > 0 ? (
                    selectedValues.map(v => (
                      <span key={v} className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium">{v}</span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-50" align="start">
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {options.map((o: string) => (
                    <label key={o} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <Checkbox
                        checked={selectedValues.includes(o)}
                        onCheckedChange={() => toggleValue(o)}
                      />
                      {o}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <p className="text-sm font-medium">
              {selectedValues.length > 0 ? selectedValues.join(', ') : '—'}
            </p>
          )}
          {latestComment && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="italic">"{latestComment.comment}"</span>
            </div>
          )}
          {crossFieldError && <p className="text-xs text-destructive">{crossFieldError}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <FieldLabel name={field.name} isRequired={isRequired} className={labelClassName} />
        {isEditable ? (
          <Select
            value={displayVal}
            onValueChange={(v) => onSelectChange ? onSelectChange(field, v) : validatedSave(v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o: string) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm font-medium">{displayVal || '—'}</p>
        )}
        {latestComment && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="italic">"{latestComment.comment}"</span>
          </div>
        )}
        {crossFieldError && <p className="text-xs text-destructive">{crossFieldError}</p>}
      </div>
    );
  }

  // Checkbox / Boolean — immediate toggle, no edit mode
  if (isCheckbox) {
    const checked = displayVal === 'true' || displayVal === '1';
    const boolLabels = field.settings?.boolean_labels;
    const trueLabel = boolLabels?.true_label || 'Oui';
    const falseLabel = boolLabels?.false_label || 'Non';
    return (
      <div className="space-y-1">
        <FieldLabel name={field.name} isRequired={isRequired} className={labelClassName} />
        <div className="flex items-center gap-2">
          {isEditable ? (
            <Switch
              checked={checked}
              onCheckedChange={(v) => validatedSave(String(v))}
              className="scale-90"
            />
          ) : null}
          <span className="text-sm">{checked ? trueLabel : falseLabel}</span>
        </div>
        {crossFieldError && <p className="text-xs text-destructive">{crossFieldError}</p>}
      </div>
    );
  }

  // Date — popover calendar
  if (isDate) {
    return (
      <DateInlineField
        field={field}
        value={displayVal}
        isEditable={isEditable}
        onSave={validatedSave}
        crossFieldError={crossFieldError}
        labelClassName={labelClassName}
      />
    );
  }

  // Textarea
  if (isTextarea) {
    return (
      <TextareaInlineField
        field={field}
        value={displayVal}
        isEditable={isEditable}
        maxLength={maxLength}
        onSave={validatedSave}
        crossFieldError={crossFieldError}
        labelClassName={labelClassName}
      />
    );
  }

  // Default: text / number / email / phone / url
  return (
    <TextInlineField
      field={field}
      value={displayVal}
      isEditable={isEditable}
      maxLength={maxLength}
      onSave={validatedSave}
      crossFieldError={crossFieldError}
      labelClassName={labelClassName}
    />
  );
}

/* ── Sub-components ── */

function FieldLabel({ name, isRequired, className }: { name: string; isRequired: boolean; className?: string }) {
  return (
    <span className={cn(
      'text-xs',
      isRequired ? 'text-destructive font-medium' : 'text-muted-foreground',
      className,
    )}>
      {name}{isRequired && '*'}
    </span>
  );
}

/* Text / Number / Email / Phone / URL */
function TextInlineField({
  field, value, isEditable, maxLength, onSave, crossFieldError, labelClassName,
}: {
  field: EoFieldDefinition; value: string; isEditable: boolean; maxLength?: number; onSave: (v: string) => string | null; crossFieldError?: string | null; labelClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); setEditing(false); setError(''); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    if (field.is_required && !draft.trim()) { setError('Ce champ est obligatoire'); return; }
    if (draft !== value) {
      const crossErr = onSave(draft);
      if (crossErr) { setError(crossErr); return; }
    }
    setError(''); setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); setError(''); };

  if (editing) {
    return (
      <div className="space-y-1">
        <FieldLabel name={field.name} isRequired={field.is_required} className={labelClassName} />
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type={inputTypeFor(field.field_type)}
            value={draft}
            maxLength={maxLength}
            step={field.field_type === 'number' ? 'any' : undefined}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
            className="flex-1 h-8 p-0 px-2 text-sm border rounded bg-background shadow-none focus-visible:border-primary"
          />
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={commit}><Check className="h-3.5 w-3.5" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={cancel}><X className="h-3.5 w-3.5" /></Button>
        </div>
        {maxLength && <p className="text-xs text-muted-foreground text-right">{draft.length} / {maxLength}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  const isEmpty = !value;
  return (
    <div className="group space-y-1">
      <FieldLabel name={field.name} isRequired={field.is_required} className={labelClassName} />
      <div className="flex items-center gap-2">
        <p className={cn('text-sm', isEmpty ? (field.is_required ? 'text-destructive' : 'text-muted-foreground') : 'font-medium')}>
          {isEmpty ? '—' : formatDisplayValue(value, field)}
        </p>
        {isEditable && (
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      {crossFieldError && !editing && <p className="text-xs text-destructive">{crossFieldError}</p>}
    </div>
  );
}

/* Textarea */
function TextareaInlineField({
  field, value, isEditable, maxLength, onSave, crossFieldError, labelClassName,
}: {
  field: EoFieldDefinition; value: string; isEditable: boolean; maxLength?: number; onSave: (v: string) => string | null; crossFieldError?: string | null; labelClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); setEditing(false); setError(''); }, [value]);
  useEffect(() => { if (editing) textareaRef.current?.focus(); }, [editing]);

  const commit = () => {
    if (field.is_required && !draft.trim()) { setError('Ce champ est obligatoire'); return; }
    if (draft !== value) {
      const crossErr = onSave(draft);
      if (crossErr) { setError(crossErr); return; }
    }
    setError(''); setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); setError(''); };

  if (editing) {
    return (
      <div className="space-y-1">
        <FieldLabel name={field.name} isRequired={field.is_required} className={labelClassName} />
        <textarea
          ref={textareaRef}
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}
          className="w-full min-h-[80px] px-2 py-1.5 text-sm border rounded bg-background outline-none focus:border-primary resize-y"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={commit}><Check className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={cancel}><X className="h-3.5 w-3.5" /></Button>
          </div>
          {maxLength && <p className="text-xs text-muted-foreground">{draft.length} / {maxLength}</p>}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  const isEmpty = !value;
  return (
    <div className="group space-y-1">
      <FieldLabel name={field.name} isRequired={field.is_required} className={labelClassName} />
      <div className="flex items-start gap-2">
        <p className={cn('text-sm whitespace-pre-wrap', isEmpty ? (field.is_required ? 'text-destructive' : 'text-muted-foreground') : 'font-medium')}>
          {isEmpty ? '—' : value}
        </p>
        {isEditable && (
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      {crossFieldError && !editing && <p className="text-xs text-destructive">{crossFieldError}</p>}
    </div>
  );
}

/* Date */
function DateInlineField({
  field, value, isEditable, onSave, crossFieldError, labelClassName,
}: {
  field: EoFieldDefinition; value: string; isEditable: boolean; onSave: (v: string) => string | null; crossFieldError?: string | null; labelClassName?: string;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const validDate = value ? parseDateValue(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    const val = date ? format(date, 'yyyy-MM-dd') : '';
    const err = onSave(val);
    if (err) {
      setLocalError(err);
    } else {
      setLocalError(null);
      setPopoverOpen(false);
    }
  };

  const displayText = validDate ? format(validDate, 'dd/MM/yyyy') : '';
  const isEmpty = !displayText;

  return (
    <div className="space-y-1">
      <FieldLabel name={field.name} isRequired={field.is_required} className={labelClassName} />
      {isEditable ? (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-8 w-full justify-start text-left text-sm font-normal',
                isEmpty && 'text-muted-foreground',
              )}
            >
              {displayText || '—'}
              <CalendarIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={validDate}
              onSelect={handleSelect}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <p className={cn('text-sm', isEmpty ? 'text-muted-foreground' : 'font-medium')}>
          {displayText || '—'}
        </p>
      )}
      {(localError || crossFieldError) && <p className="text-xs text-destructive">{localError || crossFieldError}</p>}
    </div>
  );
}
