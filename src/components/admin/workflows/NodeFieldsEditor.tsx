import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronDown, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import {
  useFieldDefinitions,
} from '@/hooks/useFieldDefinitions';
import {
  useNodeFields,
  useSaveNodeFields,
  type NodeFieldConfig,
  type NodeFieldSettings,
} from '@/hooks/useNodeFields';
import { FieldDefinitionFormDialog } from '@/components/admin/business-objects/FieldDefinitionFormDialog';

interface NodeFieldsEditorProps {
  nodeId: string;
  boDefinitionId: string;
}

interface LocalFieldConfig {
  visibility: 'visible' | 'readonly' | 'hidden';
  is_required: boolean;
  allow_comment: boolean;
  custom_label: string;
  display_order: number;
}

/**
 * Convert a NodeFieldConfig (from DB) to LocalFieldConfig.
 */
function dbToLocal(nf: NodeFieldConfig, index: number): LocalFieldConfig {
  let visibility: LocalFieldConfig['visibility'] = 'hidden';
  if (nf.is_visible && nf.is_editable) visibility = 'visible';
  else if (nf.is_visible && !nf.is_editable) visibility = 'readonly';

  const settings = (nf.settings ?? {}) as NodeFieldSettings;

  return {
    visibility,
    is_required: nf.is_required_override ?? false,
    allow_comment: settings.allow_comment ?? false,
    custom_label: settings.custom_label ?? '',
    display_order: nf.display_order ?? index,
  };
}

/**
 * Convert a LocalFieldConfig back to the shape expected by useSaveNodeFields.
 */
function localToDb(fieldDefinitionId: string, config: LocalFieldConfig) {
  return {
    field_definition_id: fieldDefinitionId,
    is_visible: config.visibility !== 'hidden',
    is_editable: config.visibility === 'visible',
    is_required_override: config.is_required,
    display_order: config.display_order,
    settings: {
      allow_comment: config.allow_comment,
      custom_label: config.custom_label || undefined,
    } satisfies NodeFieldSettings,
  };
}

function defaultConfig(index: number): LocalFieldConfig {
  return {
    visibility: 'hidden',
    is_required: false,
    allow_comment: false,
    custom_label: '',
    display_order: index,
  };
}

export function NodeFieldsEditor({ nodeId, boDefinitionId }: NodeFieldsEditorProps) {
  const { data: fieldDefinitions = [], isLoading: isLoadingFields } = useFieldDefinitions(boDefinitionId);
  const { data: nodeFields = [], isLoading: isLoadingNodeFields } = useNodeFields(nodeId);
  const saveNodeFields = useSaveNodeFields();

  const [fieldConfigs, setFieldConfigs] = useState<Map<string, LocalFieldConfig>>(new Map());
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const [showNewFieldDialog, setShowNewFieldDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [initialized, setInitialized] = useState(false);

  // Initialize fieldConfigs from nodeFields + fieldDefinitions
  useEffect(() => {
    if (isLoadingFields || isLoadingNodeFields) return;

    const newConfigs = new Map<string, LocalFieldConfig>();

    // Build a lookup of existing node_fields by field_definition_id
    const nodeFieldMap = new Map<string, NodeFieldConfig>();
    nodeFields.forEach((nf) => {
      nodeFieldMap.set(nf.field_definition_id, nf);
    });

    fieldDefinitions.forEach((fd, index) => {
      const existing = nodeFieldMap.get(fd.id);
      if (existing) {
        newConfigs.set(fd.id, dbToLocal(existing, index));
      } else {
        newConfigs.set(fd.id, defaultConfig(index));
      }
    });

    setFieldConfigs(newConfigs);
    setInitialized(true);
  }, [fieldDefinitions, nodeFields, isLoadingFields, isLoadingNodeFields]);

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldConfigsRef = useRef(fieldConfigs);
  useEffect(() => {
    fieldConfigsRef.current = fieldConfigs;
  }, [fieldConfigs]);

  const triggerSave = useCallback(() => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const configs = fieldConfigsRef.current;
      const fields = Array.from(configs.entries()).map(([fieldDefId, config]) =>
        localToDb(fieldDefId, config)
      );

      saveNodeFields.mutate(
        { nodeId, fields },
        {
          onSuccess: () => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
          },
          onError: () => {
            setSaveStatus('idle');
          },
        }
      );
    }, 500);
  }, [nodeId, saveNodeFields]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const updateField = (fieldDefId: string, updates: Partial<LocalFieldConfig>) => {
    setFieldConfigs((prev) => {
      const next = new Map(prev);
      const existing = next.get(fieldDefId);
      if (existing) {
        const updated = { ...existing, ...updates };
        // If visibility is not "visible", force is_required to false
        if (updated.visibility !== 'visible') {
          updated.is_required = false;
        }
        next.set(fieldDefId, updated);
      }
      return next;
    });
    // Trigger save after state update
    triggerSave();
  };

  const toggleLabelExpanded = (fieldDefId: string) => {
    setExpandedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(fieldDefId)) {
        next.delete(fieldDefId);
      } else {
        next.add(fieldDefId);
      }
      return next;
    });
  };

  // After creating a new field definition, set it to visible
  const handleFieldCreated = () => {
    // The field definitions query will be invalidated by useCreateFieldDefinition.
    // We need to wait for the refetch, then set the new field to visible.
    // We'll do this via a flag + useEffect.
    setShowNewFieldDialog(false);
    // Mark that we should make the latest field visible after next data refresh
    pendingNewFieldRef.current = true;
  };

  const pendingNewFieldRef = useRef(false);
  const prevFieldCountRef = useRef(fieldDefinitions.length);

  useEffect(() => {
    if (
      pendingNewFieldRef.current &&
      fieldDefinitions.length > prevFieldCountRef.current
    ) {
      // Find the new field (last one that's not in our config map yet)
      const newField = fieldDefinitions.find((fd) => !fieldConfigs.has(fd.id));
      if (newField) {
        setFieldConfigs((prev) => {
          const next = new Map(prev);
          next.set(newField.id, {
            visibility: 'visible',
            is_required: false,
            allow_comment: false,
            custom_label: '',
            display_order: prev.size,
          });
          return next;
        });
        triggerSave();
      }
      pendingNewFieldRef.current = false;
    }
    prevFieldCountRef.current = fieldDefinitions.length;
  }, [fieldDefinitions, fieldConfigs, triggerSave]);

  const isLoading = isLoadingFields || isLoadingNodeFields || !initialized;

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (fieldDefinitions.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Aucun champ disponible pour cet objet métier.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewFieldDialog(true)}
        >
          Nouveau champ
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <FieldDefinitionFormDialog
          open={showNewFieldDialog}
          onOpenChange={(open) => {
            setShowNewFieldDialog(open);
            if (!open) handleFieldCreated();
          }}
          objectDefinitionId={boDefinitionId}
          field={null}
          fields={fieldDefinitions}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Save status indicator */}
      <div className="flex items-center justify-end px-1 h-5">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Sauvegarde...</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            <span>Enregistré</span>
          </div>
        )}
      </div>

      {/* Field rows */}
      {fieldDefinitions.map((fd) => {
        const config = fieldConfigs.get(fd.id);
        if (!config) return null;

        const isLabelExpanded = expandedLabels.has(fd.id);

        return (
          <div
            key={fd.id}
            className="border rounded-md px-3 py-2 space-y-2 bg-background"
          >
            {/* Row 1: Field name + type badge + visibility */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{fd.name}</span>
                <Chip variant="outline" className="text-xs shrink-0">
                  {fd.field_type}
                </Chip>
              </div>

              <Select
                value={config.visibility}
                onValueChange={(value) =>
                  updateField(fd.id, {
                    visibility: value as LocalFieldConfig['visibility'],
                  })
                }
              >
                <SelectTrigger className="h-7 text-xs w-[130px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="readonly">Lecture seule</SelectItem>
                  <SelectItem value="hidden">Masqué</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Checkboxes (only when not hidden) */}
            {config.visibility !== 'hidden' && (
              <div className="flex items-center gap-4 pl-0.5">
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`required-${fd.id}`}
                    checked={config.is_required}
                    onCheckedChange={(checked) =>
                      updateField(fd.id, { is_required: !!checked })
                    }
                    disabled={config.visibility !== 'visible'}
                  />
                  <Label
                    htmlFor={`required-${fd.id}`}
                    className={`text-xs ${
                      config.visibility !== 'visible'
                        ? 'text-muted-foreground'
                        : ''
                    }`}
                  >
                    Obligatoire
                  </Label>
                </div>

                {/* Custom label toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto h-auto p-0"
                  onClick={() => toggleLabelExpanded(fd.id)}
                >
                  {isLabelExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Label personnalisé
                </Button>
              </div>
            )}

            {/* Row 3: Custom label input (collapsible) */}
            {config.visibility !== 'hidden' && isLabelExpanded && (
              <div className="pt-1">
                <Input
                  className="h-7 text-xs"
                  placeholder="Label personnalisé..."
                  value={config.custom_label}
                  onChange={(e) =>
                    updateField(fd.id, { custom_label: e.target.value })
                  }
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Add new field button */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowNewFieldDialog(true)}
        >
          Nouveau champ
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Field Definition Creation Dialog */}
      <FieldDefinitionFormDialog
        open={showNewFieldDialog}
        onOpenChange={(open) => {
          if (!open) handleFieldCreated();
          else setShowNewFieldDialog(true);
        }}
        objectDefinitionId={boDefinitionId}
        field={null}
        fields={fieldDefinitions}
      />
    </div>
  );
}
