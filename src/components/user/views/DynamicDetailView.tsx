import { useBoFieldDefinitions } from '@/hooks/useBoFieldDefinitions';
import { useBusinessObject } from '@/hooks/useBusinessObjectsWithFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Edit, Trash2, ChevronDown, FileText, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/hooks/useT';
import type { ViewConfig } from '@/hooks/useViewConfigs';
import type { Json } from '@/types/database';

interface FieldLayout {
  field_id: string;
  field_name: string;
  width: 'full' | 'half' | 'third';
  visible: boolean;
}

interface SectionLayout {
  id: string;
  title: string;
  collapsed_by_default: boolean;
  fields: FieldLayout[];
}

interface DetailConfig {
  layout?: 'single' | 'two-column' | 'tabs';
  sections?: SectionLayout[];
  show_header?: boolean;
  show_metadata?: boolean;
  show_actions?: boolean;
  enable_edit_button?: boolean;
  enable_delete_button?: boolean;
}

function getConfig(json: Json | undefined): DetailConfig {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as DetailConfig;
  }
  return {};
}

interface DynamicDetailViewProps {
  viewConfig: ViewConfig;
  itemId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function DynamicDetailView({
  viewConfig,
  itemId,
  onEdit,
  onDelete,
}: DynamicDetailViewProps) {
  const { t } = useT();
  const config = getConfig(viewConfig.config);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(
      (config.sections || [])
        .filter(s => s.collapsed_by_default)
        .map(s => s.id)
    )
  );

  // Fetch the business object
  const { data: item, isLoading: isLoadingItem } = useBusinessObject(itemId);

  // Fetch field definitions
  const { data: fieldDefinitions = [] } = useBoFieldDefinitions(viewConfig.bo_definition_id);

  // Note: field_values would need to be fetched separately if the table exists
  // For now, we'll work with the business_object data directly

  // Create field map
  const fieldMap = new Map<string, typeof fieldDefinitions[0]>();
  fieldDefinitions.forEach(fd => fieldMap.set(fd.id, fd));

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const renderFieldValue = (_fieldId: string) => {
    // Simplified - would fetch from field_values table
    return '-';
  };

  const getWidthClass = (width: 'full' | 'half' | 'third') => {
    switch (width) {
      case 'half': return 'w-1/2';
      case 'third': return 'w-1/3';
      default: return 'w-full';
    }
  };

  if (isLoadingItem) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card className="flex items-center justify-center h-64">
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">{t('views.item_not_found')}</p>
        </CardContent>
      </Card>
    );
  }

  // Default sections if not configured
  const sections: SectionLayout[] = config.sections?.length
    ? config.sections
    : [
        {
          id: 'default',
          title: t('labels.information'),
          collapsed_by_default: false,
          fields: fieldDefinitions
            .map(f => ({
              field_id: f.id,
              field_name: f.name,
              width: 'full' as const,
              visible: true,
            })),
        },
      ];

  return (
    <div className="space-y-4">
      {/* Header */}
      {config.show_header !== false && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {item.reference_number}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Chip variant="outline">{item.reference_number}</Chip>
                  {item.status && <Chip variant="default">{item.status}</Chip>}
                </div>
              </div>
              {config.show_actions !== false && (
                <div className="flex items-center gap-2">
                  {config.enable_edit_button !== false && onEdit && (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      {t('buttons.edit')}
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {config.enable_delete_button !== false && onDelete && (
                    <Button variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
                      {t('buttons.delete')}
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Sections */}
      {sections.map((section) => (
        <Collapsible
          key={section.id}
          open={!collapsedSections.has(section.id)}
          onOpenChange={() => toggleSection(section.id)}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      collapsedSections.has(section.id) ? '' : 'rotate-180'
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div
                  className={`flex flex-wrap gap-4 ${
                    config.layout === 'two-column' ? 'grid grid-cols-2' : ''
                  }`}
                >
                  {section.fields
                    .filter(f => f.visible)
                    .map((field) => (
                      <div
                        key={field.field_id}
                        className={`space-y-1 ${getWidthClass(field.width)}`}
                      >
                        <p className="text-sm text-muted-foreground">
                          {field.field_name}
                        </p>
                        <p className="font-medium">
                          {renderFieldValue(field.field_id)}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      {/* Metadata */}
      {config.show_metadata !== false && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{t('labels.created_at')} {new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{t('views.modified_on')} {new Date(item.updated_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
