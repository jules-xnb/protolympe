import { useMemo, useState, useCallback } from 'react';
import { Building2, GitBranch, Calendar, Check, History, Power } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEoFieldValues, useEoFieldDefinitions, useUpsertEoFieldValue, useEoSystemNameField, useEoSystemIsActiveField, type EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { getAutoGenerateConfig, generateAutoValue } from '@/lib/eo/eo-auto-generate';
import { checkEoFieldDuplicate, checkEoNameDuplicate } from '@/lib/eo/eo-unique-check';
import { validateDeactivation, validateActivation } from '@/lib/eo/eo-hierarchy-validation';
import { computeAncestors, computeParentCandidates, parseCustomFieldValues, getVisibleCustomFields } from '@/lib/eo/eo-details-calculator';
import { useEoFieldChangeComments, useCreateEoFieldChangeComment } from '@/hooks/useEoFieldChangeComments';
import { EoFieldChangeCommentDialog } from '@/components/user/views/EoFieldChangeCommentDialog';
import { EoHistoryDialog } from '@/components/admin/entities/EoHistoryDialog';
import { InlineFieldEditor } from '@/components/admin/entities/InlineFieldEditor';
import { EoDetailsHierarchySection } from '@/components/user/views/EoDetailsHierarchySection';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useOrganizationalEntity, useUpdateOrganizationalEntity } from '@/hooks/useOrganizationalEntities';
import { useT } from '@/hooks/useT';
import { toast } from 'sonner';
import type { EoFieldKey, EoCardBlockConfig } from '@/components/builder/page-builder/types';

interface OrganizationalEntity {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  level?: number;
  is_active: boolean;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/* InlineField removed — now using shared InlineFieldEditor */

interface EoDetailsDrawerProps {
  entity: OrganizationalEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFieldVisible: (field: EoFieldKey) => boolean;
  config: EoCardBlockConfig;
  onNavigateToEntity?: (entityId: string) => void;
  allEntities?: { id: string; name: string; path: string; parent_id: string | null; is_active?: boolean }[];
}

export function EoDetailsDrawer({
  entity: entityProp,
  open,
  onOpenChange,
  isFieldVisible,
  config,
  onNavigateToEntity,
  allEntities = [],
}: EoDetailsDrawerProps) {
  const { t } = useT();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id;

  // Use entityProp directly — parent component resolves from reactive query cache
  const entity = entityProp;

  const { data: customFieldDefinitions = [] } = useEoFieldDefinitions(clientId || undefined);
  const { data: systemNameField } = useEoSystemNameField(clientId || undefined);
  const { data: systemIsActiveField } = useEoSystemIsActiveField(clientId || undefined);
  const { data: fieldValuesData } = useEoFieldValues(entity?.id);
  const { data: parentEntity } = useOrganizationalEntity(entity?.parent_id ?? undefined);
  const updateEntity = useUpdateOrganizationalEntity();
  const upsertFieldValue = useUpsertEoFieldValue();
  const createChangeComment = useCreateEoFieldChangeComment();
  const { data: changeComments = [] } = useEoFieldChangeComments(entity?.id);

  const [savedIndicator, setSavedIndicator] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [isActiveTogglePending, setIsActiveTogglePending] = useState(false);
  const [pendingIsActiveValue, setPendingIsActiveValue] = useState<boolean | null>(null);
  const [commentDialog, setCommentDialog] = useState<{
    open: boolean;
    fieldId: string;
    fieldName: string;
    oldValue: string;
    newValue: string;
    required: boolean;
  } | null>(null);

  const ancestors = useMemo(() => {
    if (!entity) return [];
    return computeAncestors(entity, allEntities);
  }, [allEntities, entity]);

  const children = useMemo(() => {
    if (!entity) return [];
    return allEntities.filter((e) => e.parent_id === entity.id);
  }, [allEntities, entity]);

  const activeChildren = useMemo(() => children.filter(c => c.is_active !== false), [children]);

  const flashSaved = useCallback(() => {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1500);
  }, []);

  const customFieldValues = useMemo(
    () => parseCustomFieldValues(fieldValuesData),
    [fieldValuesData],
  );

  // Check if a field is editable based on config
  const isFieldEditable = useCallback((fieldKey: string): boolean => {
    if (!config.field_visibility || config.field_visibility.length === 0) return false;
    const fieldConfig = config.field_visibility.find(fv => fv.field === fieldKey);
    if (!fieldConfig) return false;
    return fieldConfig.editable !== false;
  }, [config.field_visibility]);

  const visibleCustomFields = useMemo(() => {
    if (!config.field_visibility || config.field_visibility.length === 0) {
      return [];
    }
    return getVisibleCustomFields(customFieldDefinitions, isFieldVisible);
  }, [customFieldDefinitions, config.field_visibility, isFieldVisible]);

  const parentCandidates = useMemo(() => {
    if (!entity) return [];
    return computeParentCandidates(entity, allEntities);
  }, [allEntities, entity]);

  const saveCustomField = useCallback(
    async (fieldId: string, value: string) => {
      if (!entity) return;
      try {
        let finalValue = value;
        // Auto-generate if value is empty and auto-generate is configured
        if (!finalValue) {
          const fieldDef = customFieldDefinitions.find(f => f.id === fieldId);
          const agConfig = fieldDef ? getAutoGenerateConfig(fieldDef.settings) : null;
          if (agConfig) {
            finalValue = await generateAutoValue(fieldId, agConfig);
          }
        }

        // Uniqueness check
        const fieldDef = customFieldDefinitions.find(f => f.id === fieldId);
        if (fieldDef?.is_unique && finalValue) {
          const isDuplicate = await checkEoFieldDuplicate(fieldId, finalValue, entity.id);
          if (isDuplicate) {
            toast.error(t('eo.field_duplicate', { name: fieldDef.name }));
            return;
          }
        }

        await upsertFieldValue.mutateAsync({
          eo_id: entity.id,
          field_definition_id: fieldId,
          value: finalValue || null,
        });
        flashSaved();
      } catch { /* handled by hook */ }
    },
    [entity, upsertFieldValue, flashSaved, customFieldDefinitions, t],
  );

  const handleSelectChange = useCallback(
    (field: EoFieldDefinition, newValue: string) => {
      if (!entity) return;
      const oldValue = customFieldValues[field.id] != null ? String(customFieldValues[field.id]) : '';
      const commentRules = (field.settings as Record<string, unknown> | null)?.comment_rules as { enabled?: boolean; required?: boolean; transitions?: { from: string; to: string }[] | null } | undefined;

      if (commentRules?.enabled) {
        const transitions = commentRules.transitions as { from: string; to: string }[] | null;
        const needsComment = !transitions || transitions.length === 0 ||
          transitions.some((t: { from: string; to: string }) => t.from === oldValue && t.to === newValue);

        if (needsComment) {
          setCommentDialog({
            open: true,
            fieldId: field.id,
            fieldName: field.name,
            oldValue,
            newValue,
            required: commentRules.required ?? false,
          });
          return;
        }
      }
      saveCustomField(field.id, newValue);
    },
    [entity, customFieldValues, saveCustomField],
  );

  const handleCommentConfirm = useCallback(
    async (comment: string) => {
      if (!commentDialog || !entity) return;

      // Check if this is the system is_active field
      if (commentDialog.fieldId === systemIsActiveField?.id) {
        const newIsActive = pendingIsActiveValue;
        setPendingIsActiveValue(null);
        await updateEntity.mutateAsync({ id: entity.id, is_active: newIsActive! });
        await createChangeComment.mutateAsync({
          eo_id: entity.id,
          field_definition_id: commentDialog.fieldId,
          old_value: commentDialog.oldValue || null,
          new_value: commentDialog.newValue || null,
          comment,
        });
        flashSaved();
        setIsActiveTogglePending(false);
      } else {
        await saveCustomField(commentDialog.fieldId, commentDialog.newValue);
        await createChangeComment.mutateAsync({
          eo_id: entity.id,
          field_definition_id: commentDialog.fieldId,
          old_value: commentDialog.oldValue || null,
          new_value: commentDialog.newValue || null,
          comment,
        });
      }
      setCommentDialog(null);
    },
    [commentDialog, entity, saveCustomField, createChangeComment, updateEntity, systemIsActiveField, flashSaved, pendingIsActiveValue],
  );

  if (!entity) return null;

  return (
    <>
    <DetailsDrawer
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="overflow-y-auto"
      customHeader={
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {entity.name}
                {savedIndicator && (
                  <Chip variant="outline" className="text-xs text-primary border-primary/30 animate-in fade-in">
                    <Check className="h-3 w-3 mr-0.5" /> {t('eo.saved')}
                  </Chip>
                )}
              </div>
              {isFieldVisible('code') && entity.code && (
                <div className="text-xs font-mono text-muted-foreground">{entity.code}</div>
              )}
            </div>
          </SheetTitle>
          <SheetDescription className="flex items-center justify-between">
            <span>{t('eo.entity_details')}</span>
            {config.enable_history && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setHistoryDialogOpen(true)}
              >
                <History className="h-3 w-3" />
                {t('eo.history')}
              </Button>
            )}
          </SheetDescription>
        </SheetHeader>
      }
    >

        {/* Breadcrumb */}
        {ancestors.length > 0 && (
          <div className="mt-3 flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
            {ancestors.map((ancestor) => (
              <span key={ancestor.id} className="flex items-center gap-1">
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => onNavigateToEntity?.(ancestor.id)}
                >
                  {ancestor.name}
                </Button>
                <span className="text-muted-foreground/50">/</span>
              </span>
            ))}
            <span className="font-medium text-foreground">{entity.name}</span>
          </div>
        )}

        <div className="mt-6 space-y-6">
           {/* Status & Hierarchy */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {entity.level !== undefined && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <GitBranch className="h-4 w-4" />
                  {t('labels.level')} {entity.level}
                </div>
              )}
            </div>

            <EoDetailsHierarchySection
              key={entity.id}
              entity={entity}
              parentEntity={parentEntity}
              parentCandidates={parentCandidates}
              children={children}
              activeChildren={activeChildren}
              isFieldVisible={isFieldVisible}
              isFieldEditable={isFieldEditable}
              onNavigateToEntity={onNavigateToEntity}
              onUpdateParent={async (parentId) => {
                await updateEntity.mutateAsync({ id: entity.id, parent_id: parentId });
              }}
            />

            {isFieldVisible('description') && entity.description && (
              <p className="text-sm text-muted-foreground">{entity.description}</p>
            )}
          </div>

          {/* Core + Custom Fields */}
          {(isFieldVisible('name') || isFieldVisible('code') || isFieldVisible('is_active') || visibleCustomFields.length > 0) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                {/* Core field: Nom */}
                {isFieldVisible('name') && (
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">{t('labels.name')}</span>
                    {isFieldEditable('name') ? (
                      <Input
                        className="h-8 w-full p-0 px-2 text-sm border rounded-md bg-background shadow-none focus-visible:border-primary"
                        defaultValue={entity.name}
                        onBlur={async (e) => {
                          if (e.target.value !== entity.name) {
                            if (systemNameField?.is_unique && clientId) {
                              const isDuplicate = await checkEoNameDuplicate(clientId, e.target.value, entity.id);
                              if (isDuplicate) {
                                toast.error(t('errors.name_exists'));
                                e.target.value = entity.name;
                                return;
                              }
                            }
                            updateEntity.mutateAsync({ id: entity.id, name: e.target.value });
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      />
                    ) : (
                      <span className="text-sm">{entity.name}</span>
                    )}
                  </div>
                )}
                {/* Core field: Code (always read-only) */}
                {isFieldVisible('code') && (
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">ID</span>
                    <span className="text-sm font-mono select-all">{entity.code || '—'}</span>
                  </div>
                )}
                {/* Core field: Statut actif */}
                {isFieldVisible('is_active') && (() => {
                  const boolLabels = (systemIsActiveField?.settings as Record<string, unknown> | null)?.boolean_labels as { true_label?: string; false_label?: string } | undefined;
                  const trueLabel = boolLabels?.true_label || t('status.active');
                  const falseLabel = boolLabels?.false_label || t('status.inactive');
                  const fieldLabel = systemIsActiveField?.name || t('labels.status');
                  return (
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">{fieldLabel}</span>
                    <div className="flex items-center gap-2 h-8">
                      {isFieldEditable('is_active') ? (
                        <Switch
                          checked={entity.is_active}
                          disabled={isActiveTogglePending}
                          onCheckedChange={async (checked) => {
                            setIsActiveTogglePending(true);
                            try {
                              if (!checked) {
                                const error = await validateDeactivation(entity.id, clientId || '');
                                if (error) { toast.error(error); return; }
                              } else {
                                const error = await validateActivation(entity.parent_id || null);
                                if (error) { toast.error(error); return; }
                              }
                              const commentRules = (systemIsActiveField?.settings as Record<string, unknown> | null)?.comment_rules as { enabled?: boolean; required?: boolean } | undefined;
                              if (commentRules?.enabled) {
                                setCommentDialog({
                                  open: true,
                                  fieldId: systemIsActiveField!.id,
                                  fieldName: fieldLabel,
                                  oldValue: entity.is_active ? trueLabel : falseLabel,
                                  newValue: checked ? trueLabel : falseLabel,
                                  required: commentRules.required ?? false,
                                });
                                setPendingIsActiveValue(checked);
                                return;
                              }
                              await updateEntity.mutateAsync({ id: entity.id, is_active: checked });
                              flashSaved();
                            } catch { /* intentionally ignored */
                            } finally {
                              setIsActiveTogglePending(false);
                            }
                          }}
                        />
                      ) : null}
                      <Chip variant="default" className="text-xs gap-1">
                        <Power className="h-3 w-3" />
                        {entity.is_active ? trueLabel : falseLabel}
                      </Chip>
                    </div>
                  </div>
                  );
                })()}
                {/* Custom fields */}
                {visibleCustomFields
                  .sort((a, b) => a.display_order - b.display_order)
                  .map(field => {
                    const raw = customFieldValues[field.id];
                    const displayVal = raw != null ? String(raw) : '';
                    const editable = isFieldEditable(field.id);
                    return (
                      <InlineFieldEditor
                        key={field.id}
                        field={field}
                        value={displayVal}
                        isEditable={editable}
                        onSave={(v) => saveCustomField(field.id, String(v))}
                        changeComments={changeComments}
                        onSelectChange={handleSelectChange}
                        allFieldValues={customFieldValues}
                        allFieldDefinitions={customFieldDefinitions}
                      />
                    );
                  })}
              </div>
            </>
          )}

          {/* Metadata */}
          {(entity.created_at || entity.updated_at) && (
            <>
              <Separator />
              <div className="space-y-2 text-xs text-muted-foreground">
                {entity.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {t('eo.created_on')} {format(new Date(entity.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </div>
                )}
                {entity.updated_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {t('eo.modified_on')} {format(new Date(entity.updated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
    </DetailsDrawer>

    {commentDialog && (
      <EoFieldChangeCommentDialog
        open={commentDialog.open}
        onOpenChange={(v) => { if (!v) setCommentDialog(null); }}
        fieldName={commentDialog.fieldName}
        oldValue={commentDialog.oldValue}
        newValue={commentDialog.newValue}
        required={commentDialog.required}
        onConfirm={handleCommentConfirm}
        isPending={createChangeComment.isPending}
      />
    )}

    {config.enable_history && entity && (
      <EoHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        entityId={entity.id}
        entityName={entity.name}
      />
    )}
    </>
  );
}
