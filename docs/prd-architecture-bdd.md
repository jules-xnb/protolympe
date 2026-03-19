# PRD — Problèmes d'architecture de la base de données

## Contexte

Migration en cours de Supabase vers Hono + Drizzle + Neon. Le schéma Drizzle (`server/src/db/schema.ts`) est la source de vérité. Ce document recense tous les problèmes structurels identifiés.

---

## 1. Clés étrangères manquantes (CRITIQUE)

Plusieurs colonnes référencent d'autres tables sans contrainte FK déclarée. Cela permet l'insertion de données orphelines.

| Table | Colonne | Référence attendue |
|---|---|---|
| `module_bo_links` | `bo_definition_id` | `business_object_definitions.id` |
| `business_objects` | `workflow_id` | `workflows.id` |
| `business_objects` | `current_node_id` | `workflow_nodes.id` |
| `organizational_entities` | `parent_id` | `organizational_entities.id` (self-ref) |
| `field_definitions` | `parent_field_id` | `field_definitions.id` (self-ref) |
| `referential_values` | `parent_id` | `referential_values.id` (self-ref) |
| `navigation_configs` | `view_config_id` | `view_configs.id` |
| `navigation_configs` | `created_by` | `profiles.id` |

**Impact** : données incohérentes, cascades de suppression non appliquées.

---

## 2. Champs manquants dans le schéma Drizzle (HAUTE)

Colonnes présentes dans Supabase mais absentes du schéma Drizzle :

### `business_objects`
- `campaign_id` (FK vers `survey_campaigns`)
- `completed_at` (timestamp)

### `field_definitions`
- `calculation_formula` (text)
- `is_readonly` (boolean)
- `placeholder` (text)
- `reference_object_definition_id` (uuid, FK)
- `referential_id` (uuid, FK vers `referentials`)
- `validation_rules` (jsonb)
- `visibility_conditions` (jsonb)

### `client_design_configs`
- `font_size_base` (integer)
- `font_weight_main` (text)

### `eo_groups`
- `created_by` (uuid)
- `updated_at` (timestamp)

### `node_fields`
- `is_required_override` (boolean)
- `settings` (jsonb)
- `updated_at` (timestamp)
- `visibility_condition` (jsonb)

### `node_field_role_overrides`
- `is_required` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Impact** : les routes Hono ne peuvent pas lire/écrire ces colonnes, le frontend perd des fonctionnalités.

---

## 3. Incohérence du pattern de soft-delete (HAUTE)

Trois patterns coexistent sans logique claire :

| Pattern | Tables |
|---|---|
| `is_active` + `is_archived` | `organizational_entities`, `role_categories`, `roles`, `workflows`, `profile_templates`, `referentials` |
| `is_active` seul | `clients`, `client_modules`, `module_roles`, `surveys`, `user_field_definitions`, `view_configs`, `business_object_definitions`... |
| Aucun | `bo_documents`, `eo_audit_log`, `survey_responses`, `workflow_nodes`, `node_fields`... |

**Problèmes** :
- `is_active = false` peut signifier "archivé" ou "désactivé" selon la table
- `is_archived = true` ET `is_active = true` est un état possible mais incohérent
- Le frontend doit gérer chaque cas différemment

**Recommandation** : unifier sur un seul pattern. Option A : `is_archived` (boolean, default false) pour toutes les tables soft-deletables. Option B : `deleted_at` (timestamp nullable).

---

## 4. Doublons fonctionnels modules vs entités globales (HAUTE)

### `module_workflows` vs `workflows`
- `module_workflows` : liés à un `client_module_id`, table légère (name, description, is_active)
- `workflows` : liés à un `client_id`, avec `bo_definition_id`, `slug`, `is_archived`
- **Problème** : deux systèmes de workflows indépendants. Un seul devrait exister.

### `module_roles` vs `roles`
- `module_roles` : portée module (client_module_id)
- `roles` : portée client (client_id), avec catégories
- **Question ouverte** : est-ce que les `module_roles` sont des instances de `roles` ou un concept séparé ?

### `eo_field_definitions` vs `field_definitions`
- Deux systèmes de définition de champs : un pour les entités organisationnelles, un pour les objets métier
- Structures quasi-identiques mais sans lien entre elles

**Impact** : complexité du code, confusion sur quel système utiliser.

---

## 5. Contraintes d'unicité manquantes (MOYENNE)

Seule `profiles.email` a une contrainte unique. Il manque :

| Table | Colonnes | Portée |
|---|---|---|
| `business_object_definitions` | `slug` | par `client_id` |
| `roles` | `slug` | par `client_id` |
| `workflows` | `slug` | par `client_id` |
| `navigation_configs` | `slug` | par `client_id` |
| `referentials` | `slug` | par `client_id` |
| `eo_field_definitions` | `slug` | par `client_id` |
| `field_definitions` | `slug` | par `bo_definition_id` |
| `module_roles` | `slug` | par `client_module_id` |
| `integrator_client_assignments` | `user_id` + `client_id` | unique combo |
| `user_role_assignments` | `user_id` + `role_id` + `client_id` | unique combo |

**Impact** : doublons possibles, bugs silencieux.

---

## 6. Index manquants (MOYENNE)

Aucun index explicite n'est déclaré dans le schéma Drizzle. Index critiques manquants :

### FK lookup (chaque FK devrait avoir un index)
- `business_objects.definition_id`
- `field_definitions.bo_definition_id`
- `object_field_values.business_object_id`
- `object_field_values.field_definition_id`
- `organizational_entities.client_id`
- `organizational_entities.parent_id`
- `navigation_configs.client_id`
- `user_role_assignments.user_id`
- `user_role_assignments.role_id`

### Filtres fréquents
- `*.is_active` (sur toutes les tables qui l'utilisent)
- `*.client_id` (filtre systématique)
- `organizational_entities.path` (pour les requêtes hiérarchiques)
- `business_objects.status`

### Composites
- `(client_id, is_active)` sur la plupart des tables client-scoped
- `(client_id, slug)` pour les lookups par slug

**Impact** : performance dégradée sur les requêtes filtrées, full table scans.

---

## 7. Hooks encore sur Supabase (HAUTE — migration)

Hooks frontend qui utilisent encore directement le client Supabase :

| Hook | Fonctionnalité |
|---|---|
| `useClientLogo.ts` | Upload logo (Supabase Storage + DB) |
| `useNavigationConfigs.ts` | CRUD navigation (marked "still needed") |
| `useUserPermissions.ts` | Contexte permissions utilisateur |
| `useToggleRoleAccess.ts` | Gestion accès nav par rôle |
| `useRoles.ts` | Mixte API + Supabase |
| `useRoleUsages.ts` | Usages d'un rôle |
| `useMissingRoles.ts` | Rôles manquants dans workflow |
| `createCrudHooks.ts` | Factory Supabase (utilisé par archive/restore) |

De plus, de nombreux hooks du middle/front office (business objects, field definitions, surveys, etc.) n'ont pas encore de routes Hono correspondantes.

---

## 8. Nommage incohérent (BASSE)

- `boDefinitionId` (abréviation) vs `businessObjectId` (complet) vs `definitionId` (ambigu)
- `module_workflows.client_module_id` vs `workflows.client_id` (portée différente, noms similaires)
- `business_objects.reference` dans Drizzle vs `reference_number` dans Supabase
- `eo_id` (abréviation) vs `entity_id` dans `eo_audit_log`

---

## 9. Tables de jonction sans timestamps (BASSE)

Certaines tables de jonction n'ont pas de `created_at`, rendant impossible le suivi de quand une association a été créée :

- `node_field_role_overrides` — pas de `created_at`
- Incohérent avec d'autres tables de jonction qui ont `created_at`

---

## Résumé des priorités

| Priorité | Action | Effort |
|---|---|---|
| CRITIQUE | Ajouter les FK manquantes | Faible |
| HAUTE | Ajouter les champs manquants au schéma Drizzle | Moyen |
| HAUTE | Unifier le pattern soft-delete | Moyen |
| HAUTE | Migrer les hooks restants vers l'API Hono | Élevé |
| HAUTE | Clarifier modules_workflows vs workflows | Moyen (refactoring) |
| MOYENNE | Ajouter les contraintes d'unicité | Faible |
| MOYENNE | Ajouter les index de performance | Faible |
| BASSE | Harmoniser le nommage | Moyen (refactoring) |
