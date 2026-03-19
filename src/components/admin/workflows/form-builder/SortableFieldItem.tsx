import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Asterisk, GitBranch, GripVertical, Lock, Percent, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NodeFieldConfig } from '@/hooks/useNodeFields';
import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';
import { FIELD_GRID, getFieldTypeLabel } from './form-canvas-utils';

interface SortableFieldItemProps {
  config: NodeFieldConfig;
  fieldDef: FieldDefinitionWithRelations;
  isLocked: boolean;
  nodeType: 'respondent' | 'validation' | 'validated';
  sectionId: string;
  conditionCount: number;
  onRemove: () => void;
  onToggleEditable: () => void;
  onToggleRequired: () => void;
  onEditConditions: () => void;
  onEditVariation: () => void;
}

export function SortableFieldItem({
  config,
  fieldDef,
  isLocked,
  nodeType,
  sectionId,
  conditionCount,
  onRemove,
  onToggleEditable,
  onToggleRequired,
  onEditConditions,
  onEditVariation,
}: SortableFieldItemProps) {
  const isNumeric = ['number', 'decimal'].includes(fieldDef.field_type);
  const variationValue = config.settings?.variation_threshold;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `field-${config.id}`,
    data: { type: 'field', config, sectionId },
    disabled: false,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        FIELD_GRID,
        'px-2 py-1.5 rounded-md text-sm',
        config.is_editable ? 'bg-background' : 'bg-muted/30',
      )}
    >
      <div className="flex items-center cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>

      <div className="flex justify-center">
        {isLocked && <Lock className="h-3.5 w-3.5 text-warning" />}
      </div>

      <span className="truncate min-w-0">{fieldDef.name}</span>

      <div className="flex justify-start">
        <Chip variant="outline" className="text-xs whitespace-nowrap">
          {getFieldTypeLabel(fieldDef.field_type)}
        </Chip>
      </div>

      <div>
        {nodeType !== 'respondent' && !(fieldDef.is_system && fieldDef.slug !== 'name') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleEditable}
            className={cn(
              'text-xs w-full text-center py-0.5 h-auto rounded border transition-colors',
              config.is_editable
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                : 'bg-muted text-muted-foreground border-border',
            )}
          >
            {config.is_editable ? 'éditable' : 'lecture'}
          </Button>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={fieldDef.is_required || !config.is_editable ? undefined : onToggleRequired}
        title={
          fieldDef.is_required ? 'Obligatoire (défini dans le BO)'
          : !config.is_editable ? 'Non disponible en lecture seule'
          : 'Rendre obligatoire'
        }
        disabled={fieldDef.is_required || !config.is_editable}
        className={cn(
          'w-6 h-6 rounded border transition-colors',
          fieldDef.is_required || config.is_required_override
            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
            : 'bg-muted text-muted-foreground/40 border-transparent',
          (fieldDef.is_required || !config.is_editable) && 'opacity-60 cursor-not-allowed',
        )}
      >
        <Asterisk className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onEditConditions}
        title="Conditions de visibilité"
        className={cn(
          'w-6 h-6 rounded border transition-colors relative',
          conditionCount > 0
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-muted text-muted-foreground/40 border-transparent',
        )}
      >
        <GitBranch className="h-3.5 w-3.5" />
        {conditionCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center">
            {conditionCount}
          </span>
        )}
      </Button>

      {/* Variation threshold (number/decimal only) */}
      <div className="flex justify-center">
        {isNumeric ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditVariation}
            title="Seuil de variation (%)"
            className={cn(
              'w-6 h-6 rounded border transition-colors relative',
              variationValue
                ? 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800'
                : 'bg-muted text-muted-foreground/40 border-transparent',
            )}
          >
            <Percent className="h-3.5 w-3.5" />
            {variationValue && (
              <span className="absolute -top-1.5 -right-2 bg-violet-600 text-white text-[9px] rounded-full px-1 min-w-[14px] h-3.5 flex items-center justify-center">
                {variationValue}
              </span>
            )}
          </Button>
        ) : (
          <span />
        )}
      </div>

      <div className="flex justify-center">
        {!isLocked && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
