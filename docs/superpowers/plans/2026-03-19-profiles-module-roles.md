# Profiles → Module Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace global roles with module roles in profile templates, then remove the global roles system entirely.

**Architecture:** Profile templates will link to `module_roles` instead of `roles`. The UI selector groups roles by module (replacing categories). All global role tables/routes/hooks/pages are deleted.

**Tech Stack:** Drizzle ORM, Hono, React, TanStack Query, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-19-profiles-module-roles-design.md`

---

### Task 1: Schema — Replace `profile_template_roles` with `profile_template_module_roles`

**Files:**
- Modify: `server/src/db/schema.ts`

- [ ] **Step 1: Add `profileTemplateModuleRoles` table**

In `schema.ts`, after the `profileTemplateEoGroups` definition (~line 598), replace `profileTemplateRoles`:

```ts
export const profileTemplateModuleRoles = pgTable('profile_template_module_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => profileTemplates.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Remove old `profileTemplateRoles` export**

Delete the `profileTemplateRoles` table definition (lines 600-605).

- [ ] **Step 3: Remove `roles`, `roleCategories`, `userRoleAssignments` tables**

Delete:
- `roleCategories` (lines 273-285)
- `roles` (lines 287-299)
- `userRoleAssignments` (lines 301-308)

- [ ] **Step 4: Nullify FK references to `roles` in other tables**

Tables `nodeFieldRoleOverrides`, `nodeRolePermissions`, `viewPermissions`, `navPermissions`, `surveyResponsePermissions` reference `roles`. Remove the `.references()` call but keep the columns (they become unlinked UUIDs for now):

```ts
// nodeFieldRoleOverrides line 467
roleId: uuid('role_id').notNull(),  // was .references(() => roles.id, ...)

// nodeRolePermissions line 478
roleId: uuid('role_id').notNull(),  // was .references(() => roles.id, ...)

// viewPermissions line 649
roleId: uuid('role_id'),  // was .references(() => roles.id, ...)
categoryId: uuid('category_id'),  // was .references(() => roleCategories.id, ...)

// navPermissions line 659
roleId: uuid('role_id'),  // was .references(() => roles.id, ...)
categoryId: uuid('category_id'),  // was .references(() => roleCategories.id, ...)

// surveyResponsePermissions line 557
roleId: uuid('role_id').notNull(),  // was .references(() => roles.id, ...)
```

- [ ] **Step 5: Run the SQL migration on Neon**

```sql
CREATE TABLE IF NOT EXISTS profile_template_module_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
  module_role_id UUID NOT NULL REFERENCES module_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS profile_template_roles;
DROP TABLE IF EXISTS user_role_assignments;

ALTER TABLE node_field_role_overrides DROP CONSTRAINT IF EXISTS node_field_role_overrides_role_id_roles_id_fk;
ALTER TABLE node_role_permissions DROP CONSTRAINT IF EXISTS node_role_permissions_role_id_roles_id_fk;
ALTER TABLE view_permissions DROP CONSTRAINT IF EXISTS view_permissions_role_id_roles_id_fk;
ALTER TABLE view_permissions DROP CONSTRAINT IF EXISTS view_permissions_category_id_role_categories_id_fk;
ALTER TABLE nav_permissions DROP CONSTRAINT IF EXISTS nav_permissions_role_id_roles_id_fk;
ALTER TABLE nav_permissions DROP CONSTRAINT IF EXISTS nav_permissions_category_id_role_categories_id_fk;
ALTER TABLE survey_response_permissions DROP CONSTRAINT IF EXISTS survey_response_permissions_role_id_roles_id_fk;

DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS role_categories;
```

---

### Task 2: API — Update `profile-templates.ts` routes

**Files:**
- Modify: `server/src/routes/profile-templates.ts`

- [ ] **Step 1: Update imports**

Replace `profileTemplateRoles, roles` with `profileTemplateModuleRoles, moduleRoles, clientModules`.

- [ ] **Step 2: Update GET /:id — join module_roles + client_modules**

Replace the `templateRoles` query (lines 109-119):

```ts
db
  .select({
    id: profileTemplateModuleRoles.id,
    templateId: profileTemplateModuleRoles.templateId,
    moduleRoleId: profileTemplateModuleRoles.moduleRoleId,
    createdAt: profileTemplateModuleRoles.createdAt,
    roleName: moduleRoles.name,
    roleColor: moduleRoles.color,
    moduleSlug: clientModules.moduleSlug,
  })
  .from(profileTemplateModuleRoles)
  .leftJoin(moduleRoles, eq(profileTemplateModuleRoles.moduleRoleId, moduleRoles.id))
  .leftJoin(clientModules, eq(moduleRoles.clientModuleId, clientModules.id))
  .where(eq(profileTemplateModuleRoles.templateId, id)),
```

- [ ] **Step 3: Update GET /:id/roles**

Same join as above for the dedicated roles endpoint.

- [ ] **Step 4: Update POST /:id/roles**

Accept `moduleRoleId` instead of `roleId`:

```ts
const addRoleSchema = z.object({
  moduleRoleId: z.string().uuid(),
});
// Insert into profileTemplateModuleRoles
```

- [ ] **Step 5: Update DELETE /roles/:id**

Use `profileTemplateModuleRoles` table.

---

### Task 3: API — Add `module-roles/by-client` endpoint

**Files:**
- Modify: `server/src/routes/module-roles.ts`

- [ ] **Step 1: Add GET /by-client?client_id=X endpoint**

Returns all module_roles for a client, grouped by module, for modules with `hasRoles: true`:

```ts
moduleRolesRouter.get('/by-client', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) return c.json({ error: 'client_id requis' }, 400);

  const result = await db
    .select({
      id: moduleRoles.id,
      clientModuleId: moduleRoles.clientModuleId,
      name: moduleRoles.name,
      slug: moduleRoles.slug,
      color: moduleRoles.color,
      description: moduleRoles.description,
      isActive: moduleRoles.isActive,
      createdAt: moduleRoles.createdAt,
      moduleSlug: clientModules.moduleSlug,
    })
    .from(moduleRoles)
    .innerJoin(clientModules, eq(moduleRoles.clientModuleId, clientModules.id))
    .where(and(eq(clientModules.clientId, clientId), eq(clientModules.isActive, true)))
    .orderBy(clientModules.moduleSlug, moduleRoles.name);

  return c.json(toSnakeCase(result));
});
```

---

### Task 4: API — Remove global roles routes & server mount

**Files:**
- Modify: `server/src/index.ts`
- Delete: `server/src/routes/roles.ts`

- [ ] **Step 1: Remove roles route from index.ts**

Remove import of `rolesRouter` (line 18) and the route mount `app.route('/api/roles', rolesRouter)` (line 55).

- [ ] **Step 2: Delete `server/src/routes/roles.ts`**

---

### Task 5: Frontend — Add `useModuleRolesByClient` hook

**Files:**
- Create: `src/hooks/useModuleRolesByClient.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { MODULE_CATALOG } from '@/lib/module-catalog';
import type { ModuleRole } from '@/hooks/useModuleRoles';

export interface ModuleRoleWithModule extends ModuleRole {
  module_slug: string;
}

export interface ModuleWithRoles {
  moduleSlug: string;
  moduleLabel: string;
  moduleIcon: string;
  roles: ModuleRoleWithModule[];
}

export function useModuleRolesByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['module_roles_by_client', clientId],
    queryFn: async (): Promise<ModuleRoleWithModule[]> => {
      if (!clientId) return [];
      return api.get<ModuleRoleWithModule[]>(`/api/module-roles/by-client?client_id=${clientId}`);
    },
    enabled: !!clientId,
  });
}

/** Group flat module roles into modules for UI display */
export function groupRolesByModule(roles: ModuleRoleWithModule[]): ModuleWithRoles[] {
  const moduleMap = new Map<string, ModuleRoleWithModule[]>();
  for (const role of roles) {
    const list = moduleMap.get(role.module_slug) ?? [];
    list.push(role);
    moduleMap.set(role.module_slug, list);
  }

  return Array.from(moduleMap.entries()).map(([slug, moduleRoles]) => {
    const catalog = MODULE_CATALOG[slug];
    return {
      moduleSlug: slug,
      moduleLabel: catalog?.label ?? slug,
      moduleIcon: catalog?.icon ?? 'Box',
      roles: moduleRoles,
    };
  });
}
```

---

### Task 6: Frontend — Rewrite `RoleSelector.tsx` for modules

**Files:**
- Modify: `src/components/admin/users/profile-form/RoleSelector.tsx`

- [ ] **Step 1: Rewrite to use modules instead of categories**

Replace the entire component. Accept `modules: ModuleWithRoles[]` instead of `categories/rolesByCategory`. Each collapsible section = a module with its icon and label. Roles within are checkboxes like before.

---

### Task 7: Frontend — Update `SelectionBadges.tsx`

**Files:**
- Modify: `src/components/admin/users/profile-form/SelectionBadges.tsx`

- [ ] **Step 1: Replace `RoleWithCategory` with `ModuleRoleWithModule`**

Change the `roles` prop type and display. Keep same visual style but use `ModuleRoleWithModule` for the lookup.

---

### Task 8: Frontend — Update `ProfileTemplateFormDialog.tsx`

**Files:**
- Modify: `src/components/admin/profiles/ProfileTemplateFormDialog.tsx`

- [ ] **Step 1: Replace role data loading**

Remove `useRolesByClient`, `useRoleCategoriesByClient`. Add `useModuleRolesByClient` + `groupRolesByModule`.

- [ ] **Step 2: Replace role state**

`expandedCategories` → `expandedModules`. `rolesByCategory` → computed from `groupRolesByModule`. `filteredRoles` filters on `ModuleRoleWithModule[]`.

- [ ] **Step 3: Update RoleSelector props**

Pass `modules` (from `groupRolesByModule`) instead of `categories`/`rolesByCategory`.

- [ ] **Step 4: Update SelectionBadges props**

Pass the flat `moduleRoles` array instead of global `roles`.

- [ ] **Step 5: Update handleSubmit**

`role_ids` still sends an array of IDs — but they're now `module_role.id` values. The field name stays `role_ids` on the client; the server knows to insert into `profile_template_module_roles`.

---

### Task 9: Frontend — Update `ProfileTemplateDetailsDrawer.tsx`

**Files:**
- Modify: `src/components/admin/profiles/ProfileTemplateDetailsDrawer.tsx`

- [ ] **Step 1: Update role display**

Group by `module_slug` instead of `role_category_name`. Use module label from catalog as section header.

---

### Task 10: Frontend — Update `useProfileTemplates.ts` types

**Files:**
- Modify: `src/hooks/useProfileTemplates.ts`

- [ ] **Step 1: Update `ProfileTemplate.roles` type**

```ts
roles: Array<{
  id: string;
  module_role_id: string;
  role_name: string;
  role_color: string | null;
  module_slug: string;
}>;
```

---

### Task 11: Frontend — Remove global roles pages, hooks, components

**Files:**
- Delete: `src/pages/admin/RolesPage.tsx`
- Delete: `src/pages/admin/RolesArchivedPage.tsx`
- Delete: `src/pages/admin/RolesImportPage.tsx`
- Delete: `src/hooks/useRoles.ts`
- Delete: `src/hooks/useRoleCategories.ts`
- Delete: `src/components/admin/roles/RoleFormDialog.tsx`
- Delete: `src/components/admin/roles/RoleSidebar.tsx`
- Delete: `src/components/admin/roles/RoleDetailHeader.tsx`
- Delete: `src/components/admin/roles/RoleSidebar.tsx`
- Delete: `src/components/admin/role-categories/RoleCategoryFormDialog.tsx`
- Delete: `src/components/admin/users/UserRoleAssignmentDialog.tsx`
- Modify: `src/App.tsx` — remove roles routes (lines 49-51, 168-170)
- Modify: `src/lib/query-keys.ts` — remove `roles` and `roleCategories` sections
- Modify: `src/components/profile/SelectionBadges.tsx` — update to use ModuleRoleWithModule
- Modify: Any other file importing from `useRoles` or `useRoleCategories`

- [ ] **Step 1: Remove routes from App.tsx**
- [ ] **Step 2: Delete all files listed above**
- [ ] **Step 3: Clean up query-keys.ts**
- [ ] **Step 4: Update `src/components/profile/SelectionBadges.tsx`**
- [ ] **Step 5: Fix any remaining import errors**

---

### Task 12: Verify build

- [ ] **Step 1: Run TypeScript compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Fix any type errors**

- [ ] **Step 3: Run dev server to verify**

```bash
npm run dev
```
