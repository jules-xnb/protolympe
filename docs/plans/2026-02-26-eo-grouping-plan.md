# EO Grouping — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow integrators to create named groupings of organizational entities (EOs) and assign them to user profiles, so users get access to all EOs in a group without individual assignment.

**Architecture:** Three new Supabase tables (`eo_groups`, `eo_group_members`, `user_profile_eo_groups`), two CRUD hooks, a new Tabs UI in the existing EntitiesPage, a group detail panel with EO member management, group assignment in ProfileFormDialog, and EO resolution union in useUserPermissions.

**Tech Stack:** React 18, TypeScript, Supabase (migrations + client), TanStack React Query, Shadcn/ui (Radix primitives), Tailwind CSS.

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/<timestamp>_create_eo_groups.sql`

**Step 1: Write the migration SQL**

```sql
-- EO Groups: named groupings of organizational entities
CREATE TABLE eo_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Members of an EO group
CREATE TABLE eo_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES eo_groups(id) ON DELETE CASCADE,
  eo_id UUID NOT NULL REFERENCES organizational_entities(id) ON DELETE CASCADE,
  include_descendants BOOLEAN DEFAULT true,
  UNIQUE(group_id, eo_id)
);

-- Assign groups to user profiles
CREATE TABLE user_profile_eo_groups (
  profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES eo_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, group_id)
);

-- RLS policies
ALTER TABLE eo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE eo_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_eo_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON eo_groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON eo_group_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON user_profile_eo_groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_eo_groups_client ON eo_groups(client_id);
CREATE INDEX idx_eo_group_members_group ON eo_group_members(group_id);
CREATE INDEX idx_eo_group_members_eo ON eo_group_members(eo_id);
CREATE INDEX idx_user_profile_eo_groups_profile ON user_profile_eo_groups(profile_id);
CREATE INDEX idx_user_profile_eo_groups_group ON user_profile_eo_groups(group_id);
```

**Step 2: Apply the migration via Supabase MCP**

Show the SQL to the user for approval, then apply via `mcp__supabase__apply_migration`.

**Step 3: Regenerate TypeScript types**

Run: `mcp__supabase__generate_typescript_types` and update `src/integrations/supabase/types.ts`.

**Step 4: Commit**

```
git add supabase/migrations/ src/integrations/supabase/types.ts
git commit -m "feat: add eo_groups, eo_group_members, user_profile_eo_groups tables"
```

---

## Task 2: CRUD Hooks — `useEoGroups`

**Files:**
- Create: `src/hooks/useEoGroups.ts`

**Step 1: Create the hook file**

Follow the pattern from `src/hooks/useRoles.ts`. The hook should:

- `useEoGroups(clientId)` — fetch all groups for a client with member count
  - Query: `eo_groups` where `client_id = clientId`, join `eo_group_members(count)`
  - Return: `{ id, name, description, client_id, created_at, member_count }`
  - queryKey: `['eo_groups', clientId]`

- `useCreateEoGroup()` — insert into `eo_groups`
  - Invalidate: `['eo_groups']`
  - Toast on success/error

- `useUpdateEoGroup()` — update `eo_groups` by id (name, description)
  - Invalidate: `['eo_groups']`

- `useDeleteEoGroup()` — delete from `eo_groups` by id (CASCADE handles members + profile assignments)
  - Invalidate: `['eo_groups']`, `['eo_group_members']`, `['user_profiles']`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EoGroup {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
}

export function useEoGroups(clientId: string | undefined) {
  return useQuery({
    queryKey: ['eo_groups', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('eo_groups')
        .select('*, eo_group_members(count)')
        .eq('client_id', clientId)
        .order('name');
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        member_count: g.eo_group_members?.[0]?.count ?? 0,
      })) as EoGroup[];
    },
    enabled: !!clientId,
  });
}

export function useCreateEoGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { client_id: string; name: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from('eo_groups')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo_groups'] });
      toast.success('Regroupement créé');
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });
}

export function useUpdateEoGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string }) => {
      const { data: result, error } = await supabase
        .from('eo_groups')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo_groups'] });
      toast.success('Regroupement mis à jour');
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });
}

export function useDeleteEoGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('eo_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo_groups'] });
      queryClient.invalidateQueries({ queryKey: ['eo_group_members'] });
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
      toast.success('Regroupement supprimé');
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });
}
```

**Step 2: Commit**

```
git add src/hooks/useEoGroups.ts
git commit -m "feat: add useEoGroups CRUD hook"
```

---

## Task 3: CRUD Hooks — `useEoGroupMembers`

**Files:**
- Create: `src/hooks/useEoGroupMembers.ts`

**Step 1: Create the hook file**

- `useEoGroupMembers(groupId)` — fetch members of a group with EO details
  - Query: `eo_group_members` where `group_id = groupId`, join `organizational_entities(id, name, code, level, path)`
  - queryKey: `['eo_group_members', groupId]`

- `useAddEoGroupMember()` — insert into `eo_group_members`
  - Invalidate: `['eo_group_members']`, `['eo_groups']` (for member_count)

- `useUpdateEoGroupMember()` — update `include_descendants` by id
  - Invalidate: `['eo_group_members']`

- `useRemoveEoGroupMember()` — delete from `eo_group_members` by id
  - Invalidate: `['eo_group_members']`, `['eo_groups']`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EoGroupMember {
  id: string;
  group_id: string;
  eo_id: string;
  include_descendants: boolean;
  eo_name: string;
  eo_code: string | null;
  eo_level: number;
  eo_path: string;
}

export function useEoGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['eo_group_members', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('eo_group_members')
        .select('*, organizational_entities!inner(name, code, level, path)')
        .eq('group_id', groupId);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        group_id: m.group_id,
        eo_id: m.eo_id,
        include_descendants: m.include_descendants ?? true,
        eo_name: m.organizational_entities.name,
        eo_code: m.organizational_entities.code,
        eo_level: m.organizational_entities.level,
        eo_path: m.organizational_entities.path,
      })) as EoGroupMember[];
    },
    enabled: !!groupId,
  });
}

export function useAddEoGroupMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (members: { group_id: string; eo_id: string; include_descendants?: boolean }[]) => {
      const { error } = await supabase.from('eo_group_members').insert(members);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo_group_members'] });
      queryClient.invalidateQueries({ queryKey: ['eo_groups'] });
      toast.success('EOs ajoutées au regroupement');
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });
}

export function useUpdateEoGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, include_descendants }: { id: string; include_descendants: boolean }) => {
      const { error } = await supabase
        .from('eo_group_members')
        .update({ include_descendants })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo_group_members'] });
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });
}

export function useRemoveEoGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('eo_group_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eo_group_members'] });
      queryClient.invalidateQueries({ queryKey: ['eo_groups'] });
      toast.success('EO retirée du regroupement');
    },
    onError: (error: Error) => toast.error(`Erreur: ${error.message}`),
  });
}
```

**Step 2: Commit**

```
git add src/hooks/useEoGroupMembers.ts
git commit -m "feat: add useEoGroupMembers CRUD hook"
```

---

## Task 4: Create Tabs UI Component

**Files:**
- Create: `src/components/ui/tabs.tsx`

The `@radix-ui/react-tabs` package is already installed but the component wrapper doesn't exist.

**Step 1: Create the Shadcn-style Tabs component**

Standard Shadcn tabs component wrapping `@radix-ui/react-tabs`:

```typescript
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

**Step 2: Commit**

```
git add src/components/ui/tabs.tsx
git commit -m "feat: add Tabs UI component (shadcn/radix)"
```

---

## Task 5: EntitiesPage — Add Tabs (Entités / Regroupements)

**Files:**
- Modify: `src/pages/admin/EntitiesPage.tsx`
- Create: `src/components/admin/entities/EoGroupsTab.tsx`

**Step 1: Wrap EntitiesPage content in Tabs**

In `EntitiesPage.tsx`:
- Import `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- Import the new `EoGroupsTab` component
- Add a `Tabs` wrapper with `defaultValue="entities"` around the existing content (after `PageHeader`, inside the `selectedClient` conditional)
- `TabsTrigger value="entities"` → "Entités"
- `TabsTrigger value="groups"` → "Regroupements"
- Move existing search/filters/views into `TabsContent value="entities"`
- Add `TabsContent value="groups"` rendering `<EoGroupsTab clientId={selectedClient.id} />`

The tabs bar should be placed just after the PageHeader, before the search/filter toolbar.

**Step 2: Create EoGroupsTab skeleton**

Create `src/components/admin/entities/EoGroupsTab.tsx`:

```typescript
interface EoGroupsTabProps {
  clientId: string;
}

export function EoGroupsTab({ clientId }: EoGroupsTabProps) {
  // Placeholder — will be filled in Task 6
  return <div>Regroupements (à implémenter)</div>;
}
```

**Step 3: Verify tabs render correctly**

Check `npm run dev` in the browser at the entities page URL. Both tabs should be visible, switching between entities content and the placeholder.

**Step 4: Commit**

```
git add src/pages/admin/EntitiesPage.tsx src/components/admin/entities/EoGroupsTab.tsx
git commit -m "feat: add Tabs to EntitiesPage with Regroupements placeholder"
```

---

## Task 6: EoGroupsTab — Group List + Create Dialog

**Files:**
- Modify: `src/components/admin/entities/EoGroupsTab.tsx`

**Step 1: Implement the group list and create dialog**

The `EoGroupsTab` component should:

1. Use `useEoGroups(clientId)` to fetch groups
2. Display groups as a list of cards: name, description, member count badge
3. Button "+ Nouveau regroupement" opens a Dialog for name + description input
4. On create success → close dialog, list refreshes
5. State: `selectedGroupId` — when a group card is clicked, it opens the detail panel (Task 7)
6. Delete button on each card with confirmation dialog

Layout:
- If no `selectedGroupId`: full-width group list
- If `selectedGroupId` is set: split layout — group list (left 1/3) + detail panel (right 2/3) — detail panel built in Task 7

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { useEoGroups, useCreateEoGroup, useDeleteEoGroup } from '@/hooks/useEoGroups';
import { EoGroupDetailPanel } from './EoGroupDetailPanel';
import { Plus, Users, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EoGroupsTabProps {
  clientId: string;
}

export function EoGroupsTab({ clientId }: EoGroupsTabProps) {
  const { data: groups = [], isLoading } = useEoGroups(clientId);
  const createGroup = useCreateEoGroup();
  const deleteGroup = useDeleteEoGroup();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const handleCreate = async () => {
    await createGroup.mutateAsync({ client_id: clientId, name: newName, description: newDesc || undefined });
    setCreateOpen(false);
    setNewName('');
    setNewDesc('');
  };

  const handleDelete = async () => {
    if (!deletingGroupId) return;
    await deleteGroup.mutateAsync(deletingGroupId);
    if (selectedGroupId === deletingGroupId) setSelectedGroupId(null);
    setDeletingGroupId(null);
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="flex gap-4">
      {/* Group list */}
      <div className={cn("space-y-3", selectedGroupId ? "w-1/3" : "w-full")}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {groups.length} regroupement{groups.length !== 1 ? 's' : ''}
          </h3>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau
          </Button>
        </div>

        {groups.map(group => (
          <div
            key={group.id}
            className={cn(
              "border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors",
              selectedGroupId === group.id && "border-primary bg-primary/5"
            )}
            onClick={() => setSelectedGroupId(group.id)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{group.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {group.member_count}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); setDeletingGroupId(group.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            {group.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{group.description}</p>
            )}
          </div>
        ))}

        {!isLoading && groups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucun regroupement. Créez-en un pour commencer.
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedGroupId && selectedGroup && (
        <div className="w-2/3 border rounded-lg p-4">
          <EoGroupDetailPanel
            group={selectedGroup}
            clientId={clientId}
            onClose={() => setSelectedGroupId(null)}
          />
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau regroupement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Région Sud" />
            </div>
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description du regroupement..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createGroup.isPending}>
              {createGroup.isPending ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={!!deletingGroupId}
        onOpenChange={open => !open && setDeletingGroupId(null)}
        onConfirm={handleDelete}
        title="Supprimer le regroupement"
        description="Ce regroupement sera supprimé, ainsi que toutes les assignations de profils associées."
        isDeleting={deleteGroup.isPending}
      />
    </div>
  );
}
```

**Step 2: Commit**

```
git add src/components/admin/entities/EoGroupsTab.tsx
git commit -m "feat: EoGroupsTab with group list and create/delete"
```

---

## Task 7: EoGroupDetailPanel — Name/Desc Edit + Member Management

**Files:**
- Create: `src/components/admin/entities/EoGroupDetailPanel.tsx`

**Step 1: Implement the detail panel**

The panel shows:
1. **Header**: Group name (editable inline) + close button
2. **Description**: Editable inline (textarea)
3. **Members list**: Each member shows EO name, code, `include_descendants` toggle, remove button (×)
4. **Add EOs button**: Opens a dialog with the existing EO tree for multi-selection (reuse the checkbox list pattern from `ProfileFormDialog`)

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useEoGroupMembers,
  useAddEoGroupMembers,
  useUpdateEoGroupMember,
  useRemoveEoGroupMember,
} from '@/hooks/useEoGroupMembers';
import { useUpdateEoGroup, type EoGroup } from '@/hooks/useEoGroups';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { X, Plus, GitBranch, Search, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EoGroupDetailPanelProps {
  group: EoGroup;
  clientId: string;
  onClose: () => void;
}

export function EoGroupDetailPanel({ group, clientId, onClose }: EoGroupDetailPanelProps) {
  const { data: members = [] } = useEoGroupMembers(group.id);
  const { data: allEntities = [] } = useOrganizationalEntities(clientId);
  const updateGroup = useUpdateEoGroup();
  const addMembers = useAddEoGroupMembers();
  const updateMember = useUpdateEoGroupMember();
  const removeMember = useRemoveEoGroupMember();

  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description || '');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEoIds, setSelectedEoIds] = useState<string[]>([]);
  const [eoSearch, setEoSearch] = useState('');

  // Track whether name/desc changed for save
  const nameChanged = editName !== group.name;
  const descChanged = editDesc !== (group.description || '');

  const handleSave = async () => {
    const updates: { id: string; name?: string; description?: string } = { id: group.id };
    if (nameChanged) updates.name = editName;
    if (descChanged) updates.description = editDesc;
    await updateGroup.mutateAsync(updates);
  };

  const handleAddMembers = async () => {
    if (selectedEoIds.length === 0) return;
    await addMembers.mutateAsync(
      selectedEoIds.map(eo_id => ({ group_id: group.id, eo_id, include_descendants: true }))
    );
    setSelectedEoIds([]);
    setAddDialogOpen(false);
  };

  const existingEoIds = new Set(members.map(m => m.eo_id));

  const filteredEntities = allEntities.filter(e => {
    if (existingEoIds.has(e.id)) return false;
    if (!eoSearch.trim()) return true;
    const q = eoSearch.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.code?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Input
          value={editName}
          onChange={e => setEditName(e.target.value)}
          className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
        />
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Description */}
      <Input
        value={editDesc}
        onChange={e => setEditDesc(e.target.value)}
        placeholder="Description (optionnel)..."
        className="text-sm text-muted-foreground"
      />

      {/* Save button if changed */}
      {(nameChanged || descChanged) && (
        <Button size="sm" onClick={handleSave} disabled={updateGroup.isPending}>
          Enregistrer
        </Button>
      )}

      {/* Members */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Membres ({members.length})</span>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter des EOs
          </Button>
        </div>

        <div className="space-y-1">
          {members.map(member => (
            <div key={member.id} className="flex items-center gap-2 p-2 border rounded-md">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{member.eo_name}</span>
                {member.eo_code && (
                  <span className="text-xs text-muted-foreground ml-2">{member.eo_code}</span>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => updateMember.mutate({
                      id: member.id,
                      include_descendants: !member.include_descendants,
                    })}
                    className={cn(
                      "p-1 rounded hover:bg-muted transition-colors shrink-0",
                      member.include_descendants ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {member.include_descendants
                    ? 'Descendance incluse — cliquez pour retirer'
                    : 'Inclure les sous-entités'}
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeMember.mutate(member.id)}
              >
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Aucune EO dans ce regroupement.
            </div>
          )}
        </div>
      </div>

      {/* Add EOs dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter des EOs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={eoSearch}
                onChange={e => setEoSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1 pr-2">
                {filteredEntities.map(entity => (
                  <div
                    key={entity.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer",
                      selectedEoIds.includes(entity.id) && "bg-primary/10"
                    )}
                    style={{ paddingLeft: `${entity.level * 12 + 8}px` }}
                    onClick={() => setSelectedEoIds(prev =>
                      prev.includes(entity.id) ? prev.filter(x => x !== entity.id) : [...prev, entity.id]
                    )}
                  >
                    <Checkbox checked={selectedEoIds.includes(entity.id)} />
                    <span className="text-sm truncate">{entity.name}</span>
                    {entity.code && (
                      <span className="text-xs text-muted-foreground">{entity.code}</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddMembers} disabled={selectedEoIds.length === 0 || addMembers.isPending}>
              Ajouter {selectedEoIds.length > 0 ? `(${selectedEoIds.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Verify visually**

Navigate to entities page → Regroupements tab → create a group → click it → verify the detail panel renders.

**Step 3: Commit**

```
git add src/components/admin/entities/EoGroupDetailPanel.tsx
git commit -m "feat: EoGroupDetailPanel with member management"
```

---

## Task 8: ProfileFormDialog — Group Assignment Section

**Files:**
- Modify: `src/components/profile/ProfileFormDialog.tsx`

**Step 1: Add EO groups section to the profile dialog**

In `ProfileFormDialog.tsx`:

1. Import `useEoGroups` from `@/hooks/useEoGroups`
2. Add state: `selectedGroupIds: string[]` initialized from profile data (when editing)
3. Add a new section below the EO/Roles grid: "Regroupements d'EO"
4. Display groups as a multi-checkbox list (similar to the EO list): group name + member count badge
5. Pass `group_ids` through `onSubmit` alongside existing data

Changes to `ProfileFormDialogProps.onSubmit`:
```typescript
onSubmit: (data: {
  name: string;
  eo_ids: string[];
  eo_descendants: Record<string, boolean>;
  role_ids: string[];
  group_ids: string[];  // NEW
}) => void;
```

Add the groups section after the EO/Roles grid:
```tsx
{/* EO Groups */}
<div className="border rounded-lg p-3 space-y-2">
  <div className="flex items-center gap-2 font-medium text-sm">
    <Users className="h-4 w-4 text-muted-foreground" />
    Regroupements d'EO
  </div>
  <ScrollArea className="h-[120px]">
    <div className="space-y-1 pr-2">
      {eoGroups.map(group => (
        <div
          key={group.id}
          className={cn(
            "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer",
            selectedGroupIds.includes(group.id) && "bg-primary/10"
          )}
          onClick={() => handleGroupToggle(group.id)}
        >
          <Checkbox checked={selectedGroupIds.includes(group.id)} />
          <span className="text-sm truncate flex-1">{group.name}</span>
          <Badge variant="secondary" className="text-xs">{group.member_count} EOs</Badge>
        </div>
      ))}
    </div>
  </ScrollArea>
</div>
```

**Step 2: Update `useCreateProfile` and `useUpdateProfile`**

In `src/hooks/useUserProfiles.ts`:

- Add `group_ids: string[]` to `CreateProfileInput` and `UpdateProfileInput`
- In `useCreateProfile.mutationFn`: after inserting EOs and roles, insert into `user_profile_eo_groups`:
  ```typescript
  if (input.group_ids.length > 0) {
    await supabase.from('user_profile_eo_groups').insert(
      input.group_ids.map(group_id => ({ profile_id: profile.id, group_id }))
    );
  }
  ```
- In `useUpdateProfile.mutationFn`: delete existing groups, insert new ones:
  ```typescript
  if (input.group_ids !== undefined) {
    await supabase.from('user_profile_eo_groups').delete().eq('profile_id', input.id);
    if (input.group_ids.length > 0) {
      await supabase.from('user_profile_eo_groups').insert(
        input.group_ids.map(group_id => ({ profile_id: input.id, group_id }))
      );
    }
  }
  ```
- In `useUserProfilesByClient.queryFn`: also fetch `user_profile_eo_groups` for each profile and add to the returned data:
  ```typescript
  // Add to the parallel fetch
  const groupsResult = await supabase
    .from('user_profile_eo_groups')
    .select('profile_id, group_id, eo_groups!inner(name)')
    .in('profile_id', profileIds);
  ```
- Update the `UserProfile` interface to include `groups`:
  ```typescript
  groups: Array<{
    group_id: string;
    group_name: string;
  }>;
  ```

**Step 3: Update callers of onSubmit in ProfileFormDialog**

Search for components that call `ProfileFormDialog`'s `onSubmit` and ensure they pass through `group_ids`.

**Step 4: Verify visually**

Open a user → edit profile → verify the groups section appears and saves correctly.

**Step 5: Commit**

```
git add src/components/profile/ProfileFormDialog.tsx src/hooks/useUserProfiles.ts
git commit -m "feat: add EO group assignment to user profiles"
```

---

## Task 9: useUserPermissions — Resolve Groups into EOs

**Files:**
- Modify: `src/hooks/useUserPermissions.ts`

**Step 1: Extend EO resolution with group-based EOs**

In `useUserPermissions.queryFn`:

After fetching direct EOs, also resolve group-based EOs:

```typescript
// Fetch EO groups for this profile
const { data: profileGroups } = await supabase
  .from('user_profile_eo_groups')
  .select('group_id')
  .eq('profile_id', activeProfile.profileId);

let groupEoIds: string[] = [];
if (profileGroups && profileGroups.length > 0) {
  const groupIds = profileGroups.map(g => g.group_id);
  const { data: groupMembers } = await supabase
    .from('eo_group_members')
    .select('eo_id, include_descendants')
    .in('group_id', groupIds);

  if (groupMembers) {
    // Fetch EO details for group members
    const memberEoIds = groupMembers.map(m => m.eo_id);
    const { data: memberEos } = await supabase
      .from('organizational_entities')
      .select('id, name, code, path')
      .in('id', memberEoIds);

    if (memberEos) {
      // Merge into the main EO lists (union, no duplicates)
      for (const eo of memberEos) {
        if (!selectedEoIds.includes(eo.id)) {
          groupEoIds.push(eo.id);
          eos.push(eo);
        }
      }
    }
  }
}

// The final eoIds is the union of direct + group-resolved
const allEoIds = [...selectedEoIds, ...groupEoIds];
```

Then use `allEoIds` instead of `selectedEoIds` for the `eoIds` return value.

**Important:** The `activeProfile` object already contains `eoIds` (direct). We need to verify how `activeProfile` is built to ensure we have access to `profileId` for the group query. Check `ViewModeContext` to confirm.

**Step 2: Verify the resolution**

1. Create a group with some EOs
2. Assign the group to a profile
3. Switch to user_final mode and verify the profile's EOs include the group members

**Step 3: Commit**

```
git add src/hooks/useUserPermissions.ts
git commit -m "feat: resolve EO groups in useUserPermissions (union with direct EOs)"
```

---

## Task 10: Final Integration Testing + Cleanup

**Step 1: End-to-end verification**

1. Create a group "Région Sud" with 3 EOs
2. Create a user profile and assign the group
3. Verify in user_final mode that the user sees data for all 3 EOs
4. Edit the group (rename, add/remove members, toggle descendants)
5. Delete the group → verify profile's group assignment is cleaned up

**Step 2: Remove any console.log debug statements**

Grep for `console.log` in newly created/modified files and remove debug logs.

**Step 3: Final commit**

```
git add -A
git commit -m "chore: cleanup and final integration"
```

---

## Summary of Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/<ts>_create_eo_groups.sql` |
| Update | `src/integrations/supabase/types.ts` (regenerated) |
| Create | `src/hooks/useEoGroups.ts` |
| Create | `src/hooks/useEoGroupMembers.ts` |
| Create | `src/components/ui/tabs.tsx` |
| Create | `src/components/admin/entities/EoGroupsTab.tsx` |
| Create | `src/components/admin/entities/EoGroupDetailPanel.tsx` |
| Modify | `src/pages/admin/EntitiesPage.tsx` |
| Modify | `src/components/profile/ProfileFormDialog.tsx` |
| Modify | `src/hooks/useUserProfiles.ts` |
| Modify | `src/hooks/useUserPermissions.ts` |
