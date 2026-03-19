import React, { useMemo, useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import {
  useUpdateOrganizationalEntity,
} from '@/hooks/useOrganizationalEntities';
import { useEoAuditLog, useRevertEoField } from '@/hooks/useEoAuditLog';
import { useEoFieldValues, useUpsertEoFieldValue, useEoFieldDefinitions, type EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { useEoFieldChangeComments, useCreateEoFieldChangeComment } from '@/hooks/useEoFieldChangeComments';
import { EoFieldChangeCommentDialog } from '@/components/user/views/EoFieldChangeCommentDialog';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import { useClientDesignConfig, getEffectiveDesignConfig } from '@/hooks/useClientDesignConfig';
import { buildCssVars } from '@/components/layout/UserFinalThemeWrapper';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';
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
import { EntityInfoSection, type DrawerEntity } from './entity-details/EntityInfoSection';
import { EntityFieldsSection } from './entity-details/EntityFieldsSection';
import { EntityHistorySection } from './entity-details/EntityHistorySection';

interface EntityDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: DrawerEntity | null;
  allEntities?: DrawerEntity[];
  customFieldDefinitions?: EoFieldDefinition[];
  onNavigateToEntity?: (entityId: string) => void;
  enableReparent?: boolean;
  enableArchive?: boolean;
}

export function EntityDetailsDrawer({
  open,
  onOpenChange,
  entity,
  allEntities: allEntitiesProp = [],
  customFieldDefinitions: customFieldDefinitionsProp,
  onNavigateToEntity,
  enableReparent = true,
  enableArchive = true,
}: EntityDetailsDrawerProps) {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { data: designConfig } = useClientDesignConfig(entity?.client_id ?? undefined);
  const themeStyle = buildCssVars(getEffectiveDesignConfig(designConfig));
  const updateEntity = useUpdateOrganizationalEntity();
  const upsertFieldValue = useUpsertEoFieldValue();
  const createChangeComment = useCreateEoFieldChangeComment();
  const { data: _changeComments = [] } = useEoFieldChangeComments(entity?.id);
  const { data: auditLogs = [], isLoading: auditLoading } = useEoAuditLog(entity?.id);
  const revertFieldMutation = useRevertEoField();
  const { data: fieldValuesData } = useEoFieldValues(entity?.id);

  // Auto-fetch field definitions if not provided
  const { data: fetchedFieldDefinitions = [] } = useEoFieldDefinitions(
    !customFieldDefinitionsProp ? (entity?.client_id ?? undefined) : undefined,
  );
  const customFieldDefinitions = customFieldDefinitionsProp ?? fetchedFieldDefinitions;
  const allEntities = allEntitiesProp;
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [editingParent, setEditingParent] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState<{ entityId: string; fieldKey: string; fieldLabel: string; oldValue: unknown } | null>(null);
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
    const chain: DrawerEntity[] = [];
    let current = entity;
    while (current.parent_id) {
      const parent = allEntities.find(e => e.id === current.parent_id);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }
    return chain;
  }, [allEntities, entity]);

  const activeChildren = useMemo(() => {
    if (!entity) return [];
    return allEntities
      .filter(e => e.parent_id === entity.id && e.is_active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allEntities, entity]);

  const inactiveChildren = useMemo(() => {
    if (!entity) return [];
    return allEntities
      .filter(e => e.parent_id === entity.id && !e.is_active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allEntities, entity]);

  const customFieldValues = useMemo(() => {
    if (!fieldValuesData) return {} as Record<string, unknown>;
    const values: Record<string, unknown> = {};
    for (const fv of fieldValuesData) {
      const raw = fv.value;
      values[fv.field_definition_id] =
        typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : raw ?? '';
    }
    return values;
  }, [fieldValuesData]);

  useEffect(() => {
    setEditingParent(false);
  }, [entity?.id]);

  const flashSaved = useCallback(() => {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1500);
  }, []);

  const saveCoreField = useCallback(
    async (field: string, value: string | boolean | null) => {
      if (!entity) return;


      try {
        await updateEntity.mutateAsync({ id: entity.id, [field]: value } as Parameters<typeof updateEntity.mutateAsync>[0]);
        flashSaved();
      } catch { /* handled by hook */ }
    },
    [entity, updateEntity, flashSaved],
  );

  const saveCustomField = useCallback(
    async (fieldId: string, value: string) => {
      if (!entity) return;
      try {
        await upsertFieldValue.mutateAsync({
          eo_id: entity.id,
          field_definition_id: fieldId,
          value: value || null,
        });
        flashSaved();
      } catch { /* handled by hook */ }
    },
    [entity, upsertFieldValue, flashSaved],
  );

  const handleSelectChange = useCallback(
    (field: EoFieldDefinition, newValue: string) => {
      if (!entity) return;
      const oldValue = customFieldValues[field.id] != null ? String(customFieldValues[field.id]) : '';
      const commentRules = field.settings?.comment_rules;

      if (commentRules?.enabled) {
        const transitions = commentRules.transitions;
        const needsComment = !transitions || transitions.length === 0 ||
          transitions.some((t) => t.from === oldValue && t.to === newValue);

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
      await saveCustomField(commentDialog.fieldId, commentDialog.newValue);
      await createChangeComment.mutateAsync({
        eo_id: entity.id,
        field_definition_id: commentDialog.fieldId,
        old_value: commentDialog.oldValue || null,
        new_value: commentDialog.newValue || null,
        comment,
      });
      setCommentDialog(null);
    },
    [commentDialog, entity, saveCustomField, createChangeComment],
  );

  const handleToggleActive = useCallback(
    async (checked: boolean) => {
      if (!entity) return;
      if (!checked && activeChildren.length > 0) {
        toast.error(`Impossible de désactiver cette entité : ${activeChildren.length} enfant${activeChildren.length > 1 ? 's' : ''} actif${activeChildren.length > 1 ? 's' : ''}`);
        return;
      }
      try {
        await updateEntity.mutateAsync({ id: entity.id, is_active: checked });
        flashSaved();
        toast.success(checked ? 'Entité activée' : 'Entité désactivée');
      } catch { /* intentionally ignored */ }
    },
    [entity, activeChildren.length, updateEntity, flashSaved],
  );

  const handleArchive = useCallback(async () => {
    if (!entity) return;
    const totalChildren = activeChildren.length + inactiveChildren.length;
    if (totalChildren > 0) {
      toast.error(`Vous ne pouvez pas archiver cette entité : elle possède ${totalChildren} enfant${totalChildren > 1 ? 's' : ''}. Archivez d'abord les entités enfants.`);
      return;
    }
    try {
      await updateEntity.mutateAsync({ id: entity.id, is_archived: true });
      toast.success('Entité archivée');
      onOpenChange(false);
    } catch { /* intentionally ignored */ }
  }, [entity, activeChildren.length, inactiveChildren.length, updateEntity, onOpenChange]);

  const updateEntityParent = useCallback(
    async (parentId: string | null) => {
      if (!entity) return;
      await updateEntity.mutateAsync({ id: entity.id, parent_id: parentId });
    },
    [entity, updateEntity],
  );

  if (!entity) return null;

  const activeCustomFields = customFieldDefinitions
    .filter((f) => f.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  const parentEntity = entity.parent_id ? allEntities.find(e => e.id === entity.parent_id) : null;

  // Parent candidates: exclude self and descendants
  const parentCandidates = allEntities.filter(e => {
    if (e.id === entity.id) return false;
    if (entity.path && e.path?.startsWith(entity.path + '.')) return false;
    return true;
  });

  return (
    <>
    <DetailsDrawer
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="overflow-y-auto p-0"
      showClose={false}
      style={themeStyle}
    >
        <EntityInfoSection
          entity={entity}
          ancestors={ancestors}
          activeChildren={activeChildren}
          inactiveChildren={inactiveChildren}
          onNavigateToEntity={onNavigateToEntity}
          onToggleActive={handleToggleActive}
          savedIndicator={savedIndicator}
          onArchive={enableArchive ? handleArchive : undefined}
        />

        {/* Toggle actif/inactif */}
        <div className="px-6 mt-4">
          <div className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 bg-gray-50">
            <Switch
              checked={entity.is_active}
              onCheckedChange={handleToggleActive}
            />
            <div>
              <p className="text-sm font-medium">Entité active</p>
              <p className="text-xs text-muted-foreground">Désactivez pour masquer l'entité</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="attributs" className="mt-4">
          <div className="px-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="attributs">Attributs</TabsTrigger>
              <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
              <TabsTrigger value="historique">Historique</TabsTrigger>
            </TabsList>
          </div>

          {/* Attributs Tab */}
          <TabsContent value="attributs" className="px-6 py-4 space-y-5 mt-0">
            <EntityFieldsSection
              entity={entity}
              enableReparent={enableReparent}
              parentEntity={parentEntity ?? null}
              parentCandidates={parentCandidates}
              editingParent={editingParent}
              setEditingParent={setEditingParent}
              activeCustomFields={activeCustomFields}
              customFieldValues={customFieldValues}
              saveCoreField={saveCoreField}
              saveCustomField={saveCustomField}
              handleSelectChange={handleSelectChange}
              updateEntityParent={updateEntityParent}
              flashSaved={flashSaved}
            />
          </TabsContent>

          {/* Utilisateurs Tab */}
          <TabsContent value="utilisateurs" className="px-6 py-4 mt-0">
            <EmptyState icon={Users} title="Gestion des utilisateurs à venir" />
          </TabsContent>

          <TabsContent value="historique" className="px-6 py-4 mt-0">
            <EntityHistorySection
              entity={entity}
              allEntities={allEntities}
              auditLogs={auditLogs}
              auditLoading={auditLoading}
              onRevert={setConfirmRevert}
              onViewFullHistory={() => {
                onOpenChange(false);
                navigate(cp(CLIENT_ROUTES.ENTITY_HISTORY(entity.id)));
              }}
            />
          </TabsContent>
        </Tabs>
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

    <AlertDialog open={!!confirmRevert} onOpenChange={(o) => !o && setConfirmRevert(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler cette modification ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le champ <strong>{confirmRevert?.fieldLabel}</strong> sera rétabli à sa valeur précédente.
            Cette action créera une nouvelle entrée dans l'historique.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!confirmRevert) return;
              revertFieldMutation.mutate(
                { entityId: confirmRevert.entityId, field: confirmRevert.fieldKey, value: confirmRevert.oldValue },
                { onSuccess: () => setConfirmRevert(null) },
              );
            }}
            disabled={revertFieldMutation.isPending}
          >
            {revertFieldMutation.isPending ? 'Annulation…' : 'Confirmer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
