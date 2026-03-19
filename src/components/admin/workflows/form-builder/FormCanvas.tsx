import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy } from 'lucide-react';
import type { NodeSection } from '@/hooks/useNodeSections';
import type { NodeFieldConfig } from '@/hooks/useNodeFields';
import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';
import type { FieldVisibilityCondition } from '@/components/builder/page-builder/types';
import { VisibilityConditionDialog } from './VisibilityConditionDialog';
import { VariationThresholdDialog } from './VariationThresholdDialog';
import { useSectionOperations } from './useSectionOperations';
import { SortableSectionCard } from './SortableSectionCard';

interface VisibilityConditionData {
  conditions?: FieldVisibilityCondition[];
  logic?: 'AND' | 'OR';
}

// ---------------------------------------------------------------------------
// FormCanvas props
// ---------------------------------------------------------------------------

interface FormCanvasProps {
  nodeId: string;
  nodeType: 'respondent' | 'validation' | 'validated';
  nodeName: string;
  sections: NodeSection[];
  fieldConfigs: NodeFieldConfig[];
  fieldDefinitions: FieldDefinitionWithRelations[];
  requiredFieldIds: Set<string>;
  onSectionsChange: (sections: NodeSection[]) => void;
  onFieldConfigsChange: (configs: NodeFieldConfig[]) => void;
  allStepNodes: Array<{ id: string; name: string }>;
  onCopyFromStep: (sourceNodeId: string) => void;
}

// ---------------------------------------------------------------------------
// FormCanvas component
// ---------------------------------------------------------------------------

export function FormCanvas({
  nodeId,
  nodeType,
  nodeName: _nodeName,
  sections,
  fieldConfigs,
  fieldDefinitions,
  requiredFieldIds,
  onSectionsChange,
  onFieldConfigsChange,
  allStepNodes,
  onCopyFromStep,
}: FormCanvasProps) {
  const [conditionDialogConfig, setConditionDialogConfig] = useState<{
    config: NodeFieldConfig;
    sectionId: string;
  } | null>(null);

  const [variationDialogConfig, setVariationDialogConfig] = useState<NodeFieldConfig | null>(null);

  const {
    editingSectionId,
    editingSectionName,
    setEditingSectionName,
    getFieldsInSection,
    handleRemoveField,
    handleToggleEditable,
    handleToggleRequired,
    handleToggleSectionEditable,
    handleToggleSectionRequired,
    handleDeleteSection,
    handleStartRename,
    handleFinishRename,
    handleCancelRename,
    handleSaveConditions,
    handleVariationChange,
  } = useSectionOperations({
    nodeType,
    sections,
    fieldConfigs,
    fieldDefinitions,
    requiredFieldIds,
    onSectionsChange,
    onFieldConfigsChange,
  });

  const sortedSections = [...sections].sort(
    (a, b) => a.display_order - b.display_order,
  );

  const handleEditConditions = (config: NodeFieldConfig, sectionId: string) => {
    setConditionDialogConfig({ config, sectionId });
  };

  // -- Render ----------------------------------------------------------------

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* Header (only shown when copy button is relevant) */}
      {allStepNodes.length > 1 && (
        <div className="flex items-center justify-end px-4 py-2 border-b">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                Copier depuis…
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allStepNodes
                .filter(n => n.id !== nodeId)
                .map(n => (
                  <DropdownMenuItem key={n.id} onClick={() => onCopyFromStep(n.id)}>
                    {n.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          <SortableContext
            items={sortedSections.map((s) => `sortable-section-${s.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {sortedSections.map((section) => {
              const fieldsInSection = getFieldsInSection(section.id);
              const sortableIds = fieldsInSection.map((c) => `field-${c.id}`);

              return (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  fieldsInSection={fieldsInSection}
                  sortableFieldIds={sortableIds}
                  fieldDefinitions={fieldDefinitions}
                  nodeType={nodeType}
                  requiredFieldIds={requiredFieldIds}
                  editingSectionId={editingSectionId}
                  editingSectionName={editingSectionName}
                  onEditingSectionNameChange={setEditingSectionName}
                  onStartRename={handleStartRename}
                  onFinishRename={handleFinishRename}
                  onCancelRename={handleCancelRename}
                  onDeleteSection={handleDeleteSection}
                  onToggleSectionEditable={handleToggleSectionEditable}
                  onToggleSectionRequired={handleToggleSectionRequired}
                  onRemoveField={handleRemoveField}
                  onToggleEditable={handleToggleEditable}
                  onToggleRequired={handleToggleRequired}
                  onEditConditions={(config) => handleEditConditions(config, section.id)}
                  onEditVariation={setVariationDialogConfig}
                />
              );
            })}
          </SortableContext>
        </div>
      </div>

      {conditionDialogConfig && (
        <VisibilityConditionDialog
          open={!!conditionDialogConfig}
          onOpenChange={(open) => { if (!open) setConditionDialogConfig(null); }}
          fieldName={fieldDefinitions.find(f => f.id === conditionDialogConfig.config.field_definition_id)?.name || ''}
          conditions={((conditionDialogConfig.config.visibility_condition as VisibilityConditionData | null)?.conditions) || []}
          logic={((conditionDialogConfig.config.visibility_condition as VisibilityConditionData | null)?.logic) || 'AND'}
          sectionFields={
            fieldConfigs
              .filter(c => c.settings?.section_id === conditionDialogConfig.sectionId && c.id !== conditionDialogConfig.config.id)
              .map(c => {
                const fd = fieldDefinitions.find(f => f.id === c.field_definition_id);
                return fd ? { id: fd.id, name: fd.name, field_type: fd.field_type, referential_id: fd.referential_id } : null;
              })
              .filter(Boolean) as Array<{ id: string; name: string; field_type: string; referential_id?: string | null }>
          }
          onSave={(conditions, logic) => {
            handleSaveConditions(conditionDialogConfig.config.id, conditions, logic);
            setConditionDialogConfig(null);
          }}
        />
      )}

      {variationDialogConfig && (
        <VariationThresholdDialog
          open={!!variationDialogConfig}
          onOpenChange={(open) => { if (!open) setVariationDialogConfig(null); }}
          fieldName={fieldDefinitions.find(f => f.id === variationDialogConfig.field_definition_id)?.name || ''}
          threshold={variationDialogConfig.settings?.variation_threshold}
          direction={variationDialogConfig.settings?.variation_direction || '+-'}
          onSave={(value, direction) => {
            handleVariationChange(variationDialogConfig, value, direction);
            setVariationDialogConfig(null);
          }}
        />
      )}
    </div>
  );
}
