import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';
import type { Database } from '@/types/database';
import { FieldDefinitionFormDialog } from '@/components/admin/business-objects/FieldDefinitionFormDialog';

type FieldType = Database['public']['Enums']['field_type'];

interface AvailableFieldsPanelProps {
  fields: FieldDefinitionWithRelations[];
  usedFieldIds: Set<string>;
  onAddSection: () => void;
  selectedFieldIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  boDefinitionId: string;
  allFields: FieldDefinitionWithRelations[];
}

// Group field types into categories
const FIELD_CATEGORIES: { label: string; types: FieldType[] }[] = [
  { label: 'Texte', types: ['text', 'textarea', 'email', 'phone', 'url'] },
  { label: 'Nombres', types: ['number', 'decimal'] },
  { label: 'Dates', types: ['date', 'datetime', 'time'] },
  { label: 'Choix', types: ['select', 'multiselect', 'checkbox'] },
  { label: 'Références', types: ['user_reference', 'eo_reference', 'object_reference'] },
  { label: 'Autres', types: ['calculated', 'aggregation', 'boolean', 'document', 'file', 'image', 'section', 'initials', 'currency'] },
];

// Draggable field item
function DraggableField({
  field,
  isSelected,
  onToggleSelect,
  selectedFields,
}: {
  field: FieldDefinitionWithRelations;
  isSelected: boolean;
  onToggleSelect: (fieldId: string) => void;
  selectedFields: FieldDefinitionWithRelations[];
}) {
  // If this field is selected, drag all selected fields; otherwise just this one
  const dragFields = isSelected && selectedFields.length > 1 ? selectedFields : [field];

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `available-${field.id}`,
    data: { type: 'available-field', field, fields: dragFields },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-md text-sm',
        'hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent/30',
        isDragging && 'opacity-50 bg-accent'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect(field.id)}
        className="shrink-0 ml-2"
      />
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-2 px-2 py-1.5 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        <span className="truncate flex-1">{field.name}</span>
      </div>
    </div>
  );
}

export function AvailableFieldsPanel({
  fields,
  usedFieldIds,
  onAddSection,
  selectedFieldIds,
  onSelectionChange,
  boDefinitionId,
  allFields,
}: AvailableFieldsPanelProps) {
  const [search, setSearch] = useState('');
  const [showNewFieldDialog, setShowNewFieldDialog] = useState(false);

  const toggleSelect = (fieldId: string) => {
    const next = new Set(selectedFieldIds);
    if (next.has(fieldId)) next.delete(fieldId);
    else next.add(fieldId);
    onSelectionChange(next);
  };

  // Filter out used fields and section-type fields, then apply search
  const availableFields = useMemo(() => {
    return fields.filter(f => {
      if (usedFieldIds.has(f.id)) return false;
      if (search) {
        const s = search.toLowerCase();
        return f.name.toLowerCase().includes(s) || f.slug.toLowerCase().includes(s);
      }
      return true;
    });
  }, [fields, usedFieldIds, search]);

  // Group available fields by category (system fields first, then by type)
  const groupedFields = useMemo(() => {
    const groups: { label: string; fields: FieldDefinitionWithRelations[] }[] = [];

    // System fields first
    const systemFields = availableFields.filter(f => f.is_system);
    if (systemFields.length > 0) {
      groups.push({ label: 'Système', fields: systemFields });
    }

    // Then regular fields by type category
    const regularFields = availableFields.filter(f => !f.is_system);
    for (const category of FIELD_CATEGORIES) {
      const categoryFields = regularFields.filter(f => category.types.includes(f.field_type));
      if (categoryFields.length > 0) {
        groups.push({ label: category.label, fields: categoryFields });
      }
    }
    return groups;
  }, [availableFields]);

  return (
    <div className="w-[320px] border-r shrink-0 flex flex-col bg-background">
      <div className="p-3 border-b space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Champs disponibles
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-7 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-3">
          {groupedFields.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {search ? 'Aucun champ trouvé' : 'Tous les champs sont utilisés'}
            </p>
          ) : (
            groupedFields.map(group => (
              <div key={group.label}>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.fields.map(field => (
                    <DraggableField
                      key={field.id}
                      field={field}
                      isSelected={selectedFieldIds.has(field.id)}
                      onToggleSelect={toggleSelect}
                      selectedFields={availableFields.filter(f => selectedFieldIds.has(f.id))}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-2 border-t space-y-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowNewFieldDialog(true)}
        >
          Nouveau champ
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onAddSection}
        >
          Nouvelle section
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <FieldDefinitionFormDialog
        open={showNewFieldDialog}
        onOpenChange={setShowNewFieldDialog}
        objectDefinitionId={boDefinitionId}
        field={null}
        fields={allFields}
      />
    </div>
  );
}
