import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface FloatingLabelFieldProps {
  label: string;
  value: string;
  onSave?: (val: string) => void;
  readOnly?: boolean;
}

export function FloatingLabelField({
  label,
  value,
  onSave,
  readOnly = false,
}: FloatingLabelFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); setEditing(false); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => { setEditing(false); if (draft !== value && onSave) onSave(draft); };

  if (readOnly || !onSave) {
    return (
      <fieldset className="rounded-[8px] border px-3 pt-1 pb-2">
        <legend className="text-xs text-muted-foreground px-1">{label}</legend>
        <p className="text-sm">{value || '—'}</p>
      </fieldset>
    );
  }

  if (editing) {
    return (
      <fieldset className="rounded-[8px] border border-primary px-3 pt-1 pb-2">
        <legend className="text-xs text-primary px-1">{label}</legend>
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
