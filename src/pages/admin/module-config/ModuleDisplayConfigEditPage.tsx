import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useModuleDisplayConfig,
  useUpdateDisplayConfig,
} from '@/hooks/useModuleDisplayConfigs';
import { useClientModule } from '@/hooks/useModules';
import { useClientPath } from '@/hooks/useClientPath';
import { PageHeader } from '@/components/admin/PageHeader';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Plus, Trash2, Loader2, GripVertical, Eye, Pencil, ChevronUp, ChevronDown, Archive, Download, X as XIcon, Users as UsersIcon } from 'lucide-react';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import { StatusChip } from '@/components/ui/status-chip';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  getModuleDisplayDefinition,
  mergeWithDefaults,
  type DisplayConfigData,
  type ListColumn,
  type DrawerField,
  type DrawerSection,
  type FilterField,
  type Prefilter,
  type DisplayTab,
  type GestionnaireConfig,
  type RepondantConfig,
  type UserAnonymizableField,
  type UserFieldAnonymization,
} from '@/lib/module-display-fields';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIEW_LABELS: Record<string, string> = {
  list: 'Liste',
  tree: 'Arborescence',
  canvas: 'Canvas',
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: 'Égal à',
  not_equals: 'Différent de',
  contains: 'Contient',
  is_empty: 'Est vide',
  is_not_empty: "N'est pas vide",
};

const TAB_LABELS: Record<DisplayTab, string> = {
  general: 'Général',
  views: 'Vues',
  columns: 'Colonnes',
  drawer: 'Drawer',
  filters: 'Filtres',
  prefilters: 'Pré-filtres',
  anonymization: 'Anonymisation',
  gestionnaire: 'Vue gestionnaire',
  repondant: 'Vue répondant',
};

const ANONYMIZABLE_FIELDS: { field: UserAnonymizableField; label: string }[] = [
  { field: 'first_name', label: 'Prénom' },
  { field: 'last_name', label: 'Nom' },
  { field: 'email', label: 'Email' },
  { field: 'profile', label: 'Profil' },
];

// ---------------------------------------------------------------------------
// Sortable row components
// ---------------------------------------------------------------------------

function SortableColumnRow({ column, onToggleVisibility }: { column: ListColumn; onToggleVisibility: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.field_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[40px]">
        <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{column.field_name}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <Switch checked={column.visible} onCheckedChange={onToggleVisibility} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function SortableFilterRow({ filter, onRemove }: { filter: FilterField; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: filter.field_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[40px]">
        <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{filter.field_name}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <Switch checked onCheckedChange={onRemove} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function SortableDrawerFieldRow({
  field,
  onToggleVisible,
  onToggleEditable,
}: {
  field: DrawerField;
  onToggleVisible: () => void;
  onToggleEditable: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.field_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
      <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium">{field.field_name}</span>
      <Switch checked={field.visible} onCheckedChange={onToggleVisible} />
      <Switch checked={field.editable} disabled={!field.visible} onCheckedChange={onToggleEditable} />
    </div>
  );
}

function DroppableFieldList({
  containerId,
  fields,
  onToggleVisible,
  onToggleEditable,
  selectable,
  selectedIds,
  onToggleSelect,
}: {
  containerId: string;
  fields: DrawerField[];
  onToggleVisible: (fieldId: string) => void;
  onToggleEditable: (fieldId: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (fieldId: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: containerId });

  return (
    <div ref={setNodeRef} className="min-h-[48px] space-y-1 rounded-md border border-dashed p-2">
      <SortableContext items={fields.map((f) => f.field_id)} strategy={verticalListSortingStrategy}>
        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">Glissez des champs ici</p>
        )}
        {fields.map((field) => (
          <div key={field.field_id} className="flex items-center gap-1">
            {selectable && (
              <Checkbox
                checked={selectedIds?.has(field.field_id) ?? false}
                onCheckedChange={() => onToggleSelect?.(field.field_id)}
                className="shrink-0"
              />
            )}
            <div className="flex-1">
              <SortableDrawerFieldRow
                field={field}
                onToggleVisible={() => onToggleVisible(field.field_id)}
                onToggleEditable={() => onToggleEditable(field.field_id)}
              />
            </div>
          </div>
        ))}
      </SortableContext>
    </div>
  );
}

function DrawerSectionBlock({
  section,
  onRename,
  onDelete,
  onToggleVisible,
  onToggleEditable,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  section: DrawerSection;
  onRename: (name: string) => void;
  onDelete: () => void;
  onToggleVisible: (fieldId: string) => void;
  onToggleEditable: (fieldId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(section.name);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        {editing ? (
          <Input
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={() => { onRename(nameValue); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onRename(nameValue); setEditing(false); } }}
            className="h-8 w-64"
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold">{section.name}</span>
        )}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst} onClick={onMoveUp}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLast} onClick={onMoveDown}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setNameValue(section.name); setEditing(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      <DroppableFieldList
        containerId={section.id}
        fields={section.fields}
        onToggleVisible={onToggleVisible}
        onToggleEditable={onToggleEditable}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModuleDisplayConfigEditPage() {
  const { moduleId, configId } = useParams<{ moduleId: string; configId: string }>();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { data: configRecord, isLoading: configLoading } = useModuleDisplayConfig(configId);
  const { data: clientModule, isLoading: moduleLoading } = useClientModule(moduleId);
  const updateConfig = useUpdateDisplayConfig();

  const moduleSlug = clientModule?.module_slug ?? '';
  const definition = getModuleDisplayDefinition(moduleSlug);
  const fields = definition?.fields ?? [];
  const tabs = definition?.tabs ?? [];

  const [localConfig, setLocalConfig] = useState<DisplayConfigData>({});
  const initialised = useRef(false);

  useEffect(() => {
    if (configRecord && moduleSlug && !initialised.current) {
      setLocalConfig(mergeWithDefaults(configRecord.config, moduleSlug));
      initialised.current = true;
    }
  }, [configRecord, moduleSlug]);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistConfig = useCallback(
    (next: DisplayConfigData) => {
      if (!configId) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        updateConfig.mutate({ id: configId, config: next as unknown as Record<string, unknown> });
      }, 400);
    },
    [configId, updateConfig],
  );

  const update = useCallback(
    (patch: Partial<DisplayConfigData>) => {
      setLocalConfig((prev) => {
        const next = { ...prev, ...patch };
        persistConfig(next);
        return next;
      });
    },
    [persistConfig],
  );

  // ------ Views ------
  const toggleView = (view: 'list' | 'tree' | 'canvas') => {
    const views = (localConfig.available_views ?? []).includes(view)
      ? (localConfig.available_views ?? []).filter((v) => v !== view)
      : [...(localConfig.available_views ?? []), view];
    if (views.length === 0) return;
    let defaultView = localConfig.default_view ?? views[0];
    if (!views.includes(defaultView)) defaultView = views[0];
    update({ available_views: views, default_view: defaultView });
  };

  // ------ List columns ------
  const toggleColumnVisibility = (fieldId: string) => {
    const cols = (localConfig.list_columns ?? []).map((col) =>
      col.field_id === fieldId ? { ...col, visible: !col.visible } : col,
    );
    update({ list_columns: cols });
  };

  const reorderColumns = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const cols = localConfig.list_columns ?? [];
    const oldIndex = cols.findIndex((c) => c.field_id === active.id);
    const newIndex = cols.findIndex((c) => c.field_id === over.id);
    update({ list_columns: arrayMove(cols, oldIndex, newIndex) });
  };

  // ------ Filters ------
  const toggleFilter = (fieldId: string) => {
    const currentFilters = localConfig.filters ?? [];
    const exists = currentFilters.some((f) => f.field_id === fieldId);
    const filters = exists
      ? currentFilters.filter((f) => f.field_id !== fieldId)
      : [...currentFilters, { field_id: fieldId, field_name: fields.find((f) => f.id === fieldId)!.name }];
    update({ filters });
  };

  const reorderFilters = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const f = localConfig.filters ?? [];
    const oldIndex = f.findIndex((fi) => fi.field_id === active.id);
    const newIndex = f.findIndex((fi) => fi.field_id === over.id);
    update({ filters: arrayMove(f, oldIndex, newIndex) });
  };

  // ------ Prefilters ------
  const addPrefilter = () => {
    const first = fields[0];
    if (!first) return;
    update({
      prefilters: [
        ...(localConfig.prefilters ?? []),
        { field_id: first.id, field_name: first.name, operator: 'equals' as const, value: '', is_user_editable: false },
      ],
    });
  };

  const updatePrefilter = (index: number, patch: Partial<Prefilter>) => {
    const prefilters = (localConfig.prefilters ?? []).map((pf, i) => (i === index ? { ...pf, ...patch } : pf));
    update({ prefilters });
  };

  const removePrefilter = (index: number) => {
    update({ prefilters: (localConfig.prefilters ?? []).filter((_, i) => i !== index) });
  };

  // ------ Drawer (new structure) ------
  const [drawerPreviewOpen, setDrawerPreviewOpen] = useState(false);
  const [activeDragField, setActiveDragField] = useState<DrawerField | null>(null);
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(new Set());

  const toggleUnassignedSelection = useCallback((fieldId: string) => {
    setSelectedUnassigned((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }, []);

  const moveSelectedToSection = useCallback((sectionId: string) => {
    const fieldsToMove = (localConfig.drawer_unassigned_fields ?? []).filter((f) => selectedUnassigned.has(f.field_id));
    if (fieldsToMove.length === 0) return;

    const newUnassigned = (localConfig.drawer_unassigned_fields ?? []).filter((f) => !selectedUnassigned.has(f.field_id));
    const newSections = (localConfig.drawer_sections ?? []).map((s) =>
      s.id === sectionId ? { ...s, fields: [...s.fields, ...fieldsToMove] } : s,
    );

    update({ drawer_sections: newSections, drawer_unassigned_fields: newUnassigned });
    setSelectedUnassigned(new Set());
  }, [localConfig, selectedUnassigned, update]);

  const toggleSystemFieldVisible = (fieldId: string) => {
    const fields = (localConfig.drawer_system_fields ?? []).map((f) =>
      f.field_id === fieldId ? { ...f, visible: !f.visible, editable: !f.visible ? f.editable : false } : f,
    );
    update({ drawer_system_fields: fields });
  };

  const toggleSystemFieldEditable = (fieldId: string) => {
    const fields = (localConfig.drawer_system_fields ?? []).map((f) =>
      f.field_id === fieldId ? { ...f, editable: !f.editable } : f,
    );
    update({ drawer_system_fields: fields });
  };

  const addDrawerSection = () => {
    const sections = [...(localConfig.drawer_sections ?? [])];
    sections.push({ id: crypto.randomUUID(), name: 'Nouvelle section', fields: [] });
    update({ drawer_sections: sections });
  };

  const renameDrawerSection = (sectionId: string, name: string) => {
    const sections = (localConfig.drawer_sections ?? []).map((s) =>
      s.id === sectionId ? { ...s, name } : s,
    );
    update({ drawer_sections: sections });
  };

  const deleteDrawerSection = (sectionId: string) => {
    const section = (localConfig.drawer_sections ?? []).find((s) => s.id === sectionId);
    const freedFields = section?.fields ?? [];
    const sections = (localConfig.drawer_sections ?? []).filter((s) => s.id !== sectionId);
    const unassigned = [...(localConfig.drawer_unassigned_fields ?? []), ...freedFields];
    update({ drawer_sections: sections, drawer_unassigned_fields: unassigned });
  };

  const toggleDrawerFieldVisible = (fieldId: string, container: string) => {
    if (container === 'unassigned') {
      const fields = (localConfig.drawer_unassigned_fields ?? []).map((f) =>
        f.field_id === fieldId ? { ...f, visible: !f.visible, editable: !f.visible ? f.editable : false } : f,
      );
      update({ drawer_unassigned_fields: fields });
    } else {
      const sections = (localConfig.drawer_sections ?? []).map((s) =>
        s.id === container
          ? { ...s, fields: s.fields.map((f) => f.field_id === fieldId ? { ...f, visible: !f.visible, editable: !f.visible ? f.editable : false } : f) }
          : s,
      );
      update({ drawer_sections: sections });
    }
  };

  const toggleDrawerFieldEditable = (fieldId: string, container: string) => {
    if (container === 'unassigned') {
      const fields = (localConfig.drawer_unassigned_fields ?? []).map((f) =>
        f.field_id === fieldId ? { ...f, editable: !f.editable } : f,
      );
      update({ drawer_unassigned_fields: fields });
    } else {
      const sections = (localConfig.drawer_sections ?? []).map((s) =>
        s.id === container
          ? { ...s, fields: s.fields.map((f) => f.field_id === fieldId ? { ...f, editable: !f.editable } : f) }
          : s,
      );
      update({ drawer_sections: sections });
    }
  };

  // Find which container a field belongs to
  const findFieldContainer = (fieldId: string): { container: string; index: number } | null => {
    const sections = localConfig.drawer_sections ?? [];
    for (const section of sections) {
      const idx = section.fields.findIndex((f) => f.field_id === fieldId);
      if (idx !== -1) return { container: section.id, index: idx };
    }
    const unIdx = (localConfig.drawer_unassigned_fields ?? []).findIndex((f) => f.field_id === fieldId);
    if (unIdx !== -1) return { container: 'unassigned', index: unIdx };
    return null;
  };

  const handleDrawerDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const fieldId = active.id as string;
    // Find the field in sections or unassigned
    const sections = localConfig.drawer_sections ?? [];
    for (const section of sections) {
      const field = section.fields.find((f) => f.field_id === fieldId);
      if (field) { setActiveDragField(field); return; }
    }
    const unField = (localConfig.drawer_unassigned_fields ?? []).find((f) => f.field_id === fieldId);
    if (unField) setActiveDragField(unField);
  };

  const handleDrawerDragEnd = (event: DragEndEvent) => {
    setActiveDragField(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine source container
    const source = findFieldContainer(activeId);
    if (!source) return;

    // Determine target container: either the overId IS a container, or the field's container
    let targetContainer: string;
    let targetIndex: number;

    // Check if overId is a section ID or 'unassigned' (droppable zone)
    const isDroppableZone = overId === 'unassigned' || (localConfig.drawer_sections ?? []).some((s) => s.id === overId);

    if (isDroppableZone) {
      targetContainer = overId;
      // Append at end
      if (targetContainer === 'unassigned') {
        targetIndex = (localConfig.drawer_unassigned_fields ?? []).length;
      } else {
        const section = (localConfig.drawer_sections ?? []).find((s) => s.id === targetContainer);
        targetIndex = section ? section.fields.length : 0;
      }
    } else {
      // overId is a field — find its container
      const target = findFieldContainer(overId);
      if (!target) return;
      targetContainer = target.container;
      targetIndex = target.index;
    }

    // Same container reorder
    if (source.container === targetContainer) {
      if (activeId === overId) return;
      if (source.container === 'unassigned') {
        const fields = [...(localConfig.drawer_unassigned_fields ?? [])];
        update({ drawer_unassigned_fields: arrayMove(fields, source.index, targetIndex) });
      } else {
        const sections = (localConfig.drawer_sections ?? []).map((s) => {
          if (s.id !== source.container) return s;
          return { ...s, fields: arrayMove([...s.fields], source.index, targetIndex) };
        });
        update({ drawer_sections: sections });
      }
      return;
    }

    // Cross-container move
    // Remove from source
    let movedField: DrawerField | undefined;
    let newSections = [...(localConfig.drawer_sections ?? [])];
    let newUnassigned = [...(localConfig.drawer_unassigned_fields ?? [])];

    if (source.container === 'unassigned') {
      movedField = newUnassigned[source.index];
      newUnassigned = newUnassigned.filter((_, i) => i !== source.index);
    } else {
      newSections = newSections.map((s) => {
        if (s.id !== source.container) return s;
        movedField = s.fields[source.index];
        return { ...s, fields: s.fields.filter((_, i) => i !== source.index) };
      });
    }

    if (!movedField) return;

    // Add to target
    if (targetContainer === 'unassigned') {
      newUnassigned.splice(targetIndex, 0, movedField);
    } else {
      newSections = newSections.map((s) => {
        if (s.id !== targetContainer) return s;
        const fields = [...s.fields];
        fields.splice(targetIndex, 0, movedField!);
        return { ...s, fields };
      });
    }

    update({ drawer_sections: newSections, drawer_unassigned_fields: newUnassigned });
  };

  const moveSectionUp = (sectionId: string) => {
    const sections = [...(localConfig.drawer_sections ?? [])];
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx <= 0) return;
    update({ drawer_sections: arrayMove(sections, idx, idx - 1) });
  };

  const moveSectionDown = (sectionId: string) => {
    const sections = [...(localConfig.drawer_sections ?? [])];
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1 || idx >= sections.length - 1) return;
    update({ drawer_sections: arrayMove(sections, idx, idx + 1) });
  };

  // ------ Anonymization ------
  const toggleAnonymization = (field: UserAnonymizableField) => {
    const current = localConfig.anonymization ?? [];
    const exists = current.some((a) => a.field === field);
    const anonymization = exists
      ? current.filter((a) => a.field !== field)
      : [...current, { field }];
    update({ anonymization });
  };

  // ------ Gestionnaire (collecte_valeur) ------
  const updateGestionnaire = (patch: Partial<GestionnaireConfig>) => {
    const gestionnaire = { ...(localConfig.gestionnaire ?? {} as GestionnaireConfig), ...patch };
    update({ gestionnaire });
  };

  // ------ Repondant (collecte_valeur) ------
  const updateRepondant = (patch: Partial<RepondantConfig>) => {
    const repondant = { ...(localConfig.repondant ?? {} as RepondantConfig), ...patch };
    update({ repondant });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ------ Config name ------
  const [configName, setConfigName] = useState(configRecord?.name || '');
  useEffect(() => {
    if (configRecord) setConfigName(configRecord.name);
  }, [configRecord]);

  const saveConfigName = useCallback(() => {
    if (!configId || !configName.trim() || configName === configRecord?.name) return;
    updateConfig.mutate({ id: configId, name: configName.trim() });
  }, [configId, configName, configRecord?.name, updateConfig]);

  // ------ Derived: non-filter fields (for adding) ------
  const enabledFilterIds = new Set((localConfig.filters ?? []).map((f) => f.field_id));
  const availableFilterFields = fields.filter((f) => !enabledFilterIds.has(f.id));

  // ------ Render ------

  if (configLoading || moduleLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!configRecord || !definition) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Configuration introuvable.</p>
      </div>
    );
  }

  const defaultTab = tabs[0] ?? 'columns';

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={configRecord.name}
        description="Configuration de l'affichage"
        backAction={{ onClick: () => navigate(cp(`/modules/${moduleId}/display`)) }}
      >
        {updateConfig.isPending && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement...
          </span>
        )}
      </PageHeader>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab: Général */}
        {tabs.includes('general') && (
          <TabsContent value="general" className="space-y-6 pt-4">
            <div className="space-y-2 max-w-md">
              <Label className="text-base font-medium">Nom de la page (utilisateur final)</Label>
              <p className="text-sm text-muted-foreground">
                Ce nom sera affiché comme titre de la page pour les utilisateurs finaux.
              </p>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                onBlur={saveConfigName}
                placeholder="Nom de la configuration"
              />
            </div>
          </TabsContent>
        )}

        {/* Tab: Vues */}
        {tabs.includes('views') && (
          <TabsContent value="views" className="space-y-6 pt-4">
            <div className="space-y-4">
              <Label className="text-base font-medium">Vues disponibles</Label>
              <div className="space-y-3">
                {(definition.availableViews ?? []).map((view) => (
                  <label key={view} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={(localConfig.available_views ?? []).includes(view)}
                      onCheckedChange={() => toggleView(view)}
                    />
                    <span className="text-sm">{VIEW_LABELS[view]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Vue par défaut</Label>
              <Select
                value={localConfig.default_view}
                onValueChange={(v) => update({ default_view: v as 'list' | 'tree' | 'canvas' })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(localConfig.available_views ?? []).map((view) => (
                    <SelectItem key={view} value={view}>
                      {VIEW_LABELS[view]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        )}

        {/* Tab: Colonnes */}
        {tabs.includes('columns') && (
          <TabsContent value="columns" className="pt-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderColumns}>
              <SortableContext items={(localConfig.list_columns ?? []).map((c) => c.field_id)} strategy={verticalListSortingStrategy}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]" />
                      <TableHead>Champ</TableHead>
                      <TableHead className="text-right">Visible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(localConfig.list_columns ?? []).map((col) => (
                      <SortableColumnRow
                        key={col.field_id}
                        column={col}
                        onToggleVisibility={() => toggleColumnVisibility(col.field_id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          </TabsContent>
        )}

        {/* Tab: Drawer */}
        {tabs.includes('drawer') && (
          <TabsContent value="drawer" className="pt-4 space-y-6">
            {/* Preview button */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDrawerPreviewOpen(true)}>
                Prévisualiser le drawer <Eye className="h-4 w-4" />
              </Button>
            </div>

            {/* System fields */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Champs système</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Champ</TableHead>
                    <TableHead className="text-center w-[100px]">Visible</TableHead>
                    <TableHead className="text-center w-[100px]">Éditable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(localConfig.drawer_system_fields ?? []).map((field) => {
                    const isLocked = ['name', 'parent', 'level'].includes(field.field_id);
                    return (
                      <TableRow key={field.field_id}>
                        <TableCell className="font-medium">
                          {field.field_name}
                          {field.field_id === 'level' && (
                            <span className="ml-2 text-xs text-muted-foreground">(lecture seule)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {isLocked ? (
                              <Switch checked disabled />
                            ) : (
                              <Switch checked={field.visible} onCheckedChange={() => toggleSystemFieldVisible(field.field_id)} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {isLocked ? (
                              <Switch checked disabled />
                            ) : (
                              <Switch checked={field.editable} disabled={!field.visible} onCheckedChange={() => toggleSystemFieldEditable(field.field_id)} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Separator />

            {/* Sections header + add button */}
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Sections</Label>
              <Button variant="outline" size="sm" onClick={addDrawerSection}>
                Ajouter une section <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Sections + Unassigned — all in one DndContext for cross-container drag */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDrawerDragStart}
              onDragEnd={handleDrawerDragEnd}
            >
              {(localConfig.drawer_sections ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune section. Ajoutez-en une pour organiser vos champs.</p>
              )}

              {/* Section reordering is handled via up/down buttons */}
              {(localConfig.drawer_sections ?? []).map((section, idx, arr) => (
                <DrawerSectionBlock
                  key={section.id}
                  section={section}
                  onRename={(name) => renameDrawerSection(section.id, name)}
                  onDelete={() => deleteDrawerSection(section.id)}
                  onToggleVisible={(fieldId) => toggleDrawerFieldVisible(fieldId, section.id)}
                  onToggleEditable={(fieldId) => toggleDrawerFieldEditable(fieldId, section.id)}
                  onMoveUp={() => moveSectionUp(section.id)}
                  onMoveDown={() => moveSectionDown(section.id)}
                  isFirst={idx === 0}
                  isLast={idx === arr.length - 1}
                />
              ))}

              <Separator />

              {/* Unassigned fields with multi-select */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">Non classés</Label>
                  <div className="flex items-center gap-2">
                    {selectedUnassigned.size > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">{selectedUnassigned.size} sélectionné{selectedUnassigned.size > 1 ? 's' : ''}</span>
                        <Select
                          value=""
                          onValueChange={(sectionId) => {
                            moveSelectedToSection(sectionId);
                          }}
                        >
                          <SelectTrigger className="w-[200px] h-8 text-xs">
                            <SelectValue placeholder="Déplacer vers..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(localConfig.drawer_sections ?? []).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>
                <DroppableFieldList
                  containerId="unassigned"
                  fields={localConfig.drawer_unassigned_fields ?? []}
                  onToggleVisible={(fieldId) => toggleDrawerFieldVisible(fieldId, 'unassigned')}
                  onToggleEditable={(fieldId) => toggleDrawerFieldEditable(fieldId, 'unassigned')}
                  selectable
                  selectedIds={selectedUnassigned}
                  onToggleSelect={toggleUnassignedSelection}
                />
              </div>

              <DragOverlay>
                {activeDragField ? (
                  <div className="flex items-center gap-3 rounded border bg-background p-2 shadow-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{activeDragField.field_name}</span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Drawer preview — uses same components as real FO EntityDetailsDrawer */}
            <DetailsDrawer
              open={drawerPreviewOpen}
              onOpenChange={setDrawerPreviewOpen}
              contentClassName="overflow-y-auto p-0"
              showClose={false}
            >
              {/* Header — exact same structure as EntityInfoSection */}
              <div className="px-6 pt-6 pb-0">
                <SheetHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-xl font-semibold">Entité exemple</SheetTitle>
                      <StatusChip status="actif" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" disabled>
                        Archiver <Archive className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="h-10" disabled>
                        Exporter <Download className="h-4 w-4" />
                      </Button>
                      <button
                        className="rounded-sm opacity-70 hover:opacity-100"
                        onClick={() => setDrawerPreviewOpen(false)}
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1 flex-wrap text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Groupe parent</span>
                      <span className="text-muted-foreground/50">/</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Sous-groupe</span>
                      <span className="text-muted-foreground/50">/</span>
                    </span>
                    <span className="font-medium text-foreground">Entité exemple</span>
                  </div>
                </SheetHeader>
              </div>

              {/* Children section */}
              <div className="px-6 mt-3 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Enfants (3)
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {['Service RH', 'Service Finance', 'Service IT'].map((name) => (
                      <Button key={name} variant="ghost" className="justify-start gap-2 px-2 py-1.5 h-auto text-sm" disabled>
                        <span className="h-2 w-2 rounded-full shrink-0 bg-emerald-500" />
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggle actif/inactif — exact same as real drawer */}
              {(localConfig.drawer_system_fields ?? []).find((f) => f.field_id === 'is_active')?.visible && (
                <div className="px-6 mt-4">
                  <div className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 bg-gray-50">
                    <Switch checked disabled />
                    <div>
                      <p className="text-sm font-medium">Entité active</p>
                      <p className="text-xs text-muted-foreground">Désactivez pour masquer l&apos;entité</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs — exact same as real drawer */}
              <Tabs defaultValue="attributs" className="mt-4">
                <div className="px-6">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="attributs">Attributs</TabsTrigger>
                    <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
                    <TabsTrigger value="historique">Historique</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="attributs" className="px-6 py-4 space-y-5 mt-0">
                  {/* Parent field — FloatingLabelSelect style */}
                  {(localConfig.drawer_system_fields ?? []).find((f) => f.field_id === 'parent')?.visible && (
                    <fieldset className="relative rounded-md border px-3 pb-2 pt-1">
                      <legend className="px-1 text-xs text-muted-foreground">Entité parente</legend>
                      <div className="flex items-center justify-between text-sm py-1">
                        <span className="text-muted-foreground">Sous-groupe</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </fieldset>
                  )}

                  {/* Name field — FloatingLabelField style */}
                  {(localConfig.drawer_system_fields ?? []).find((f) => f.field_id === 'name')?.visible && (
                    <fieldset className="relative rounded-md border px-3 pb-2 pt-1">
                      <legend className="px-1 text-xs text-muted-foreground">Nom</legend>
                      <p className="text-sm py-1">Entité exemple</p>
                    </fieldset>
                  )}

                  {/* Sections with custom fields */}
                  {(localConfig.drawer_sections ?? []).map((section) => {
                    const visibleFields = section.fields.filter((f) => f.visible);
                    if (visibleFields.length === 0) return null;
                    return (
                      <div key={section.id} className="space-y-5">
                        <div className="flex items-center gap-2 pt-2">
                          <Separator className="flex-1" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.name}</span>
                              <Separator className="flex-1" />
                            </div>
                            {visibleFields.map((field) => (
                              <fieldset key={field.field_id} className="relative rounded-md border px-3 pb-2 pt-1">
                                <legend className="px-1 text-xs text-muted-foreground">{field.field_name}</legend>
                                {field.editable ? (
                                  <p className="text-sm py-1 text-muted-foreground">—</p>
                                ) : (
                                  <p className="text-sm py-1 text-muted-foreground italic">Lecture seule</p>
                                )}
                              </fieldset>
                            ))}
                          </div>
                        );
                      })}

                  {/* Unassigned visible fields */}
                  {(() => {
                    const visibleUnassigned = (localConfig.drawer_unassigned_fields ?? []).filter((f) => f.visible);
                    if (visibleUnassigned.length === 0) return null;
                    return visibleUnassigned.map((field) => (
                      <fieldset key={field.field_id} className="relative rounded-md border px-3 pb-2 pt-1">
                        <legend className="px-1 text-xs text-muted-foreground">{field.field_name}</legend>
                        {field.editable ? (
                          <p className="text-sm py-1 text-muted-foreground">—</p>
                        ) : (
                          <p className="text-sm py-1 text-muted-foreground italic">Lecture seule</p>
                        )}
                      </fieldset>
                    ));
                  })()}

                  {/* Metadata footer — same as real drawer */}
                  <div className="pt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Créé le 19 mars 2026</span>
                    <span>Modifié le 19 mars 2026</span>
                  </div>
                </TabsContent>

                <TabsContent value="utilisateurs" className="px-6 py-4 mt-0">
                  <EmptyState icon={UsersIcon} title="Gestion des utilisateurs à venir" />
                </TabsContent>

                <TabsContent value="historique" className="px-6 py-4 mt-0">
                  <p className="text-sm text-muted-foreground text-center py-8">Historique des modifications</p>
                </TabsContent>
              </Tabs>
            </DetailsDrawer>
          </TabsContent>
        )}

        {/* Tab: Filtres */}
        {tabs.includes('filters') && (
          <TabsContent value="filters" className="pt-4 space-y-6">
            {(localConfig.filters ?? []).length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderFilters}>
                <SortableContext items={(localConfig.filters ?? []).map((f) => f.field_id)} strategy={verticalListSortingStrategy}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]" />
                        <TableHead>Champ</TableHead>
                        <TableHead className="text-right">Filtrable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(localConfig.filters ?? []).map((filter) => (
                        <SortableFilterRow
                          key={filter.field_id}
                          filter={filter}
                          onRemove={() => toggleFilter(filter.field_id)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </SortableContext>
              </DndContext>
            )}
            {availableFilterFields.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Champ</TableHead>
                    <TableHead className="text-right">Filtrable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableFilterFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="w-[40px]" />
                      <TableCell className="font-medium text-muted-foreground">{field.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Switch checked={false} onCheckedChange={() => toggleFilter(field.id)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        )}

        {/* Tab: Pré-filtres */}
        {tabs.includes('prefilters') && (
          <TabsContent value="prefilters" className="pt-4">
            <div className="flex justify-end mb-4">
              <Button size="sm" variant="outline" onClick={addPrefilter}>
                Ajouter un pré-filtre <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(localConfig.prefilters ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucun pré-filtre configuré.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Champ</TableHead>
                    <TableHead>Opérateur</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead className="text-center">Modifiable</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(localConfig.prefilters ?? []).map((pf, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={pf.field_id}
                          onValueChange={(v) => {
                            const field = fields.find((f) => f.id === v)!;
                            updatePrefilter(idx, { field_id: v, field_name: field.name });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={pf.operator}
                          onValueChange={(v) => updatePrefilter(idx, { operator: v as Prefilter['operator'] })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {pf.operator !== 'is_empty' && pf.operator !== 'is_not_empty' ? (
                          <Input
                            value={pf.value ?? ''}
                            onChange={(e) => updatePrefilter(idx, { value: e.target.value })}
                            placeholder="Valeur"
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={pf.is_user_editable}
                            onCheckedChange={(checked) => updatePrefilter(idx, { is_user_editable: checked })}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removePrefilter(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        )}

        {/* Tab: Anonymisation (user module) */}
        {tabs.includes('anonymization') && (
          <TabsContent value="anonymization" className="pt-4">
            <div className="space-y-1 mb-6">
              <Label className="text-base font-medium">Champs anonymisés</Label>
              <p className="text-sm text-muted-foreground">
                Les champs anonymisés s'afficheront en *** pour les utilisateurs finaux.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Champ</TableHead>
                  <TableHead className="text-right">Anonymisé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ANONYMIZABLE_FIELDS.map(({ field, label }) => (
                  <TableRow key={field}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Switch
                          checked={(localConfig.anonymization ?? []).some((a) => a.field === field)}
                          onCheckedChange={() => toggleAnonymization(field)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        )}

        {/* Tab: Vue gestionnaire (collecte_valeur) */}
        {tabs.includes('gestionnaire') && (
          <TabsContent value="gestionnaire" className="pt-4">
            <div className="space-y-1 mb-6">
              <Label className="text-base font-medium">Vue gestionnaire</Label>
              <p className="text-sm text-muted-foreground">
                Options d'affichage pour les utilisateurs qui gèrent les campagnes.
              </p>
            </div>
            <div className="space-y-4 max-w-lg">
              <SwitchRow
                label="Afficher toutes les campagnes"
                checked={localConfig.gestionnaire?.show_all_surveys ?? true}
                onCheckedChange={(v) => updateGestionnaire({ show_all_surveys: v })}
              />
              <SwitchRow
                label="Afficher uniquement mes campagnes"
                checked={localConfig.gestionnaire?.show_my_surveys ?? true}
                onCheckedChange={(v) => updateGestionnaire({ show_my_surveys: v })}
              />
              <Separator />
              <SwitchRow
                label="Regrouper par statut"
                checked={localConfig.gestionnaire?.group_by_status ?? false}
                onCheckedChange={(v) => updateGestionnaire({ group_by_status: v })}
              />
              <SwitchRow
                label="Validation multi-étapes"
                checked={localConfig.gestionnaire?.enable_validation_workflow ?? false}
                onCheckedChange={(v) => updateGestionnaire({ enable_validation_workflow: v })}
              />
              <Separator />
              <SwitchRow
                label="Affichage pleine page"
                checked={localConfig.gestionnaire?.full_page ?? false}
                onCheckedChange={(v) => updateGestionnaire({ full_page: v })}
              />
            </div>
          </TabsContent>
        )}

        {/* Tab: Vue répondant (collecte_valeur) */}
        {tabs.includes('repondant') && (
          <TabsContent value="repondant" className="pt-4">
            <div className="space-y-1 mb-6">
              <Label className="text-base font-medium">Vue répondant</Label>
              <p className="text-sm text-muted-foreground">
                Options d'affichage pour les utilisateurs qui répondent aux questionnaires.
              </p>
            </div>
            <div className="space-y-4 max-w-lg">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Statuts visibles</Label>
              <SwitchRow
                label="Réponses en attente"
                checked={localConfig.repondant?.show_pending ?? true}
                onCheckedChange={(v) => updateRepondant({ show_pending: v })}
              />
              <SwitchRow
                label="Réponses soumises"
                checked={localConfig.repondant?.show_submitted ?? false}
                onCheckedChange={(v) => updateRepondant({ show_submitted: v })}
              />
              <SwitchRow
                label="Réponses validées"
                checked={localConfig.repondant?.show_validated ?? false}
                onCheckedChange={(v) => updateRepondant({ show_validated: v })}
              />
              <SwitchRow
                label="Réponses rejetées"
                checked={localConfig.repondant?.show_rejected ?? true}
                onCheckedChange={(v) => updateRepondant({ show_rejected: v })}
              />
              <Separator />
              <Label className="text-xs font-medium text-muted-foreground uppercase">Affichage</Label>
              <SwitchRow
                label="Regrouper par campagne"
                checked={localConfig.repondant?.group_by_campaign ?? false}
                onCheckedChange={(v) => updateRepondant({ group_by_campaign: v })}
              />
              <SwitchRow
                label="Afficher la date limite"
                checked={localConfig.repondant?.show_deadline ?? true}
                onCheckedChange={(v) => updateRepondant({ show_deadline: v })}
              />
              <SwitchRow
                label="Afficher la progression"
                checked={localConfig.repondant?.show_progress ?? true}
                onCheckedChange={(v) => updateRepondant({ show_progress: v })}
              />
              <Separator />
              <Label className="text-xs font-medium text-muted-foreground uppercase">Fonctionnalités</Label>
              <SwitchRow
                label="Sauvegarde en brouillon"
                checked={localConfig.repondant?.allow_draft ?? true}
                onCheckedChange={(v) => updateRepondant({ allow_draft: v })}
              />
              <SwitchRow
                label="File de validation"
                checked={localConfig.repondant?.show_validation_queue ?? false}
                onCheckedChange={(v) => updateRepondant({ show_validation_queue: v })}
              />
              <SwitchRow
                label='Séparer "En cours" / "Terminées"'
                checked={localConfig.repondant?.enable_history ?? false}
                onCheckedChange={(v) => updateRepondant({ enable_history: v })}
              />
              <Separator />
              <SwitchRow
                label="Affichage pleine page"
                checked={localConfig.repondant?.full_page ?? false}
                onCheckedChange={(v) => updateRepondant({ full_page: v })}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
