import { useState } from 'react';
import { Plus, Search, CheckCircle2, Calendar, Hash, Type, List, ToggleLeft, FileText, Link2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/database';
import { useT } from '@/hooks/useT';

type FieldDefinition = Tables<'field_definitions'>;

export interface SurveyField {
  id?: string;
  field_definition_id?: string;
  label: string;
  description?: string;
  field_type: string;
  is_required: boolean;
  is_from_bo?: boolean;
  referential_id?: string;
  options?: Record<string, unknown>;
  validation_rules?: Record<string, unknown>;
}

interface SurveyFieldSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectField: (field: SurveyField) => void;
  onCreateField: () => void;
  availableFields: FieldDefinition[];
  existingFieldIds: string[];
}

// Icon mapping for field types
const fieldTypeIcons: Record<string, React.ElementType> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  date: Calendar,
  datetime: Clock,
  select: List,
  boolean: ToggleLeft,
  referential: List,
  object_reference: Link2,
};

// Field type labels are resolved via t() in the component

export function SurveyFieldSelector({
  open,
  onOpenChange,
  onSelectField,
  onCreateField,
  availableFields,
  existingFieldIds,
}: SurveyFieldSelectorProps) {
  const { t, td } = useT();
  const [searchQuery, setSearchQuery] = useState('');

  const fieldTypeLabels: Record<string, string> = {
    text: t('field_types.text'),
    textarea: t('field_types.textarea'),
    number: t('field_types.number'),
    date: t('field_types.date'),
    datetime: t('field_types.datetime'),
    select: t('field_types.select'),
    boolean: t('field_types.boolean'),
    referential: t('field_types.referential'),
    object_reference: t('field_types.object_reference'),
  };

  // Filter out fields that are already in the survey and sections
  const selectableFields = availableFields.filter(
    (f) => !existingFieldIds.includes(f.id)
  );

  const filteredFields = selectableFields.filter((field) =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectField = (field: FieldDefinition) => {
    onSelectField({
      field_definition_id: field.id,
      label: field.name,
      description: field.description || '',
      field_type: field.field_type,
      is_required: field.is_required,
      is_from_bo: false,
      referential_id: field.referential_id || undefined,
    });
  };

  const handleCreateAndClose = () => {
    onOpenChange(false);
    onCreateField();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl">{t('dialogs.add_field')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('survey.select_existing_or_create')}
          </p>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('survey.search_field')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[320px] border-t border-b">
          {filteredFields.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">
                {selectableFields.length === 0
                  ? t('empty.all_fields_added')
                  : t('empty.no_fields')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('survey.create_on_source')}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredFields.map((field) => {
                const Icon = fieldTypeIcons[field.field_type] || Type;
                const typeLabel = fieldTypeLabels[field.field_type] || field.field_type;
                
                return (
                  <Button
                    key={field.id}
                    variant="ghost"
                    type="button"
                    onClick={() => handleSelectField(field)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left h-auto justify-start",
                      "hover:bg-primary/5 hover:border-primary/20",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20",
                      "group"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {field.name}
                        </span>
                        {field.is_required && (
                          <Chip variant="default" className="text-xs shrink-0">
                            {t('labels.required_chip')}
                          </Chip>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {typeLabel}
                      </span>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-background border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('survey.missing_field')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('survey.create_on_source_short')}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleCreateAndClose}>
              {t('buttons.create')}
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            {t('buttons.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
