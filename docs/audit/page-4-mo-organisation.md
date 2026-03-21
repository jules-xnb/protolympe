# Page 4 : MO Organisation — Entités organisationnelles (`/dashboard/:clientId/entities`)

## Vue d'ensemble — Maquettes visuelles

### Page principale — Vue liste (par défaut)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ← Sidebar                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  Organisation                                              [Champs ⚙️]  │    │
│  │                                                            [Historique]  │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐  │    │
│  │  │  🔍 Rechercher...    [Filtres dynamiques ▾]                       │  │    │
│  │  └────────────────────────────────────────────────────────────────────┘  │    │
│  │                                                                          │    │
│  │  [Arbre 🌳] [Liste 📋] [Canvas 🖼️]     [+ Nouvelle entité]  [⋮ Import/Export] │
│  │                                                                          │    │
│  │  ┌──────┬────────────────┬────────────┬────────┬──────────────────────┐  │    │
│  │  │ Code │ Nom            │ Parent     │ Niveau │ Champs perso...      │  │    │
│  │  ├──────┼────────────────┼────────────┼────────┼──────────────────────┤  │    │
│  │  │ FR01 │ France         │ —          │ 0      │ ...                  │  │    │
│  │  │ FR02 │ Île-de-France  │ France     │ 1      │ ...                  │  │    │
│  │  │ FR03 │ Paris          │ Île-de-Fr. │ 2      │ ...                  │  │    │
│  │  └──────┴────────────────┴────────────┴────────┴──────────────────────┘  │    │
│  │                                                                          │    │
│  │  Onglets : [Entités] [Regroupements]                                     │    │
│  │                                                          [Archives 📦]   │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Vue arbre

```
┌────────────────────────────────────────────────────────────────┐
│  ▸ France (FR01)                                    Niv. 0     │
│    ▾ Île-de-France (FR02)                           Niv. 1     │
│      ├── Paris (FR03)                               Niv. 2     │
│      └── Versailles (FR04)                          Niv. 2     │
│    ▸ Provence-Alpes-Côte d'Azur (FR05)             Niv. 1     │
│  ▸ Belgique (BE01)                                  Niv. 0     │
└────────────────────────────────────────────────────────────────┘
```

### Vue canvas (organigramme SVG)

```
┌────────────────────────────────────────────────────────────────┐
│  [🔍+] [🔍-] [⊞ Centrer] [🖱️ Pan/Select]                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ┌──────────┐                          │  │
│  │                    │ France   │                          │  │
│  │                    └─────┬────┘                          │  │
│  │              ┌───────────┼───────────┐                   │  │
│  │        ┌─────┴─────┐         ┌──────┴─────┐             │  │
│  │        │ Île-de-Fr. │         │ PACA       │             │  │
│  │        └─────┬─────┘         └────────────┘             │  │
│  │        ┌─────┴─────┐                                     │  │
│  │   ┌────┴───┐  ┌────┴──────┐                              │  │
│  │   │ Paris  │  │ Versailles│                              │  │
│  │   └────────┘  └───────────┘                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Drawer de détail (clic sur une entité)

```
┌─────────────────────────────────────────┐
│  ← Fermer                              │
│                                         │
│  Paris (FR03)                           │
│  Fil d'ariane : France > Île-de-France  │
│  Enfants : Versailles, Neuilly          │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ Onglet : Infos | Champs | Historique││
│  ├─────────────────────────────────────┤│
│  │ Nom       : [Paris            ] ✏️  ││
│  │ Code      : FR03 (lecture seule)    ││
│  │ Parent    : [Île-de-France    ▾]    ││
│  │ Actif     : [✓]                     ││
│  │ Description: [                 ]    ││
│  │                                     ││
│  │ — Champs personnalisés —            ││
│  │ Population : [2 161 000       ] ✏️  ││
│  │ Région     : [Île-de-France   ▾]    ││
│  │                                     ││
│  │ [Archiver ⚠️]  [Exporter CSV 📥]    ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Dialog de création / édition

```
┌────────────────────────────────────────────┐
│  Nouvelle entité                           │
│                                            │
│  Onglets : [Général] [Détails]             │
│                                            │
│  ┌────────────────────────────────────────┐│
│  │ Nom *          [                     ] ││
│  │ Code           [auto-généré          ] ││
│  │ Parent         [— Aucun —         ▾] ││
│  │ Description    [                     ] ││
│  │ Actif          [✓]                     ││
│  ├────────────────────────────────────────┤│
│  │         [Annuler]    [Créer →]         ││
│  └────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

---

## Sous-pages

| # | Sous-page | Route | Description |
|---|-----------|-------|-------------|
| 4.1 | Liste des entités | `/entities` | Liste, arbre, canvas + CRUD |
| 4.2 | Création d'entité | `/entities/new` | Page dédiée de création |
| 4.3 | Import entités | `/entities/import` | Import CSV avec résolution hiérarchie |
| 4.4 | Entités archivées | `/entities/archived` | Liste des entités archivées |
| 4.5 | Champs personnalisés | `/entities/fields` | Gestion des définitions de champs |
| 4.6 | Import champs | `/entities/fields/import` | Import CSV des définitions |
| 4.7 | Champs archivés | `/entities/fields/archived` | Champs désactivés |
| 4.8 | Historique | `/entities/history` | Journal d'audit complet |
| 4.9 | Regroupements | `/entities` (onglet) | Groupes d'entités |

---

## 4.1 Liste des entités (`/entities`)

**Accès** : Authentifié, accès client requis (admin_delta, integrator_delta, integrator_external, client_user)

**Comportement cible** :
- Afficher les entités du client sélectionné (non archivées)
- 3 modes de vue : liste (DataTable), arbre (TreeView), canvas (organigramme SVG)
- Recherche textuelle sur nom/code
- Filtres dynamiques sur champs core + champs personnalisés
- Export CSV (code, nom, code_parent, actif, + champs perso)
- Clic sur une ligne → drawer de détail avec édition inline
- Onglets "Entités" / "Regroupements"
- Boutons d'accès : Champs, Historique, Archives, Import

**API** : `GET /api/clients/:clientId/eo/`
- Query : `?page=1&per_page=10`
- Réponse : `{ data: Entity[], total: number, page: number, per_page: number }`
- Filtre : `is_archived = false`, tri par `path` puis `name`

**État actuel du front** :
- ✅ 3 modes de vue fonctionnels (liste, arbre, canvas)
- ✅ Filtres dynamiques avec champs personnalisés
- ✅ Export CSV fonctionnel
- ✅ Drawer de détail avec édition inline
- ✅ Onglets Entités / Regroupements
- ✅ Navigation vers sous-pages (champs, historique, archives, import)
- ⚠️ Export CSV utilise `selectedClient?.slug` qui pourrait ne pas exister
- ⚠️ `useAllEoFieldValues()` charge TOUTES les valeurs en batch de 10 → N+1 côté front, devrait avoir un endpoint API dédié
- ⚠️ Arbre initialement tout replié → UX : devrait auto-expand le chemin de l'entité sélectionnée
- ⚠️ Canvas : hauteur hardcodée `calc(100vh-280px)`, fragile si le layout change

**État actuel de l'API** :
- ✅ Pagination côté API
- ✅ Filtre `is_archived = false`
- ✅ Tri par path + name
- ✅ Isolation client (middleware `requireClientAccess`)
- ⚠️ Pagination offset-based (lent sur gros volumes, considérer keyset)

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Liste paginée | ✅ | ✅ | ✅ | — |
| 3 vues (liste, arbre, canvas) | — | ✅ | ✅ | — |
| Recherche texte | ❌ Pas côté API | ✅ Côté front | ⚠️ | **REFACTO API** — Ajouter `?search=` côté API pour gros volumes |
| Filtres dynamiques | ❌ Pas côté API | ✅ Côté front | ⚠️ | **REFACTO API** — Filtrer côté API (pas front) pour gros volumes |
| Export CSV | ✅ `GET /export` | ✅ | ⚠️ | **REFACTO FRONT** — Slug safety |
| Chargement valeurs champs | ❌ Pas d'endpoint batch | ⚠️ N+1 en batch de 10 | **REFACTO API** | Créer `GET /api/clients/:clientId/eo/values/all` |
| Canvas hauteur | — | ⚠️ Hardcodé | **REFACTO FRONT** | Utiliser une hauteur relative responsive |

---

## 4.2 Création d'entité

### Via dialog (depuis la liste)

**API** : `POST /api/clients/:clientId/eo/`
- Body : `{ name: string, description?: string, parent_id?: uuid, is_active?: boolean }`
- Réponse 201 : entité créée
- Hiérarchie : si `parent_id` → path = `parent.path/{parent.id}`, level = parent.level + 1
- Audit : `eo.entity.create` dans `admin_audit_log`

### Via page dédiée (`/entities/new`)

- Supporte `?parent=<parentId>` pour créer un enfant directement
- Auto-génération du slug depuis le nom
- Auto-génération du code si vide
- Onglets "Général" + "Détails" (champs personnalisés)

**État actuel du front** :
- ✅ Dialog de création fonctionnel
- ✅ Page dédiée avec paramètre parent
- ✅ Auto-génération code/slug
- ✅ Champs personnalisés en onglet séparé
- ❌ Pas de vérification de doublon de code avant création (dépend du back)
- ❌ Le champ `description` existe dans le formulaire mais n'est **pas envoyé** dans le POST (ligne 166 du composant)
- ⚠️ Le dropdown parent affiche TOUTES les entités sans limite — UX problématique sur gros volumes
- ⚠️ Pas de détection de cycle dans l'UI (dépend du back)

**État actuel de l'API** :
- ✅ Validation Zod (name min 1 char)
- ✅ Résolution hiérarchie (path, level)
- ✅ Vérification parent dans le même client
- ✅ Audit trail
- ❌ Pas de contrainte UNIQUE sur le code par client
- ❌ Pas de détection de cycle (un parent peut être son propre descendant)

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Création basique | ✅ | ✅ | ✅ | — |
| Description dans le POST | ✅ Accepte `description` | ❌ Ne l'envoie pas | **REFACTO FRONT** | Inclure `description` dans le body |
| Détection doublon code | ❌ Pas de UNIQUE | ❌ | **REFACTO BDD** | Ajouter index UNIQUE `(client_id, code)` |
| Détection cycle parent | ❌ | ❌ | **REFACTO API** | Valider que parent_id n'est pas un descendant |
| Dropdown parent gros volumes | — | ⚠️ Charge tout | **REFACTO FRONT** | Implémenter recherche/pagination dans le dropdown |

---

## 4.3 Mise à jour d'entité (drawer de détail)

**API** : `PATCH /api/clients/:clientId/eo/:id`
- Body : `{ name?: string, description?: string, is_active?: boolean }`
- Contrôle d'accès par champ pour `client_user` (via `getEditableFieldSlugs()`)
- Réponse 200 : entité mise à jour
- Réponse 403 : `Champ non autorisé : {field}` (client_user sans permission)
- Audit : `eo.entity.update`

**État actuel du front** :
- ✅ Édition inline dans le drawer
- ✅ Reparenting avec filtrage des candidats (pas de self-reference, pas de descendants)
- ✅ Toggle actif/inactif avec validation enfants (pas de désactivation si enfants actifs)
- ✅ Archivage uniquement si pas d'enfants
- ⚠️ Indicateur "sauvegardé" (flash 1.5s) local uniquement — pas d'affichage d'erreur si l'API échoue silencieusement
- ⚠️ Vérification reparent utilise `e.path?.startsWith(entity.path + '.')` — fragile si `path` est null

**État actuel de l'API** :
- ✅ Validation Zod
- ✅ Contrôle d'accès champ par champ pour client_user
- ✅ Audit trail
- ⚠️ Le contrôle d'accès par champ compare les clés du body aux slugs éditables — mapping implicite entre camelCase/snake_case

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Update basique | ✅ | ✅ | ✅ | — |
| Contrôle accès champs (client_user) | ✅ | — | ✅ | — |
| Feedback erreur save | — | ❌ Flash local seulement | **REFACTO FRONT** | Afficher toast erreur si PATCH échoue |
| Validation reparent path null | — | ⚠️ `path?.startsWith` | **REFACTO FRONT** | Ajouter fallback si path est null |

---

## 4.4 Archivage (soft delete)

**API** : `PATCH /api/clients/:clientId/eo/:id/archive`
- Réponse 200 : entité archivée (`is_archived = true`)
- Pas de cascade — les enfants restent visibles
- Audit : `eo.entity.archive`

**État actuel du front** :
- ✅ Bouton "Archiver" dans le drawer
- ✅ Validation : archivage uniquement si pas d'enfants
- ⚠️ Le hook `useDeleteOrganizationalEntity` s'appelle "Delete" mais fait un archive — terminologie incohérente

**État actuel de l'API** :
- ✅ Soft delete (is_archived = true)
- ✅ Pas de suppression physique
- ✅ Audit trail
- ❌ Pas d'endpoint de restauration (unarchive)

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Archive | ✅ | ✅ | ✅ | — |
| Terminologie hook | — | ⚠️ "Delete" au lieu de "Archive" | **REFACTO FRONT** | Renommer en `useArchiveOrganizationalEntity` |
| Restauration | ❌ Pas d'endpoint | ❌ | **REFACTO API** | Créer `PATCH /:id/unarchive` |
| Cascade enfants | ❌ Pas de cascade | ⚠️ Bloque si enfants | **À DÉCIDER** | Faut-il archiver récursivement les enfants ? |

---

## 4.5 Valeurs des champs personnalisés

**API lecture** : `GET /api/clients/:clientId/eo/:id/values`
- Réponse : `FieldValue[]` triés par `createdAt`

**API écriture** : `POST /api/clients/:clientId/eo/:id/values`
- Body : `{ field_definition_id: uuid, value: unknown }`
- Upsert : update si existe, insert sinon
- `lastModifiedBy` tracé

**État actuel du front** :
- ✅ Édition inline dans le drawer avec auto-save
- ✅ Champs select avec règles de commentaire (dialog de transition)
- ✅ Types de champs gérés (text, number, date, select, multiselect, etc.)
- ⚠️ Sérialisation JSONB incohérente : `JSON.stringify()` à l'import mais `replace(/^"|"$/g, '')` à l'affichage
- ⚠️ `useAllEoFieldValues()` fait N requêtes en batch de 10 — performance

**État actuel de l'API** :
- ✅ Upsert fonctionnel
- ✅ Validation entity + field_definition dans le même client
- ❌ **Pas d'audit trail** sur les changements de valeurs
- ❌ **Pas de contrôle d'accès par champ** sur les valeurs (contrairement à l'update entity)
- ❌ **Pas de validation de la valeur** selon le type du champ (accepte n'importe quel JSON)
- ❌ Pas de contrainte UNIQUE `(eo_id, field_definition_id)` — doublons possibles en BDD

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Upsert valeur | ✅ | ✅ | ✅ | — |
| Audit trail valeurs | ❌ | — | **REFACTO API** | Logger `eo.field_value.update` dans `admin_audit_log` |
| Contrôle accès champs (client_user) | ❌ Non appliqué | — | **REFACTO API** | Appliquer `getEditableFieldSlugs()` sur POST values |
| Validation valeur vs type champ | ❌ Accepte tout JSON | ⚠️ Valide côté front | **REFACTO API** | Valider selon `field_type` (number → number, email → regex, etc.) |
| Contrainte unicité BDD | ❌ | — | **REFACTO BDD** | `UNIQUE (eo_id, field_definition_id)` |
| Sérialisation JSONB | — | ⚠️ Incohérente | **REFACTO FRONT** | Normaliser : toujours stocker des valeurs brutes, pas de `JSON.stringify` wrapper |
| Endpoint batch valeurs | ❌ | ⚠️ N+1 | **REFACTO API** | `GET /api/clients/:clientId/eo/values/all` |

---

## 4.6 Définitions de champs (`/entities/fields`)

**API** : `GET /api/clients/:clientId/eo/fields`
- Réponse : `FieldDefinition[]` triés par `name`

**API création** : `POST /api/clients/:clientId/eo/fields`
- Body : `{ name, description?, field_type, is_required?, is_unique?, comment_on_change?, list_id?, settings? }`
- Audit : `eo.field.create`

**API update** : `PATCH /api/clients/:clientId/eo/fields/:id`
- Audit : `eo.field.update`

**API désactivation** : `PATCH /api/clients/:clientId/eo/fields/:id/deactivate`
- `is_active = false`
- Audit : `eo.field.deactivate`

**État actuel du front** :
- ✅ Affichage champs système (Nom, ID, Statut actif) + champs personnalisés
- ✅ Auto-création des champs système si manquants (`useEnsureSystemNameField`)
- ✅ Export/import CSV des définitions
- ✅ Badges is_required, is_unique, comment_rules, auto_generate, validation_rules
- ⚠️ Champs système avec IDs hardcodés (`__system_name`, `__system_id`, `__system_is_active`) — race condition possible sur l'auto-création
- ⚠️ Dialog "Archiver ce champ" mais le hook fait un `deactivate` — terminologie incohérente

**État actuel de l'API** :
- ✅ CRUD complet
- ✅ Audit trail (create, update, deactivate)
- ❌ **`field_type` accepte n'importe quelle string** — pas d'enum de validation
- ❌ **`settings` JSONB non validé** — accepte n'importe quel JSON
- ❌ **`comment_on_change` non validé** — devrait être enum `none|always|required`
- ❌ **`list_id` non validé** côté client — pourrait référencer une liste d'un autre client
- ❌ Pas de contrainte UNIQUE `(client_id, name)` — doublons de noms possibles
- ❌ Pas d'endpoint de réactivation

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| CRUD champs | ✅ | ✅ | ✅ | — |
| Audit trail | ✅ | — | ✅ | — |
| Enum field_type | ❌ Accepte tout | ✅ Valide côté front | **REFACTO API** | Enum : `text, number, date, select, multiselect, email, phone, url, boolean, textarea` |
| Validation settings | ❌ JSONB brut | — | **REFACTO API** | Schéma JSON par field_type |
| Enum comment_on_change | ❌ Accepte tout | ✅ Enum côté front | **REFACTO API** | Enum : `none, always, required` |
| Validation list_id | ❌ Pas de check client | — | **REFACTO API** | Vérifier que list_id appartient au même client |
| UNIQUE (client_id, name) | ❌ | — | **REFACTO BDD** | Ajouter index UNIQUE |
| Réactivation champ | ❌ | ❌ | **REFACTO API** | `PATCH /fields/:id/reactivate` |
| Terminologie archive/deactivate | — | ⚠️ Incohérent | **REFACTO FRONT** | Aligner la terminologie |

---

## 4.7 Import entités (`/entities/import`)

**API** : `POST /api/clients/:clientId/eo/import`
- Body : CSV brut
- Réponse : `{ imported: number, errors: [{ row, error }] }`

**État actuel du front** :
- ✅ Mapping automatique colonnes CSV → champs
- ✅ Preview avec erreurs de validation + visualisation arbre
- ✅ Résolution parent par code puis par nom (case-insensitive)
- ✅ Import des valeurs de champs personnalisés
- ✅ Template CSV téléchargeable
- ✅ Rapport de contrôle CSV après import (Créé, Déplacé, Erreur, Ignoré)
- ⚠️ Pas de modification possible avant import (doit ré-uploader)
- ⚠️ Pas de rollback si import partiel échoue — les entités créées restent

**État actuel de l'API** :
- ✅ Traitement row-by-row avec tolérance erreurs
- ❌ **Pas de résolution hiérarchique** — toutes les entités importées au niveau racine (path="", level=0)
- ❌ **Pas d'audit trail** pour les imports (contrairement à l'export qui a `eo_export_history`)
- ❌ **Pas de rate limiting** sur l'import bulk
- ❌ `is_active = false` par défaut à l'import — incohérent avec la création manuelle (`is_active = true`)

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Import CSV basique | ✅ | ✅ | ✅ | — |
| Résolution hiérarchie | ❌ Tout au niveau 0 | ✅ Résout côté front | **REFACTO API** | Résoudre parent_id → path/level côté API |
| Audit trail import | ❌ | — | **REFACTO API** | Logger dans `admin_audit_log` action `eo.import` avec row_count |
| is_active par défaut | ❌ `false` | ✅ `true` côté front | **REFACTO API** | Aligner : `is_active = true` par défaut |
| Rate limiting import | ❌ | — | **REFACTO API** | Ajouter rate limit sur POST /import |
| Rollback import partiel | ❌ | ❌ | **À DÉCIDER** | Transaction wrapping ou import atomique ? |

---

## 4.8 Export entités

**API** : `GET /api/clients/:clientId/eo/export`
- Réponse : fichier CSV (`Content-Disposition: attachment`)
- Headers : `id, name, description, parent_id, is_active, is_archived, created_at`
- Audit : entrée dans `eo_export_history` (exported_by, row_count, file_name)

**État actuel** :
- ✅ Export fonctionnel avec audit trail
- ⚠️ **Inclut les entités archivées** — contrairement à la liste qui les filtre
- ⚠️ Pas de contrôle de permission sur l'export — tout utilisateur authentifié peut exporter toutes les entités

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Export CSV | ✅ | ✅ | ✅ | — |
| Audit export | ✅ `eo_export_history` | — | ✅ | — |
| Inclut entités archivées | ⚠️ | — | **À DÉCIDER** | Ajouter filtre `?include_archived=false` ? |

---

## 4.9 Regroupements (onglet dans `/entities`)

**API** :
- `GET /api/clients/:clientId/eo/groups` — liste des groupes
- `POST /api/clients/:clientId/eo/groups` — créer un groupe
- `PATCH /api/clients/:clientId/eo/groups/:id` — modifier
- `PATCH /api/clients/:clientId/eo/groups/:id/deactivate` — désactiver
- `GET /api/clients/:clientId/eo/groups/:id/members` — membres (soft delete via `deleted_at`)
- `POST /api/clients/:clientId/eo/groups/:id/members` — ajouter membre (`include_descendants` optionnel)
- `DELETE /api/clients/:clientId/eo/groups/members/:memberId` — retirer membre (soft delete)

**État actuel du front** :
- ✅ Création/suppression de groupes
- ✅ Ajout de membres avec toggle `include_descendants`
- ✅ Compteur de membres
- ✅ Vue expandable par groupe
- ✅ Recherche
- ⚠️ Pas de validation doublon nom de groupe
- ⚠️ Pas de preview du nombre de descendants inclus

**État actuel de l'API** :
- ✅ CRUD complet groupes
- ✅ Audit trail (create, update, deactivate groupes)
- ✅ Soft delete membres (`deleted_at`)
- ✅ Validation cross-client sur suppression membre
- ❌ **Pas d'audit trail** pour ajout/suppression de membres
- ❌ **Pas de prévention doublons** — même entité ajoutée plusieurs fois au groupe
- ❌ `include_descendants` résolu statiquement à l'ajout — si entités archivées après, restent dans le périmètre (cache 60s)

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| CRUD groupes | ✅ | ✅ | ✅ | — |
| Audit groupes | ✅ | — | ✅ | — |
| Audit membres | ❌ | — | **REFACTO API** | Logger ajout/suppression membres |
| Doublon membre | ❌ Pas de UNIQUE | ⚠️ | **REFACTO BDD** | `UNIQUE (group_id, eo_id) WHERE deleted_at IS NULL` |
| Preview descendants | — | ❌ | **REFACTO FRONT** | Afficher nombre de descendants avant ajout |
| Doublon nom groupe | ❌ | ❌ | **REFACTO API** | Vérifier unicité nom par client |

---

## 4.10 Historique (`/entities/history`)

**API** : `GET /api/clients/:clientId/eo/:id/audit`
- Pagination
- Réponse : `{ data: AuditEntry[], total, page, per_page }`

**État actuel du front** :
- ✅ Journal d'audit complet (create, update, delete, revert)
- ✅ Filtre par entité
- ✅ Export CSV de l'historique
- ✅ Revert de changements individuels (crée une nouvelle entrée)
- ✅ Dialog snapshot (état complet à un instant T)
- ⚠️ `findSnapshotEntry()` utilise `line.id.startsWith(l.id)` — comparaison string fragile

**État actuel de l'API** :
- ⚠️ Table `eo_audit_log` définie mais **jamais peuplée** — les actions sont loggées dans `admin_audit_log` à la place
- ⚠️ L'endpoint `GET /:id/audit` lit `eo_audit_log` → retournera toujours vide

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Lecture historique | ⚠️ Table vide | ✅ UI existe | **REFACTO API** | Soit peupler `eo_audit_log`, soit lire `admin_audit_log` |
| Revert | — | ✅ | ⚠️ | Dépend de la correction au-dessus |
| Snapshot | — | ✅ | ⚠️ | Dépend de la correction au-dessus |

---

## 4.11 Commentaires sur changements de champs

**API** :
- `GET /api/clients/:clientId/eo/:id/comments` — liste paginée
- `POST /api/clients/:clientId/eo/:id/comments` — `{ field_definition_id, old_value?, new_value?, comment }`

**État actuel** :
- ✅ Front : dialog de commentaire sur transition de champ select (quand `comment_on_change` configuré)
- ✅ API : CRUD fonctionnel
- ❌ Pas d'audit trail pour la création de commentaires

---

## Sécurité — Analyse OWASP

| Vulnérabilité | Status | Détail |
|---|---|---|
| A01 Broken Access Control | ⚠️ PARTIEL | Isolation client OK. **Contrôle accès champs MANQUANT sur valeurs** (POST values bypass `getEditableFieldSlugs`) |
| A02 Cryptographic Failures | ✅ | JWT validation présente |
| A03 Injection | ✅ | Requêtes paramétrées (Drizzle ORM) |
| A04 Insecure Design | ⚠️ | **JSONB non validé** (`settings`, `value`) — accepte n'importe quel JSON |
| A05 Security Misconfiguration | ✅ | Middleware stack sécurisé |
| A06 Vulnerable Components | N/A | — |
| A07 Authentication | ✅ | JWT + persona validation |
| A08 Data Integrity | ⚠️ | **Pas de UNIQUE** sur `(eo_id, field_definition_id)`, `(client_id, code)`, `(client_id, field_name)`, `(group_id, eo_id)` |
| A09 Logging & Monitoring | ⚠️ PARTIEL | Audit entités/champs OK. **Manque** : valeurs, membres groupes, commentaires |
| A10 SSRF | ✅ | Pas d'appels externes |

---

## Récapitulatif complet des refactos

### Base de données

| # | Table | Modification |
|---|-------|-------------|
| D1 | `eo_entities` | Ajouter index UNIQUE `(client_id, code)` — empêcher doublons de code |
| D2 | `eo_field_values` | Ajouter contrainte UNIQUE `(eo_id, field_definition_id)` |
| D3 | `eo_field_definitions` | Ajouter index UNIQUE `(client_id, name)` |
| D4 | `eo_group_members` | Ajouter contrainte UNIQUE `(group_id, eo_id) WHERE deleted_at IS NULL` |

### Back-end (API)

| # | Fichier | Modification |
|---|---------|-------------|
| B1 | `server/src/routes/eo.ts` — POST /:id/values | Ajouter audit trail `eo.field_value.update` |
| B2 | `server/src/routes/eo.ts` — POST /:id/values | Appliquer `getEditableFieldSlugs()` pour client_user |
| B3 | `server/src/routes/eo.ts` — POST /:id/values | Valider la valeur selon le `field_type` de la définition |
| B4 | `server/src/routes/eo.ts` — POST /fields | Enum validation sur `field_type` (text, number, date, select, multiselect, email, phone, url, boolean, textarea) |
| B5 | `server/src/routes/eo.ts` — POST/PATCH /fields | Enum validation sur `comment_on_change` (none, always, required) |
| B6 | `server/src/routes/eo.ts` — POST/PATCH /fields | Valider que `list_id` appartient au même client |
| B7 | `server/src/routes/eo.ts` — POST /fields | Valider schema JSON pour `settings` selon `field_type` |
| B8 | `server/src/routes/eo.ts` — POST / (create entity) | Détecter cycles parent (parent_id ne peut pas être un descendant) |
| B9 | `server/src/routes/eo.ts` — GET /:id/audit | Lire `admin_audit_log` au lieu de `eo_audit_log` (table vide) |
| B10 | `server/src/routes/eo.ts` — POST /import | Résoudre hiérarchie parent → path/level côté API |
| B11 | `server/src/routes/eo.ts` — POST /import | Aligner `is_active = true` par défaut |
| B12 | `server/src/routes/eo.ts` — POST /import | Ajouter audit trail `eo.import` |
| B13 | `server/src/routes/eo.ts` — POST /import | Ajouter rate limiting |
| B14 | `server/src/routes/eo.ts` — POST /groups/:id/members | Ajouter audit trail ajout/suppression membres |
| B15 | `server/src/routes/eo.ts` — POST /groups/:id/members | Vérifier doublon avant ajout |
| B16 | `server/src/routes/eo.ts` — POST /groups | Vérifier unicité nom par client |
| B17 | `server/src/routes/eo.ts` | Créer endpoint `PATCH /:id/unarchive` (restauration) |
| B18 | `server/src/routes/eo.ts` | Créer endpoint `PATCH /fields/:id/reactivate` |
| B19 | `server/src/routes/eo.ts` | Créer endpoint batch `GET /values/all?client_id=` |
| B20 | `server/src/routes/eo.ts` — GET / | Ajouter param `?search=` pour recherche côté API |

### Front-end

| # | Fichier(s) | Modification |
|---|-----------|-------------|
| F1 | `EntityFormDialog.tsx` | Inclure `description` dans le body POST création |
| F2 | `EntityFormDialog.tsx` | Limiter/paginer le dropdown parent pour gros volumes |
| F3 | `EntityDetailsDrawer.tsx` | Afficher toast erreur si PATCH échoue (pas seulement flash local) |
| F4 | `EntityDetailsDrawer.tsx` | Fallback si `path` est null dans la validation reparent |
| F5 | `useOrganizationalEntities.ts` | Renommer `useDeleteOrganizationalEntity` → `useArchiveOrganizationalEntity` |
| F6 | `EntitiesPage.tsx` | Utiliser une hauteur responsive pour le canvas (pas hardcodée) |
| F7 | `EntitiesPage.tsx` | Corriger export CSV slug safety |
| F8 | `EoImportPage.tsx` / `useEoFieldDefinitions.ts` | Normaliser sérialisation JSONB (pas de `JSON.stringify` wrapper) |
| F9 | `useEoFieldDefinitions.ts` | Utiliser endpoint batch `/values/all` au lieu de N requêtes |
| F10 | `EoFieldsPage.tsx` | Aligner terminologie "Archiver" → "Désactiver" |
| F11 | `EoGroupsTab.tsx` | Afficher preview du nombre de descendants avant ajout |
| F12 | `EoTreeView.tsx` | Auto-expand le chemin de l'entité sélectionnée |

### Décisions en attente

- [ ] **Archivage récursif** : quand on archive un parent, faut-il archiver ses enfants ? Ou bloquer l'archivage tant qu'il a des enfants actifs ? (actuellement : bloqué)
- [ ] **Import atomique** : rollback si erreur partielle, ou tolérance avec rapport ? (actuellement : tolérance)
- [ ] **Export archivés** : inclure ou exclure les entités archivées de l'export ? (actuellement : incluses)
- [ ] **Table audit** : consolider `eo_audit_log` et `admin_audit_log`, ou supprimer `eo_audit_log` inutilisée ?

### Décisions prises

- [x] Soft delete uniquement — jamais de suppression physique (is_archived sur entities, deleted_at sur group members)
- [x] Hiérarchie via path materialized (`parent.path/{parent.id}`) + level
- [x] 3 vues front : liste, arbre, canvas
- [x] Champs personnalisés avec types multiples + règles de commentaire
- [x] Regroupements avec option `include_descendants`
- [x] Audit trail sur `admin_audit_log` pour les opérations CRUD principales
