import { memo } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TableRow, TableCell } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReferenceObjects } from '@/hooks/useReferenceObjects';
import { DocumentFieldUpload } from './DocumentFieldUpload';
import { CellCommentPopover } from '../CellCommentPopover';
import type { BoFieldDefinition } from '@/hooks/useBoFieldDefinitions';
import { useT } from '@/hooks/useT';

// ── Types ────────────────────────────────────────────────────────────────────

export type VisibleField = BoFieldDefinition & {
  visibility: 'visible' | 'readonly';
  is_required_override: boolean;
  custom_label?: string;
  section_id?: string;
  visibility_conditions?: import('@/components/builder/page-builder/types').FieldVisibilityCondition[];
  visibility_logic?: 'AND' | 'OR';
  variation_threshold?: number;
  variation_direction?: '+' | '+-' | '-';
};

type RefValuesMap = Map<string, Array<{ id: string; label: string; code: string }>>;

interface FieldComment {
  id: string;
  field_definition_id: string;
  commenter_user_id?: string;
  is_resolved: boolean;
  comment: string;
  step_label?: string | null;
  _commenter?: { full_name?: string | null; email?: string };
}

export interface SurveyFieldRendererProps {
  field: VisibleField;
  value: unknown;
  previousValue: unknown;
  fieldComments: FieldComment[];
  isReadOnly: boolean;
  canComment?: boolean;
  showCommentColumn?: boolean;
  showPreviousColumn: boolean;
  refValuesMap: RefValuesMap | undefined;
  onValueChange: (fieldId: string, value: unknown) => void;
  onResolveComment: (commentId: string) => void;
  onAddComment?: (fieldId: string, comment: string) => void;
  commentDraft?: string;
  onCommentDraftChange?: (fieldId: string, draft: string) => void;
  currentUserId?: string;
  businessObjectId?: string;
  responseId?: string;
  stepLabel?: string;
}

// ── ObjectReferenceField (internal helper) ──────────────────────────────────

function ObjectReferenceField({
  field,
  value,
  onChange,
  disabled,
  label,
}: {
  field: BoFieldDefinition & { is_required_override: boolean };
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
  label: string;
}) {
  const { data: refObjects = [] } = useReferenceObjects(field.reference_object_definition_id);

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {field.is_required_override && field.visibility !== 'readonly' && <span className="text-destructive">*</span>}
      </Label>
      <Select
        value={value ? String(value) : undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="rounded-none">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          {refObjects.map(obj => (
            <SelectItem key={obj.id} value={obj.id}>
              {obj.reference_number}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── SurveyFieldRenderer (table row) ────────────────────────────────────────

export const SurveyFieldRenderer = memo(function SurveyFieldRenderer({
  field,
  value,
  previousValue,
  fieldComments,
  isReadOnly,
  canComment,
  showCommentColumn,
  showPreviousColumn,
  refValuesMap,
  onValueChange,
  onResolveComment,
  onAddComment,
  commentDraft = '',
  onCommentDraftChange,
  currentUserId,
  businessObjectId,
  responseId,
  stepLabel,
}: SurveyFieldRendererProps) {
  const { t, td } = useT();
  const aggSettings = field.field_type === 'aggregation' ? (field.settings || {}) as Record<string, unknown> : null;
  const isFieldReadonly = isReadOnly || field.visibility === 'readonly' || (aggSettings !== null && !aggSettings.aggregation_editable);
  const label = field.custom_label || td('field_definitions', field.id, 'name', field.name);
  const hasPreviousValue = previousValue !== undefined && previousValue !== null;

  // Variation threshold check for number fields
  const variationExceeded = (() => {
    if (!field.variation_threshold || !hasPreviousValue) return false;
    if (!['number', 'decimal'].includes(field.field_type)) return false;
    const prev = Number(previousValue);
    const curr = Number(value);
    if (isNaN(prev) || isNaN(curr) || prev === 0) return false;
    const pct = field.variation_threshold / 100;
    const dir = field.variation_direction || '+-';
    const tooHigh = curr > prev * (1 + pct);
    const tooLow = curr < prev * (1 - pct);
    if (dir === '+') return tooHigh;
    if (dir === '-') return tooLow;
    return tooHigh || tooLow; // '+-'
  })();

  const formatDisplayValue = (val: unknown) => {
    if (val === null || val === undefined || val === '') return '-';
    if (typeof val === 'boolean') return val ? t('boolean.yes') : t('boolean.no');
    // For referential values, try to resolve label
    if (field.referential_id && refValuesMap) {
      const refValues = refValuesMap.get(field.referential_id);
      const match = refValues?.find(rv => rv.id === String(val));
      if (match) return match.label;
    }
    return String(val);
  };

  return (
    <TableRow key={field.id}>
      {/* Field name */}
      <TableCell className="text-sm text-foreground align-top">
        <div className="flex items-start gap-1">
          <span>{label}</span>
          {field.is_required_override && !isFieldReadonly && <span className="text-destructive">*</span>}
        </div>
      </TableCell>

      {/* Previous value (N-1) */}
      {showPreviousColumn && (
        <>
          <TableCell className="text-sm text-primary align-top" style={{ width: '20%' }}>
            {hasPreviousValue ? formatDisplayValue(previousValue) : '-'}
          </TableCell>
          <TableCell className="text-muted-foreground align-top w-8">
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </TableCell>
        </>
      )}

      {/* Current value input */}
      <TableCell className="align-top" style={{ width: showPreviousColumn ? '30%' : '50%' }}>
        <div className="flex items-start gap-2">
          {isFieldReadonly ? (
            <span className="text-sm py-1">{formatDisplayValue(value)}</span>
          ) : field.field_type === 'checkbox' ? (
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => onValueChange(field.id, !!checked)}
            />
          ) : field.field_type === 'textarea' ? (
            <Textarea
              value={value || ''}
              onChange={(e) => onValueChange(field.id, e.target.value)}
              placeholder=""
              rows={3}
              className="rounded-none text-sm border-border"
            />
          ) : (field.field_type === 'select' || field.field_type === 'multiselect') ? (
            <Select
              value={value ? String(value) : undefined}
              onValueChange={(v) => onValueChange(field.id, v)}
            >
              <SelectTrigger className="rounded-none w-full">
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                {(refValuesMap?.get(field.referential_id || '') || []).map(rv => (
                  <SelectItem key={rv.id} value={rv.id}>{rv.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.field_type === 'object_reference' ? (
            <ObjectReferenceField
              field={field}
              value={value}
              onChange={(v) => onValueChange(field.id, v)}
              disabled={false}
              label={label}
            />
          ) : field.field_type === 'document' && businessObjectId ? (
            (() => {
              const fieldSettings = (field.settings || {}) as Record<string, unknown>;
              return (
                <DocumentFieldUpload
                  businessObjectId={businessObjectId}
                  fieldDefinitionId={field.id}
                  disabled={false}
                  multiple={(fieldSettings.doc_multiple as boolean) || false}
                  maxSizeMb={(fieldSettings.doc_max_size_mb as number) || undefined}
                  acceptedFormats={(fieldSettings.doc_accepted_formats as string) || undefined}
                />
              );
            })()
          ) : field.field_type === 'date' || field.field_type === 'datetime' ? (
            <Input
              type="date"
              value={value ? String(value).slice(0, 10) : ''}
              onChange={(e) => onValueChange(field.id, e.target.value)}
              className="rounded-none"
            />
          ) : (
            <Input
              type={field.field_type === 'number' ? 'number' : field.field_type === 'decimal' ? 'number' : field.field_type === 'email' ? 'email' : 'text'}
              step={field.field_type === 'decimal' ? '0.01' : undefined}
              value={value ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (field.field_type === 'number') {
                  onValueChange(field.id, raw === '' ? null : parseInt(raw, 10));
                } else if (field.field_type === 'decimal') {
                  onValueChange(field.id, raw === '' ? null : parseFloat(raw));
                } else {
                  onValueChange(field.id, raw);
                }
              }}
              className={cn('rounded-none', variationExceeded && 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700')}
            />
          )}
          {/* Variation indicator */}
          {variationExceeded && (
            <Chip variant="outline" className="rounded-none text-xs shrink-0 border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700 gap-1 whitespace-nowrap">
              <AlertCircle className="h-3 w-3" />
              {t('survey.variation_exceeded', { threshold: field.variation_threshold })}
            </Chip>
          )}
        </div>
      </TableCell>

      {/* Comments column — Google Sheets style */}
      {showCommentColumn && (
        <TableCell className="relative group/cell p-0">
          <CellCommentPopover
            responseId={responseId!}
            fieldDefinitionId={field.id}
            hasComments={fieldComments.length > 0}
            stepLabel={stepLabel}
          />
          {/* Preview text */}
          <div className="px-2 py-1.5 min-h-[32px] text-xs">
            {fieldComments.length > 0 && (
              <span className="text-foreground line-clamp-2">{fieldComments[0].comment}</span>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
});
