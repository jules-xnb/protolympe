# Campaign Dialog Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the "Lancer une campagne" dialog with a 3-step flow (type selection → informations → périmètre), vertical stepper, EO table with grouping/search, and missing role validation.

**Architecture:** Refactor existing `NewCampaignDialog.tsx` with 3 internal steps. Add a new `useMissingRoles` hook that cross-references `node_role_permissions`, `user_role_assignments`, and `user_eo_assignments` to detect EOs missing required respondent roles. No new UI components — stepper and table are inline.

**Tech Stack:** React, TypeScript, Supabase, React Hook Form, Zod, shadcn/ui, Tailwind CSS

---

### Task 1: Create `useMissingRoles` hook

**Files:**
- Create: `src/hooks/useMissingRoles.ts`

**Step 1: Create the hook file**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MissingRolesResult {
  /** Map of eoId → array of missing role names */
  missingByEo: Map<string, string[]>;
  /** The required role IDs for the workflow */
  requiredRoleIds: string[];
  /** Loading state */
  isLoading: boolean;
}

/**
 * For a given workflow, determines which EOs are missing required respondent roles.
 *
 * Logic:
 * 1. Find the workflow's "form" node (node_type='form' or first non-start/end node)
 * 2. Get required roles from node_role_permissions where can_edit=true on that node
 * 3. Get all user_eo_assignments for the client
 * 4. Get all user_role_assignments for users in those EOs that match required roles
 * 5. For each EO, check if at least one user has each required role
 */
export function useMissingRoles(workflowId: string | undefined, clientId: string | undefined) {
  return useQuery({
    queryKey: ['missing_roles', workflowId, clientId],
    queryFn: async (): Promise<Map<string, string[]>> => {
      if (!workflowId || !clientId) return new Map();

      // 1. Get workflow nodes
      const { data: nodes } = await supabase
        .from('workflow_nodes')
        .select('id, node_type')
        .eq('workflow_id', workflowId);

      const formNode = (nodes || []).find(n => n.node_type === 'form');
      if (!formNode) return new Map();

      // 2. Get required roles from node_role_permissions (can_edit on form node = respondent)
      const { data: perms } = await supabase
        .from('node_role_permissions')
        .select('role_id')
        .eq('node_id', formNode.id)
        .eq('can_edit', true);

      const requiredRoleIds = [...new Set((perms || []).map(p => p.role_id))];
      if (requiredRoleIds.length === 0) return new Map();

      // 3. Get role names
      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .in('id', requiredRoleIds);

      const roleNameMap = new Map((roles || []).map(r => [r.id, r.name]));

      // 4. Get all EOs for the client
      const { data: eos } = await supabase
        .from('organizational_entities')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_active', true);

      const eoIds = (eos || []).map(e => e.id);
      if (eoIds.length === 0) return new Map();

      // 5. Get all user_eo_assignments for these EOs
      const { data: eoAssignments } = await supabase
        .from('user_eo_assignments')
        .select('user_id, eo_id')
        .in('eo_id', eoIds)
        .eq('is_active', true);

      // 6. Get all user_role_assignments for the required roles
      const userIds = [...new Set((eoAssignments || []).map(a => a.user_id))];

      let roleAssignments: { user_id: string; role_id: string }[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('user_role_assignments')
          .select('user_id, role_id')
          .in('user_id', userIds)
          .in('role_id', requiredRoleIds)
          .eq('is_active', true);
        roleAssignments = data || [];
      }

      // 7. Build user→roles lookup
      const userRoles = new Map<string, Set<string>>();
      for (const ra of roleAssignments) {
        if (!userRoles.has(ra.user_id)) userRoles.set(ra.user_id, new Set());
        userRoles.get(ra.user_id)!.add(ra.role_id);
      }

      // 8. For each EO, find which required roles have no user covering them
      const eoUsers = new Map<string, string[]>();
      for (const ea of (eoAssignments || [])) {
        if (!eoUsers.has(ea.eo_id)) eoUsers.set(ea.eo_id, []);
        eoUsers.get(ea.eo_id)!.push(ea.user_id);
      }

      const missingByEo = new Map<string, string[]>();
      for (const eoId of eoIds) {
        const usersInEo = eoUsers.get(eoId) || [];
        const coveredRoles = new Set<string>();
        for (const userId of usersInEo) {
          const roles = userRoles.get(userId);
          if (roles) {
            for (const roleId of roles) coveredRoles.add(roleId);
          }
        }
        const missing = requiredRoleIds
          .filter(rid => !coveredRoles.has(rid))
          .map(rid => roleNameMap.get(rid) || rid);
        if (missing.length > 0) {
          missingByEo.set(eoId, missing);
        }
      }

      return missingByEo;
    },
    enabled: !!workflowId && !!clientId,
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/useMissingRoles.ts
git commit -m "feat: add useMissingRoles hook for campaign role validation"
```

---

### Task 2: Refactor NewCampaignDialog — step types and stepper

**Files:**
- Modify: `src/components/user/views/NewCampaignDialog.tsx`

**Step 1: Update step type and add stepper**

Change the `Step` type from `'select_type' | 'configure'` to `'select_type' | 'informations' | 'perimeter'`.

Add a `CampaignStepper` inline component:

```tsx
function CampaignStepper({ currentStep }: { currentStep: 'informations' | 'perimeter' }) {
  const steps = [
    { key: 'informations', label: 'Informations' },
    { key: 'perimeter', label: 'Périmètre' },
  ] as const;

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, idx) => {
        const isCompleted = currentStep === 'perimeter' && step.key === 'informations';
        const isActive = currentStep === step.key;
        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Indicator + line */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 shrink-0',
                isCompleted
                  ? 'bg-primary border-primary text-primary-foreground'
                  : isActive
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-muted-foreground/30 text-muted-foreground'
              )}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div className={cn(
                  'w-0.5 h-6 my-1',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                )} />
              )}
            </div>
            {/* Label */}
            <span className={cn(
              'text-sm pt-1',
              isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Update state management**

Replace `step` state and navigation:
- `select_type` → `informations` (on continue)
- `informations` → `perimeter` (on "Suivant", after form validation of name + dates)
- `perimeter` → submit (on "Lancer la campagne")
- Back navigation: `perimeter` → `informations`, `informations` → `select_type` (if not preselected)

**Step 3: Commit**

```bash
git add src/components/user/views/NewCampaignDialog.tsx
git commit -m "feat: add stepper and 3-step flow structure to campaign dialog"
```

---

### Task 3: Implement "Informations" step (Figma Step 1)

**Files:**
- Modify: `src/components/user/views/NewCampaignDialog.tsx`

**Step 1: Build the informations step UI**

Layout: Stepper on the left, form on the right (or stepper above form on narrow screens).

Form fields (using existing react-hook-form setup):
- "Nom de la campagne" (text input, required)
- "Date de début" (date input, required)
- "Date de fin" (date input, required)

Footer: "Annuler" (closes dialog) / "Suivant" (validates form, moves to perimeter step).

The "Suivant" button should trigger form validation for name + dates only. Use `form.trigger(['name', 'start_date', 'end_date'])` before advancing.

**Step 2: Commit**

```bash
git add src/components/user/views/NewCampaignDialog.tsx
git commit -m "feat: implement informations step with form fields and stepper"
```

---

### Task 4: Implement "Périmètre" step — search, grouping, table

**Files:**
- Modify: `src/components/user/views/NewCampaignDialog.tsx`

**Step 1: Add search and grouping controls**

At the top of the périmètre step:
- Search `<Input>` with `Search` icon, placeholder "Chercher", filters EOs by name/code (case-insensitive)
- "Regroupement" `<Select>` populated from `useEoGroups(clientId)`. Selecting a group calls `useEoGroupMembers(groupId)` and pre-selects those EO IDs in `targets`.

**Step 2: Replace checkbox tree with table**

Replace the current `renderEoItem` recursive renderer with a `<Table>`:
- Header: `Filiales` | `Rôle manquant`
- Rows: hierarchical with indentation via `paddingLeft`. Each row has:
  - Chevron toggle (if has children)
  - Checkbox
  - EO name + code
  - Missing role names from `useMissingRoles` (or "—" if none missing)

Add "Sélectionner toutes les filiales" master checkbox above the table. When checked, selects all visible (search-filtered) root-level EOs with `include_descendants: true`.

**Step 3: Add missing roles warning alert**

Below the table, when any selected EO has missing roles:
```tsx
<Alert variant="destructive">
  <AlertTriangle className="h-4 w-4" />
  <AlertDescription className="flex items-center justify-between">
    <span>Attention, rôle manquant</span>
    <Button variant="outline" size="sm" onClick={handleExportMissing}>
      Exporte la liste
    </Button>
  </AlertDescription>
</Alert>
```

The `handleExportMissing` generates a CSV with columns `Filiale;Code;Rôle manquant` and triggers a download.

Footer: "Annuler" / "Lancer la campagne" (submit).

**Step 4: Commit**

```bash
git add src/components/user/views/NewCampaignDialog.tsx
git commit -m "feat: implement périmètre step with table, search, grouping, role validation"
```

---

### Task 5: Wire up data flow and test end-to-end

**Files:**
- Modify: `src/components/user/views/NewCampaignDialog.tsx`

**Step 1: Wire hooks**

Add to the component:
```tsx
const { data: eoGroups = [] } = useEoGroups(clientId);
const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
const { data: groupMembers = [] } = useEoGroupMembers(selectedGroupId ?? undefined);
const { data: missingRolesMap = new Map() } = useMissingRoles(
  selectedType?.workflow_id,
  clientId
);
```

When `selectedGroupId` changes and `groupMembers` load, pre-select those EOs:
```tsx
useEffect(() => {
  if (groupMembers.length > 0) {
    const newTargets = groupMembers.map(m => ({
      eo_id: m.eo_id,
      include_descendants: m.include_descendants,
    }));
    setTargets(newTargets);
  }
}, [groupMembers]);
```

**Step 2: Add imports**

Add new imports:
```tsx
import { useMissingRoles } from '@/hooks/useMissingRoles';
import { useEoGroups } from '@/hooks/useEoGroups';
import { useEoGroupMembers } from '@/hooks/useEoGroupMembers';
import { AlertTriangle } from 'lucide-react';
```

**Step 3: Handle search filtering**

```tsx
const [searchQuery, setSearchQuery] = useState('');

const filteredEoTree = useMemo(() => {
  if (!searchQuery) return eoTree;
  const query = searchQuery.toLowerCase();
  const matchingIds = new Set<string>();
  // Include matching EOs and their ancestors
  allEos.forEach(eo => {
    if (eo.name.toLowerCase().includes(query) || eo.code?.toLowerCase().includes(query)) {
      matchingIds.add(eo.id);
      // Walk up parents to keep tree structure
      let parentId = eo.parent_id;
      while (parentId) {
        matchingIds.add(parentId);
        const parent = allEos.find(e => e.id === parentId);
        parentId = parent?.parent_id ?? null;
      }
    }
  });
  const filtered = allEos.filter(eo => matchingIds.has(eo.id));
  const roots = filtered.filter(eo => !eo.parent_id || !matchingIds.has(eo.parent_id));
  const childrenMap = new Map<string, typeof filtered>();
  filtered.forEach(eo => {
    if (eo.parent_id && matchingIds.has(eo.parent_id)) {
      const children = childrenMap.get(eo.parent_id) || [];
      children.push(eo);
      childrenMap.set(eo.parent_id, children);
    }
  });
  return { roots, childrenMap };
}, [allEos, searchQuery, eoTree]);
```

**Step 4: Handle "select all" checkbox**

```tsx
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    const rootTargets = filteredEoTree.roots.map(eo => ({
      eo_id: eo.id,
      include_descendants: true,
    }));
    setTargets(rootTargets);
  } else {
    setTargets([]);
  }
};
```

**Step 5: CSV export for missing roles**

```tsx
const handleExportMissing = () => {
  const rows = [['Filiale', 'Code', 'Rôle manquant']];
  targets.forEach(t => {
    const missing = missingRolesMap.get(t.eo_id);
    if (missing && missing.length > 0) {
      const eo = allEos.find(e => e.id === t.eo_id);
      rows.push([eo?.name || '', eo?.code || '', missing.join(', ')]);
    }
  });
  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'roles_manquants.csv';
  a.click();
  URL.revokeObjectURL(url);
};
```

**Step 6: Final commit**

```bash
git add src/components/user/views/NewCampaignDialog.tsx src/hooks/useMissingRoles.ts
git commit -m "feat: wire data flow, search, grouping, CSV export in campaign dialog"
```

---

### Task 6: Clean up and final review

**Files:**
- Modify: `src/components/user/views/NewCampaignDialog.tsx`

**Step 1: Remove dead code**

Remove the old `renderEoItem` function, old step logic (`configure` step), and any unused imports.

**Step 2: Visual polish**

- Ensure the stepper renders correctly at both steps
- Ensure the dialog is scrollable when the EO list is long (use `ScrollArea`)
- Ensure the search input resets when the dialog opens
- Ensure the grouping select resets when the dialog opens

**Step 3: Test manually**

Navigate to the survey creator view, open a campaign type, click "Lancer une campagne":
1. Step 1: Verify stepper shows "1. Informations" active, form fields work, "Suivant" validates
2. Step 2: Verify stepper shows step 1 ✓, search filters, grouping pre-selects, table shows hierarchy, missing roles display, alert appears, CSV export works
3. Submit: Verify campaign creation still works end-to-end

**Step 4: Final commit**

```bash
git add src/components/user/views/NewCampaignDialog.tsx
git commit -m "refactor: clean up campaign dialog, remove old step logic"
```
