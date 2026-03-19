import { useState, useMemo, useCallback } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Archive, RotateCcw, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useEoFieldDefinitions, useArchivedEoFieldDefinitions, useArchiveEoFieldDefinition, useRestoreEoFieldDefinition, type EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { EoFieldFormDialog } from '@/components/admin/entities/eo-field-form/EoFieldFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { DataTable } from '@/components/admin/DataTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getFieldTypeIcon, getFieldTypeLabel } from '@/lib/field-type-registry';
import { useT } from '@/hooks/useT';

interface EoFieldsTabContentProps {
  clientId: string;
}

export function EoFieldsTabContent({ clientId }: EoFieldsTabContentProps) {
  const { t } = useT();
  const { data: customFields = [] } = useEoFieldDefinitions(clientId);
  const { data: archivedFields = [] } = useArchivedEoFieldDefinitions();
  const archiveField = useArchiveEoFieldDefinition();
  const restoreField = useRestoreEoFieldDefinition();

  const [fieldFormOpen, setFieldFormOpen] = useState(false);
  const archiveDialog = useDialogState<EoFieldDefinition>();
  const [showArchivedFields, setShowArchivedFields] = useState(false);

  const activeFields = customFields.filter(f => f.is_active);

  const handleArchiveField = async () => {
    if (!archiveDialog.item) return;
    await archiveField.mutateAsync(archiveDialog.item.id);
    archiveDialog.close();
  };

  const handleRestoreField = useCallback(async (field: EoFieldDefinition) => {
    await restoreField.mutateAsync(field.id);
  }, [restoreField]);

  const fieldColumns = useMemo<ColumnDef<EoFieldDefinition>[]>(() => [
    {
      accessorKey: 'name',
      header: t('labels.name'),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'field_type',
      header: t('labels.type'),
      cell: ({ row }) => {
        const IconComp = getFieldTypeIcon(row.original.field_type);
        return (
          <div className="flex items-center gap-2">
            <IconComp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{getFieldTypeLabel(row.original.field_type)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'is_required',
      header: t('labels.required'),
      cell: ({ row }) => (
        <Chip variant="default" className="text-xs">
          {row.original.is_required ? t('boolean.yes') : t('boolean.no')}
        </Chip>
      ),
    },
    {
      accessorKey: 'is_unique',
      header: t('labels.unique'),
      cell: ({ row }) => row.original.is_unique ? (
        <Chip variant="default" className="text-xs">{t('boolean.yes')}</Chip>
      ) : (
        <Chip variant="default" className="text-xs">{t('boolean.no')}</Chip>
      ),
    },
    {
      id: 'max_length',
      header: t('labels.max'),
      cell: ({ row }) => {
        const maxLen = (row.original.validation_rules as Record<string, unknown> | null)?.max_length;
        return maxLen ? (
          <Chip variant="outline" className="text-xs">{maxLen} {t('eo.characters_short')}</Chip>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => showArchivedFields ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRestoreField(row.original)}
          disabled={restoreField.isPending}
        >
          {t('buttons.restore')}
          <RotateCcw className="h-4 w-4" />
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => archiveDialog.open(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="mr-2 h-4 w-4" />
              {t('buttons.archive')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      maxSize: 50,
    },
  ], [showArchivedFields, restoreField.isPending, handleRestoreField, t]);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        <DataTable
          columns={fieldColumns}
          data={showArchivedFields ? archivedFields : activeFields}
          searchColumn="name"
          searchPlaceholder={t('eo.search_field')}
          hideColumnSelector
          toolbarRight={
            <div className="flex items-center gap-2">
              <Button
                variant={showArchivedFields ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowArchivedFields(!showArchivedFields)}
              >
                {t('eo.archived')}
                <Archive className="h-4 w-4" />
              </Button>
              {!showArchivedFields && (
                <Button size="sm" onClick={() => setFieldFormOpen(true)}>
                  {t('eo.new_field')}
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Create field dialog */}
      <EoFieldFormDialog
        open={fieldFormOpen}
        onOpenChange={setFieldFormOpen}
        clientId={clientId}
        fieldsCount={activeFields.length}
      />

      {/* Archive confirmation */}
      <DeleteConfirmDialog
        open={archiveDialog.isOpen}
        onOpenChange={archiveDialog.onOpenChange}
        onConfirm={handleArchiveField}
        title={t('eo.archive_field_title')}
        description={t('eo.archive_field_description', { name: archiveDialog.item?.name || '' })}
        isDeleting={archiveField.isPending}
      />
    </>
  );
}
