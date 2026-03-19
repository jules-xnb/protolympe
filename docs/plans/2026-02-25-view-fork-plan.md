# Fork de vue lors de l'édition par rôle — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Quand un intégrateur modifie les options d'un bloc sur une vue partagée par plusieurs rôles, le système propose de créer une copie de la vue dédiée à ce rôle, afin de ne pas impacter les autres rôles.

**Architecture:** On ajoute un champ `sharedRoleCount` dans `RoleUsageItem` pour que l'UI sache si une vue est partagée. Un nouveau hook `useForkViewForRole` gère l'opération de fork (copie view_config + navigation_config + déplacement nav_permission). Les composants d'options de bloc (EoCardInlineOptions, etc.) passent en mode verrouillé quand la vue est partagée, avec un bouton "Personnaliser pour ce rôle" qui ouvre un dialog de confirmation.

**Tech Stack:** React 18, TypeScript, TanStack Query, Supabase, Shadcn/ui, Tailwind CSS

**Design doc:** `docs/plans/2026-02-25-view-fork-design.md`

---

## Task 1 : Enrichir `RoleUsageItem` avec `sharedRoleCount`

**Files:**
- Modify: `src/hooks/useRoleUsages.ts`

**Contexte:** Le hook doit maintenant calculer combien de rôles ont accès à chaque vue (via nav_permissions) pour que l'UI puisse savoir si la vue est partagée.

**Step 1: Ajouter le champ `sharedRoleCount` à l'interface**

Dans `RoleUsageItem` (ligne 10), ajouter :

```typescript
export interface RoleUsageItem {
  // ... champs existants ...
  sharedRoleCount: number;   // nombre de rôles ayant accès à cette vue (incluant le rôle courant)
}
```

**Step 2: Calculer le nombre de rôles partageant chaque nav_config**

Après l'étape 4 (fetch nav_permissions), ajouter le calcul. On compte les `nav_permissions` distinctes par `role_id` (non-null, `is_visible !== false`) pour chaque `navigation_config_id`.

Insérer après la ligne 143 (après le `permsByNav` grouping) :

```typescript
// Count distinct roles with access per nav config
const roleCountByNav = new Map<string, number>();
for (const [navId, perms] of permsByNav) {
  const allowedRoleIds = new Set(
    perms
      .filter(p => p.is_visible !== false && p.role_id)
      .map(p => p.role_id!)
  );
  roleCountByNav.set(navId, allowedRoleIds.size);
}
```

**Step 3: Passer `sharedRoleCount` dans chaque item**

Dans la boucle de construction du flat list (ligne 227, `items.push`), ajouter :

```typescript
sharedRoleCount: roleCountByNav.get(nav.id) ?? 0,
```

Note : si `sharedRoleCount === 0`, cela signifie qu'il n'y a pas de nav_permissions explicites (vue visible par tous par défaut). Dans ce cas, on considère la vue comme partagée (on ne peut pas la modifier pour un seul rôle sans d'abord définir des permissions explicites).

**Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/hooks/useRoleUsages.ts
git commit -m "feat: add sharedRoleCount to RoleUsageItem for view fork detection"
```

---

## Task 2 : Hook `useForkViewForRole` — Opération de fork

**Files:**
- Create: `src/hooks/useForkViewForRole.ts`

**Contexte:** Ce hook encapsule toute l'opération de fork : copie de view_config, création de navigation_config, déplacement de nav_permission.

**Step 1: Créer le hook**

```typescript
// src/hooks/useForkViewForRole.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface ForkViewParams {
  viewConfigId: string;       // view_config à copier
  navConfigId: string;        // navigation_config dont on copie la structure
  roleId: string;             // rôle pour lequel on fork
  roleName: string;           // nom du rôle (pour le suffixe)
}

interface ForkResult {
  newViewConfigId: string;
  newNavConfigId: string;
}

export function useForkViewForRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ viewConfigId, navConfigId, roleId, roleName }: ForkViewParams): Promise<ForkResult> => {

      // 1. Fetch the original view_config
      const { data: originalView, error: viewError } = await supabase
        .from('view_configs')
        .select('*')
        .eq('id', viewConfigId)
        .single();

      if (viewError || !originalView) throw viewError || new Error('View config not found');

      // 2. Fetch the original navigation_config
      const { data: originalNav, error: navError } = await supabase
        .from('navigation_configs')
        .select('*')
        .eq('id', navConfigId)
        .single();

      if (navError || !originalNav) throw navError || new Error('Nav config not found');

      // 3. Create a copy of the view_config
      const { id: _vcId, created_at: _vcCa, updated_at: _vcUa, ...viewFields } = originalView;
      const newViewName = `${originalView.name || originalNav.label} - ${roleName}`;

      const { data: newView, error: newViewError } = await supabase
        .from('view_configs')
        .insert({
          ...viewFields,
          name: newViewName,
          config: originalView.config as Json,
        })
        .select()
        .single();

      if (newViewError || !newView) throw newViewError || new Error('Failed to create view config copy');

      // 4. Create a new navigation_config pointing to the new view
      const { id: _navId, created_at: _navCa, updated_at: _navUa, ...navFields } = originalNav;
      const newNavSlug = `${originalNav.slug || originalNav.label} - ${roleName}`;

      const { data: newNav, error: newNavError } = await supabase
        .from('navigation_configs')
        .insert({
          ...navFields,
          slug: newNavSlug,
          label: originalNav.label,  // même label affiché
          view_config_id: newView.id,
        })
        .select()
        .single();

      if (newNavError || !newNav) throw newNavError || new Error('Failed to create nav config copy');

      // 5. Create nav_permission for the role on the new nav_config
      const { error: createPermError } = await supabase
        .from('nav_permissions')
        .insert({
          navigation_config_id: newNav.id,
          role_id: roleId,
          is_visible: true,
        });

      if (createPermError) throw createPermError;

      // 6. Remove nav_permission for the role on the original nav_config
      const { error: deletePermError } = await supabase
        .from('nav_permissions')
        .delete()
        .eq('navigation_config_id', navConfigId)
        .eq('role_id', roleId);

      if (deletePermError) throw deletePermError;

      return {
        newViewConfigId: newView.id,
        newNavConfigId: newNav.id,
      };
    },
    onSuccess: () => {
      // Refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['role-usages'] });
      queryClient.invalidateQueries({ queryKey: ['navigation_configs'] });
      queryClient.invalidateQueries({ queryKey: ['view_configs'] });
      toast.success('Vue personnalisée créée pour ce rôle');
    },
    onError: (error) => {
      toast.error('Erreur lors de la personnalisation', {
        description: error.message,
      });
    },
  });
}
```

**Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/hooks/useForkViewForRole.ts
git commit -m "feat: add useForkViewForRole hook for view fork operation"
```

---

## Task 3 : Dialog `ForkViewConfirmDialog`

**Files:**
- Create: `src/components/admin/roles/ForkViewConfirmDialog.tsx`

**Contexte:** Dialog de confirmation avant le fork. Affiche les rôles qui partagent la vue et demande confirmation.

**Step 1: Créer le composant**

```typescript
// src/components/admin/roles/ForkViewConfirmDialog.tsx
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

interface ForkViewConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  roleName: string;
  viewName: string;
  sharedRoleCount: number;
  isPending: boolean;
}

export function ForkViewConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  roleName,
  viewName,
  sharedRoleCount,
  isPending,
}: ForkViewConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Personnaliser la vue pour ce rôle</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                La vue <strong>"{viewName}"</strong> est actuellement partagée
                avec <strong>{sharedRoleCount - 1} autre{sharedRoleCount > 2 ? 's' : ''} rôle{sharedRoleCount > 2 ? 's' : ''}</strong>.
              </p>
              <p>
                Une copie de la vue sera créée avec les mêmes options,
                dédiée au rôle <strong>"{roleName}"</strong>.
                Les autres rôles ne seront pas impactés.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Création...' : 'Personnaliser'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 2: Vérifier que AlertDialog existe dans le projet**

Run: vérifier que `@/components/ui/alert-dialog` existe. Si non, utiliser le composant `Dialog` de Shadcn avec les mêmes props.

**Step 3: Commit**

```bash
git add src/components/admin/roles/ForkViewConfirmDialog.tsx
git commit -m "feat: add ForkViewConfirmDialog for view fork confirmation"
```

---

## Task 4 : Modifier `EoCardInlineOptions` — Mode verrouillé + fork

**Files:**
- Modify: `src/components/admin/roles/block-options/EoCardInlineOptions.tsx`

**Contexte:** Quand `sharedRoleCount >= 2`, les options sont verrouillées (disabled) avec un badge "Partagée" et un bouton "Personnaliser pour ce rôle". Le clic sur ce bouton ouvre le dialog de confirmation, qui appelle `useForkViewForRole`.

**Step 1: Ajouter les nouvelles props**

Modifier l'interface `EoCardInlineOptionsProps` :

```typescript
interface EoCardInlineOptionsProps {
  viewConfigId: string;
  blockIndex: number;
  config: EoCardBlock['config'];
  navConfigId: string;            // NOUVEAU
  viewName: string;               // NOUVEAU
  roleId: string;                 // NOUVEAU
  roleName: string;               // NOUVEAU
  sharedRoleCount: number;        // NOUVEAU
}
```

**Step 2: Ajouter la logique de verrouillage**

En haut du composant, après les hooks existants :

```typescript
const isShared = sharedRoleCount >= 2;
const forkMutation = useForkViewForRole();
const [forkDialogOpen, setForkDialogOpen] = useState(false);

const handleFork = () => {
  forkMutation.mutate(
    { viewConfigId, navConfigId, roleId, roleName },
    { onSuccess: () => setForkDialogOpen(false) }
  );
};
```

**Step 3: Wrapper conditionnel dans le JSX**

Si `isShared`, afficher en haut de la zone :
- Badge "Partagée avec N rôles"
- Bouton "Personnaliser pour ce rôle"
- Tous les toggles/switches reçoivent `disabled={true}`

Si `!isShared`, comportement actuel inchangé.

Ajouter avant le grid des options :

```tsx
{isShared && (
  <div className="flex items-center justify-between p-3 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
    <div className="flex items-center gap-2 text-sm text-amber-800">
      <Users className="h-4 w-4" />
      Partagée avec {sharedRoleCount - 1} autre{sharedRoleCount > 2 ? 's' : ''} rôle{sharedRoleCount > 2 ? 's' : ''}
    </div>
    <Button size="sm" onClick={() => setForkDialogOpen(true)}>
      Personnaliser pour ce rôle
    </Button>
  </div>
)}
```

**Step 4: Passer `disabled={isShared}` à tous les Switch et Checkbox**

Chaque `<Switch>` et `<Checkbox>` reçoit la prop `disabled={isShared}`.
Les `<Button>` de config avancée (colonnes, champs, filtres, pré-filtres) reçoivent aussi `disabled={isShared}`.

**Step 5: Ajouter le dialog de fork à la fin du JSX**

```tsx
<ForkViewConfirmDialog
  open={forkDialogOpen}
  onOpenChange={setForkDialogOpen}
  onConfirm={handleFork}
  roleName={roleName}
  viewName={viewName}
  sharedRoleCount={sharedRoleCount}
  isPending={forkMutation.isPending}
/>
```

**Step 6: Ajouter les imports**

```typescript
import { useForkViewForRole } from '@/hooks/useForkViewForRole';
import { ForkViewConfirmDialog } from '@/components/admin/roles/ForkViewConfirmDialog';
import { Users } from 'lucide-react';
```

**Step 7: Vérifier la compilation et commit**

```bash
git add src/components/admin/roles/block-options/EoCardInlineOptions.tsx
git commit -m "feat: add shared view lock + fork trigger to EoCardInlineOptions"
```

---

## Task 5 : Modifier `RoleUsagesTable` — Passer les nouvelles props

**Files:**
- Modify: `src/components/admin/roles/RoleUsagesTable.tsx`

**Contexte:** Le composant doit passer les nouvelles props (`navConfigId`, `viewName`, `roleId`, `roleName`, `sharedRoleCount`) aux composants d'options de bloc.

**Step 1: Ajouter `roleId` et `roleName` aux props**

```typescript
interface RoleUsagesTableProps {
  usages: RoleUsageItem[];
  isLoading: boolean;
  roleId: string;        // NOUVEAU
  roleName: string;      // NOUVEAU
}
```

**Step 2: Modifier `renderBlockOptions` pour passer les nouvelles props**

```typescript
const renderBlockOptions = (usage: RoleUsageItem) => {
  switch (usage.blockType) {
    case 'eo_card':
      return (
        <EoCardInlineOptions
          viewConfigId={usage.viewConfigId}
          blockIndex={usage.blockIndex}
          config={usage.blockConfig as EoCardBlock['config']}
          navConfigId={usage.navConfigId}
          viewName={usage.viewName}
          roleId={roleId}
          roleName={roleName}
          sharedRoleCount={usage.sharedRoleCount}
        />
      );
    default:
      return (
        <div className="p-4 bg-muted/30 text-sm text-muted-foreground">
          Configuration non disponible pour ce type de bloc.
        </div>
      );
  }
};
```

**Step 3: Commit**

```bash
git add src/components/admin/roles/RoleUsagesTable.tsx
git commit -m "feat: pass roleId, roleName, and sharedRoleCount to block options"
```

---

## Task 6 : Modifier `RolesPage` — Passer `roleId` et `roleName` à `RoleUsagesTable`

**Files:**
- Modify: `src/pages/admin/RolesPage.tsx`

**Contexte:** Le composant `RoleUsagesTable` a maintenant besoin de `roleId` et `roleName`.

**Step 1: Mettre à jour l'appel à RoleUsagesTable**

Remplacer :
```tsx
<RoleUsagesTable
  usages={usages}
  isLoading={loadingUsages}
/>
```

Par :
```tsx
<RoleUsagesTable
  usages={usages}
  isLoading={loadingUsages}
  roleId={selectedRole.id}
  roleName={selectedRole.name}
/>
```

Note : `selectedRole` est forcément non-null ici car on est dans le bloc `{selectedRole ? (...) : ...}`.

**Step 2: Commit**

```bash
git add src/pages/admin/RolesPage.tsx
git commit -m "feat: pass roleId and roleName to RoleUsagesTable for fork support"
```

---

## Task 7 : Test manuel et polish

**Steps:**

1. Lancer le serveur de dev (`npm run dev`)
2. Naviguer vers `/dashboard/roles`
3. Sélectionner un rôle qui a accès à une vue partagée avec d'autres rôles
4. Expand la ligne → vérifier : badge "Partagée", options désactivées, bouton "Personnaliser"
5. Cliquer "Personnaliser" → vérifier le dialog de confirmation
6. Confirmer → vérifier :
   - Toast de succès
   - La ligne se recharge avec la vue forkée
   - Les options sont maintenant éditables
   - Les autres rôles n'ont pas été impactés
7. Sélectionner un rôle seul sur une vue → vérifier : pas de badge, options éditables directement

---

## Résumé des fichiers

| Action | Fichier |
|---|---|
| Modify | `src/hooks/useRoleUsages.ts` — ajout `sharedRoleCount` |
| Create | `src/hooks/useForkViewForRole.ts` — mutation de fork |
| Create | `src/components/admin/roles/ForkViewConfirmDialog.tsx` — dialog confirmation |
| Modify | `src/components/admin/roles/block-options/EoCardInlineOptions.tsx` — mode verrouillé + fork |
| Modify | `src/components/admin/roles/RoleUsagesTable.tsx` — nouvelles props |
| Modify | `src/pages/admin/RolesPage.tsx` — passer roleId/roleName |


