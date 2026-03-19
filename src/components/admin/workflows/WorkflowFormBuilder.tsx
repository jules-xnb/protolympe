import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { generateId } from '@/lib/utils';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { useNodeFields, fetchNodeFields, type NodeFieldConfig } from '@/hooks/useNodeFields';
import { useNodeSections, fetchNodeSections, type NodeSection } from '@/hooks/useNodeSections';
import { AvailableFieldsPanel } from './form-builder/AvailableFieldsPanel';
import { FormCanvas } from './form-builder/FormCanvas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ValidationStep } from '@/components/builder/page-builder/types';
import { StepsSidebar } from './workflow-form-builder/StepsSidebar';
import { useFormBuilderDnD } from './workflow-form-builder/useFormBuilderDnD';
import { useAutoSave } from './workflow-form-builder/useAutoSave';

interface WorkflowFormBuilderProps {
  steps: ValidationStep[];
  startNodeId: string;
  endNodeId: string;
  startNodeName: string;
  endNodeName: string;
  onStartNodeNameChange: (name: string) => void;
  onEndNodeNameChange: (name: string) => void;
  boDefinitionId: string | undefined;
  workflowId: string;
}

interface StepNode {
  id: string;
  name: string;
  type: 'respondent' | 'validation' | 'validated';
}

export function WorkflowFormBuilder({
  steps,
  startNodeId,
  endNodeId,
  startNodeName,
  endNodeName,
  onStartNodeNameChange,
  onEndNodeNameChange,
  boDefinitionId,
  workflowId: _workflowId,
}: WorkflowFormBuilderProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(startNodeId);

  const orderedNodes = useMemo<StepNode[]>(() => {
    const excludeIds = new Set([startNodeId, endNodeId, 'respondent', 'validated'].filter(Boolean));
    return [
      { id: startNodeId, name: startNodeName, type: 'respondent' as const },
      ...steps
        .filter(s => !excludeIds.has(s.id))
        .sort((a, b) => a.order - b.order)
        .map(s => ({ id: s.id, name: s.name, type: 'validation' as const })),
      { id: endNodeId, name: endNodeName, type: 'validated' as const },
    ];
  }, [steps, startNodeId, endNodeId, startNodeName, endNodeName]);

  const selectedNode = orderedNodes.find(n => n.id === selectedNodeId) || orderedNodes[0];

  // Load field definitions for the BO
  const { data: allFieldDefs = [] } = useFieldDefinitions(boDefinitionId);
  const fieldDefinitions = allFieldDefs;

  // Load node-specific data
  const { data: dbSectionsRaw, isSuccess: sectionsReady } = useNodeSections(selectedNodeId);
  const { data: dbFieldConfigsRaw, isSuccess: fieldsReady } = useNodeFields(selectedNodeId);
  const dbSections = useMemo(() => dbSectionsRaw ?? [], [dbSectionsRaw]);
  const dbFieldConfigs = useMemo(() => dbFieldConfigsRaw ?? [], [dbFieldConfigsRaw]);

  const [localSections, setLocalSections] = useState<NodeSection[]>([]);
  const [localFieldConfigs, setLocalFieldConfigs] = useState<NodeFieldConfig[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Auto-save hook
  const { flushSave, resetLastSaved } = useAutoSave({
    selectedNodeId,
    localSections,
    localFieldConfigs,
    initialized,
  });

  // Reset initialized when the selected node changes
  const prevNodeIdRef = useRef(selectedNodeId);
  useEffect(() => {
    if (prevNodeIdRef.current !== selectedNodeId) {
      flushSave(prevNodeIdRef.current);
      prevNodeIdRef.current = selectedNodeId;
      resetLastSaved();
      setInitialized(false);
    }
  }, [selectedNodeId, flushSave, resetLastSaved]);

  // Sync from DB only on initial load or node change
  useEffect(() => {
    if (initialized) return;
    if (!sectionsReady || !fieldsReady) return;

    let sections = [...dbSections];
    const configs = [...dbFieldConfigs];

    if (sections.length === 0) {
      sections = [{ id: generateId(), node_id: selectedNodeId, name: 'Général', display_order: 0, created_at: new Date().toISOString() }];
    }

    if (selectedNode.type === 'respondent' && sections.length > 0) {
      const existingFieldIds = new Set(configs.map(c => c.field_definition_id));
      const requiredFields = fieldDefinitions.filter(f => f.is_required);
      const firstSectionId = sections[0].id;

      requiredFields.forEach((field, index) => {
        if (!existingFieldIds.has(field.id)) {
          configs.push({
            id: generateId(), node_id: selectedNodeId, field_definition_id: field.id,
            is_visible: true, is_editable: true, is_required_override: true,
            display_order: index, settings: { section_id: firstSectionId },
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            visibility_condition: null,
          } as NodeFieldConfig);
        }
      });
    }

    setLocalSections(sections);
    setLocalFieldConfigs(configs);
    setInitialized(true);
  }, [initialized, sectionsReady, fieldsReady, selectedNodeId, dbSections, dbFieldConfigs, selectedNode.type, fieldDefinitions]);

  // Derived data
  const usedFieldIds = useMemo(() => new Set(localFieldConfigs.map(c => c.field_definition_id)), [localFieldConfigs]);
  const requiredFieldIds = useMemo(() => new Set(fieldDefinitions.filter(f => f.is_required).map(f => f.id)), [fieldDefinitions]);

  // DnD handling
  const [selectedAvailableFieldIds, setSelectedAvailableFieldIds] = useState<Set<string>>(new Set());

  const { sensors, collisionDetection, activeDragId, handleDragStart, handleDragEnd } = useFormBuilderDnD({
    selectedNodeId, nodeType: selectedNode.type, fieldDefinitions,
    localSections, localFieldConfigs, setLocalSections, setLocalFieldConfigs,
    selectedAvailableFieldIds, setSelectedAvailableFieldIds,
  });

  const handleAddSection = useCallback(() => {
    const newId = generateId();
    setLocalSections(prev => [...prev, { id: newId, node_id: selectedNodeId, name: 'Nouvelle section', display_order: localSections.length, created_at: new Date().toISOString() }]);
    requestAnimationFrame(() => {
      document.getElementById(`section-${newId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [selectedNodeId, localSections.length]);

  useEffect(() => { setSelectedAvailableFieldIds(new Set()); }, [selectedNodeId]);

  // Copy from step
  const [confirmCopySourceId, setConfirmCopySourceId] = useState<string | null>(null);

  const executeCopyFromStep = useCallback(async (sourceNodeId: string) => {
    const sourceSections = await fetchNodeSections(sourceNodeId);
    const sourceFields = await fetchNodeFields(sourceNodeId);
    if (!sourceSections.length || !sourceFields.length) return;

    const sectionIdMap = new Map<string, string>();
    const newSections: NodeSection[] = sourceSections.map(s => {
      const newId = generateId();
      sectionIdMap.set(s.id, newId);
      return { ...s, id: newId, node_id: selectedNodeId, created_at: new Date().toISOString() };
    });

    const isRespondentTarget = selectedNode.type === 'respondent';
    const readonlyFieldIds = new Set(fieldDefinitions.filter(fd => fd.is_readonly).map(fd => fd.id));

    const newConfigs: NodeFieldConfig[] = sourceFields.map(f => ({
      ...f, id: generateId(), node_id: selectedNodeId,
      is_editable: isRespondentTarget ? !readonlyFieldIds.has(f.field_definition_id) : f.is_editable,
      settings: f.settings ? { ...(f.settings as Record<string, unknown>), section_id: sectionIdMap.get((f.settings as Record<string, unknown>)?.section_id as string) || newSections[0]?.id } : { section_id: newSections[0]?.id },
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })) as NodeFieldConfig[];

    setLocalSections(newSections);
    setLocalFieldConfigs(newConfigs);
  }, [selectedNodeId, selectedNode.type, fieldDefinitions]);

  const handleCopyFromStep = useCallback((sourceNodeId: string) => {
    if (localFieldConfigs.length > 0) setConfirmCopySourceId(sourceNodeId);
    else executeCopyFromStep(sourceNodeId);
  }, [localFieldConfigs.length, executeCopyFromStep]);

  return (
    <div className="flex h-full w-full min-w-0">
      <StepsSidebar orderedNodes={orderedNodes} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} onStartNodeNameChange={onStartNodeNameChange} onEndNodeNameChange={onEndNodeNameChange} />

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <AvailableFieldsPanel fields={fieldDefinitions} usedFieldIds={usedFieldIds} onAddSection={handleAddSection} selectedFieldIds={selectedAvailableFieldIds} onSelectionChange={setSelectedAvailableFieldIds} boDefinitionId={boDefinitionId || ''} allFields={allFieldDefs} />
        <FormCanvas nodeId={selectedNodeId} nodeType={selectedNode.type} nodeName={selectedNode.name} sections={localSections} fieldConfigs={localFieldConfigs} fieldDefinitions={fieldDefinitions} requiredFieldIds={requiredFieldIds} onSectionsChange={setLocalSections} onFieldConfigsChange={setLocalFieldConfigs} allStepNodes={orderedNodes.map(n => ({ id: n.id, name: n.name }))} onCopyFromStep={handleCopyFromStep} />

        <DragOverlay>
          {activeDragId && (() => {
            if (activeDragId.startsWith('available-')) {
              const fieldId = activeDragId.replace('available-', '');
              const field = fieldDefinitions.find(f => f.id === fieldId);
              if (!field) return null;
              const isSelected = selectedAvailableFieldIds.has(fieldId);
              const count = isSelected ? selectedAvailableFieldIds.size : 1;
              return (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-background border shadow-md">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span>{field.name}</span>
                  {count > 1 && <Chip variant="default" className="text-xs">+{count - 1}</Chip>}
                </div>
              );
            }
            if (activeDragId.startsWith('field-')) {
              const configId = activeDragId.replace('field-', '');
              const config = localFieldConfigs.find(c => c.id === configId);
              if (!config) return null;
              const field = fieldDefinitions.find(f => f.id === config.field_definition_id);
              if (!field) return null;
              return (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-background border shadow-md">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span>{field.name}</span>
                  <Chip variant="outline" className="text-xs">{field.field_type}</Chip>
                </div>
              );
            }
            return null;
          })()}
        </DragOverlay>
      </DndContext>

      <AlertDialog open={confirmCopySourceId !== null} onOpenChange={(open) => { if (!open) setConfirmCopySourceId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer la configuration ?</AlertDialogTitle>
            <AlertDialogDescription>
              La configuration actuelle sera remplacée par celle de
              « {orderedNodes.find(n => n.id === confirmCopySourceId)?.name || 'cette étape'} ».
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (confirmCopySourceId) executeCopyFromStep(confirmCopySourceId); setConfirmCopySourceId(null); }}>
              Remplacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
