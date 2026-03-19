# Profils basés sur les rôles modules

## Contexte

Les profils (profile templates) utilisent actuellement les **rôles globaux** (`roles` + `role_categories`) pour définir les permissions. En parallèle, les **modules** ont leur propre système de rôles (`module_roles`). Ces deux systèmes coexistent sans lien.

L'objectif est de remplacer les rôles globaux par les rôles modules dans les profils, puis supprimer entièrement le système de rôles globaux.

## Changements

### Base de données (schema.ts)

**Table remplacée :**
- `profile_template_roles` (FK vers `roles`) → `profile_template_module_roles` (FK vers `module_roles`)
  - Colonnes : `id`, `template_id`, `module_role_id`, `created_at`

**Tables supprimées :**
- `roles`
- `role_categories`
- `user_role_assignments`
- `profile_template_roles`

**Tables impactées (FK vers `roles` à mettre à jour) :**
- `node_field_role_overrides.role_id` → à migrer vers `module_roles` (hors scope, marqué TODO)
- `node_role_permissions.role_id` → idem
- `view_permissions.role_id` / `category_id` → idem
- `nav_permissions.role_id` / `category_id` → idem
- `survey_response_permissions.role_id` → idem

> Note : Ces tables référencent encore les rôles globaux. Pour cette itération, on garde les FK telles quelles mais on ne les utilise pas activement. La migration complète de ces permissions vers module_roles sera un chantier séparé.

### API (server)

**Route modifiée : `profile-templates.ts`**
- `GET /:id` — join sur `module_roles` + `client_modules` au lieu de `roles`
- `GET /:id/roles` → retourne les module_roles liés, avec le nom du module
- `POST /:id/roles` — accepte `module_role_id` au lieu de `role_id`
- `DELETE /roles/:id` — inchangé (supprime le lien)
- La création/mise à jour atomique (POST / PATCH du template avec `role_ids`) utilise `profile_template_module_roles`

**Routes supprimées :**
- `server/src/routes/roles.ts` (entier)
- `server/src/routes/role-categories.ts` (si existe)
- Retirer l'import/mount dans `server/src/index.ts`

### UI — Formulaire de profil

**`ProfileTemplateFormDialog.tsx` :**
- Remplacer `useRolesByClient` + `useRoleCategoriesByClient` par `useClientModules` + `useModuleRoles` (un appel par module actif avec `hasRoles: true`)
- `selectedRoleIds` → contient des `module_role.id` au lieu de `role.id`
- Le groupement passe de `rolesByCategory` à `rolesByModule` (les modules remplacent les catégories)
- `expandedCategories` → `expandedModules`

**`RoleSelector.tsx` :**
- Props renommées : `categories` → `modules`, `rolesByCategory` → `rolesByModule`
- Chaque section collapsible affiche un module (icône + label du catalogue) au lieu d'une catégorie
- Les rôles sous chaque module sont les `module_roles` de ce module
- Plus de section "Sans catégorie"

**`SelectionBadges.tsx` :**
- Les badges de rôles affichent `[Module] Rôle` au lieu de `[Catégorie] Rôle`

**`ProfileTemplateDetailsDrawer.tsx` :**
- L'affichage des rôles est groupé par module

### UI — Pages supprimées

- `RolesPage.tsx` — page admin des rôles globaux
- `RolesArchivedPage.tsx` — archive des rôles globaux
- `RolesImportPage.tsx` — import CSV des rôles
- Composants associés : `RoleFormDialog`, `RoleSidebar`, `RoleDetailHeader`, `RoleCategoryFormDialog`, `UserRoleAssignmentDialog`

### Hooks supprimés

- `useRoles.ts`
- `useRoleCategories.ts`

### Hooks modifiés

- `useProfileTemplates.ts` — types `ProfileTemplate.roles` : `role_id` → `module_role_id`, ajout `module_name`, `module_slug`
- `useProfileTemplateMutations.ts` — `role_ids` pointe vers des `module_role.id`

### Ce qui ne change pas

- Tables EO : `profile_template_eos`, `profile_template_eo_groups`
- Table `user_profile_templates`
- Tout le système de modules : `client_modules`, `module_roles`, `module_permissions`, `module_display_configs`
- La logique d'assignation user ↔ profil

## Nouveau hook nécessaire

`useModuleRolesByClient(clientId)` — charge tous les modules actifs du client ayant `hasRoles: true`, puis tous leurs `module_roles`, et retourne le tout groupé par module. Ceci évite N appels séparés dans le formulaire.

## Migration SQL

```sql
-- 1. Créer la nouvelle table de liaison
CREATE TABLE profile_template_module_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
  module_role_id UUID NOT NULL REFERENCES module_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Supprimer les anciennes tables (dans cet ordre pour respecter les FK)
-- Note: les FK de view_permissions, nav_permissions, node_role_permissions,
-- node_field_role_overrides, survey_response_permissions vers roles
-- doivent d'abord être droppées ou les colonnes rendues nullable
DROP TABLE IF EXISTS profile_template_roles;
DROP TABLE IF EXISTS user_role_assignments;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS role_categories;
```
