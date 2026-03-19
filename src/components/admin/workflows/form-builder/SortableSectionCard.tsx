import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NodeSection } from '@/hooks/useNodeSections';
import type { NodeFieldConfig } from '@/hooks/useNodeFields';
import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';
import { FieldColumnHeaders } from './FieldColumnHeaders';
import { SortableFieldItem } from './SortableFieldItem';

// ---------------------------------------------------------------------------
// SortableSection wrapper (sortable for reorder + droppable for fields)
// ---------------------------------------------------------------------------

function SortableSection({
  sectionId,
  children,
}: {
  sectionId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${sectionId}`,
    data: { type: 'section', sectionId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'p-2 space-y-1 min-h-[40px] transition-colors',
        isOver && 'bg-primary/5 ring-1 ring-primary/20 rounded-b-lg',
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableSectionCard props
// ---------------------------------------------------------------------------

interface SortableSectionCardProps {
  section: NodeSection;
  fieldsInSection: NodeFieldConfig[];
  sortableFieldIds: string[];
  fieldDefinitions: FieldDefinitionWithRelations[];
  nodeType: 'respondent' | 'validation' | 'validated';
  requiredFieldIds: Set<string>;
  editingSectionId: string | null;
  editingSectionName: string;
  onEditingSectionNameChange: (name: string) => void;
  onStartRename: (sectionId: string) => void;
  onFinishRename: () => void;
  onCancelRename: () => void;
  onDeleteSection: (sectionId: string) => void;
  onToggleSectionEditable: (sectionId: string) => void;
  onToggleSectionRequired: (sectionId: string) => void;
  onRemoveField: (config: NodeFieldConfig) => void;
  onToggleEditable: (config: NodeFieldConfig) => void;
  onToggleRequired: (config: NodeFieldConfig) => void;
  onEditConditions: (config: NodeFieldConfig) => void;
  onEditVariation: (config: NodeFieldConfig) => void;
}

// ---------------------------------------------------------------------------
// SortableSectionCard component
// ---------------------------------------------------------------------------

export function SortableSectionCard({
  section,
  fieldsInSection,
  sortableFieldIds,
  fieldDefinitions,
  nodeType,
  requiredFieldIds,
  editingSectionId,
  editingSectionName,
  onEditingSectionNameChange,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onDeleteSection,
  onToggleSectionEditable,
  onToggleSectionRequired,
  onRemoveField,
  onToggleEditable,
  onToggleRequired,
  onEditConditions,
  onEditVariation,
}: SortableSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `sortable-section-${section.id}`,
    data: { type: 'sortable-section', sectionId: section.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} id={`section-${section.id}`} className="border rounded-lg">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center shrink-0 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          </div>
          {editingSectionId === section.id ? (
            <Input
              value={editingSectionName}
              onChange={(e) => onEditingSectionNameChange(e.target.value)}
              onBlur={onFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFinishRename();
                if (e.key === 'Escape') onCancelRename();
              }}
              className="h-7 text-sm font-medium w-48"
              autoFocus
            />
          ) : (
            <span
              className="text-sm font-medium cursor-pointer"
              onDoubleClick={() => onStartRename(section.id)}
            >
              {section.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onStartRename(section.id)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onDeleteSection(section.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <SortableSection sectionId={section.id}>
        {/* Column headers with section toggles */}
        {fieldsInSection.length > 0 && (
          <FieldColumnHeaders
            nodeType={nodeType}
            fieldsInSection={fieldsInSection}
            sectionId={section.id}
            requiredFieldIds={requiredFieldIds}
            onToggleSectionEditable={onToggleSectionEditable}
            onToggleSectionRequired={onToggleSectionRequired}
          />
        )}
        <SortableContext items={sortableFieldIds} strategy={verticalListSortingStrategy}>
          {fieldsInSection.map((config) => {
            const fieldDef = fieldDefinitions.find(
              (f) => f.id === config.field_definition_id,
            );
            if (!fieldDef) return null;

            const isLocked =
              nodeType === 'respondent' &&
              requiredFieldIds.has(fieldDef.id);

            return (
              <SortableFieldItem
                key={config.id}
                config={config}
                fieldDef={fieldDef}
                isLocked={isLocked}
                nodeType={nodeType}
                sectionId={section.id}
                conditionCount={((config.visibility_condition as Record<string, unknown> | null)?.conditions as unknown[] | undefined)?.length || 0}
                onRemove={() => onRemoveField(config)}
                onToggleEditable={() => onToggleEditable(config)}
                onToggleRequired={() => onToggleRequired(config)}
                onEditConditions={() => onEditConditions(config)}
                onEditVariation={() => onEditVariation(config)}
              />
            );
          })}
        </SortableContext>

        {fieldsInSection.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
            Déposez des champs ici
          </div>
        )}
      </SortableSection>
    </div>
  );
}
