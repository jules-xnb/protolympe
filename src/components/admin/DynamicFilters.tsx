import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn, generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Filter, Plus, X, Trash2, Search as SearchIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export interface FilterColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';
  options?: { value: string; label: string }[];
}

export type FilterLogic = 'and' | 'or';

export interface FilterRule {
  id: string;
  columnId: string;
  operator: string;
  value: string;
  is_locked?: boolean;
}

const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contient' },
  { value: 'equals', label: 'Égal à' },
  { value: 'not_equals', label: 'Différent de' },
  { value: 'starts_with', label: 'Commence par' },
];

const NUMBER_OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
];

const BOOLEAN_OPERATORS = [
  { value: 'equals', label: 'Est' },
];

const SELECT_OPERATORS = [
  { value: 'equals', label: 'Est' },
  { value: 'not_equals', label: 'N\'est pas' },
];

const MULTISELECT_OPERATORS = [
  { value: 'in', label: 'Est' },
];

const DATE_OPERATORS = [
  { value: 'equals', label: 'Égal à' },
  { value: 'not_equals', label: 'Différent de' },
  { value: 'gt', label: 'Après' },
  { value: 'lt', label: 'Avant' },
  { value: 'gte', label: 'À partir de' },
  { value: 'lte', label: 'Jusqu\'à' },
];

function getOperators(type: FilterColumn['type']) {
  switch (type) {
    case 'number': return NUMBER_OPERATORS;
    case 'boolean': return BOOLEAN_OPERATORS;
    case 'select': return SELECT_OPERATORS;
    case 'multiselect': return MULTISELECT_OPERATORS;
    case 'date': return DATE_OPERATORS;
    default: return TEXT_OPERATORS;
  }
}

interface DynamicFiltersProps {
  columns: FilterColumn[];
  filters: FilterRule[];
  onFiltersChange: (filters: FilterRule[]) => void;
  logic: FilterLogic;
  onLogicChange: (logic: FilterLogic) => void;
  showBadges?: boolean;
}

export function DynamicFilters({ columns, filters, onFiltersChange, logic, onLogicChange, showBadges = true }: DynamicFiltersProps) {
  const [open, setOpen] = useState(false);
  const [multiselectSearch, setMultiselectSearch] = useState<Record<string, string>>({});

  const addFilter = () => {
    const firstCol = columns[0];
    if (!firstCol) return;
    const ops = getOperators(firstCol.type);
    onFiltersChange([
      ...filters,
      {
        id: generateId(),
        columnId: firstCol.id,
        operator: ops[0].value,
        value: '',
      },
    ]);
  };

  const updateFilter = (id: string, updates: Partial<FilterRule>) => {
    onFiltersChange(
      filters.map(f => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };
        if (updates.columnId && updates.columnId !== f.columnId) {
          const col = columns.find(c => c.id === updates.columnId);
          const ops = getOperators(col?.type || 'text');
          updated.operator = ops[0].value;
          updated.value = '';
        }
        return updated;
      })
    );
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id || f.is_locked));
  };

  const clearAll = () => {
    onFiltersChange(filters.filter(f => f.is_locked));
  };

  const isFilterActive = (f: FilterRule) => {
    if (f.value === '') return false;
    try { const arr = JSON.parse(f.value); if (Array.isArray(arr)) return arr.length > 0; } catch { /* not json */ }
    return true;
  };
  const activeCount = filters.filter(isFilterActive).length;

  const renderFilterRow = (filter: FilterRule) => {
    const col = columns.find(c => c.id === filter.columnId);
    const ops = getOperators(col?.type || 'text');

    return (
      <div className="flex items-center gap-1.5">
        <Select
          value={filter.columnId}
          onValueChange={(v) => updateFilter(filter.id, { columnId: v })}
          disabled={filter.is_locked}
        >
          <SelectTrigger className="h-7 w-[150px] text-xs">
            <SelectValue placeholder="Champ...">{col?.label || 'Champ...'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {columns.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filter.operator}
          onValueChange={(v) => updateFilter(filter.id, { operator: v })}
          disabled={filter.is_locked}
        >
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ops.map(op => (
              <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {col?.type === 'boolean' ? (
          <Select
            value={filter.value}
            onValueChange={(v) => updateFilter(filter.id, { value: v })}
          >
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue placeholder="Valeur..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true" className="text-xs">Oui</SelectItem>
              <SelectItem value="false" className="text-xs">Non</SelectItem>
            </SelectContent>
          </Select>
        ) : col?.type === 'select' && col.options ? (
          <Select
            value={filter.value}
            onValueChange={(v) => updateFilter(filter.id, { value: v })}
          >
            <SelectTrigger className="h-7 flex-1 text-xs">
              <SelectValue placeholder="Valeur..." />
            </SelectTrigger>
            <SelectContent>
              {col.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : col?.type === 'multiselect' && col.options ? (() => {
          const selected: string[] = (() => { try { return JSON.parse(filter.value) as string[]; } catch { return []; } })();
          const search = multiselectSearch[filter.id] || '';
          const filtered = col.options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
          const label = selected.length === 0
            ? 'Valeur...'
            : selected.length === 1
              ? (col.options.find(o => o.value === selected[0])?.label ?? selected[0])
              : `${selected.length} sélectionnés`;
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('h-7 flex-1 text-xs justify-start font-normal', selected.length === 0 && 'text-muted-foreground')}>
                  {label}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="start">
                <div className="relative mb-1.5">
                  <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setMultiselectSearch(prev => ({ ...prev, [filter.id]: e.target.value }))}
                    placeholder="Rechercher..."
                    className="h-6 pl-6 text-xs"
                  />
                </div>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {filtered.map(opt => {
                    const checked = selected.includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer text-xs py-1 px-1 hover:bg-muted rounded-sm"
                        onClick={() => {
                          const next = checked ? selected.filter(v => v !== opt.value) : [...selected, opt.value];
                          updateFilter(filter.id, { value: JSON.stringify(next) });
                        }}
                      >
                        <Checkbox checked={checked} className="pointer-events-none h-3.5 w-3.5" />
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          );
        })() : col?.type === 'date' ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-7 flex-1 text-xs justify-start font-normal",
                  !filter.value && "text-muted-foreground"
                )}
              >
                {filter.value ? format(parseISO(filter.value), 'dd/MM/yyyy') : 'Date...'}
                <CalendarIcon className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filter.value ? parseISO(filter.value) : undefined}
                onSelect={(date) => updateFilter(filter.id, { value: date ? format(date, 'yyyy-MM-dd') : '' })}
                initialFocus
                locale={fr}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <Input
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            placeholder="Valeur..."
            className="h-7 flex-1 text-xs"
            type={col?.type === 'number' ? 'number' : 'text'}
          />
        )}

        {!filter.is_locked && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => removeFilter(filter.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 text-sm gap-1.5">
            Filtrer
            {activeCount > 0 && (
              <Chip variant="default" className="h-5 px-1.5 text-xs rounded-full">
                {activeCount}
              </Chip>
            )}
            <Filter className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[540px] p-3" align="end">
          <div className="space-y-1.5">
            {filters.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                Aucun filtre actif
              </p>
            ) : (
              filters.map((filter, index) => (
                <div key={filter.id}>
                  {index > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onLogicChange(logic === 'and' ? 'or' : 'and')}
                        className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 h-auto rounded text-muted-foreground"
                      >
                        {logic === 'and' ? 'ET' : 'OU'}
                      </Button>
                      <div className="flex-1 border-t" />
                    </div>
                  )}
                  {renderFilterRow(filter)}
                </div>
              ))
            )}

            <div className="flex items-center justify-between pt-1.5 border-t">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addFilter}>
                  Ajouter un filtre
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                {filters.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLogicChange(logic === 'and' ? 'or' : 'and')}
                    className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 h-auto rounded text-muted-foreground"
                  >
                    Logique : {logic === 'and' ? 'ET' : 'OU'}
                  </Button>
                )}
              </div>
              {filters.some(f => !f.is_locked) && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAll}>
                  Tout effacer
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {showBadges && filters.filter(isFilterActive).map((filter, index) => {
        const col = columns.find(c => c.id === filter.columnId);
        const ops = getOperators(col?.type || 'text');
        const opLabel = ops.find(o => o.value === filter.operator)?.label || filter.operator;
        let displayValue = filter.value;
        if (col?.type === 'boolean') {
          displayValue = filter.value === 'true' ? 'Oui' : 'Non';
        } else if (col?.type === 'date') {
          try { displayValue = format(parseISO(filter.value), 'dd/MM/yyyy'); } catch { /* keep raw */ }
        } else if (col?.type === 'select' && col.options) {
          displayValue = col.options.find(o => o.value === filter.value)?.label || filter.value;
        } else if (col?.type === 'multiselect' && col.options) {
          try {
            const arr = JSON.parse(filter.value) as string[];
            displayValue = arr.map(v => col.options!.find(o => o.value === v)?.label ?? v).join(', ');
          } catch { displayValue = filter.value; }
        }
        return (
          <span key={filter.id} className="flex items-center gap-1">
            {index > 0 && (
              <span className="text-xs text-muted-foreground font-medium uppercase">
                {logic === 'and' ? 'et' : 'ou'}
              </span>
            )}
            <Chip
              variant="default"
              className={`h-6 text-xs gap-1 ${filter.is_locked ? '' : 'cursor-pointer hover:bg-destructive/10'}`}
              onClick={() => !filter.is_locked && removeFilter(filter.id)}
            >
              {col?.label} {opLabel} {displayValue}
              {!filter.is_locked && <X className="h-3 w-3" />}
            </Chip>
          </span>
        );
      })}
    </div>
  );
}

