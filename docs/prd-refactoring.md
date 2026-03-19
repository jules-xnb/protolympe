# PRD — Refactoring global du codebase

## Objectif

Améliorer la maintenabilité, la cohérence et la robustesse du codebase en éliminant les duplications, en consolidant les patterns, et en renforçant la gestion des erreurs et des types.

---

## 1. Consolidation des définitions de types de champs

### Problème
Le tableau `FIELD_TYPES` (labels, icônes, groupes) est copié-collé dans 5+ fichiers de formulaires (BO, EO, User fields, imports). Chaque modification de type doit être répliquée manuellement.

### Cible
Un fichier unique `src/lib/field-type-registry.ts` exposant :
- Le registre des types avec label, icône, groupe
- Des helpers : `getFieldTypeLabel()`, `getFieldTypeIcon()`, `getGroupedFieldTypes()`
- Suppression de toutes les définitions locales

### Fichiers concernés
- `FieldDefinitionFormDialog.tsx`
- `FieldTypeConfig.tsx`
- `UserFieldsArchivedPage.tsx`
- `EoFieldFormDialog.tsx`
- `BusinessObjectDetailPage.tsx` (`_getFieldTypeLabel`)
- Pages d'import (mapping des types)

---

## 2. Hook `useDialogState`

### Problème
Le pattern `useState(false)` + `useState<Item | null>(null)` pour gérer l'ouverture d'un dialog et l'item associé est répété dans ~28 pages et drawers. Ça représente 5-10 lignes de boilerplate par dialog.

### Cible
Un hook générique :
```
useDialogState<T>() → { isOpen, item, open(item?), close() }
```
Remplacement progressif dans toutes les pages.

### Fichiers concernés
- Toutes les pages admin avec dialogs de création/édition/archivage
- `ReferentialValuesDrawer.tsx` (9 useState)
- `UserDetailsDrawer.tsx`
- `BusinessObjectDetailPage.tsx`

---

## 3. Centralisation des query keys

### Problème
Les clés de cache React Query sont des strings littérales dispersées dans 50+ hooks. Certaines incohérences existent (ex : `'business_objects'` vs `'business-objects'`). Les invalidations peuvent rater si la clé ne correspond pas exactement.

### Cible
Un fichier `src/lib/query-keys.ts` avec un objet structuré :
```
queryKeys.businessObjects.all()
queryKeys.businessObjects.byDefinition(id)
queryKeys.businessObjects.archived(id)
queryKeys.roles.all(clientId)
...
```
Remplacement de toutes les strings littérales.

### Fichiers concernés
- Tous les fichiers dans `src/hooks/`

---

## 4. Factory archive/restore via `createCrudHooks`

### Problème
Le pattern `useArchiveX` / `useRestoreX` (mutation + invalidation) est implémenté manuellement dans 7 modules avec le même code copié-collé. `createCrudHooks()` existe déjà mais est sous-utilisé.

### Cible
Étendre `createCrudHooks()` pour gérer archive/restore nativement. Migrer tous les modules :
- `useFieldDefinitions`
- `useUserFieldDefinitions`
- `useEoFieldDefinitions`
- `useProfileTemplates`
- `useReferentials`
- `useBusinessObjects` (archive/restore instances)
- `useBusinessObjectDefinitions`

### Fichiers concernés
- `src/hooks/createCrudHooks.ts`
- Les 7 hooks ci-dessus

---

## 5. Composant générique pour les pages d'archives

### Problème
6 pages d'archives suivent le même pattern (PageHeader + DataTable + bouton Restaurer) mais sont implémentées séparément avec des variations mineures.

### Cible
Un composant `ArchivedItemsPage` configurable avec :
- Titre, route de retour
- Hook de données et hook de restauration
- Colonnes configurables
- Recherche optionnelle
- Groupement optionnel (pour RolesArchivedPage qui groupe par catégorie)

### Fichiers concernés
- `RolesArchivedPage.tsx` (318 lignes)
- `UserFieldsArchivedPage.tsx` (143 lignes)
- `ReferentialsArchivedPage.tsx` (125 lignes)
- `EoFieldsArchivedPage.tsx` (124 lignes)
- `BusinessObjectsArchivedPage.tsx` (106 lignes)
- `ProfileTemplatesArchivedPage.tsx` (101 lignes)
- `BusinessObjectArchivedFieldsPage.tsx`
- `BusinessObjectArchivedInstancesPage.tsx`

---

## 6. Gestion des erreurs dans les mutations

### Problème
34 hooks utilisent `useMutation` sans `onError`, ce qui provoque des échecs silencieux. L'utilisateur ne sait pas que l'opération a échoué. Seuls quelques hooks utilisent `useMutationWithToast`.

### Cible
- Migrer tous les `useMutation` vers `useMutationWithToast` (qui gère automatiquement le toast d'erreur)
- S'assurer que chaque mutation a un message d'erreur explicite
- Supprimer les try/catch manuels dans les composants quand `useMutationWithToast` est utilisé

### Fichiers concernés
- `useReferentials.ts`
- `useEoFieldDefinitions.ts`
- `useWorkflows.ts`
- `useOrganizationalEntities.ts`
- Et ~30 autres hooks avec mutations

---

## 7. Découpage des fichiers > 500 lignes

### Problème
Plusieurs composants et hooks dépassent 500 lignes, rendant la lecture et la maintenance difficiles.

### Cible

#### Composants
| Fichier | Lignes | Découpage |
|---------|--------|-----------|
| `FieldDefinitionFormDialog.tsx` | 1140 | Extraire `FieldTypeSelector`, `FieldSettingsSection`, `FieldAggregationConfig`, `FieldDocumentConfig` |
| `UserDetailsDrawer.tsx` | 666 | Extraire `UserProfileSection`, `UserRoleSection`, `UserEoAssignmentSection` |
| `FieldTypeConfig.tsx` | 639 | Extraire `FieldCommentConfig`, `FieldAutoGenerateConfig`, `FieldFormatConfig` |
| `EoFieldFormDialog.tsx` | 554 | Extraire `EoFieldBasicInfo`, `EoFieldValidationStep` |
| `EntityFormDialog.tsx` | 516 | Extraire sections par onglet |
| `EoCardInlineOptions.tsx` | 508 | Extraire sous-composants d'options |
| `ProfileTemplateFormDialog.tsx` | 506 | Extraire sections de configuration |

#### Hooks
| Fichier | Lignes | Découpage |
|---------|--------|-----------|
| `useSurveyResponseQueries.ts` | 617 | Séparer queries et mutations |
| `useProfileTemplates.ts` | 552 | Séparer CRUD, relations, logique métier |
| `useEoFieldDefinitions.ts` | 482 | Séparer queries, mutations, system fields |
| `useWorkflows.ts` | 447 | Séparer queries et mutations |
| `useBusinessObjects.ts` | 395 | Extraire la logique d'agrégation dans `src/lib/aggregation-resolver.ts` |

---

## 8. Type safety — suppression des `as unknown as`

### Problème
115 lignes utilisent `as unknown as` ou `as any`, masquant des problèmes de typage. Les jointures Supabase retournent des types génériques castés en force.

### Cible
- Définir des types explicites pour les réponses Supabase avec jointures :
  ```
  type BusinessObjectWithEO = BusinessObject & { organizational_entity: Pick<OE, 'id'|'name'|'code'> }
  ```
- Remplacer les `as unknown as` par des types propres
- Valider les colonnes JSON (settings, etc.) avec des type guards

### Fichiers prioritaires
- `useBusinessObjects.ts` (lignes 250, 287)
- `useSurveyResponseQueries.ts` (lignes 48-77)
- `useSurveyCampaigns.ts`

---

## 9. Fonctions utilitaires dupliquées

### Problème
Certaines fonctions utilitaires sont définies localement dans plusieurs fichiers au lieu d'être centralisées.

### Cible
Consolider dans `src/lib/` :
- `formatDate` — défini dans 4 fichiers, centraliser dans `format-utils.ts`
- `generateCode` / `generateShortId` — logique identique dans `slug-utils.ts` et `referential-values/types.ts`
- `formatFieldValue` — défini localement dans `BusinessObjectDetailPage.tsx`, `ResponseDetailsDrawer.tsx`, `InlineEditableCell.tsx`, `InlineFieldEditor.tsx`

### Fichiers concernés
- `src/lib/format-utils.ts`
- `src/lib/slug-utils.ts`
- `src/components/admin/referentials/referential-values/types.ts`
- Les 4 fichiers avec `formatFieldValue`

---

## 10. États de chargement cohérents

### Problème
Les états de chargement sont gérés de manière incohérente : certains composants affichent un skeleton, d'autres un spinner, d'autres rien du tout. Pas d'ErrorBoundary au niveau applicatif.

### Cible
- Définir un pattern standard : Skeleton pour les listes/tables, `LoadingSpinner` pour les actions
- Ajouter un `ErrorBoundary` global avec fallback UI
- Vérifier que tous les `isLoading` sont traités dans les composants (20+ composants sans traitement)

---

## 11. Nettoyage des dépendances inutilisées

### Problème
Certains packages dans `package.json` semblent peu ou pas utilisés, alourdissant le bundle.

### Cible
Vérifier et supprimer si inutilisés :
- `jspdf` + `jspdf-autotable` — utilisé uniquement pour l'export PDF d'import de champs → passer en import dynamique
- `embla-carousel-react` — composant Carousel potentiellement inutilisé
- `input-otp` — vérifier si OTP est utilisé
- `vaul` (drawer) — vérifier si le composant Drawer est utilisé vs. les sheets Radix

---

## 12. Suppression du code mort

### Problème
Plusieurs fonctions/variables préfixées `_` ou importées sans être utilisées.

### Cible
- Nettoyer les `_` prefixes (`_getFieldTypeLabel`, `_IconComponent`, `_downloadTemplate`, `_instanceColumnLabels` dans `BusinessObjectDetailPage.tsx`)
- Supprimer les imports inutilisés
- Supprimer les `console.warn` en production (4 occurrences dans `ViewModeContext.tsx`)

---

## 13. Constantes magiques

### Problème
Des valeurs numériques sans explication sont dispersées dans le code (taille de page, longueur d'ID, etc.).

### Cible
Extraire dans un fichier de constantes `src/lib/constants.ts` :
- `DEFAULT_PAGE_SIZE = 50`
- `SHORT_ID_LENGTH = 6`
- `STALE_TIME_MS = 30_000`
- `MAX_UPLOAD_SIZE_MB = 50`
- Couleurs prédéfinies des référentiels

---

## Statut — Phase 1 (terminée)

| # | Chantier | Statut | Résultat |
|---|----------|--------|----------|
| 1 | Consolidation types de champs | ✅ | `field-type-registry.ts` créé, 14+ fichiers nettoyés |
| 2 | Hook `useDialogState` | ✅ | Hook créé, adopté dans 18+ fichiers |
| 3 | Centralisation query keys | ✅ | `query-keys.ts` créé, 101 fichiers migrés |
| 4 | Factory archive/restore | ✅ | `createCrudHooks` étendu, 6 modules migrés |
| 5 | Pages d'archives génériques | ✅ | `ArchivedItemsPage` créé, 7 pages refactorisées |
| 6 | Gestion erreurs mutations | ✅ | 3 hooks + 2 composants migrés vers `useMutationWithToast` |
| 7 | Découpage fichiers > 500 lignes | ✅ | 5 composants + 4 hooks découpés |
| 8 | Type safety (`as unknown as`) | ✅ | 65 → 13 instances, helpers centralisés |
| 9 | Fonctions utilitaires dupliquées | ✅ | `formatFieldValue`, `generateCode` consolidés |
| 10 | États de chargement | ✅ | ErrorBoundary root + loading guards |
| 11 | Dépendances inutilisées | ✅ | 8 packages supprimés, jspdf en import dynamique |
| 12 | Code mort + constantes | ✅ | 16+ items supprimés, constantes extraites |

**Bilan Phase 1 : 182 fichiers, +1 664 / -5 726 lignes (net -4 062), 0 erreurs TypeScript**

---

## Phase 2 — Composants et patterns dupliqués

### 14. Fichier dupliqué `useBoDocuments 2.ts`

#### Problème
Le fichier `src/hooks/useBoDocuments 2.ts` est une copie exacte de `useBoDocuments.ts` (101 lignes).

#### Cible
Supprimer le fichier dupliqué.

---

### 15. Composant générique `AssignmentDialog`

#### Problème
3 dialogs d'assignation suivent un pattern identique à 95% : fetch des items disponibles → filtre des déjà assignés → sélection → assignation. Seule la source de données change.

#### Cible
Créer `src/components/admin/AssignmentDialog.tsx` générique avec props configurables (dataSource, labelField, etc.). Refactorer les 3 dialogs existants.

#### Fichiers concernés
- `src/components/admin/users/UserEoAssignmentDialog.tsx` (160 lignes)
- `src/components/admin/users/UserRoleAssignmentDialog.tsx` (167 lignes)
- `src/components/admin/clients/AssignIntegratorToClientDialog.tsx`

#### Économie estimée : ~250 lignes

---

### 16. TreeRow dupliqué

#### Problème
Le composant `TreeRow` existe en double avec 2 implémentations quasi-identiques (drag/drop, badges, actions).

#### Cible
Supprimer la version legacy et rediriger les imports vers la version `modules-tree/`.

#### Fichiers concernés
- `src/components/builder/modules/TreeRow.tsx` (486 lignes) — à supprimer
- `src/components/builder/modules/modules-tree/TreeRow.tsx` (414 lignes) — à conserver

#### Économie estimée : ~486 lignes

---

### 17. SelectionBadges dupliqué

#### Problème
Le composant `SelectionBadges` existe en 2 endroits avec des variations mineures (l'un supporte les groupes EO, l'autre non).

#### Cible
Fusionner en un seul composant avec support optionnel des groupes.

#### Fichiers concernés
- `src/components/admin/users/profile-form/SelectionBadges.tsx` (110 lignes)
- `src/components/profile/SelectionBadges.tsx` (86 lignes)

#### Économie estimée : ~50 lignes

---

### 18. Nettoyage des re-export shims

#### Problème
5 fichiers ne font que re-exporter un composant depuis un sous-dossier, ajoutant de la confusion dans l'arborescence.

#### Cible
Mettre à jour les imports pour pointer directement vers les sous-dossiers et supprimer les shims.

#### Fichiers concernés
- `src/components/admin/entities/EoFieldFormDialog.tsx` (re-export)
- `src/components/admin/entities/EoImportDialog.tsx` (re-export)
- `src/components/user/views/EoCardView.tsx` (re-export)
- `src/components/builder/page-builder/BlockConfigPanel.tsx` (re-export)
- `src/components/builder/page-builder/WorkflowGraphEditor.tsx` (re-export)

---

### 19. Composant générique `DetailsDrawer`

#### Problème
8 drawers de détails suivent le même pattern (Sheet + Header + contenu scrollable + actions). Le boilerplate Shell/Header/Footer est répété partout.

#### Cible
Créer `src/components/admin/DetailsDrawer.tsx` wrapper qui gère la structure commune. Chaque drawer ne fournit que son contenu et ses actions.

#### Fichiers concernés
- `EntityDetailsDrawer.tsx`, `ClientDetailsDrawer.tsx`, `IntegratorDetailsDrawer.tsx`
- `ProfileTemplateDetailsDrawer.tsx`, `UserDetailsDrawer.tsx`
- `CampaignDetailsDrawer.tsx`, `EoDetailsDrawer.tsx`, `ResponseDetailsDrawer.tsx`

#### Économie estimée : ~300 lignes

---

### 20. Appels Supabase bruts dans les composants

#### Problème
7 composants font des appels `supabase.from()` directement au lieu de passer par des hooks, rendant le code moins testable et la logique moins réutilisable.

#### Cible
Extraire ces appels dans des hooks dédiés ou étendre les hooks existants.

#### Fichiers concernés
- `WorkflowFormBuilder.tsx`, `RoleFormDialog.tsx`
- `BusinessObjectDefinitionFormDialog.tsx`, `DynamicPageView.tsx`
- `ModulesEditor.tsx`, `UserEoAssignmentDialog.tsx`, `UserRoleAssignmentDialog.tsx`

---

### 21. Composant `EmptyState` sous-utilisé

#### Problème
50+ composants implémentent leur propre logique d'état vide inline au lieu d'utiliser le composant `EmptyState` existant.

#### Cible
Remplacer les patterns `{data.length === 0 ? <div>...</div> : ...}` par `<EmptyState>` dans les composants principaux.

#### Économie estimée : ~100 lignes

---

## Ordre de priorité Phase 2

| # | Chantier | Effort | Impact |
|---|----------|--------|--------|
| 14 | Fichier dupliqué | 5min | 101 lignes supprimées |
| 15 | AssignmentDialog générique | 3h | 250+ lignes, 3 composants unifiés |
| 16 | TreeRow dupliqué | 2h | 486 lignes supprimées |
| 17 | SelectionBadges fusionné | 1h | 50 lignes, cohérence |
| 18 | Re-export shims | 1h | Clarté arborescence |
| 19 | DetailsDrawer générique | 3h | 300+ lignes, 8 drawers simplifiés |
| 20 | Supabase brut → hooks | 4h | Testabilité, réutilisabilité |
| 21 | EmptyState adoption | 2h | 100+ lignes, cohérence UX |
