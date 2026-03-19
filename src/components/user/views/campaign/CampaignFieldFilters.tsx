import { useState } from 'react';
import { Plus, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Chip } from '@/components/ui/chip';
import { useReferentialValues } from '@/hooks/useReferentialValues';
import type { CampaignFieldColumn } from '@/hooks/useCampaignFieldColumns';

// ── Types ──────────────────────────────────────────────────────────────────

export interface FieldFilter {
  id: string;
  field_id: string;
  operator: string;
  value: string;
}

export type FilterLogic = 'AND' | 'OR';

interface CampaignFieldFiltersProps {
  columns: CampaignFieldColumn[];
  filters: FieldFilter[];
  filterLogic: FilterLogic;
  onFiltersChange: (filters: FieldFilter[]) => void;
  onFilterLogicChange: (logic: FilterLogic) => void;
}

// ── Operators by field type ────────────────────────────────────────────────

const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contient' },
  { value: 'equals', label: 'Égal à' },
  { value: 'not_equals', label: 'Différent de' },
  { value: 'is_empty', label: 'Est vide' },
  { value: 'is_not_empty', label: 'N\'est pas vide' },
];

const NUMBER_OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'greater_or_equal', label: '≥' },
  { value: 'less_or_equal', label: '≤' },
  { value: 'is_empty', label: 'Est vide' },
  { value: 'is_not_empty', label: 'N\'est pas vide' },
];

const SELECT_OPERATORS = [
  { value: 'equals', label: 'Égal à' },
  { value: 'not_equals', label: 'Différent de' },
  { value: 'is_empty', label: 'Est vide' },
  { value: 'is_not_empty', label: 'N\'est pas vide' },
];

const BOOLEAN_OPERATORS = [
  { value: 'equals', label: 'Égal à' },
];

const DATE_OPERATORS = [
  { value: 'equals', label: 'Égal à' },
  { value: 'greater_than', label: 'Après' },
  { value: 'less_than', label: 'Avant' },
  { value: 'is_empty', label: 'Est vide' },
  { value: 'is_not_empty', label: 'N\'est pas vide' },
];

function getOperators(fieldType: string) {
  if (['number', 'decimal', 'currency'].includes(fieldType)) return NUMBER_OPERATORS;
  if (['select', 'multiselect'].includes(fieldType)) return SELECT_OPERATORS;
  if (['checkbox', 'boolean'].includes(fieldType)) return BOOLEAN_OPERATORS;
  if (['date', 'datetime'].includes(fieldType)) return DATE_OPERATORS;
  return TEXT_OPERATORS;
}

function needsValue(operator: string) {
  return !['is_empty', 'is_not_empty'].includes(operator);
}

// ── Evaluate a single filter against a value ──────────────────────────────

export function evaluateFieldFilter(filter: FieldFilter, rawValue: unknown): boolean {
  const { operator, value: filterValue } = filter;

  if (operator === 'is_empty') {
    return rawValue === null || rawValue === undefined || rawValue === '';
  }
  if (operator === 'is_not_empty') {
    return rawValue !== null && rawValue !== undefined && rawValue !== '';
  }

  const fieldStr = rawValue != null ? String(rawValue).toLowerCase() : '';
  const filterStr = filterValue.toLowerCase();

  switch (operator) {
    case 'contains':
      return fieldStr.includes(filterStr);
    case 'equals':
      return fieldStr === filterStr;
    case 'not_equals':
      return fieldStr !== filterStr;
    case 'greater_than':
      return Number(rawValue) > Number(filterValue);
    case 'less_than':
      return Number(rawValue) < Number(filterValue);
    case 'greater_or_equal':
      return Number(rawValue) >= Number(filterValue);
    case 'less_or_equal':
      return Number(rawValue) <= Number(filterValue);
    default:
      return true;
  }
}

// ── Filter row: value input adapts to field type ──────────────────────────

function FilterValueInput({
  column,
  value,
  onChange,
}: {
  column: CampaignFieldColumn;
  value: string;
  onChange: (v: string) => void;
}) {
  const isSelect = ['select', 'multiselect'].includes(column.field_type);
  const { data: refValues } = useReferentialValues(isSelect ? column.referential_id : undefined);

  if (['checkbox', 'boolean'].includes(column.field_type)) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs w-32">
          <SelectValue placeholder="Valeur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Oui</SelectItem>
          <SelectItem value="false">Non</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (isSelect && refValues) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs w-40">
          <SelectValue placeholder="Valeur" />
        </SelectTrigger>
        <SelectContent>
          {refValues.map(rv => (
            <SelectItem key={rv.id} value={rv.id}>{rv.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (['date', 'datetime'].includes(column.field_type)) {
    return (
      <Input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-7 text-xs w-36"
      />
    );
  }

  if (['number', 'decimal', 'currency'].includes(column.field_type)) {
    return (
      <Input
        type="number"
        step={column.field_type === 'number' ? '1' : '0.01'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Valeur"
        className="h-7 text-xs w-28"
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Valeur"
      className="h-7 text-xs w-36"
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function CampaignFieldFilters({
  columns,
  filters,
  filterLogic,
  onFiltersChange,
  onFilterLogicChange,
}: CampaignFieldFiltersProps) {
  const [open, setOpen] = useState(filters.length > 0);

  const addFilter = () => {
    const firstCol = columns[0];
    if (!firstCol) return;
    const ops = getOperators(firstCol.field_type);
    onFiltersChange([
      ...filters,
      { id: crypto.randomUUID(), field_id: firstCol.field_id, operator: ops[0].value, value: '' },
    ]);
    setOpen(true);
  };

  const updateFilter = (id: string, updates: Partial<FieldFilter>) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id: string) => {
    const next = filters.filter(f => f.id !== id);
    onFiltersChange(next);
    if (next.length === 0) setOpen(false);
  };

  if (columns.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle + add */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => filters.length > 0 ? setOpen(!open) : addFilter()}
        >
          <Filter className="h-3 w-3" />
          Filtres
          {filters.length > 0 && (
            <Chip variant="default" className="ml-1 h-4 min-w-[16px] px-1 text-[10px]">
              {filters.length}
            </Chip>
          )}
        </Button>

        {open && filters.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addFilter}>
            <Plus className="h-3 w-3" />
            Ajouter
          </Button>
        )}
      </div>

      {/* Filter rows */}
      {open && filters.map((filter, index) => {
        const col = columns.find(c => c.field_id === filter.field_id);
        const operators = col ? getOperators(col.field_type) : TEXT_OPERATORS;

        return (
          <div key={filter.id} className="flex items-center gap-2">
            {/* Logic connector: spacer for first, AND/OR toggle for others */}
            {index === 0 ? (
              <span className="w-14 shrink-0" />
            ) : (
              <div className="flex items-center border rounded-md overflow-hidden w-14 shrink-0">
                <button
                  type="button"
                  className={`flex-1 px-1 py-0.5 text-[10px] font-medium transition-colors ${filterLogic === 'AND' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => onFilterLogicChange('AND')}
                >
                  ET
                </button>
                <button
                  type="button"
                  className={`flex-1 px-1 py-0.5 text-[10px] font-medium transition-colors ${filterLogic === 'OR' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                  onClick={() => onFilterLogicChange('OR')}
                >
                  OU
                </button>
              </div>
            )}
            {/* Column picker */}
            <Select
              value={filter.field_id}
              onValueChange={fieldId => {
                const newCol = columns.find(c => c.field_id === fieldId);
                const newOps = newCol ? getOperators(newCol.field_type) : TEXT_OPERATORS;
                updateFilter(filter.id, {
                  field_id: fieldId,
                  operator: newOps[0].value,
                  value: '',
                });
              }}
            >
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map(c => (
                  <SelectItem key={c.field_id} value={c.field_id}>
                    {c.custom_label || c.field_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator picker */}
            <Select
              value={filter.operator}
              onValueChange={op => updateFilter(filter.id, { operator: op, value: needsValue(op) ? filter.value : '' })}
            >
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map(op => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value input — adapts to field type */}
            {needsValue(filter.operator) && col && (
              <FilterValueInput
                column={col}
                value={filter.value}
                onChange={v => updateFilter(filter.id, { value: v })}
              />
            )}

            {/* Remove */}
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFilter(filter.id)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
