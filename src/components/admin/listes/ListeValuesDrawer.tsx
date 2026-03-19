import { useState, useMemo, useCallback } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useListeWithValues,
  useCreateListeValue,
  useUpdateListeValue,
  useDeleteListeValue,
  useRestoreListeValue,
  useDeleteListe,
  useUpdateListe,
  type Liste,
  type ListeValue,
} from '@/hooks/useListes';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Loader2, Archive, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TreeItem } from './liste-values/TreeItem';
import { ValueFormDialog } from './liste-values/ValueFormDialog';
import { DrawerHeader } from './liste-values/DrawerHeader';
import {
  buildTree,
  getDescendantIds,
  DEFAULT_COLOR,
  type ValueFormData,
} from './liste-values/types';
import { generateCode } from '@/lib/format-utils';

interface ListeValuesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liste: Liste | null;
}

export function ListeValuesDrawer({ open, onOpenChange, liste }: ListeValuesDrawerProps) {
  const { data, isLoading } = useListeWithValues(liste?.id);
  const createMutation = useCreateListeValue();
  const updateMutation = useUpdateListeValue();
  const deleteMutation = useDeleteListeValue();
  const restoreMutation = useRestoreListeValue();
  const deleteListeMutation = useDeleteListe();
  const updateListeMutation = useUpdateListe();
  const archiveListeDialog = useDialogState();
  const archiveValueDialog = useDialogState<ListeValue>();
  const [showArchivedValues, setShowArchivedValues] = useState(false);

  const [editingValue, setEditingValue] = useState<ListeValue | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<ValueFormData>({
    code: '',
    label: '',
    color: DEFAULT_COLOR,
    parent_value_id: null,
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const allValues = useMemo(() => data?.values || [], [data?.values]);
  const values = useMemo(() =>
    showArchivedValues ? allValues.filter(v => !v.is_active) : allValues.filter(v => v.is_active),
    [allValues, showArchivedValues]
  );
  const activeValues = useMemo(() => allValues.filter(v => v.is_active), [allValues]);
  const archivedCount = useMemo(() => allValues.filter(v => !v.is_active).length, [allValues]);
  const tree = useMemo(() => buildTree(values), [values]);
  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending;

  const availableParents = useMemo(() => {
    if (!editingValue) return values;
    const descendants = getDescendantIds(editingValue.id, values);
    return values.filter(v => v.id !== editingValue.id && !descendants.has(v.id));
  }, [values, editingValue]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useMemo(() => {
    if (values.length > 0) {
      const ids = new Set(values.filter(v => values.some(c => c.parent_value_id === v.id)).map(v => v.id));
      setExpandedIds(ids);
    }
  }, [values]);

  const resetForm = () => {
    setFormData({ code: '', label: '', color: DEFAULT_COLOR, parent_value_id: null });
    setEditingValue(null);
    setIsAdding(false);
  };

  const handleEdit = (value: ListeValue) => {
    setEditingValue(value);
    setFormData({ code: value.code, label: value.label, color: value.color || '', parent_value_id: value.parent_value_id || null });
    setIsAdding(false);
  };

  const handleAddChild = (parentId: string) => {
    resetForm();
    setFormData(prev => ({ ...prev, parent_value_id: parentId }));
    setIsAdding(true);
    setExpandedIds(prev => new Set([...prev, parentId]));
  };

  const handleLabelChange = (label: string) => {
    // When editing, auto-generate code from single label; when adding, code is generated per line at save time
    setFormData(prev => ({ ...prev, label, code: editingValue ? prev.code : '' }));
  };

  const handleSave = async () => {
    if (!liste) return;
    const parentValue = formData.parent_value_id ? values.find(v => v.id === formData.parent_value_id) : null;
    const level = parentValue ? parentValue.level + 1 : 0;

    try {
      if (editingValue) {
        await updateMutation.mutateAsync({ id: editingValue.id, code: formData.code, label: formData.label, color: formData.color || null, parent_value_id: formData.parent_value_id, level });
        toast.success('Valeur mise à jour');
      } else {
        // Multi-line: create one value per non-empty line, skip duplicates
        const labels = formData.label.split('\n').map(l => l.trim()).filter(Boolean);
        if (labels.length === 0) return;

        // Deduplicate: existing codes in this liste + within the batch
        const existingCodes = new Set(allValues.map(v => v.code));
        const seenCodes = new Set<string>();
        const uniqueLabels: string[] = [];
        const skipped: string[] = [];
        for (const label of labels) {
          const code = generateCode(label);
          if (existingCodes.has(code) || seenCodes.has(code)) {
            skipped.push(label);
          } else {
            seenCodes.add(code);
            uniqueLabels.push(label);
          }
        }

        if (skipped.length > 0) {
          toast.warning(`${skipped.length} doublon${skipped.length > 1 ? 's' : ''} ignoré${skipped.length > 1 ? 's' : ''} : ${skipped.join(', ')}`);
        }
        if (uniqueLabels.length === 0) return;

        const siblings = values.filter(v => v.parent_value_id === formData.parent_value_id);
        let created = 0;
        for (let i = 0; i < uniqueLabels.length; i++) {
          const label = uniqueLabels[i];
          const code = generateCode(label);
          await createMutation.mutateAsync({ liste_id: liste.id, code, label, color: formData.color || null, display_order: siblings.length + i, parent_value_id: formData.parent_value_id, level });
          created++;
        }
        toast.success(created > 1 ? `${created} valeurs ajoutées` : 'Valeur ajoutée');
      }
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleArchiveRequest = (value: ListeValue) => {
    if (activeValues.some(v => v.parent_value_id === value.id)) {
      toast.error('Archivez d\'abord les valeurs enfants');
      return;
    }
    archiveValueDialog.open(value);
  };

  const handleArchiveConfirm = async () => {
    if (!liste || !archiveValueDialog.item) return;
    try {
      await deleteMutation.mutateAsync({ id: archiveValueDialog.item.id, listeId: liste.id });
      toast.success('Valeur archivée');
      if (editingValue?.id === archiveValueDialog.item.id) resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erreur lors de l\'archivage');
    }
    archiveValueDialog.close();
  };

  const handleRestore = async (value: ListeValue) => {
    if (!liste) return;
    try {
      await restoreMutation.mutateAsync({ id: value.id, listeId: liste.id });
      toast.success('Valeur restaurée');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erreur lors de la restauration');
    }
  };

  const handleUpdateListe = useCallback(async (data: { id: string; name?: string; description?: string | null; tag?: string | null }) => {
    await updateListeMutation.mutateAsync(data);
  }, [updateListeMutation]);

  return (
    <>
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) { resetForm(); setShowArchivedValues(false); }
      onOpenChange(isOpen);
    }}>
      <SheetContent className="flex flex-col" showClose={false}>
        <DrawerHeader
          liste={liste}
          onUpdateListe={handleUpdateListe}
          isPending={updateListeMutation.isPending}
          showArchive={!!(liste && !liste.is_system && !showArchivedValues)}
          onArchive={() => archiveListeDialog.open()}
        />

        <div className="flex-1 flex flex-col gap-4 mt-4 min-h-0">
          {!showArchivedValues && (
            <Button onClick={() => { resetForm(); setIsAdding(true); }} size="sm">
              Ajouter une valeur
              <Plus className="h-4 w-4" />
            </Button>
          )}

          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : values.length === 0 ? (
              <EmptyState
                title="Aucune valeur"
                description="Ajoutez des valeurs à cette liste"
              />
            ) : (
              <div className="space-y-1">
                {tree.map((node) => (
                  <TreeItem key={node.id} node={node} depth={0} editingId={editingValue?.id || null} onEdit={handleEdit} onArchive={handleArchiveRequest} onRestore={handleRestore} onAddChild={handleAddChild} isArchiving={deleteMutation.isPending || restoreMutation.isPending} expandedIds={expandedIds} toggleExpanded={toggleExpanded} showArchived={showArchivedValues} />
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="pt-2 border-t space-y-2">
            <div className="text-xs text-muted-foreground text-center">
              {showArchivedValues
                ? `${values.length} valeur${values.length !== 1 ? 's' : ''} archivée${values.length !== 1 ? 's' : ''}`
                : `${values.length} valeur${values.length !== 1 ? 's' : ''}`}
            </div>
            {showArchivedValues ? (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowArchivedValues(false)}>
                Retour aux valeurs actives
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowArchivedValues(true)}>
                Voir les valeurs archivées ({archivedCount})
                <Archive className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <ValueFormDialog open={isAdding || !!editingValue} onOpenChange={(open) => { if (!open) resetForm(); }} editingValue={editingValue} formData={formData} onFormDataChange={setFormData} onLabelChange={handleLabelChange} availableParents={availableParents} onSave={handleSave} onCancel={resetForm} isPending={isPending} />

    <DeleteConfirmDialog open={archiveListeDialog.isOpen} onOpenChange={archiveListeDialog.onOpenChange} onConfirm={async () => { if (!liste) return; await deleteListeMutation.mutateAsync(liste.id); archiveListeDialog.close(); onOpenChange(false); }} title="Archiver la liste" description={`Êtes-vous sûr de vouloir archiver "${liste?.name}" ? Cette action supprimera également toutes ses valeurs.`} isDeleting={deleteListeMutation.isPending} />
    <DeleteConfirmDialog open={archiveValueDialog.isOpen} onOpenChange={archiveValueDialog.onOpenChange} onConfirm={handleArchiveConfirm} title="Archiver la valeur" description={`Êtes-vous sûr de vouloir archiver la valeur "${archiveValueDialog.item?.label}" ?`} isDeleting={deleteMutation.isPending} />
    </>
  );
}
