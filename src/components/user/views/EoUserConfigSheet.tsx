import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Settings2, Columns3, Layers,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { EO_LIST_COLUMN_OPTIONS, type EoListColumnConfig } from '@/components/builder/page-builder/types';
import {
  DraggableAvailableItem,
  SortableColumnItem,
  DragOverlayItem,
  DroppableSelectedZone,
} from './ColumnDndItems';
import { EoFieldsTabContent } from './EoFieldsTabContent';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

/* ── Main overlay component ── */
interface EoUserConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewConfigId: string;
  blockId: string;
  clientId: string;
  listColumns: EoListColumnConfig[];
  allowColumnConfig: boolean;
  allowFieldManagement: boolean;
}

export function EoUserConfigSheet({
  open,
  onOpenChange,
  viewConfigId,
  blockId,
  clientId,
  listColumns,
  allowColumnConfig,
  allowFieldManagement,
}: EoUserConfigSheetProps) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const { data: customFields = [] } = useEoFieldDefinitions(clientId);

  const ensureNameColumn = (cols: EoListColumnConfig[]): EoListColumnConfig[] => {
    const hasName = cols.some(c => c.field_id === 'name');
    if (!hasName) return [{ field_id: 'name', field_name: t('labels.name'), is_custom: false }, ...cols];
    return cols;
  };

  const [localColumns, setLocalColumns] = useState<EoListColumnConfig[]>([]);
  const [activeItem, setActiveItem] = useState<{ id: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Build initial columns when opened
  useEffect(() => {
    if (!open) return;
    const cols: EoListColumnConfig[] = listColumns.length > 0
      ? listColumns.map(c => ({ ...c }))
      : [{ field_id: 'name', field_name: t('labels.name') }];
    setLocalColumns(ensureNameColumn(cols));
  }, [open, listColumns]);

  const defaultTab = allowColumnConfig ? 'columns' : 'fields';

  // ── DnD handlers ──
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === 'available') {
      setActiveItem({ id: data.fieldId, name: data.fieldName });
    } else {
      const col = localColumns.find(c => c.field_id === active.id);
      if (col) setActiveItem({ id: col.field_id, name: col.field_name });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    const data = active.data.current;
    if (data?.type === 'available') {
      if (over) {
        const fieldId = data.fieldId as string;
        const fieldName = data.fieldName as string;
        const isCustom = !new Set(EO_LIST_COLUMN_OPTIONS.map(f => f.field)).has(fieldId);
        if (!localColumns.some(c => c.field_id === fieldId)) {
          setLocalColumns(prev => [...prev, { field_id: fieldId, field_name: fieldName, is_custom: isCustom || undefined }]);
        }
      }
      return;
    }

    if (!over || active.id === over.id) return;
    const oldIndex = localColumns.findIndex(c => c.field_id === active.id);
    const newIndex = localColumns.findIndex(c => c.field_id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setLocalColumns(arrayMove(localColumns, oldIndex, newIndex));
    }
  };

  const handleAddColumn = (field: string, label: string) => {
    if (localColumns.some(c => c.field_id === field)) return;
    const isCustom = !new Set(EO_LIST_COLUMN_OPTIONS.map(f => f.field)).has(field);
    setLocalColumns([...localColumns, { field_id: field, field_name: label, is_custom: isCustom || undefined }]);
  };

  const handleRemoveColumn = (fieldId: string) => {
    if (fieldId === 'name') return;
    setLocalColumns(localColumns.filter(c => c.field_id !== fieldId));
  };

  // ── Save to DB ──
  const handleSaveColumns = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/api/view-configs/${viewConfigId}/block/${blockId}/columns`, {
        list_columns: localColumns.map(c => ({
          field_id: c.field_id,
          field_name: c.field_name,
          is_custom: c.is_custom,
        })),
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.viewConfigs.byId(viewConfigId) });
      toast.success(t('eo.columns_saved'));
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(`${t('errors.generic')}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const activeFields = customFields.filter(f => f.is_active);

  const selectedFieldIds = new Set(localColumns.map(c => c.field_id));

  const allAvailableFields = [
    ...EO_LIST_COLUMN_OPTIONS.filter(f => f.field !== 'name' && !selectedFieldIds.has(f.field))
      .map(f => ({ id: f.field, name: f.label })),
    ...activeFields.filter(f => !selectedFieldIds.has(f.id))
      .map(f => ({ id: f.id, name: f.name })),
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Settings2 className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{t('eo.configuration')}</h3>
          <p className="text-xs text-muted-foreground">{t('eo.columns_and_fields')}</p>
        </div>
      </div>

      {/* Content with tabs */}
      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2 shrink-0">
          <TabsList className="w-full justify-start">
            {allowColumnConfig && (
              <TabsTrigger value="columns">
                <Columns3 className="h-3.5 w-3.5 mr-1.5" />
                {t('eo.columns')}
              </TabsTrigger>
            )}
            {allowFieldManagement && (
              <TabsTrigger value="fields">
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                {t('eo.fields')}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ── Columns Tab ── */}
        {allowColumnConfig && (
          <TabsContent value="columns" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden overflow-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex-1 grid grid-cols-2 divide-x overflow-hidden">
                {/* Left – Available */}
                <div className="flex flex-col overflow-hidden">
                  <div className="px-4 py-2.5 border-b">
                    <span className="text-xs font-medium">{t('eo.available')}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">{allAvailableFields.length}</span>
                  </div>
                  <div className="flex-1 h-0 overflow-y-auto p-2">
                    {allAvailableFields.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        {t('eo.all_columns_selected')}
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        {allAvailableFields.map(field => (
                          <DraggableAvailableItem
                            key={field.id}
                            id={field.id}
                            name={field.name}
                            onAdd={() => handleAddColumn(field.id, field.name)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right – Selected */}
                <div className="flex flex-col min-h-0">
                  <div className="px-4 py-2.5 border-b flex items-center justify-between">
                    <span className="text-xs font-medium">{t('eo.selected')}</span>
                    <span className="text-xs text-muted-foreground">
                      {localColumns.length} {t('eo.column_count', { count: String(localColumns.length) })}
                    </span>
                  </div>
                  <div className="flex-1 h-0 overflow-y-auto p-2">
                    <DroppableSelectedZone isEmpty={localColumns.length === 0}>
                      <SortableContext
                        items={localColumns.map(c => c.field_id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1.5">
                          {localColumns.map(column => (
                            <SortableColumnItem
                              key={column.field_id}
                              column={column}
                              onRemove={() => handleRemoveColumn(column.field_id)}
                              isFixed={column.field_id === 'name'}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DroppableSelectedZone>
                  </div>
                </div>
              </div>

              <DragOverlay>
                {activeItem ? <DragOverlayItem name={activeItem.name} /> : null}
              </DragOverlay>
            </DndContext>

            {/* Save footer */}
            <div className="px-4 py-3 border-t shrink-0 flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('buttons.cancel')}
              </Button>
              <Button onClick={handleSaveColumns} disabled={isSaving}>
                {isSaving ? t('buttons.saving') : t('buttons.save_configuration')}
              </Button>
            </div>
          </TabsContent>
        )}

        {/* ── Fields Tab ── */}
        {allowFieldManagement && (
          <TabsContent value="fields" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden overflow-hidden">
            <EoFieldsTabContent clientId={clientId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
