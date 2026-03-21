# Page 3 : MO — Listes (`/clients/:slug/listes`)

## Vue d'ensemble — Maquettes visuelles

### Page principale — Liste des listes

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Listes                                                                 │
│ Gérez les listes de valeurs utilisées dans vos objets métiers          │
│                                                                        │
│ [Archives 📦]  [Import / Export ↕]  [+ Nouvelle liste]                 │
│                                                                        │
│ 🔍 Rechercher par nom ou tag...            [Filtrer par tag 🏷]        │
│                                                                        │
│ ┌──────────────────┬────────────┬──────────────────────────────────┐   │
│ │ Nom              │ Tag        │ Description                      │   │
│ ├──────────────────┼────────────┼──────────────────────────────────┤   │
│ │ Civilités         │ 🏷 RH      │ M., Mme, Mx                      │   │
│ │ civ_civlites     │            │                                  │   │
│ ├──────────────────┼────────────┼──────────────────────────────────┤   │
│ │ Départements     │ 🏷 Orga    │ Liste des départements FR        │   │
│ │ dep_departements │            │                                  │   │
│ └──────────────────┴────────────┴──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Drawer — Gestion des valeurs d'une liste

```
┌─ SheetContent ──────────────────────────────────┐
│ 📝 Civilités           [Tag: RH ✎]  [🗑] [✕]    │
│                                                  │
│ [+ Ajouter une valeur]                           │
│                                                  │
│ ┌ 🔴 Monsieur  (M)  ────────── [+] [✏] [🗑] ┐  │
│ ├ 🔵 Madame    (MME) ────────── [+] [✏] [🗑] │  │
│ └ 🟢 Mx        (MX)  ────────── [+] [✏] [🗑] ┘  │
│                                                  │
│ 3 valeurs                                        │
│ [Voir les valeurs archivées (1)]                 │
└──────────────────────────────────────────────────┘
```

### Dialog — Création/édition de valeur

```
┌─ Dialog ────────────────────────────────┐
│ Nouvelle valeur                          │
│                                          │
│ Valeur parente : [Aucune (racine) ▾]     │
│ Valeurs (une par ligne) * :              │
│ ┌──────────────────────────────────┐     │
│ │ En cours                         │     │
│ │ Terminé                          │     │
│ │ Annulé                           │     │
│ └──────────────────────────────────┘     │
│ Couleur : ● ● ● ● ● ● ● ● ● ●         │
│                                          │
│               [Annuler] [Ajouter 3 val.] │
└──────────────────────────────────────────┘
```

---

## CONSTAT CRITIQUE

Le front appelle **`/api/referentials/...`** mais l'API sert **`/api/clients/:clientId/lists/...`** — **aucun endpoint front ne correspond à l'API réelle**. De plus, le front utilise des colonnes qui **n'existent pas en BDD** (`slug`, `tag`, `code`, `is_system`, `parent_value_id`). L'ensemble de la page est non-fonctionnel en l'état.

---

## 3.1 Listing des listes (page principale)

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**Comportement cible** :
- Afficher toutes les listes actives du client, triées par nom
- Recherche par nom ou tag
- Filtrage par tag (popover avec checkboxes)
- Clic sur une ligne → ouvre le drawer de valeurs

**API cible** : `GET /api/clients/:clientId/lists?page=1&per_page=50`
- Réponse paginée : `{ data: [...], total, page, per_page }`

**État actuel du front** :
- ❌ Appelle `GET /api/referentials?client_id=xxx&is_active=true&order=name` → endpoint inexistant
- ❌ Utilise `is_active` comme filtre, mais la table utilise `is_archived`
- ❌ Affiche `liste.slug` → colonne inexistante en BDD
- ❌ Affiche et filtre par `liste.tag` → colonne inexistante en BDD
- ❌ Pas de pagination (charge tout en mémoire)
- ⚠️ Filtrage par tag côté front → devrait être côté API
- ✅ Recherche côté front (DataTable interne)
- ✅ Structure UI correcte (table, header, boutons)

**État actuel de l'API** :
- ✅ `GET /api/clients/:clientId/lists` existe et fonctionne
- ✅ Pagination supportée (page, per_page)
- ✅ Tri par name
- ❌ Pas de filtre par tag (colonne inexistante)
- ❌ Pas de recherche serveur

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL endpoint | — | ✅ `/clients/:cId/lists` | ❌ `/api/referentials` | **REFACTO FRONT** | Migrer vers URL scoped client |
| Colonne `slug` | ❌ | ❌ | ❌ Affichée | **REFACTO BDD + API + FRONT** | Ajouter colonne `slug` en BDD, gérer en API, ou supprimer du front |
| Colonne `tag` | ❌ | ❌ | ❌ Filtrage + affichage | **REFACTO BDD + API + FRONT** | Ajouter colonne `tag` en BDD, gérer en API, ou supprimer du front |
| Filtre `is_active` vs `is_archived` | `is_archived` | `is_archived` | `is_active` | **REFACTO FRONT** | Configurer `archiveColumn: 'is_archived'` dans CRUD hooks |
| Pagination | — | ✅ | ❌ Non utilisée | **REFACTO FRONT** | Passer page/per_page à l'API |

---

## 3.2 Création d'une liste

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**Comportement cible** :
- Dialog avec nom (requis), tag (optionnel), description (optionnel)
- Auto-génération d'un slug depuis le nom
- Création via API

**API cible** : `POST /api/clients/:clientId/lists`
- Body : `{ name, description }`
- Réponse : liste créée (201)

**État actuel du front** :
- ❌ Appelle `POST /api/referentials` avec `{ name, slug, description, tag, client_id }` → endpoint inexistant
- ❌ Envoie `slug` → champ non accepté par l'API (et colonne BDD inexistante)
- ❌ Envoie `tag` → champ non accepté par l'API (et colonne BDD inexistante)
- ❌ Envoie `client_id` dans le body → l'API l'attend dans l'URL path

**État actuel de l'API** :
- ✅ `POST /api/clients/:clientId/lists` fonctionne
- ✅ Validation Zod (name requis, description optionnel)
- ❌ N'accepte pas `slug` ni `tag`

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL endpoint | — | ✅ scoped client | ❌ `/api/referentials` | **REFACTO FRONT** | Migrer URL |
| Champ `slug` | ❌ | ❌ | ❌ Envoyé | **REFACTO BDD + API + FRONT** | Décider : ajouter ou supprimer |
| Champ `tag` | ❌ | ❌ | ❌ Envoyé | **REFACTO BDD + API + FRONT** | Décider : ajouter ou supprimer |
| `client_id` dans body | — | ❌ (path) | ❌ (body) | **REFACTO FRONT** | Passer dans l'URL |

---

## 3.3 Modification d'une liste

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**API cible** : `PATCH /api/clients/:clientId/lists/:id`
- Body : `{ name?, description? }`

**État actuel du front** :
- ❌ Appelle `PATCH /api/referentials/:id` → endpoint inexistant
- ❌ Envoie `slug`, `tag` → non acceptés par l'API

**État actuel de l'API** :
- ✅ Fonctionne, validation Zod
- ❌ N'accepte pas `slug`, `tag`

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL endpoint | — | ✅ | ❌ | **REFACTO FRONT** | Migrer URL |
| Champs `slug`/`tag` | ❌ | ❌ | ❌ Envoyés | **REFACTO BDD + API + FRONT** | Décider : ajouter ou supprimer |

---

## 3.4 Archivage d'une liste

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**API cible** : `PATCH /api/clients/:clientId/lists/:id/archive`
- Pas de body nécessaire
- Met `is_archived = true`

**État actuel du front** :
- ❌ Appelle `PATCH /api/referentials/:id` avec `{ is_active: false }` → endpoint inexistant + mauvais champ
- ❌ Le CRUD factory utilise `is_active` au lieu de `is_archived` (config manquante)

**État actuel de l'API** :
- ✅ Endpoint dédié `/archive` fonctionne

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL endpoint | — | ✅ `/archive` | ❌ PATCH body | **REFACTO FRONT** | Appeler l'endpoint `/archive` dédié |
| Mécanisme archive | `is_archived` | `is_archived` | `is_active` | **REFACTO FRONT** | Configurer `archiveColumn: 'is_archived'` |

---

## 3.5 Restauration d'une liste

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**API cible** : ❌ **Aucun endpoint de restauration n'existe**

**État actuel du front** :
- ❌ Appelle `PATCH /api/referentials/:id` avec `{ is_active: true }` → endpoint inexistant
- Page `ListesArchivedPage.tsx` affiche les listes archivées et propose la restauration

**État actuel de l'API** :
- ❌ Pas d'endpoint `PATCH /:id/restore` ou équivalent

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Endpoint restore | — | ❌ Inexistant | ❌ Mauvaise URL | **REFACTO API + FRONT** | Créer `PATCH /:id/restore` + migrer le front |

---

## 3.6 Lecture des valeurs d'une liste (drawer)

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**API cible** : `GET /api/clients/:clientId/lists/:id` (retourne liste + valeurs)

**État actuel du front** :
- ❌ `useListeWithValues` appelle 2 endpoints inexistants en parallèle :
  - `GET /api/referentials/:id` → inexistant
  - `GET /api/referentials/:id/values` → inexistant
- ❌ Utilise `value.code` → colonne inexistante en BDD
- ❌ Utilise `value.parent_value_id` → BDD a `parent_id` (retourné comme `parent_id` par l'API)
- ❌ Utilise `value.is_active` → OK (retourné par l'API)
- ❌ Utilise `liste.is_system` pour conditionner le bouton archive → colonne inexistante

**État actuel de l'API** :
- ✅ `GET /:id` retourne la liste avec ses valeurs imbriquées
- ✅ `GET /:id/values` retourne les valeurs paginées
- ❌ Ne retourne pas de champ `code` (n'existe pas en BDD)
- ❌ Retourne `parent_id` et non `parent_value_id`

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL endpoint | — | ✅ | ❌ `/api/referentials` | **REFACTO FRONT** | Migrer URL |
| Colonne `code` | ❌ | ❌ | ❌ Affiché + dédupliqué | **REFACTO BDD + API + FRONT** | Ajouter colonne `code` en BDD |
| Champ `parent_value_id` vs `parent_id` | `parent_id` | `parent_id` | `parent_value_id` | **REFACTO FRONT** | Utiliser `parent_id` |
| Champ `is_system` | ❌ | ❌ | ❌ Utilisé | **REFACTO FRONT** | Supprimer ou ajouter en BDD |

---

## 3.7 Création de valeurs

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**Comportement cible** :
- Dialog avec label (multi-ligne pour création batch), couleur, parent
- Auto-génération du code technique depuis le label
- Déduplication par code

**API cible** : `POST /api/clients/:clientId/lists/:id/values`
- Body : `{ label, description?, color?, display_order?, parent_id?, level? }`

**État actuel du front** :
- ❌ `useCreateListeValue` appelle `POST /api/referentials/values` (non scopé à une liste) → endpoint inexistant
- ❌ Envoie `{ liste_id, code, label, color, display_order, parent_value_id, level }` :
  - `liste_id` → l'API attend le listId dans l'URL
  - `code` → non accepté par l'API (colonne BDD inexistante)
  - `parent_value_id` → l'API attend `parent_id`
- ✅ Multi-line creation (bonne UX)
- ✅ Déduplication côté front

**État actuel de l'API** :
- ✅ Endpoint fonctionne avec validation Zod
- ❌ N'accepte pas `code` ni `liste_id` dans le body

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL endpoint | — | ✅ scopé | ❌ flat | **REFACTO FRONT** | Migrer URL sous `lists/:id/values` |
| Champ `code` | ❌ | ❌ | ❌ Envoyé | **REFACTO BDD + API** | Ajouter colonne `code` en BDD |
| `parent_value_id` vs `parent_id` | `parent_id` | `parent_id` | `parent_value_id` | **REFACTO FRONT** | Renommer |
| `liste_id` dans body | — | ❌ (URL) | ❌ (body) | **REFACTO FRONT** | Supprimer du body |

---

## 3.8 Modification d'une valeur

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**API cible** : `PATCH /api/clients/:clientId/lists/:id/values/:valueId`

**État actuel du front** :
- ❌ `useUpdateListeValue` appelle `PATCH /api/referentials/values/:id` → endpoint inexistant
- ❌ Envoie `code` → non accepté par l'API
- ❌ Envoie `parent_value_id` → l'API attend `parent_id`

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL endpoint | — | ✅ scopé | ❌ flat | **REFACTO FRONT** | Migrer URL |
| Champ `code` | ❌ | ❌ | ❌ Envoyé | **REFACTO BDD + API** | Ajouter `code` |
| `parent_value_id` | `parent_id` | `parent_id` | `parent_value_id` | **REFACTO FRONT** | Renommer |

---

## 3.9 Archivage / restauration d'une valeur

**API cible** :
- Archive : `PATCH /api/clients/:clientId/lists/:id/values/:valueId/deactivate`
- Restauration : `PATCH /api/clients/:clientId/lists/:id/values/:valueId` avec `{ is_active: true }`

**État actuel du front** :
- ❌ `useDeleteListeValue` appelle `PATCH /api/referentials/values/:id` avec `{ is_active: false }` → endpoint inexistant
- ❌ Paramètre attendu `referentialId` mais le drawer passe `listeId` → cache invalidation cassée
- ❌ `useRestoreListeValue` même problème (URL + nom de paramètre)

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL archive | — | ✅ `/deactivate` | ❌ | **REFACTO FRONT** | Migrer URL |
| URL restore | — | ✅ PATCH `is_active` | ❌ | **REFACTO FRONT** | Migrer URL |
| Paramètre `referentialId` vs `listeId` | — | — | ❌ Mismatch | **REFACTO FRONT** | Harmoniser le nom du paramètre |

---

## 3.10 Export CSV

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**Comportement cible** :
- Export de toutes les listes avec leurs valeurs au format CSV

**API cible** : ❌ **Aucun endpoint d'export n'existe**

**État actuel du front** :
- ❌ Appelle `GET /api/referentials/values/export?referential_ids=...` → endpoint inexistant
- ❌ Utilise `ref.slug`, `ref.tag` → colonnes inexistantes
- ❌ Utilise `val.code`, `val.parent_value_id` → colonnes/noms inexistants

**État actuel de l'API** :
- ❌ Aucun endpoint export

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Endpoint export | — | ❌ Inexistant | ❌ Mauvaise URL | **REFACTO API + FRONT** | Créer endpoint d'export ou exporter côté front |
| Données `slug`/`tag`/`code` | ❌ | ❌ | ❌ | **REFACTO BDD** | Ajouter colonnes manquantes |

---

## 3.11 Import CSV

**Accès** : `admin_delta`, `integrator_delta`, `integrator_external`

**Comportement cible** :
- Wizard d'import avec mapping des colonnes CSV
- Preview avec arbre hiérarchique
- Import atomique par liste (rollback en cas d'erreur)

**API cible** : ❌ **Endpoints utilisés n'existent pas**

**État actuel du front** :
- ❌ Appelle `POST /api/referentials` pour créer les listes → inexistant
- ❌ Appelle `POST /api/referentials/:id/values/batch` pour insérer les valeurs → inexistant
- ❌ Appelle `DELETE /api/referentials/:id` pour rollback → inexistant
- ❌ Envoie `slug`, `tag`, `code`, `referential_id`, `parent_value_id` → champs inexistants

**État actuel de l'API** :
- ❌ Pas d'endpoint batch pour les valeurs
- ❌ Pas d'endpoint DELETE pour les listes

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Endpoint batch values | — | ❌ | ❌ | **REFACTO API** | Créer `POST /:id/values/batch` |
| Endpoint delete liste | — | ❌ | ❌ | **REFACTO API** | Créer `DELETE /:id` ou décider d'une alternative |
| Champs manquants | ❌ | ❌ | ❌ | **REFACTO BDD + API + FRONT** | Ajouter colonnes |

---

## 3.12 Hooks read-only (`useListeValues.ts`)

Ces hooks sont utilisés dans d'autres parties de l'application (BO, FO) pour résoudre les valeurs de liste.

**État actuel** :
- ❌ `useListeValues` appelle `GET /api/referentials/:id/values` → inexistant
- ❌ `useListeValueLabels` fait N appels `GET /api/referentials/:id/values` → inexistant + N+1
- ❌ `useAllListeValues` même problème de N+1
- ❌ Tous attendent un champ `code` dans la réponse → inexistant en BDD

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| URL endpoints | — | ✅ scoped | ❌ flat | **REFACTO FRONT** | Migrer toutes les URLs |
| Champ `code` attendu | ❌ | ❌ | ❌ | **REFACTO BDD + API** | Ajouter colonne `code` |
| N+1 queries | — | — | ❌ | **REFACTO API + FRONT** | Créer endpoint batch `GET /values?list_ids=...` |

---

## Récapitulatif complet des refactos

### Base de données

| # | Table | Modification |
|---|-------|-------------|
| D1 | `lists` | Ajouter colonne `slug` (text, not null, unique par client) |
| D2 | `lists` | Ajouter colonne `tag` (text, nullable) |
| D3 | `lists` | Ajouter colonne `is_system` (boolean, default false) — **ou supprimer du front** |
| D4 | `list_values` | Ajouter colonne `code` (text, not null) |
| D5 | `list_values` | Ajouter index unique `(list_id, code)` pour éviter les doublons |

### Back-end (API)

| # | Fichier | Modification |
|---|---------|-------------|
| B1 | `routes/lists.ts` | Accepter `slug` et `tag` dans createListSchema et updateListSchema |
| B2 | `routes/lists.ts` | Accepter `code` dans createValueSchema et updateValueSchema |
| B3 | `routes/lists.ts` | Créer `PATCH /:id/restore` (set `is_archived = false`) |
| B4 | `routes/lists.ts` | Créer `POST /:id/values/batch` pour l'import (insert multiple valeurs) |
| B5 | `routes/lists.ts` | Créer `GET /values/export?list_ids=...` ou refaire l'export côté front |
| B6 | `routes/lists.ts` | Créer `DELETE /:id` pour rollback d'import — **ou archiver plutôt que supprimer** |
| B7 | `routes/lists.ts` | Ajouter filtre `tag` en query param sur le listing |
| B8 | `routes/lists.ts` | Ajouter recherche serveur (`search` query param) |

### Front-end

| # | Fichier(s) | Modification |
|---|-----------|-------------|
| F1 | `hooks/createCrudHooks.ts` — TABLE_API_MAP | Changer `referentials` → URL scoped client `/api/clients/:clientId/lists` |
| F2 | `hooks/useListes.ts` | Configurer `archiveColumn: 'is_archived'` dans le CRUD factory |
| F3 | `hooks/useListes.ts` | Migrer `useListeWithValues` vers `GET /api/clients/:clientId/lists/:id` |
| F4 | `hooks/useListes.ts` | Migrer `useCreateListeValue` → `POST /api/clients/:clientId/lists/:id/values` |
| F5 | `hooks/useListes.ts` | Migrer `useUpdateListeValue` → `PATCH /api/clients/:clientId/lists/:id/values/:valueId` |
| F6 | `hooks/useListes.ts` | Migrer `useDeleteListeValue` / `useRestoreListeValue` → URLs scopées + corriger `referentialId` → `listId` |
| F7 | `hooks/useListeValues.ts` | Migrer toutes les URLs vers `/api/clients/:clientId/lists/:id/values` |
| F8 | `hooks/useListeValues.ts` | Résoudre le problème N+1 (batch endpoint ou regroupement) |
| F9 | `pages/admin/ListesPage.tsx` | Renommer toutes les propriétés : `parent_value_id` → `parent_id`, ajouter pagination |
| F10 | `pages/admin/ListesPage.tsx` — export | Migrer vers le bon endpoint ou refaire côté front avec les données déjà chargées |
| F11 | `pages/admin/ListesImportPage.tsx` | Migrer toutes les URLs vers les endpoints scopés client |
| F12 | `pages/admin/ListesArchivedPage.tsx` | Corriger l'appel restore (URL + archiveColumn) |
| F13 | `components/admin/listes/ListeFormDialog.tsx` | Adapter le submit aux champs réellement acceptés par l'API |
| F14 | `components/admin/listes/ListeValuesDrawer.tsx` | Renommer `parent_value_id` → `parent_id` partout, corriger `code` |
| F15 | `components/admin/listes/liste-values/types.ts` | Renommer `parent_value_id` → `parent_id` dans `ValueFormData` et `buildTree` |
| F16 | `components/admin/listes/liste-values/TreeItem.tsx` | Adapter si `code` est renommé |
| F17 | `types/database.ts` | Mettre à jour les types `Tables<'referentials'>` / `Tables<'referential_values'>` → `Tables<'lists'>` / `Tables<'list_values'>` |

---

## Décisions à prendre

- [ ] **`slug` et `tag`** : Ajouter en BDD (D1, D2) ou supprimer du front ? Le slug permet un identifiant stable pour les intégrations, le tag permet le filtrage par catégorie. **Recommandation : ajouter les deux.**
- [ ] **`code` sur les valeurs** : Ajouter en BDD (D4) ? Le code technique est utilisé massivement (import/export, déduplication, affichage). **Recommandation : ajouter obligatoirement.**
- [ ] **`is_system`** : Ajouter en BDD (D3) pour protéger certaines listes système, ou supprimer du front ? **Recommandation : ajouter si des listes sont créées automatiquement par le système.**
- [ ] **Export** : Côté API (B5) ou côté front avec les données chargées ? L'export côté front évite un endpoint supplémentaire mais ne supporte pas bien les gros volumes.
- [ ] **Rollback import** : `DELETE` physique (B6) ou archivage ? **Recommandation : archiver (cohérent avec la règle "jamais de suppression physique").**
- [ ] **Migration du CRUD factory** : Le CRUD factory envoie `client_id` dans le body et utilise des URLs plates. Est-ce qu'on migre tout le factory vers des URLs scopées, ou uniquement les listes ? **Recommandation : uniquement les listes pour l'instant, hooks custom.**
- [ ] **N+1 sur useListeValues** : Créer un endpoint batch (B8) ou accepter les requêtes parallèles ? Dépend du volume de listes utilisées simultanément.
