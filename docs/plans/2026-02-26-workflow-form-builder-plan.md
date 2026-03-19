# Workflow Form Builder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Formulaires" tab to the workflow editor with a 3-column drag & drop form builder (steps sidebar, available fields, form canvas with sections).

**Architecture:** New `WorkflowFormBuilder` component rendered as a second tab in `WorkflowDetailPage`. Uses `@dnd-kit` for drag & drop (already installed). Persists sections via new `node_sections` Supabase table, fields via existing `node_fields` table with `settings.section_id`. Auto-save debounced 1s.

**Tech Stack:** React, TypeScript, @dnd-kit/core + @dnd-kit/sortable, Supabase, TanStack Query, shadcn/ui

**Design doc:** `docs/plans/2026-02-26-workflow-form-builder-design.md`

---

## Task 1: Supabase migration — `node_sections` table

**Files:**
- Create: Supabase migration (via MCP or SQL)

**Step 1: Show migration SQL to user for approval**

```sql
CREATE TABLE node_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Général',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE node_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage node_sections via node's workflow client"
  ON node_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflow_nodes wn
      JOIN workflows w ON w.id = wn.workflow_id
      WHERE wn.id = node_sections.node_id
    )
  );

-- Index
CREATE INDEX idx_node_sections_node_id ON node_sections(node_id);
```

**Step 2: Apply migration after user approval**

**Step 3: Regenerate Supabase types**

Run: `npx supabase gen types typescript --project-id <project_id> > src/integrations/supabase/types.ts`

---

## Task 2: Hook — `useNodeSections`

**Files:**
- Create: `src/hooks/useNodeSections.ts`

**Step 1: Create the hook file**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type NodeSection = Tables<'node_sections'>;

export function useNodeSections(nodeId: string | null) {
  return useQuery({
    queryKey: ['node_sections', nodeId],
    queryFn: async () => {
      if (!nodeId) return [];
      const { data, error } = await supabase
        .from('node_sections')
        .select('*')
        .eq('node_id', nodeId)
        .order('display_order');
      if (error) throw error;
      return data as NodeSection[];
    },
    enabled: !!nodeId,
  });
}

export function useSaveNodeSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nodeId, sections }: { nodeId: string; sections: Omit<TablesInsert<'node_sections'>, 'node_id'>[] }) => {
      // Delete existing sections for this node
      const { error: deleteError } = await supabase
        .from('node_sections')
        .delete()
        .eq('node_id', nodeId);
      if (deleteError) throw deleteError;

      if (sections.length === 0) return [];

      const rows = sections.map(s => ({ ...s, node_id: nodeId }));
      const { data, error } = await supabase
        .from('node_sections')
        .insert(rows)
        .select();
      if (error) throw error;
      return data as NodeSection[];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['node_sections', variables.nodeId] });
    },
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```
feat: add useNodeSections hook for section persistence
```

---

## Task 3: Add tabs to `WorkflowDetailPage`

**Files:**
- Modify: `src/pages/admin/WorkflowDetailPage.tsx`

**Step 1: Add tab state and Tabs UI**

Replace the current `{/* Workflow Graph Editor */}` section (lines 101-118) with a tab system:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Workflow as WorkflowIcon, FileText } from 'lucide-react';
```

Between the header `</div>` and the graph editor, wrap in tabs:

```tsx
<Tabs defaultValue="workflow" className="flex-1 flex flex-col min-h-0">
  <div className="px-4 pt-2 border-b shrink-0">
    <TabsList>
      <TabsTrigger value="workflow" className="gap-1.5">
        <WorkflowIcon className="h-4 w-4" />
        Workflow
      </TabsTrigger>
      <TabsTrigger value="forms" className="gap-1.5">
        <FileText className="h-4 w-4" />
        Formulaires
      </TabsTrigger>
    </TabsList>
  </div>

  <TabsContent value="workflow" className="flex-1 min-h-0 mt-0 relative">
    <WorkflowGraphEditor ... />  {/* existing props */}
  </TabsContent>

  <TabsContent value="forms" className="flex-1 min-h-0 mt-0">
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Formulaire builder (à venir)
    </div>
  </TabsContent>
</Tabs>
```

**Step 2: Verify the tabs render correctly in the browser**

Open the workflow page, verify both tabs switch correctly, the graph still works in the Workflow tab.

**Step 3: Commit**

```
feat: add Workflow/Formulaires tabs to WorkflowDetailPage
```

---

## Task 4: Remove "Fields" tab from `WorkflowGraphEditor`

**Files:**
- Modify: `src/components/builder/page-builder/WorkflowGraphEditor.tsx`

**Step 1: Remove the "Formulaire" tab from the side panel**

In the side panel tabs (around line 902-1070):
- Remove the `<TabsTrigger value="fields">Formulaire</TabsTrigger>`
- Remove the entire `<TabsContent value="fields">...</TabsContent>` block (lines ~1051-1069)
- Remove the `NodeFieldsEditor` import (line 31)
- If no other tabs remain besides "config", remove the Tabs wrapper entirely and just render the config content directly

**Step 2: Verify the side panel still works for step config**

Open workflow, click a node, verify Configuration tab still shows name/roles.

**Step 3: Commit**

```
refactor: remove Fields tab from workflow side panel (moved to Formulaires tab)
```

---

## Task 5: Create `WorkflowFormBuilder` — main container

**Files:**
- Create: `src/components/admin/workflows/WorkflowFormBuilder.tsx`
- Modify: `src/pages/admin/WorkflowDetailPage.tsx` (integrate)

**Step 1: Create the main container with 3-column layout**

Props needed from the parent:
- `steps: ValidationStep[]` — the validation steps
- `startNodeId: string` — the respondent node ID
- `endNodeId: string` — the validated node ID (need to expose from bridge)
- `boDefinitionId: string | undefined` — to load field definitions
- `workflowId: string` — for section queries

```tsx
interface WorkflowFormBuilderProps {
  steps: ValidationStep[];
  startNodeId: string;
  endNodeId: string;
  boDefinitionId: string | undefined;
  workflowId: string;
}
```

The component manages:
- `selectedNodeId: string` — which step is selected in the sidebar (default: startNodeId)
- Renders 3 columns via flex layout

```tsx
export function WorkflowFormBuilder({ steps, startNodeId, endNodeId, boDefinitionId, workflowId }: WorkflowFormBuilderProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(startNodeId);

  // Build ordered list of steps for the sidebar
  const orderedNodes = useMemo(() => {
    const nodes: Array<{ id: string; name: string; type: 'respondent' | 'validation' | 'validated' }> = [
      { id: startNodeId, name: 'Répondant', type: 'respondent' },
      ...steps
        .sort((a, b) => a.order - b.order)
        .map(s => ({ id: s.id, name: s.name, type: 'validation' as const })),
      { id: endNodeId, name: 'Validé', type: 'validated' },
    ];
    return nodes;
  }, [steps, startNodeId, endNodeId]);

  return (
    <div className="flex h-full">
      {/* Column 1: Steps sidebar */}
      <div className="w-[180px] border-r bg-muted/30 shrink-0 flex flex-col">
        <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Étapes
        </div>
        <div className="flex-1 overflow-y-auto">
          {orderedNodes.map(node => (
            <button
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm transition-colors',
                'hover:bg-accent/50',
                selectedNodeId === node.id && 'bg-accent font-medium'
              )}
            >
              <div className="truncate">{node.name}</div>
              <Badge variant="outline" className="text-[10px] mt-0.5">
                {node.type === 'respondent' ? 'Répondant' : node.type === 'validated' ? 'Validé' : 'Validation'}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Column 2 & 3: placeholder for now */}
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Sélectionné : {selectedNodeId}
      </div>
    </div>
  );
}
```

**Step 2: Integrate in WorkflowDetailPage**

Replace the placeholder in the "forms" TabsContent:

```tsx
import { WorkflowFormBuilder } from '@/components/admin/workflows/WorkflowFormBuilder';

<TabsContent value="forms" className="flex-1 min-h-0 mt-0">
  <WorkflowFormBuilder
    steps={bridge.steps}
    startNodeId={bridge.startNodeId}
    endNodeId={bridge.endNodeId}
    boDefinitionId={boDefId}
    workflowId={id!}
  />
</TabsContent>
```

Note: `bridge.endNodeId` may need to be exposed from `useWorkflowEditorBridge`. Check the hook — if it doesn't expose `endNodeId`, add it (it already has `startNodeId`).

**Step 3: Verify sidebar renders with correct steps**

Open workflow → Formulaires tab → sidebar shows Répondant, Step names, Validé.

**Step 4: Commit**

```
feat: add WorkflowFormBuilder shell with steps sidebar
```

---

## Task 6: Create `AvailableFieldsPanel` — column 2

**Files:**
- Create: `src/components/admin/workflows/form-builder/AvailableFieldsPanel.tsx`

**Step 1: Create the component**

Props:
- `boDefinitionId: string | undefined`
- `usedFieldIds: Set<string>` — fields already in the current form (to hide them)
- `onAddSection: () => void` — callback for the "+ Section" button

Displays:
- Search input at top
- Fields grouped by type in collapsible accordions
- Each field is a draggable item (using `@dnd-kit` `useDraggable`)
- Fields in `usedFieldIds` are hidden
- Button "+ Section" at bottom

Use `useFieldDefinitions(boDefinitionId)` to load fields. Group by `field_type` using categories: Texte (text, textarea, email, phone, url), Nombres (number, decimal), Dates (date, datetime, time), Choix (select, multiselect, checkbox), Références (user_reference, eo_reference, object_reference), Autres (file, image, calculated).

Each draggable field card shows: field name + type badge.

**Step 2: Integrate in WorkflowFormBuilder as column 2**

**Step 3: Verify fields load and display grouped by type**

**Step 4: Commit**

```
feat: add AvailableFieldsPanel with field list and search
```

---

## Task 7: Create `FormCanvas` — column 3

**Files:**
- Create: `src/components/admin/workflows/form-builder/FormCanvas.tsx`

**Step 1: Create the component**

Props:
- `nodeId: string` — current node ID
- `nodeType: 'respondent' | 'validation' | 'validated'`
- `nodeName: string`
- `sections: NodeSection[]`
- `fieldConfigs: NodeFieldConfig[]`
- `fieldDefinitions: FieldDefinitionWithRelations[]`
- `requiredFieldIds: Set<string>` — BO required fields (locked for respondent)
- `allStepNodes: Array<{ id: string; name: string }>` — for "copy from" dropdown
- `onSectionsChange: (sections: NodeSection[]) => void`
- `onFieldConfigsChange: (fields: NodeFieldConfig[]) => void`
- `onCopyFromStep: (sourceNodeId: string) => void`

Renders:
- Header: step name + "Copier depuis…" dropdown (hidden for respondent)
- Sections: each is a `@dnd-kit` `SortableContext` for reordering
- Fields inside sections: `SortableItem` with drag handle (⋮), remove button (✕), lock icon (🔒)
- For validation/validated nodes: readonly/editable toggle badge per field
- Drop zone at bottom of each section + at bottom of canvas

**Step 2: Implement section header**

- Editable name (inline input on click)
- Drag handle for section reorder
- Delete button (fields return to available list)

**Step 3: Implement field items**

- Drag handle ⋮ for reorder within/between sections
- Field name + type badge
- For respondent: locked fields show 🔒, no ✕
- For validation/validated: toggle badge readonly ↔ éditable
- ✕ button to remove (unless locked)

**Step 4: Verify the canvas renders with placeholder data**

**Step 5: Commit**

```
feat: add FormCanvas with sections and field items
```

---

## Task 8: Wire up drag & drop between columns 2 and 3

**Files:**
- Modify: `src/components/admin/workflows/WorkflowFormBuilder.tsx`
- Modify: `src/components/admin/workflows/form-builder/AvailableFieldsPanel.tsx`
- Modify: `src/components/admin/workflows/form-builder/FormCanvas.tsx`

**Step 1: Wrap the builder in `DndContext`**

In `WorkflowFormBuilder`, wrap columns 2+3 in a `DndContext` from `@dnd-kit/core`:

```tsx
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
```

Handle `onDragEnd`:
- If dragged from available fields panel → dropped on a section → add field to that section
- If dragged within form canvas → reorder field within or between sections
- If dragged section header → reorder sections

**Step 2: Implement `useDraggable` in AvailableFieldsPanel**

Each field card gets `useDraggable({ id: `available-${field.id}`, data: { type: 'available-field', field } })`.

**Step 3: Implement `useDroppable` + `SortableContext` in FormCanvas**

Each section is a drop zone. Fields within sections use `@dnd-kit/sortable`.

**Step 4: Test drag from available → section, and reorder within sections**

**Step 5: Commit**

```
feat: wire up drag & drop between available fields and form canvas
```

---

## Task 9: Auto-save and state management

**Files:**
- Modify: `src/components/admin/workflows/WorkflowFormBuilder.tsx`

**Step 1: Load data per selected node**

When `selectedNodeId` changes:
- Load `useNodeSections(selectedNodeId)` → sections
- Load `useNodeFields(selectedNodeId)` → field configs
- Load `useFieldDefinitions(boDefinitionId)` → all available fields
- Compute `usedFieldIds` from field configs
- Compute `requiredFieldIds` from field definitions where `is_required === true`

**Step 2: Implement auto-save (debounced 1s)**

When sections or field configs change locally:
- Debounce 1000ms
- Call `useSaveNodeSections()` for sections
- Call `useSaveNodeFields()` for field configs
- Show save status indicator

**Step 3: Ensure default "Général" section**

When loading a node that has no sections:
- Auto-create one section with name "Général" and display_order 0
- For respondent node: also auto-add locked required fields to that section

**Step 4: Verify auto-save works (change a field, check DB)**

**Step 5: Commit**

```
feat: add auto-save and state management for form builder
```

---

## Task 10: Copy from step feature

**Files:**
- Modify: `src/components/admin/workflows/form-builder/FormCanvas.tsx`
- Modify: `src/components/admin/workflows/WorkflowFormBuilder.tsx`

**Step 1: Add "Copier depuis…" dropdown in FormCanvas header**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <Copy className="h-4 w-4 mr-1.5" />
      Copier depuis…
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {allStepNodes
      .filter(n => n.id !== nodeId)
      .map(n => (
        <DropdownMenuItem key={n.id} onClick={() => onCopyFromStep(n.id)}>
          {n.name}
        </DropdownMenuItem>
      ))}
  </DropdownMenuContent>
</DropdownMenu>
```

Hidden when `nodeType === 'respondent'`.

**Step 2: Implement `onCopyFromStep` in WorkflowFormBuilder**

- Load sections + field configs from the source node
- If current form is not empty, show confirmation dialog: "Remplacer la configuration actuelle par celle de [Source Name] ?"
- On confirm: replace local sections and field configs with copied data (with new UUIDs)
- Trigger auto-save

**Step 3: Test copy from Étape 1 to Étape 2**

**Step 4: Commit**

```
feat: add copy from step feature in form builder
```

---

## Task 11: Section management (create, rename, delete, reorder)

**Files:**
- Modify: `src/components/admin/workflows/form-builder/FormCanvas.tsx`

**Step 1: Create section button**

The `onAddSection` callback in `AvailableFieldsPanel` creates a new section:
- Name: "Nouvelle section"
- display_order: max existing order + 1
- Added to the end of the sections list

**Step 2: Rename section inline**

Click on section name → transforms to `<Input>` → blur or Enter saves.

**Step 3: Delete section**

Button on section header. If section contains fields:
- Fields return to the available list (removed from field configs)
- Exception: locked fields (required, respondent) move to the next section (or previous if last)

If it's the last section, prevent deletion (always minimum 1 section).

**Step 4: Reorder sections via drag & drop**

Section headers are draggable. Use `@dnd-kit/sortable` with a separate `SortableContext` for sections.

**Step 5: Test all section operations**

**Step 6: Commit**

```
feat: add section CRUD (create, rename, delete, reorder)
```

---

## Task 12: Final integration and cleanup

**Files:**
- Modify: `src/pages/admin/WorkflowDetailPage.tsx`
- Modify: `src/components/admin/workflows/WorkflowFormBuilder.tsx`

**Step 1: Expose `endNodeId` from bridge if needed**

Check `useWorkflowEditorBridge` — if it doesn't expose `endNodeId`, add it. The bridge already has `startNodeId` and knows the end node from the workflow data.

**Step 2: Wire save status from form builder to the header**

The header already shows "Sauvegarde..." / "Enregistré" from the bridge. Add form builder save status too (or reuse the same indicator).

**Step 3: Verify complete workflow**

1. Open workflow → Formulaires tab
2. Click Répondant → required fields are locked in "Général" section
3. Drag a field from available → drops into a section
4. Create a new section, rename it, drag fields into it
5. Switch to Étape 1 → empty form, copy from Répondant → sections + fields copied
6. Toggle a field readonly ↔ éditable on a validation step
7. Switch back to Répondant → changes persisted
8. Refresh page → everything reloaded from DB

**Step 4: Commit**

```
feat: complete workflow form builder integration
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Supabase migration `node_sections` | SQL migration |
| 2 | Hook `useNodeSections` | `src/hooks/useNodeSections.ts` |
| 3 | Add tabs to `WorkflowDetailPage` | `src/pages/admin/WorkflowDetailPage.tsx` |
| 4 | Remove Fields tab from side panel | `WorkflowGraphEditor.tsx` |
| 5 | Create `WorkflowFormBuilder` shell | `src/components/admin/workflows/WorkflowFormBuilder.tsx` |
| 6 | Create `AvailableFieldsPanel` (col 2) | `src/components/admin/workflows/form-builder/AvailableFieldsPanel.tsx` |
| 7 | Create `FormCanvas` (col 3) | `src/components/admin/workflows/form-builder/FormCanvas.tsx` |
| 8 | Wire drag & drop | Multiple files |
| 9 | Auto-save + state management | `WorkflowFormBuilder.tsx` |
| 10 | Copy from step | `FormCanvas.tsx`, `WorkflowFormBuilder.tsx` |
| 11 | Section CRUD | `FormCanvas.tsx` |
| 12 | Final integration + cleanup | Multiple files |
