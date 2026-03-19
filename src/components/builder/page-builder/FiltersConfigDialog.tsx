import { useState, useEffect } from 'react';
import { Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { FilterConfig, DataTableColumnConfig } from './types';

interface FieldDef {
  id: string;
  name: string;
  field_type: string;
}

interface RelatedBO {
  sourceFieldId: string;
  sourceFieldName: string;
  relatedBoId: string;
  relatedBoName: string;
  fields: FieldDef[];
}

const FILTERABLE_FIELD_TYPES = [
  'text', 'email', 'phone', 'url',
  'number', 'decimal', 'currency',
  'date', 'datetime',
  'select', 'multiselect',
  'checkbox',
  'referential',
  'user', 'eo', 'object_reference',
];

function isFilterableFieldType(fieldType: string): boolean {
  return FILTERABLE_FIELD_TYPES.includes(fieldType);
}

interface FiltersConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterConfig[];
  columns: DataTableColumnConfig[];
  directFields: FieldDef[];
  relatedBOs: RelatedBO[];
  onSave: (filters: FilterConfig[]) => void;
}

export function FiltersConfigDialog({
  open,
  onOpenChange,
  filters: initialFilters,
  columns,
  directFields,
  relatedBOs,
  onSave,
}: FiltersConfigDialogProps) {
  const [filters, setFilters] = useState<FilterConfig[]>(initialFilters);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFilters(initialFilters);
    }
  }, [open, initialFilters]);

  // Auto-save when closing the dialog
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onSave(filters);
    }
    onOpenChange(newOpen);
  };

  // Only show filters for columns that are already selected
  const filterableDirectColumns = columns
    .filter(col => !col.source_field_id && isFilterableFieldType(
      directFields.find(f => f.id === col.field_id)?.field_type || ''
    ))
    .map(col => ({
      ...col,
      field_type: directFields.find(f => f.id === col.field_id)?.field_type || '',
    }));
  
  const filterableRelatedColumns = columns
    .filter(col => col.source_field_id && (() => {
      const relatedBO = relatedBOs.find(r => r.sourceFieldId === col.source_field_id);
      const field = relatedBO?.fields.find(f => f.id === col.field_id);
      return field && isFilterableFieldType(field.field_type);
    })())
    .map(col => {
      const relatedBO = relatedBOs.find(r => r.sourceFieldId === col.source_field_id);
      const field = relatedBO?.fields.find(f => f.id === col.field_id);
      return {
        ...col,
        field_type: field?.field_type || '',
        relatedBO,
      };
    });

  const hasFilterableColumns = filterableDirectColumns.length > 0 || filterableRelatedColumns.length > 0;

  const handleToggleFilter = (col: { field_id: string; field_name: string; field_type: string; source_field_id?: string; source_field_name?: string }, checked: boolean) => {
    if (checked) {
      const newFilter: FilterConfig = {
        field_id: col.field_id,
        field_name: col.field_name,
        field_type: col.field_type,
        source_field_id: col.source_field_id,
        source_field_name: col.source_field_name,
      };
      setFilters([...filters, newFilter]);
    } else {
      if (col.source_field_id) {
        setFilters(filters.filter(f => !(f.field_id === col.field_id && f.source_field_id === col.source_field_id)));
      } else {
        setFilters(filters.filter(f => !(f.field_id === col.field_id && !f.source_field_id)));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[var(--modal-width)] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configuration des filtres</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Colonnes filtrables
            </Label>
            <span className="text-xs text-muted-foreground">
              {filters.length} sélectionné{filters.length !== 1 ? 's' : ''}
            </span>
          </div>

          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-2">
              {!hasFilterableColumns ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Aucune colonne filtrable sélectionnée.
                  <br />
                  <span className="text-xs">
                    Configurez d'abord vos colonnes.
                  </span>
                </p>
              ) : (
                <div className="space-y-1">
                  {filterableDirectColumns.map((col) => {
                    const isSelected = filters.some(
                      f => f.field_id === col.field_id && !f.source_field_id
                    );
                    return (
                      <label
                        key={col.field_id}
                        className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleFilter(col, checked as boolean)}
                        />
                        <span className="text-sm flex-1 truncate">{col.field_name}</span>
                        <Chip variant="outline" className="text-xs">
                          {col.field_type}
                        </Chip>
                      </label>
                    );
                  })}
                  
                  {filterableRelatedColumns.map((col) => {
                    const isSelected = filters.some(
                      f => f.field_id === col.field_id && f.source_field_id === col.source_field_id
                    );
                    return (
                      <label
                        key={`${col.source_field_id}-${col.field_id}`}
                        className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleFilter(col, checked as boolean)}
                        />
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Link2 className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-xs text-primary/70">{col.source_field_name}.</span>
                          <span className="text-sm truncate">{col.field_name}</span>
                        </div>
                        <Chip variant="outline" className="text-xs">
                          {col.field_type}
                        </Chip>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
