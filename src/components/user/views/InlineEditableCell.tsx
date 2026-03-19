import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListeValues } from '@/hooks/useListeValues';
import { useReferenceObjects } from '@/hooks/useReferenceObjects';
import { useT } from '@/hooks/useT';
import type { CampaignFieldColumn } from '@/hooks/useCampaignFieldColumns';
import { formatFieldValue } from '@/lib/format-utils';

interface InlineEditableCellProps {
  column: CampaignFieldColumn;
  value: unknown;
  isEditable: boolean;
  isHiddenByCondition?: boolean;
  onSave: (newValue: unknown) => void;
}

export function InlineEditableCell({ column, value, isEditable, isHiddenByCondition, onSave }: InlineEditableCellProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const { field_type, referential_id, reference_object_definition_id } = column;

  const isSelect = field_type === 'select' || field_type === 'multiselect';
  const isObjectRef = field_type === 'object_reference';

  const { data: refValues } = useListeValues(isSelect ? referential_id : undefined);
  const { data: refObjects } = useReferenceObjects(isObjectRef ? reference_object_definition_id : undefined);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = useCallback((newValue: unknown) => {
    setEditing(false);
    if (newValue !== value) {
      onSave(newValue);
    }
  }, [value, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(localValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalValue(value);
      setEditing(false);
    }
  }, [handleSave, localValue, value]);

  // Display the referential label instead of the raw value
  // Use localValue (keeps the last saved value) so the display updates instantly
  const displayValue = (() => {
    const v = localValue;
    if (isSelect && refValues && v) {
      const match = refValues.find(rv => rv.id === v || rv.code === v);
      return match?.label || formatFieldValue(v, field_type);
    }
    if (isObjectRef && refObjects && v) {
      const match = refObjects.find(obj => obj.id === v);
      return match?.reference_number || formatFieldValue(v, field_type);
    }
    return formatFieldValue(v, field_type);
  })();

  if (isHiddenByCondition) {
    return <span className="text-sm text-muted-foreground/40">-</span>;
  }

  if (!isEditable) {
    return <span className="text-sm text-foreground">{typeof displayValue === 'string' ? displayValue : displayValue}</span>;
  }

  // Checkbox: toggle immediately without entering edit mode
  if (field_type === 'checkbox') {
    return (
      <Checkbox
        checked={!!value}
        onCheckedChange={(checked) => onSave(!!checked)}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  // Select (referential): always show the Select component directly
  if (isSelect && refValues) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <Select
          value={String(localValue || '')}
          onValueChange={(v) => {
            onSave(v);
            setLocalValue(v);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-full min-w-[120px]">
            <SelectValue placeholder={t('placeholders.select')} />
          </SelectTrigger>
          <SelectContent>
            {refValues.map((rv) => (
              <SelectItem key={rv.id} value={rv.id}>
                {rv.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Display mode
  if (!editing) {
    return (
      <Button
        variant="ghost"
        type="button"
        className="w-full text-left text-sm text-foreground hover:bg-muted/50 rounded px-1 py-0.5 min-h-[28px] cursor-text transition-colors h-auto justify-start font-normal"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {displayValue}
      </Button>
    );
  }

  // Edit mode: Object reference
  if (isObjectRef && refObjects) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <Select
          value={String(localValue || '')}
          onValueChange={(v) => {
            handleSave(v);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-full min-w-[120px]">
            <SelectValue placeholder={t('placeholders.select')} />
          </SelectTrigger>
          <SelectContent>
            {refObjects.map((obj) => (
              <SelectItem key={obj.id} value={obj.id}>
                {obj.reference_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Edit mode: Date
  if (field_type === 'date' || field_type === 'datetime') {
    const dateVal = localValue ? String(localValue).slice(0, 10) : '';
    return (
      <Input
        ref={inputRef}
        type="date"
        className="h-7 text-xs px-1 w-full min-w-[130px]"
        value={dateVal}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => handleSave(localValue)}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  // Edit mode: Number / Decimal / Currency
  if (field_type === 'number' || field_type === 'decimal' || field_type === 'currency') {
    return (
      <Input
        ref={inputRef}
        type="number"
        step={field_type === 'number' ? '1' : '0.01'}
        className="h-7 text-xs px-1 w-full min-w-[80px]"
        value={localValue ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            setLocalValue(null);
          } else {
            const num = field_type === 'number' ? parseInt(raw, 10) : parseFloat(raw);
            if (!isNaN(num)) setLocalValue(num);
          }
        }}
        onBlur={() => handleSave(localValue)}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  // Edit mode: Text / Textarea / Email / URL / etc.
  return (
    <Input
      ref={inputRef}
      type={field_type === 'email' ? 'email' : field_type === 'url' ? 'url' : 'text'}
      className="h-7 text-xs px-1 w-full"
      value={localValue ?? ''}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => handleSave(localValue)}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
