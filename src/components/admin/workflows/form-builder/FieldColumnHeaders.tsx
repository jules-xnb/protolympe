import { Button } from '@/components/ui/button';
import { Asterisk } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NodeFieldConfig } from '@/hooks/useNodeFields';
import { FIELD_GRID } from './form-canvas-utils';

interface FieldColumnHeadersProps {
  nodeType: 'respondent' | 'validation' | 'validated';
  fieldsInSection: NodeFieldConfig[];
  onToggleSectionEditable: (sectionId: string) => void;
  onToggleSectionRequired: (sectionId: string) => void;
  sectionId: string;
  requiredFieldIds: Set<string>;
}

export function FieldColumnHeaders({
  nodeType,
  fieldsInSection,
  onToggleSectionEditable,
  onToggleSectionRequired,
  sectionId,
  requiredFieldIds,
}: FieldColumnHeadersProps) {
  const allEditable = fieldsInSection.every((c) => c.is_editable);
  const allRequired = fieldsInSection.every((c) => requiredFieldIds.has(c.field_definition_id) || c.is_required_override);

  return (
    <div className={cn(FIELD_GRID, 'px-2 py-1 text-xs text-muted-foreground/70 font-medium border-b')}>
      <span />
      <span />
      <span>Champ</span>
      <span className="text-left">Type</span>
      <span className="flex justify-center">
        {nodeType !== 'respondent' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleSectionEditable(sectionId)}
            className={cn(
              'px-1 py-0.5 h-auto rounded border transition-colors',
              allEditable
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                : 'text-muted-foreground border-border hover:bg-muted',
            )}
          >
            Mode
          </Button>
        ) : null}
      </span>
      <span />
      <span className="flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleSectionRequired(sectionId)}
          className={cn(
            'w-6 h-5 rounded border transition-colors',
            allRequired
              ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
              : 'text-muted-foreground/40 border-border hover:bg-muted',
          )}
        >
          <Asterisk className="h-3 w-3" />
        </Button>
      </span>
      <span />
      <span />
      <span />
    </div>
  );
}
