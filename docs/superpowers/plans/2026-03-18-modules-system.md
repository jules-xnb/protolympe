# Modules System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the page-builder-centric navigation with a module-based system where predefined business modules (Organisation, User, Collecte de valeur, Assurance, Profils) can be activated per client, each with its own roles, permissions, workflows, and BO configuration.

**Architecture:** Modules are code-defined catalog entries. A `client_modules` table tracks activation per client. Navigation is extended with a `module` type linking to `client_modules`. When an integrator enters a module config, the sidebar swaps to show module-specific sub-pages (Général, BO, Workflows, Rôles, Permissions, Paramètres). All state is URL-driven.

**Tech Stack:** Hono (backend), Drizzle ORM + Neon (DB), React + React Router + TanStack Query (frontend), Shadcn/ui (components)

**Spec:** `docs/superpowers/specs/2026-03-18-modules-system-design.md`

---

## File Structure

### Backend (server/src/)

| File | Responsibility |
|------|---------------|
| `db/schema.ts` | Add 5 new tables: `client_modules`, `module_roles`, `module_permissions`, `module_workflows`, `module_bo_links`. Extend `navigation_configs` with `type` + `client_module_id` |
| `lib/module-catalog.ts` | Module catalog definition (slugs, labels, icons, capabilities, permissions list) |
| `routes/modules.ts` | CRUD for `client_modules` + catalog endpoint |
| `routes/module-roles.ts` | CRUD for `module_roles` within a module |
| `routes/module-permissions.ts` | Read/update permission matrix for a module |
| `routes/module-workflows.ts` | CRUD for `module_workflows` within a module |
| `routes/module-bo-links.ts` | CRUD for `module_bo_links` within a module |
| `routes/navigation.ts` | CRUD for `navigation_configs` (replaces Supabase direct calls) |
| `middleware/module-access.ts` | Middleware to verify user has access to the module's client |

### Frontend (src/)

| File | Responsibility |
|------|---------------|
| `lib/module-catalog.ts` | Frontend copy of module catalog (labels, icons, capabilities, permissions) |
| `hooks/useModules.ts` | Hooks for `client_modules` CRUD via API |
| `hooks/useModuleRoles.ts` | Hooks for `module_roles` CRUD via API |
| `hooks/useModulePermissions.ts` | Hooks for permission matrix read/update via API |
| `hooks/useModuleWorkflows.ts` | Hooks for `module_workflows` CRUD via API |
| `hooks/useModuleBoLinks.ts` | Hooks for `module_bo_links` CRUD via API |
| `pages/admin/ModulesPage.tsx` | Modify: add "Nouveau module" in dropdown, handle module click → navigate |
| `pages/admin/ModuleConfigPage.tsx` | New: module config wrapper with sub-routing |
| `pages/admin/module-config/ModuleGeneralPage.tsx` | New: general settings form |
| `pages/admin/module-config/ModuleRolesPage.tsx` | New: roles list + CRUD |
| `pages/admin/module-config/ModulePermissionsPage.tsx` | New: permissions matrix |
| `pages/admin/module-config/ModuleWorkflowsPage.tsx` | New: workflows list |
| `pages/admin/module-config/ModuleBoPage.tsx` | New: BO links list |
| `pages/admin/module-config/ModuleSettingsPage.tsx` | New: module-specific config form |
| `components/admin/modules/AddModuleDialog.tsx` | New: dialog to pick module from catalog |
| `components/admin/modules/ModuleConfigSidebar.tsx` | New: sidebar for module config sub-pages |
| `components/admin/modules/PermissionsMatrix.tsx` | New: cross-table permissions × roles |
| `components/layout/AppSidebar.tsx` | Modify: detect module config routes, swap sidebar content |
| `App.tsx` | Modify: add module config routes |

---

## Task 1: Backend — DB Schema + Migration

**Files:**
- Modify: `server/src/db/schema.ts`
- Create: `server/src/migrate-modules.ts`

- [ ] **Step 1: Add new tables to Drizzle schema**

Add to `server/src/db/schema.ts`:

```typescript
// After existing tables...

export const clientModules = pgTable('client_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  moduleSlug: text('module_slug').notNull(),
  config: jsonb('config').default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// TODO: add unique constraint (client_id, module_slug) in migration

export const moduleRoles = pgTable('module_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  color: text('color'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const modulePermissions = pgTable('module_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  permissionSlug: text('permission_slug').notNull(),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  isGranted: boolean('is_granted').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleWorkflows = pgTable('module_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleBoLinks = pgTable('module_bo_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  boDefinitionId: uuid('bo_definition_id').notNull(),
  config: jsonb('config'),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const navigationConfigs = pgTable('navigation_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  label: text('label').notNull(),
  displayLabel: text('display_label'),
  slug: text('slug').notNull(),
  icon: text('icon'),
  type: text('type').default('group').notNull(), // 'group' | 'page' | 'module'
  viewConfigId: uuid('view_config_id'),
  clientModuleId: uuid('client_module_id').references(() => clientModules.id, { onDelete: 'set null' }),
  url: text('url'),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
});
```

- [ ] **Step 2: Write migration script**

Create `server/src/migrate-modules.ts` using raw SQL via neon to create tables and add unique constraints. Run it.

- [ ] **Step 3: Verify schema**

```bash
cd server && npx tsx src/migrate-modules.ts
```

- [ ] **Step 4: Commit**

```bash
git add server/src/db/schema.ts server/src/migrate-modules.ts
git commit -m "feat: add module system DB schema (client_modules, module_roles, module_permissions, module_workflows, module_bo_links, navigation_configs)"
```

---

## Task 2: Backend — Module Catalog + Modules API

**Files:**
- Create: `server/src/lib/module-catalog.ts`
- Create: `server/src/routes/modules.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create module catalog**

```typescript
// server/src/lib/module-catalog.ts
export interface ModuleCatalogEntry {
  slug: string;
  label: string;
  icon: string;
  description: string;
  hasBo: boolean;
  hasWorkflows: boolean;
  hasRoles: boolean;
  permissions: { slug: string; label: string }[];
}

export const MODULE_CATALOG: Record<string, ModuleCatalogEntry> = {
  organisation: {
    slug: 'organisation',
    label: 'Organisation',
    icon: 'Building2',
    description: 'Affichage des entités organisationnelles',
    hasBo: false, hasWorkflows: false, hasRoles: false,
    permissions: [],
  },
  user: {
    slug: 'user',
    label: 'Utilisateurs',
    icon: 'Users',
    description: 'Gestion des utilisateurs',
    hasBo: false, hasWorkflows: false, hasRoles: false,
    permissions: [],
  },
  collecte_valeur: {
    slug: 'collecte_valeur',
    label: 'Collecte de valeur',
    icon: 'ClipboardList',
    description: 'Questionnaires et collecte de réponses',
    hasBo: true, hasWorkflows: true, hasRoles: true,
    permissions: [
      { slug: 'create_campaign', label: 'Créer une campagne' },
      { slug: 'edit_campaign', label: 'Modifier une campagne' },
      { slug: 'delete_campaign', label: 'Supprimer une campagne' },
      { slug: 'view_responses', label: 'Voir les réponses' },
      { slug: 'respond', label: 'Répondre' },
      { slug: 'validate_response', label: 'Valider une réponse' },
      { slug: 'reject_response', label: 'Rejeter une réponse' },
      { slug: 'export', label: 'Exporter' },
      { slug: 'import', label: 'Importer' },
    ],
  },
  assurance: {
    slug: 'assurance',
    label: 'Assurance',
    icon: 'Shield',
    description: 'Module assurance (à venir)',
    hasBo: false, hasWorkflows: false, hasRoles: false,
    permissions: [],
  },
  profils: {
    slug: 'profils',
    label: 'Profils',
    icon: 'UserCircle',
    description: 'Gestion des profils utilisateurs',
    hasBo: false, hasWorkflows: false, hasRoles: false,
    permissions: [],
  },
};
```

- [ ] **Step 2: Create modules route**

Create `server/src/routes/modules.ts` with:
- `GET /modules/catalog` — return the catalog
- `GET /modules?client_id=X` — list activated modules for a client
- `GET /modules/:id` — get a single client_module with catalog info
- `POST /modules` — activate a module for a client (create client_module)
- `PATCH /modules/:id` — update config/is_active
- `DELETE /modules/:id` — deactivate (delete client_module + cascade)

- [ ] **Step 3: Register route in index.ts**

Add `app.route('/api/modules', modulesRouter);` to `server/src/index.ts`.

- [ ] **Step 4: Test with curl**

```bash
# Get catalog
curl -s http://localhost:3001/api/modules/catalog -H "Authorization: Bearer $TOKEN"

# Activate a module
curl -s -X POST http://localhost:3001/api/modules -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"clientId":"<client-id>","moduleSlug":"collecte_valeur"}'
```

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/module-catalog.ts server/src/routes/modules.ts server/src/index.ts
git commit -m "feat: add module catalog and client_modules API"
```

---

## Task 3: Backend — Module Roles + Permissions API

**Files:**
- Create: `server/src/routes/module-roles.ts`
- Create: `server/src/routes/module-permissions.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create module-roles route**

`server/src/routes/module-roles.ts`:
- `GET /module-roles?module_id=X` — list roles for a module
- `POST /module-roles` — create role
- `PATCH /module-roles/:id` — update role
- `DELETE /module-roles/:id` — delete role (cascades permissions)

All responses use `toSnakeCase()` for frontend compatibility.

- [ ] **Step 2: Create module-permissions route**

`server/src/routes/module-permissions.ts`:
- `GET /module-permissions?module_id=X` — return full matrix: `{ permissions: [...], roles: [...], grants: { [permSlug]: { [roleId]: boolean } } }`
- `PUT /module-permissions` — bulk update grants: `{ module_id, grants: { [permSlug]: { [roleId]: boolean } } }`

The GET endpoint merges catalog permissions with DB grants. Missing grants default to `false`.

- [ ] **Step 3: Register routes**

Add to `server/src/index.ts`:
```typescript
app.route('/api/module-roles', moduleRolesRouter);
app.route('/api/module-permissions', modulePermissionsRouter);
```

- [ ] **Step 4: Test with curl**

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/module-roles.ts server/src/routes/module-permissions.ts server/src/index.ts
git commit -m "feat: add module roles and permissions matrix API"
```

---

## Task 4: Backend — Navigation Configs API

**Files:**
- Create: `server/src/routes/navigation.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create navigation route**

`server/src/routes/navigation.ts`:
- `GET /navigation?client_id=X` — list all nav configs for a client (with `type` and `client_module_id`)
- `POST /navigation` — create nav config (group, page, or module)
- `PATCH /navigation/:id` — update nav config
- `DELETE /navigation/:id` — delete nav config (cascade children)
- `PATCH /navigation/reorder` — batch reorder: `{ items: [{ id, display_order, parent_id }] }`

For type `module`, creating a nav config also requires a `client_module_id`.

- [ ] **Step 2: Register route**

- [ ] **Step 3: Test**

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/navigation.ts server/src/index.ts
git commit -m "feat: add navigation configs API with module type support"
```

---

## Task 5: Backend — Module Workflows + BO Links API

**Files:**
- Create: `server/src/routes/module-workflows.ts`
- Create: `server/src/routes/module-bo-links.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create module-workflows route**

Standard CRUD scoped to `client_module_id`.

- [ ] **Step 2: Create module-bo-links route**

Standard CRUD scoped to `client_module_id`:
- `GET /module-bo-links?module_id=X` — list BO links
- `POST /module-bo-links` — link a BO to a module
- `PATCH /module-bo-links/:id` — update config/order
- `DELETE /module-bo-links/:id` — unlink

- [ ] **Step 3: Register routes**

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/module-workflows.ts server/src/routes/module-bo-links.ts server/src/index.ts
git commit -m "feat: add module workflows and BO links API"
```

---

## Task 6: Frontend — Module Catalog + Hooks

**Files:**
- Create: `src/lib/module-catalog.ts`
- Create: `src/hooks/useModules.ts`
- Create: `src/hooks/useModuleRoles.ts`
- Create: `src/hooks/useModulePermissions.ts`

- [ ] **Step 1: Create frontend module catalog**

Copy the catalog definition (same as backend) to `src/lib/module-catalog.ts`. Export `MODULE_CATALOG`, `ModuleCatalogEntry`, and helper `getModuleCatalog(slug)`.

- [ ] **Step 2: Create useModules hook**

```typescript
// src/hooks/useModules.ts
export function useModuleCatalog()  // GET /modules/catalog
export function useClientModules(clientId)  // GET /modules?client_id=X
export function useClientModule(id)  // GET /modules/:id
export function useActivateModule()  // POST /modules
export function useUpdateModule()  // PATCH /modules/:id
export function useDeactivateModule()  // DELETE /modules/:id
```

- [ ] **Step 3: Create useModuleRoles hook**

```typescript
// src/hooks/useModuleRoles.ts
export function useModuleRoles(moduleId)  // GET /module-roles?module_id=X
export function useCreateModuleRole()
export function useUpdateModuleRole()
export function useDeleteModuleRole()
```

- [ ] **Step 4: Create useModulePermissions hook**

```typescript
// src/hooks/useModulePermissions.ts
export function useModulePermissions(moduleId)  // GET /module-permissions?module_id=X
export function useUpdateModulePermissions()  // PUT /module-permissions
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/module-catalog.ts src/hooks/useModules.ts src/hooks/useModuleRoles.ts src/hooks/useModulePermissions.ts
git commit -m "feat: add frontend module catalog and hooks"
```

---

## Task 7: Frontend — Navigation Page Updates

**Files:**
- Modify: `src/pages/admin/ModulesPage.tsx`
- Create: `src/components/admin/modules/AddModuleDialog.tsx`
- Modify: `src/components/builder/modules/ModulesEditor.tsx`
- Modify: `src/components/builder/modules/modules-tree/TreeRow.tsx`

- [ ] **Step 1: Create AddModuleDialog**

Dialog that shows the module catalog. Filters out modules already activated for the client. On select: calls `useActivateModule()` + `useCreateNavigationConfig()` with `type: 'module'`.

- [ ] **Step 2: Add "Nouveau module" to ModulesPage dropdown**

In the "Ajouter" dropdown, add a third option "Nouveau module" that opens AddModuleDialog.

- [ ] **Step 3: Update ModulesEditor to handle module type**

When an item has `type === 'module'` (or `client_module_id` is set):
- Click on the item navigates to `/dashboard/:clientId/modules/:clientModuleId/general` instead of opening a dialog
- Show the module's catalog icon instead of folder icon

- [ ] **Step 4: Update TreeRow to show module items differently**

Module items get:
- Distinct icon from catalog (or puzzle piece icon)
- Click → navigate instead of expand/edit
- No "Add View" or "Add Group" child action

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ModulesPage.tsx src/components/admin/modules/AddModuleDialog.tsx \
  src/components/builder/modules/ModulesEditor.tsx src/components/builder/modules/modules-tree/TreeRow.tsx
git commit -m "feat: add module support to navigation page"
```

---

## Task 8: Frontend — Module Config Pages + Routing

**Files:**
- Create: `src/pages/admin/ModuleConfigPage.tsx`
- Create: `src/pages/admin/module-config/ModuleGeneralPage.tsx`
- Create: `src/pages/admin/module-config/ModuleRolesPage.tsx`
- Create: `src/pages/admin/module-config/ModulePermissionsPage.tsx`
- Create: `src/pages/admin/module-config/ModuleWorkflowsPage.tsx`
- Create: `src/pages/admin/module-config/ModuleBoPage.tsx`
- Create: `src/pages/admin/module-config/ModuleSettingsPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add routes to App.tsx**

Inside the `/:clientId` route group, add:
```
/dashboard/:clientId/modules/:moduleId/general      → ModuleGeneralPage
/dashboard/:clientId/modules/:moduleId/bo            → ModuleBoPage
/dashboard/:clientId/modules/:moduleId/workflows     → ModuleWorkflowsPage
/dashboard/:clientId/modules/:moduleId/roles         → ModuleRolesPage
/dashboard/:clientId/modules/:moduleId/permissions   → ModulePermissionsPage
/dashboard/:clientId/modules/:moduleId/settings      → ModuleSettingsPage
```

All wrapped in a `ModuleConfigPage` layout that provides module context.

- [ ] **Step 2: Create ModuleConfigPage layout**

Wrapper component that:
- Reads `moduleId` from URL params
- Fetches the `client_module` via `useClientModule(moduleId)`
- Looks up catalog entry via `module_slug`
- Provides module context to children
- Renders `<Outlet />` for child routes

- [ ] **Step 3: Create ModuleGeneralPage**

Form with: label, icon picker, active toggle, description. Saves to `client_modules` and `navigation_configs`.

- [ ] **Step 4: Create ModuleRolesPage**

DataTable with columns: name, slug, color, description, actions (edit/delete). Add button opens a form dialog. Uses `useModuleRoles()`.

- [ ] **Step 5: Create ModulePermissionsPage**

The permissions matrix component. Uses `useModulePermissions()`. Renders a table with permission labels as rows, role names as columns, and `Switch` toggles in cells. Bulk saves on change via `useUpdateModulePermissions()`.

- [ ] **Step 6: Create stub pages for Workflows, BO, Settings**

Simple placeholder pages with title and description. These will be fleshed out per-module later.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/ModuleConfigPage.tsx src/pages/admin/module-config/ src/App.tsx
git commit -m "feat: add module config pages with routing"
```

---

## Task 9: Frontend — Sidebar Module Config Mode

**Files:**
- Create: `src/components/admin/modules/ModuleConfigSidebar.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`

- [ ] **Step 1: Create ModuleConfigSidebar**

Component that renders:
- "← Retour navigation" link to `/dashboard/:clientId/modules`
- Module name + icon from catalog
- Separator
- Nav links based on catalog capabilities:
  - Général (always)
  - Objets métiers (if `hasBo`)
  - Workflows (if `hasWorkflows`)
  - Rôles (if `hasRoles`)
  - Permissions (if `hasRoles`)
  - Paramètres (always)

Each link uses `NavLink` from react-router-dom with active state styling.

URLs follow: `/dashboard/:clientId/modules/:moduleId/:section`

- [ ] **Step 2: Modify AppSidebar to detect module config routes**

In `AppSidebar.tsx`, detect when the current path matches `/dashboard/:clientId/modules/:moduleId/*`:
- If yes: render `<ModuleConfigSidebar moduleId={moduleId} />` instead of the normal integrator nav
- If no: render normal sidebar

Use `useMatch` or `useLocation` from react-router-dom to detect the pattern.

- [ ] **Step 3: Verify navigation**

Manually test:
1. Go to Navigation page → see tree
2. Add a module → appears in tree
3. Click module → URL changes, sidebar swaps to module sub-nav
4. Click "Retour navigation" → back to tree, sidebar restores
5. Refresh on a module sub-page → stays on correct page with correct sidebar

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/modules/ModuleConfigSidebar.tsx src/components/layout/AppSidebar.tsx
git commit -m "feat: swap sidebar to module config nav when inside module"
```

---

## Task 10: Frontend — Permissions Matrix Component

**Files:**
- Create: `src/components/admin/modules/PermissionsMatrix.tsx`
- Modify: `src/pages/admin/module-config/ModulePermissionsPage.tsx`

- [ ] **Step 1: Create PermissionsMatrix component**

Props:
- `permissions`: `{ slug: string; label: string }[]` (from catalog)
- `roles`: `{ id: string; name: string; color?: string }[]` (from DB)
- `grants`: `Record<string, Record<string, boolean>>` (permSlug → roleId → granted)
- `onToggle`: `(permSlug: string, roleId: string, granted: boolean) => void`
- `isLoading`: boolean

Renders a table:
- First column: permission labels (sticky)
- Subsequent columns: one per role
- Cells: `Switch` component with current grant status
- Empty state if no roles created yet

- [ ] **Step 2: Wire into ModulePermissionsPage**

Fetch permissions matrix via `useModulePermissions(moduleId)`. On toggle, call `useUpdateModulePermissions()` with debounced batch update.

- [ ] **Step 3: Test visually**

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/modules/PermissionsMatrix.tsx src/pages/admin/module-config/ModulePermissionsPage.tsx
git commit -m "feat: add permissions matrix component with role×permission toggles"
```

---

## Task 11: Frontend — Migrate Navigation Hooks to API

**Files:**
- Create: `src/hooks/useNavigationConfigsApi.ts`
- Modify: `src/hooks/useNavigationConfigs.ts`

- [ ] **Step 1: Create API-backed navigation hooks**

Replace Supabase direct calls with API calls:
- `useNavigationConfigs()` → `GET /api/navigation?client_id=X`
- `useCreateNavigationConfig()` → `POST /api/navigation`
- `useUpdateNavigationConfig()` → `PATCH /api/navigation/:id`
- `useDeleteNavigationConfig()` → `DELETE /api/navigation/:id`
- `useReorderNavigationConfigs()` → `PATCH /api/navigation/reorder`

Keep the same React Query keys and return shapes for backward compatibility.

- [ ] **Step 2: Update useNavigationConfigs.ts**

Replace the Supabase implementations with the API-backed versions.

- [ ] **Step 3: Verify navigation page still works**

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNavigationConfigs.ts
git commit -m "feat: migrate navigation hooks from Supabase to Hono API"
```

---

## Execution Order

Tasks 1-5 (backend) can be done sequentially. Tasks 6-11 (frontend) depend on the backend being ready. Within frontend tasks, the order matters:

1. **Task 1** — DB schema (everything depends on this)
2. **Task 2** — Modules API
3. **Task 3** — Roles + Permissions API
4. **Task 4** — Navigation API
5. **Task 5** — Workflows + BO Links API
6. **Task 6** — Frontend catalog + hooks
7. **Task 7** — Navigation page updates (add module to tree)
8. **Task 8** — Module config pages + routing
9. **Task 9** — Sidebar swap
10. **Task 10** — Permissions matrix
11. **Task 11** — Migrate navigation hooks to API
