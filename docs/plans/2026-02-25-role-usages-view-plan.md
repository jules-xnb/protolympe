# Vue centralisée des usages d'un rôle — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refondre la page `/dashboard/roles` en layout master-detail avec panneau gauche (catégories/rôles) et panneau droit (détail du rôle + tableau des usages avec options de blocs éditables en inline).

**Architecture:** La page `RolesPage.tsx` est restructurée en layout split. Un nouveau hook `useRoleUsages` agrège les données de `navigation_configs`, `view_configs`, et `nav_permissions` pour construire la liste des usages. Les options de bloc (eo_card, data_table, survey) sont éditables en ligne via des composants extraits du `BlockConfigPanel` existant.

**Tech Stack:** React 18, TypeScript, TanStack Query, Supabase, Shadcn/ui, Tailwind CSS, Lucide icons

**Design doc:** `docs/plans/2026-02-25-role-usages-view-design.md`

---

## Task 1 : Hook `useRoleUsages` — Données des usages

**Files:**
- Create: `src/hooks/useRoleUsages.ts`

**Contexte:** Ce hook est le cœur de la feature. Il doit récupérer toutes les vues de la plateforme avec leurs blocs, déterminer lesquelles sont accessibles au rôle sélectionné, et retourner une liste plate prête à afficher.

**Step 1: Créer le hook**

```typescript
// src/hooks/useRoleUsages.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useViewMode } from '@/contexts/ViewModeContext';
import type { BlockType, PageBlock } from '@/components/builder/page-builder/types';

export interface RoleUsageItem {
  id: string;                          // unique key (navConfigId + blockIndex)
  moduleName: string;                  // nom du module parent
  moduleId: string;                    // navigation_config parent id
  viewName: string;                    // nom de l'élément de navigation
  viewConfigId: string;                // view_configs.id
  navConfigId: string;                 // navigation_configs.id
  blockIndex: number;                  // index du bloc dans config.blocks[]
  blockType: BlockType;                // 'eo_card' | 'data_table' | 'survey_creator' | 'survey_responses'
  blockConfig: Record<string, any>;    // config du bloc (mutable)
  blockTitle: string | null;           // titre custom du bloc
  hasAccess: boolean;                  // le rôle a-t-il accès via nav_permissions ?
}

export function useRoleUsages(roleId: string | null) {
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id;

  return useQuery({
    queryKey: ['role-usages', roleId, clientId],
    enabled: !!roleId && !!clientId,
    queryFn: async (): Promise<RoleUsageItem[]> => {
      // 1. Fetch all navigation_configs for this client (with parent info)
      const { data: navConfigs } = await supabase
        .from('navigation_configs')
        .select('id, label, parent_id, view_config_id')
        .eq('client_id', clientId!)
        .eq('is_active', true);

      if (!navConfigs?.length) return [];

      // 2. Build a lookup: navConfigId → parent label
      const navLookup = new Map(navConfigs.map(n => [n.id, n]));
      const getModuleName = (navConfig: typeof navConfigs[0]): string => {
        if (navConfig.parent_id) {
          const parent = navLookup.get(navConfig.parent_id);
          return parent?.label || 'Sans module';
        }
        return navConfig.label;
      };

      // 3. Fetch view_configs for nav items that have a view
      const viewNavConfigs = navConfigs.filter(n => n.view_config_id);
      const viewConfigIds = [...new Set(viewNavConfigs.map(n => n.view_config_id!))];

      if (!viewConfigIds.length) return [];

      const { data: viewConfigs } = await supabase
        .from('view_configs')
        .select('id, config, type')
        .in('id', viewConfigIds);

      const viewConfigMap = new Map(viewConfigs?.map(v => [v.id, v]) || []);

      // 4. Fetch nav_permissions for this role
      const { data: navPerms } = await supabase
        .from('nav_permissions')
        .select('navigation_config_id, is_visible, role_id, category_id')
        .eq('role_id', roleId!);

      const permittedNavIds = new Set(
        (navPerms || [])
          .filter(p => p.is_visible !== false)
          .map(p => p.navigation_config_id)
      );

      // Also check parent permissions (inheritance)
      // If a parent has a permission for this role, children inherit it
      const hasAccessViaInheritance = (navConfigId: string): boolean => {
        if (permittedNavIds.has(navConfigId)) return true;
        const nav = navLookup.get(navConfigId);
        if (nav?.parent_id) return hasAccessViaInheritance(nav.parent_id);
        // If no nav_permissions exist at all → visible to all (default behavior)
        return (navPerms || []).length === 0 ||
          !(navPerms || []).some(p => p.navigation_config_id === navConfigId);
      };

      // 5. Build flat list of usages
      const usages: RoleUsageItem[] = [];

      for (const navConfig of viewNavConfigs) {
        const viewConfig = viewConfigMap.get(navConfig.view_config_id!);
        if (!viewConfig) continue;

        const config = viewConfig.config as any;
        const blocks: PageBlock[] = config?.blocks || [];

        if (blocks.length === 0) {
          // View without blocks (e.g. workflow, list) — skip or handle differently
          continue;
        }

        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          usages.push({
            id: `${navConfig.id}-${i}`,
            moduleName: getModuleName(navConfig),
            moduleId: navConfig.parent_id || navConfig.id,
            viewName: navConfig.label,
            viewConfigId: viewConfig.id,
            navConfigId: navConfig.id,
            blockIndex: i,
            blockType: block.type as BlockType,
            blockConfig: (block as any).config || {},
            blockTitle: (block as any).title || null,
            hasAccess: hasAccessViaInheritance(navConfig.id),
          });
        }
      }

      // Sort: by module name, then by view name
      usages.sort((a, b) =>
        a.moduleName.localeCompare(b.moduleName) || a.viewName.localeCompare(b.viewName)
      );

      return usages;
    },
  });
}
```

**Step 2: Vérifier que le hook compile**

Run: `npx tsc --noEmit src/hooks/useRoleUsages.ts` ou vérifier dans l'IDE qu'il n'y a pas d'erreurs TypeScript.

**Step 3: Commit**

```bash
git add src/hooks/useRoleUsages.ts
git commit -m "feat: add useRoleUsages hook for aggregating role usages across platform"
```

---

## Task 2 : Hook `useUpdateBlockConfig` — Sauvegarde des options de bloc

**Files:**
- Create: `src/hooks/useUpdateBlockConfig.ts`

**Contexte:** Ce hook permet de mettre à jour la config d'un bloc spécifique à l'intérieur du JSON `config.blocks[]` d'un `view_config`. Il effectue un merge partiel du config et sauvegarde en auto-save immédiat.

**Step 1: Créer le hook**

```typescript
// src/hooks/useUpdateBlockConfig.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateBlockConfigParams {
  viewConfigId: string;
  blockIndex: number;
  configUpdate: Record<string, any>;
}

export function useUpdateBlockConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ viewConfigId, blockIndex, configUpdate }: UpdateBlockConfigParams) => {
      // 1. Fetch current view_config
      const { data: viewConfig, error: fetchError } = await supabase
        .from('view_configs')
        .select('id, config')
        .eq('id', viewConfigId)
        .single();

      if (fetchError || !viewConfig) throw fetchError || new Error('View config not found');

      // 2. Deep clone and update the specific block's config
      const config = JSON.parse(JSON.stringify(viewConfig.config)) as any;
      const blocks = config.blocks || [];

      if (blockIndex < 0 || blockIndex >= blocks.length) {
        throw new Error(`Block index ${blockIndex} out of bounds`);
      }

      blocks[blockIndex].config = {
        ...blocks[blockIndex].config,
        ...configUpdate,
      };

      // 3. Save back
      const { error: updateError } = await supabase
        .from('view_configs')
        .update({ config, updated_at: new Date().toISOString() })
        .eq('id', viewConfigId);

      if (updateError) throw updateError;

      return { viewConfigId, blockIndex, config: blocks[blockIndex].config };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-usages'] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la sauvegarde', {
        description: error.message,
      });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/useUpdateBlockConfig.ts
git commit -m "feat: add useUpdateBlockConfig hook for inline block config editing"
```

---

## Task 3 : Composant `RoleSidebar` — Panneau gauche

**Files:**
- Create: `src/components/admin/roles/RoleSidebar.tsx`

**Contexte:** Remplace le tableau actuel par un panneau compact de type arbre : catégories dépliables → rôles en dessous. Recherche intégrée. Bouton "+ Rôle" en bas.

**Step 1: Créer le composant**

```typescript
// src/components/admin/roles/RoleSidebar.tsx
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  FolderTree,
} from 'lucide-react';
import type { RoleWithCategory } from '@/hooks/useRoles';
import type { RoleCategory } from '@/hooks/useRoleCategories';

interface RoleSidebarProps {
  roles: RoleWithCategory[];
  categories: RoleCategory[];
  selectedRoleId: string | null;
  onSelectRole: (role: RoleWithCategory) => void;
  onCreateRole: () => void;
  isLoading: boolean;
}

export function RoleSidebar({
  roles,
  categories,
  selectedRoleId,
  onSelectRole,
  onCreateRole,
  isLoading,
}: RoleSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map(c => c.id))
  );

  // Group roles by category
  const rolesByCategory = useMemo(() => {
    const grouped = new Map<string, RoleWithCategory[]>();
    for (const role of roles) {
      const catId = role.category_id || 'uncategorized';
      if (!grouped.has(catId)) grouped.set(catId, []);
      grouped.get(catId)!.push(role);
    }
    // Sort roles within each category
    for (const [, catRoles] of grouped) {
      catRoles.sort((a, b) => a.name.localeCompare(b.name));
    }
    return grouped;
  }, [roles]);

  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(cat => {
      if (cat.name.toLowerCase().includes(q)) return true;
      const catRoles = rolesByCategory.get(cat.id) || [];
      return catRoles.some(r => r.name.toLowerCase().includes(q));
    });
  }, [categories, searchQuery, rolesByCategory]);

  const getFilteredRoles = (categoryId: string) => {
    const catRoles = rolesByCategory.get(categoryId) || [];
    if (!searchQuery.trim()) return catRoles;
    const q = searchQuery.toLowerCase();
    // If category name matches, show all its roles
    const cat = categories.find(c => c.id === categoryId);
    if (cat?.name.toLowerCase().includes(q)) return catRoles;
    return catRoles.filter(r => r.name.toLowerCase().includes(q));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full border-r">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un rôle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Categories + Roles tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCategories.map(category => {
            const catRoles = getFilteredRoles(category.id);
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id}>
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <FolderTree className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{category.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {catRoles.length}
                  </span>
                </button>

                {/* Roles under category */}
                {isExpanded && catRoles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => onSelectRole(role)}
                    className={cn(
                      'flex items-center gap-2 w-full pl-9 pr-2 py-1.5 text-sm rounded-md transition-colors',
                      selectedRoleId === role.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted/50'
                    )}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: role.color || '#888' }}
                    />
                    <span className="truncate">{role.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Create button */}
      <div className="p-3 border-t">
        <Button onClick={onCreateRole} size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau rôle
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin/roles/RoleSidebar.tsx
git commit -m "feat: add RoleSidebar component for master-detail role selection"
```

---

## Task 4 : Composant `RoleDetailHeader` — En-tête du rôle sélectionné

**Files:**
- Create: `src/components/admin/roles/RoleDetailHeader.tsx`

**Contexte:** Affiche le nom, couleur, catégorie, description du rôle sélectionné, avec les actions Éditer et Archiver.

**Step 1: Créer le composant**

```typescript
// src/components/admin/roles/RoleDetailHeader.tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Archive, FolderTree } from 'lucide-react';
import type { RoleWithCategory } from '@/hooks/useRoles';

interface RoleDetailHeaderProps {
  role: RoleWithCategory;
  onEdit: () => void;
  onArchive: () => void;
}

export function RoleDetailHeader({ role, onEdit, onArchive }: RoleDetailHeaderProps) {
  return (
    <div className="flex items-start justify-between p-4 border-b">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: role.color || '#888' }}
          />
          <h2 className="text-lg font-semibold">{role.name}</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {role.role_categories && (
            <Badge variant="secondary" className="gap-1">
              <FolderTree className="h-3 w-3" />
              {role.role_categories.name}
            </Badge>
          )}
          {role.description && (
            <span className="text-muted-foreground">{role.description}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Button>
        <Button variant="outline" size="sm" onClick={onArchive}>
          <Archive className="h-4 w-4 mr-2" />
          Archiver
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin/roles/RoleDetailHeader.tsx
git commit -m "feat: add RoleDetailHeader component with role info and actions"
```

---

## Task 5 : Composant `EoCardInlineOptions` — Options inline pour le bloc Organisation

**Files:**
- Create: `src/components/admin/roles/block-options/EoCardInlineOptions.tsx`

**Contexte:** C'est le contenu de la ligne expandée pour un bloc `eo_card`. Il reprend les mêmes options que `BlockConfigPanel.renderEoCardConfig()` (lignes 518-809) mais dans un layout horizontal plus compact, adapté à une ligne de tableau expandée. Les modifications appellent `useUpdateBlockConfig`.

**Références clés à suivre :**
- `BlockConfigPanel.tsx:518-809` — structure des options eo_card
- `EoListColumnsConfigDialog` — dialog colonnes
- `EoFieldsVisibilityDialog` — dialog visibilité champs
- `EoFiltersConfigDialog` — dialog filtres
- `EoPreFiltersConfigDialog` — dialog pré-filtres

**Step 1: Créer le composant**

```typescript
// src/components/admin/roles/block-options/EoCardInlineOptions.tsx
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Settings2, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EoFieldsVisibilityDialog } from '@/components/builder/page-builder/EoFieldsVisibilityDialog';
import { EoListColumnsConfigDialog } from '@/components/builder/page-builder/EoListColumnsConfigDialog';
import { EoFiltersConfigDialog } from '@/components/builder/page-builder/EoFiltersConfigDialog';
import { EoPreFiltersConfigDialog } from '@/components/builder/page-builder/EoPreFiltersConfigDialog';
import { EO_FIELD_DEFINITIONS } from '@/components/builder/page-builder/types';
import type { EoCardBlock } from '@/components/builder/page-builder/types';
import { useUpdateBlockConfig } from '@/hooks/useUpdateBlockConfig';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';

interface EoCardInlineOptionsProps {
  viewConfigId: string;
  blockIndex: number;
  config: EoCardBlock['config'];
}

export function EoCardInlineOptions({
  viewConfigId,
  blockIndex,
  config,
}: EoCardInlineOptionsProps) {
  const { selectedClient } = useViewMode();
  const updateMutation = useUpdateBlockConfig();
  const { data: customEoFields = [] } = useEoFieldDefinitions(selectedClient?.id || null);
  const activeCustomFields = customEoFields.filter(f => f.is_active);

  // Dialog states
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [preFiltersDialogOpen, setPreFiltersDialogOpen] = useState(false);

  const updateConfig = (partial: Partial<EoCardBlock['config']>) => {
    updateMutation.mutate({
      viewConfigId,
      blockIndex,
      configUpdate: partial,
    });
  };

  const availableViews = config.available_views || ['list', 'tree', 'canvas'];

  const toggleView = (view: 'list' | 'tree' | 'canvas') => {
    const current = new Set(availableViews);
    if (current.has(view)) {
      if (current.size > 1) {
        current.delete(view);
        if (config.default_view === view) {
          const remaining = Array.from(current);
          updateConfig({ available_views: remaining as any, default_view: remaining[0] as any });
        } else {
          updateConfig({ available_views: Array.from(current) as any });
        }
      }
    } else {
      current.add(view);
      updateConfig({ available_views: Array.from(current) as any });
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-b-lg">

        {/* Modes de vue */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Modes de vue
          </Label>
          <div className="space-y-2">
            {(['list', 'tree', 'canvas'] as const).map(view => (
              <div key={view} className="flex items-center gap-2">
                <Checkbox
                  checked={availableViews.includes(view)}
                  onCheckedChange={() => toggleView(view)}
                />
                <span className="text-sm">
                  {view === 'list' ? 'Liste' : view === 'tree' ? 'Arbre' : 'Canvas'}
                </span>
                {config.default_view === view && (
                  <Badge variant="secondary" className="text-[10px]">Défaut</Badge>
                )}
              </div>
            ))}
          </div>
          {availableViews.length > 1 && (
            <Select
              value={config.default_view || 'list'}
              onValueChange={(value) => updateConfig({ default_view: value as any })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Vue par défaut" />
              </SelectTrigger>
              <SelectContent>
                {availableViews.map(v => (
                  <SelectItem key={v} value={v!}>
                    {v === 'list' ? 'Liste' : v === 'tree' ? 'Arbre' : 'Canvas'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Fonctionnalités */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Fonctionnalités
          </Label>
          {([
            { key: 'enable_create', label: 'Création' },
            { key: 'enable_import', label: 'Import' },
            { key: 'enable_export', label: 'Export' },
            { key: 'enable_history', label: 'Historique' },
            { key: 'enable_search', label: 'Recherche' },
            { key: 'enable_filters', label: 'Filtres' },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-sm font-normal">{label}</Label>
              <Switch
                checked={(config as any)[key] ?? false}
                onCheckedChange={(checked) => updateConfig({ [key]: checked })}
              />
            </div>
          ))}
        </div>

        {/* Personnalisation + Liens config */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Personnalisation utilisateur
          </Label>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Config colonnes</Label>
            <Switch
              checked={config.allow_user_column_config ?? false}
              onCheckedChange={(checked) => updateConfig({ allow_user_column_config: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Gestion champs</Label>
            <Switch
              checked={config.allow_user_field_management ?? false}
              onCheckedChange={(checked) => updateConfig({ allow_user_field_management: checked })}
            />
          </div>

          <Separator />

          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Configuration avancée
          </Label>
          <div className="space-y-2">
            <Button
              variant="outline" size="sm" className="w-full justify-between"
              onClick={() => setColumnsDialogOpen(true)}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" />
                Colonnes
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {(config.list_columns || []).length || 'Défaut'}
              </Badge>
            </Button>
            <Button
              variant="outline" size="sm" className="w-full justify-between"
              onClick={() => setFieldsDialogOpen(true)}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5" />
                Visibilité champs
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {(config.field_visibility || []).filter(f => f.visible !== false).length}/{EO_FIELD_DEFINITIONS.length + activeCustomFields.length}
              </Badge>
            </Button>
            <Button
              variant="outline" size="sm" className="w-full justify-between"
              onClick={() => setFiltersDialogOpen(true)}
            >
              <span className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                Filtres
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {(config.filters || []).length}
              </Badge>
            </Button>
            <Button
              variant="outline" size="sm" className="w-full justify-between"
              onClick={() => setPreFiltersDialogOpen(true)}
            >
              <span className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                Pré-filtres
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {(config.prefilters || []).length}
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs existants réutilisés */}
      <EoListColumnsConfigDialog
        open={columnsDialogOpen}
        onOpenChange={setColumnsDialogOpen}
        columns={config.list_columns || []}
        customFields={activeCustomFields}
        onSave={(list_columns) => updateConfig({ list_columns })}
      />
      <EoFieldsVisibilityDialog
        open={fieldsDialogOpen}
        onOpenChange={setFieldsDialogOpen}
        fieldVisibility={config.field_visibility || []}
        customFields={activeCustomFields}
        onSave={(field_visibility) => updateConfig({ field_visibility })}
      />
      <EoFiltersConfigDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={config.filters || []}
        prefilters={config.prefilters || []}
        customFields={activeCustomFields}
        onSave={(filters) => updateConfig({ filters })}
      />
      <EoPreFiltersConfigDialog
        open={preFiltersDialogOpen}
        onOpenChange={setPreFiltersDialogOpen}
        prefilters={config.prefilters || []}
        customFields={activeCustomFields}
        onSave={(prefilters) => updateConfig({ prefilters })}
      />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin/roles/block-options/EoCardInlineOptions.tsx
git commit -m "feat: add EoCardInlineOptions for inline eo_card block config editing"
```

---

## Task 6 : Composant `RoleUsagesTable` — Tableau des usages avec lignes expandables

**Files:**
- Create: `src/components/admin/roles/RoleUsagesTable.tsx`

**Contexte:** Tableau plat avec les colonnes Module / Vue / Type / Accès / Expand. Les lignes avec accès sont expandables et affichent le composant d'options correspondant au type de bloc.

**Step 1: Créer le composant**

```typescript
// src/components/admin/roles/RoleUsagesTable.tsx
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Building2,
  Table as TableIcon,
  GitBranch,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoleUsageItem } from '@/hooks/useRoleUsages';
import type { BlockType, EoCardBlock } from '@/components/builder/page-builder/types';
import { EoCardInlineOptions } from './block-options/EoCardInlineOptions';

const BLOCK_TYPE_CONFIG: Record<BlockType, {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
}> = {
  eo_card: { label: 'Organisation', icon: Building2, variant: 'default', color: 'bg-blue-100 text-blue-700' },
  data_table: { label: 'Données', icon: TableIcon, variant: 'secondary', color: 'bg-green-100 text-green-700' },
  survey_creator: { label: 'Enquête', icon: ClipboardList, variant: 'outline', color: 'bg-purple-100 text-purple-700' },
  survey_responses: { label: 'Réponses', icon: ClipboardList, variant: 'outline', color: 'bg-purple-100 text-purple-700' },
};

type FilterType = 'all' | BlockType;

interface RoleUsagesTableProps {
  usages: RoleUsageItem[];
  isLoading: boolean;
}

export function RoleUsagesTable({ usages, isLoading }: RoleUsagesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [activeOnly, setActiveOnly] = useState(false);

  const filteredUsages = useMemo(() => {
    let result = usages;

    if (typeFilter !== 'all') {
      result = result.filter(u => u.blockType === typeFilter);
    }

    if (activeOnly) {
      result = result.filter(u => u.hasAccess);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.moduleName.toLowerCase().includes(q) ||
        u.viewName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [usages, typeFilter, activeOnly, searchQuery]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group by module for visual grouping (show module name only on first row)
  let lastModuleName = '';

  const renderBlockOptions = (usage: RoleUsageItem) => {
    switch (usage.blockType) {
      case 'eo_card':
        return (
          <EoCardInlineOptions
            viewConfigId={usage.viewConfigId}
            blockIndex={usage.blockIndex}
            config={usage.blockConfig as EoCardBlock['config']}
          />
        );
      // Future block types go here:
      // case 'data_table':
      //   return <DataTableInlineOptions ... />;
      // case 'survey_creator':
      //   return <SurveyInlineOptions ... />;
      default:
        return (
          <div className="p-4 bg-muted/30 text-sm text-muted-foreground">
            Configuration non disponible pour ce type de bloc.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {(['all', 'eo_card', 'data_table', 'survey_creator', 'survey_responses'] as FilterType[]).map(type => {
            const isActive = typeFilter === type;
            const label = type === 'all' ? 'Tous' : BLOCK_TYPE_CONFIG[type as BlockType].label;
            return (
              <Button
                key={type}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTypeFilter(type)}
              >
                {label}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="active-only"
            checked={activeOnly}
            onCheckedChange={(checked) => setActiveOnly(!!checked)}
          />
          <Label htmlFor="active-only" className="text-sm font-normal cursor-pointer">
            Actifs seulement
          </Label>
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 w-48"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Module</TableHead>
              <TableHead className="w-[200px]">Vue</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[60px] text-center">Accès</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Chargement des usages...
                </TableCell>
              </TableRow>
            ) : filteredUsages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Aucun usage trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsages.map(usage => {
                const isExpanded = expandedRows.has(usage.id);
                const showModuleName = usage.moduleName !== lastModuleName;
                lastModuleName = usage.moduleName;
                const typeConfig = BLOCK_TYPE_CONFIG[usage.blockType];

                return (
                  <TableRow
                    key={usage.id}
                    className={cn(!usage.hasAccess && 'opacity-40')}
                  >
                    {/* Main row content */}
                    <TableCell className="font-medium">
                      {showModuleName ? usage.moduleName : ''}
                    </TableCell>
                    <TableCell>
                      {usage.blockTitle || usage.viewName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs gap-1', typeConfig.color)}>
                        <typeConfig.icon className="h-3 w-3" />
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={cn(
                        'h-2.5 w-2.5 rounded-full mx-auto',
                        usage.hasAccess ? 'bg-green-500' : 'bg-gray-300'
                      )} />
                    </TableCell>
                    <TableCell>
                      {usage.hasAccess && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => toggleRow(usage.id)}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />
                          }
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

> **Note importante :** La structure `<TableRow>` de Shadcn ne supporte pas nativement les lignes expandées (deux `<tr>` consécutifs). Il faudra adapter le rendu pour utiliser un `Fragment` contenant le `<TableRow>` principal + un `<TableRow>` conditionnel pour le contenu expandé (avec `<TableCell colSpan={5}>`). Ajuster le code final en conséquence dans le JSX du `map`.

**Step 2: Commit**

```bash
git add src/components/admin/roles/RoleUsagesTable.tsx
git commit -m "feat: add RoleUsagesTable with expandable rows and block type filtering"
```

---

## Task 7 : Refonte de `RolesPage` — Assemblage master-detail

**Files:**
- Modify: `src/pages/admin/RolesPage.tsx` (refonte complète)

**Contexte:** Remplacer le contenu actuel (tableau unique) par le layout master-detail utilisant `RoleSidebar`, `RoleDetailHeader`, et `RoleUsagesTable`. Conserver les dialogs existants (`RoleFormDialog`, `RoleCategoryFormDialog`, `DeleteConfirmDialog`).

**Step 1: Réécrire RolesPage**

Le composant conserve la même route `/dashboard/roles` et les mêmes hooks de données. La structure change :

```typescript
// Structure simplifiée du nouveau RolesPage
export default function RolesPage() {
  // ... même state & hooks qu'avant ...
  const [selectedRole, setSelectedRole] = useState<RoleWithCategory | null>(null);
  const { data: usages = [], isLoading: loadingUsages } = useRoleUsages(selectedRole?.id || null);

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Rôles" actions={[/* import, export, archives */]} />

      <div className="flex-1 flex min-h-0">
        {/* Left: sidebar */}
        <div className="w-64 shrink-0">
          <RoleSidebar
            roles={roles}
            categories={categories}
            selectedRoleId={selectedRole?.id || null}
            onSelectRole={setSelectedRole}
            onCreateRole={() => setRoleFormOpen(true)}
            isLoading={isLoading}
          />
        </div>

        {/* Right: detail */}
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          {selectedRole ? (
            <>
              <RoleDetailHeader
                role={selectedRole}
                onEdit={() => { setSelectedRole(selectedRole); setRoleFormOpen(true); }}
                onArchive={() => setArchiveRoleDialogOpen(true)}
              />
              <div className="flex-1 p-4">
                <RoleUsagesTable
                  usages={usages}
                  isLoading={loadingUsages}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Sélectionnez un rôle pour voir ses usages
            </div>
          )}
        </div>
      </div>

      {/* Dialogs (inchangés) */}
      <RoleFormDialog ... />
      <RoleCategoryFormDialog ... />
      <DeleteConfirmDialog ... />
    </div>
  );
}
```

**Points clés :**
- Le `PageHeader` reste avec les actions globales (Import, Export, Archives)
- Le `<div className="flex-1 flex min-h-0">` crée le split horizontal
- Le sidebar fait `w-64` (256px)
- Le panneau droit est scrollable indépendamment
- Le `RoleDetailsDrawer` (Sheet) est retiré — remplacé par le panneau droit
- Les dialogs `RoleFormDialog` et `DeleteConfirmDialog` restent identiques

**Step 2: Tester manuellement**

1. Naviguer vers `/dashboard/roles`
2. Vérifier : panneau gauche avec catégories dépliables et rôles
3. Cliquer sur un rôle : vérifier que le détail s'affiche à droite
4. Vérifier que le tableau des usages affiche les modules/vues/blocs
5. Expand une ligne eo_card : vérifier que les options s'affichent
6. Toggler une option : vérifier l'auto-save (pas d'erreur, rafraîchissement des données)
7. Filtres : vérifier type, actifs seulement, recherche
8. Actions : Modifier le rôle (dialog), Archiver (dialog)

**Step 3: Commit**

```bash
git add src/pages/admin/RolesPage.tsx
git commit -m "feat: refactor RolesPage to master-detail layout with role usages table"
```

---

## Task 8 : Nettoyage et polish

**Files:**
- Possibly modify: `src/components/admin/roles/RoleDetailsDrawer.tsx` (supprimer si plus utilisé)
- Modify: `src/pages/admin/RolesPage.tsx` (ajustements finaux)

**Step 1: Vérifier les imports morts**

Vérifier que `RoleDetailsDrawer` n'est plus importé nulle part. Si c'est le cas, le supprimer.

**Step 2: Ajuster les styles responsive**

- S'assurer que le sidebar se comporte bien sur petits écrans (possible collapse en mobile)
- Vérifier le scroll du panneau droit

**Step 3: Vérifier la navigation**

- `/dashboard/roles` → nouveau layout
- `/dashboard/roles/import` → page import (inchangée)
- `/dashboard/roles/archived` → page archives (inchangée, le lien retour pointe vers `/dashboard/roles`)

**Step 4: Commit final**

```bash
git add -A
git commit -m "chore: cleanup unused RoleDetailsDrawer, polish responsive styles"
```

---

## Résumé des fichiers

| Action | Fichier |
|---|---|
| Create | `src/hooks/useRoleUsages.ts` |
| Create | `src/hooks/useUpdateBlockConfig.ts` |
| Create | `src/components/admin/roles/RoleSidebar.tsx` |
| Create | `src/components/admin/roles/RoleDetailHeader.tsx` |
| Create | `src/components/admin/roles/block-options/EoCardInlineOptions.tsx` |
| Create | `src/components/admin/roles/RoleUsagesTable.tsx` |
| Modify | `src/pages/admin/RolesPage.tsx` |
| Delete | `src/components/admin/roles/RoleDetailsDrawer.tsx` (si plus utilisé) |
