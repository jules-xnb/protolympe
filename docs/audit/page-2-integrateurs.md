# Page 2 : BO — Intégrateurs (`/dashboard/admin/integrators`)

## Vue d'ensemble — Maquettes visuelles

### Page en mode Admin

```
┌─────────────────────────────────────────────────────────────────────┐
│  Intégrateurs                              [Nouveau intégrateur +] │
│  Gérez les intégrateurs de la plateforme.                          │
├─────────────────────────────────────────────────────────────────────┤
│  [🔍 Rechercher...]               Filtrer par client [Tous     ▼] │
├─────────────────────────────────────────────────────────────────────┤
│  ◀ 1/2 ▶                                          5 résultats      │
├─────────────────────────────────────────────────────────────────────┤
│  Intégrateur              Nb clients  Rôle            Actions    │
│ ─────────────────────────────────────────────────────────────────── │
│  Alice Bertrand            3          [Intégrateur]   [Modifier] │
│  alice@delta.com           ← clic ligne = drawer                 │
│ ─────────────────────────────────────────────────────────────────── │
│  Bob Martin                Tous       [Admin Delta]   [Modifier] │
│  bob@delta.com                                                   │
│ ─────────────────────────────────────────────────────────────────── │
│  Charles Dupont            1          [Intégrateur]   [Modifier] │
│  charles@ext.com                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Drawer intégrateur — Admin

```
┌─── Sheet (droite) ──────────────────────────┐
│                                              │
│  👤  Alice Bertrand                          │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Statut                                 │  │
│  │ [Intégrateur              ▼] auto-save │  │
│  │                                        │  │
│  │ Créé le                                │  │
│  │  20/03/2026               (lecture)    │  │
│  │                                        │  │
│  │ Nom                                    │  │
│  │  Bertrand                 (lecture)    │  │
│  │                                        │  │
│  │ Prénom                                 │  │
│  │  Alice                    (lecture)    │  │
│  │                                        │  │
│  │ Email                                  │  │
│  │  alice@delta.com          (lecture)    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  👥 Clients associés (3)    [Associer un +] │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  La Poste                          🗑  │  │
│  ├────────────────────────────────────────┤  │
│  │  TotalEnergies                     🗑  │  │
│  ├────────────────────────────────────────┤  │
│  │  Acme Corp                         🗑  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│       [Retirer le rôle d'intégrateur]        │
│                                              │
└──────────────────────────────────────────────┘
```

### Drawer intégrateur — Admin Delta (pas de section clients)

```
┌─── Sheet (droite) ──────────────────────────┐
│                                              │
│  👤  Bob Martin                              │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Statut                                 │  │
│  │ [Admin Delta              ▼] auto-save │  │
│  │ ...                                    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  (pas de section "Clients associés" car      │
│   admin_delta a accès à tous les clients)    │
│                                              │
│       [Retirer le rôle d'intégrateur]        │
│                                              │
└──────────────────────────────────────────────┘
```

### Dialog "Nouveau intégrateur"

```
┌─── Dialog ──────────────────────────────────┐
│                                              │
│  Ajouter un intégrateur                      │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Prénom                                 │  │
│  │ [                          ]           │  │
│  │                                        │  │
│  │ Nom                                    │  │
│  │ [                          ]           │  │
│  │                                        │  │
│  │ Email                                  │  │
│  │ [                          ]           │  │
│  │                                        │  │
│  │ Rôle                                   │  │
│  │ [Intégrateur              ▼]           │  │
│  │   Options : Intégrateur / Admin Delta  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│                     [Annuler]   [Ajouter +]  │
│                                              │
└──────────────────────────────────────────────┘
```

### Dialog "Associer un client"

```
┌─── Dialog ──────────────────────────────────┐
│                                              │
│  Associer un client                          │
│                                              │
│  [🔍 Rechercher un client...]                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  La Poste                          ✓   │  │
│  ├────────────────────────────────────────┤  │
│  │  TotalEnergies                         │  │
│  ├────────────────────────────────────────┤  │
│  │  Acme Corp                             │  │
│  └────────────────────────────────────────┘  │
│                                              │
│                  [Annuler]   [Associer +]    │
│                                              │
└──────────────────────────────────────────────┘
```

### Dialog "Retirer le rôle"

```
┌─── AlertDialog ─────────────────────────────┐
│                                              │
│  Retirer le rôle d'intégrateur               │
│                                              │
│  Êtes-vous sûr de vouloir retirer le rôle    │
│  d'intégrateur à Alice Bertrand ?            │
│  Cette action est irréversible.              │
│                                              │
│                    [Annuler]    [Retirer]     │
│                                              │
└──────────────────────────────────────────────┘
```

---

## CONSTAT CRITIQUE

Le front appelle **8 endpoints qui n'existent pas** dans le backend. Le backend a des endpoints RESTful que le front n'utilise pas. La page Intégrateurs est **non fonctionnelle** en l'état, à l'exception de l'invitation.

---

## 2.1 Lister les intégrateurs

**Accès** : Admin uniquement

**Comportement cible** :
- Colonnes : Intégrateur (nom + email), Nb clients, Rôle (chip), Actions (Modifier)
- Clic sur la ligne → ouvre le drawer
- Filtre par client (dropdown) côté serveur
- Recherche par nom/email côté serveur
- Pagination serveur (50/page)

**API cible** : `GET /api/integrators?page=1&per_page=50&search=alice&client_id=uuid`

**Réponse API** (format `PaginatedResponse`) :
```json
{
  "data": [
    { "id": "uuid", "email": "alice@delta.com", "first_name": "Alice", "last_name": "Bertrand", "persona": "integrator_delta", "created_at": "..." }
  ],
  "pagination": { "page": 1, "per_page": 50, "total": 5, "total_pages": 1 }
}
```

**État actuel du front** :
- `useIntegrators()` → `GET /api/integrators` sans params → récupère tout d'un coup
- `useIntegratorAssignments()` → `GET /api/integrators/assignments` — **endpoint inexistant**
- Filtrage par client **côté client** : `filter(a => a.client_id === selectedClientId)`
- Pagination et recherche **côté client** via DataTable
- Colonne "Nb clients" calculée côté client en comptant les assignments
- Types TS en camelCase (`userId`, `fullName`) vs API snake_case
- `profiles.email` au lieu de `email` (data shape mismatch)

**État actuel de l'API** :
- `GET /api/integrators` → paginé, retourne des comptes (`accounts`) à plat
- ❌ Pas de param `search`
- ❌ Pas de param `client_id` pour filtrer par client
- ❌ Pas d'endpoint `GET /api/integrators/assignments` (le front l'appelle)
- ❌ Pas d'endpoint `GET /api/integrators/is-admin` (utilisé pour le contrôle d'accès front)

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Pagination serveur | ✅ | ✅ `page`, `per_page` | ❌ Côté client | **REFACTO FRONT** | Brancher `serverPagination` sur la réponse API |
| Recherche `search` | ✅ colonnes name/email | ❌ Pas de param | ❌ Côté client | **REFACTO API + FRONT** | Ajouter param `search` (WHERE email/name ILIKE) |
| Filtre par client | ✅ `integrator_client_assignments` | ❌ Pas de param | ❌ `GET /integrators/assignments` inexistant | **REFACTO API + FRONT** | Ajouter param `client_id` (JOIN assignments) |
| Data shape | ✅ table `accounts` | ✅ retourne `{ email, first_name, last_name }` | ❌ attend `{ profiles: { email, fullName } }` | **REFACTO FRONT** | Aligner types TS sur la réponse API (snake_case, pas de nesting) |
| Contrôle d'accès | ✅ persona en JWT | ❌ `is-admin` inexistant | ❌ `useIsAdminDelta()` appelle endpoint inexistant | **REFACTO FRONT** | Utiliser `persona` du JWT local, pas d'appel API |
| Nb clients par intégrateur | ✅ table assignments | ❌ Pas retourné | ❌ Calculé sur assignments inexistantes | **REFACTO API** | Ajouter `client_count` dans la réponse GET (sous-requête COUNT) |

---

## 2.2 Inviter un intégrateur

**Accès** : Admin uniquement

**Comportement cible** :
- Bouton "Nouveau intégrateur +" dans le PageHeader → ouvre un Dialog
- Champs : Prénom, Nom, Email, Rôle (Intégrateur / Admin Delta)
- `POST /api/integrators/invite` avec `{ email, first_name, last_name, persona }`
- Erreur 409 si email déjà existant
- Le dialog se ferme au succès, la liste se rafraîchit

**API** : `POST /api/integrators/invite`
- Body : `{ email: string, first_name: string(min 1), last_name: string(min 1), persona: 'integrator_delta' | 'integrator_external' }`
- Réponse 201 : compte créé
- Réponse 409 : email déjà utilisé
- Rate limit : 5/60s
- Audit : `integrator.invite`

**État actuel du front** :
- ✅ Dialog `AddIntegratorDialog` avec 4 champs (prénom, nom, email, persona)
- ✅ `useInviteIntegrator()` → `POST /api/integrators/invite` — fonctionne
- ⚠️ Persona options : `admin_delta` | `integrator_delta` côté front vs `integrator_delta` | `integrator_external` côté API
- ⚠️ Body en camelCase (`firstName`) côté front, snake_case (`first_name`) côté API

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Dialog invitation | — | — | ✅ Fonctionne | ✅ OK | — |
| Endpoint invite | ✅ | ✅ `POST /invite` | ✅ Hook existe | ⚠️ PARTIEL | — |
| Enum persona | ✅ 4 valeurs | ⚠️ `integrator_delta` / `integrator_external` | ⚠️ `integrator_delta` / `admin_delta` | **REFACTO FRONT** | Aligner : offrir `integrator_delta` / `integrator_external` (pas `admin_delta` — un admin se crée autrement) |
| Body camelCase vs snake_case | — | ✅ snake_case | ❌ camelCase | **REFACTO FRONT** | Envoyer `first_name`, `last_name` au lieu de `firstName`, `lastName` |
| Gestion erreur 409 | ✅ email UNIQUE | ✅ check avant insert | ⚠️ Toast générique | **REFACTO FRONT** | Afficher "Cet email est déjà utilisé" |

---

## 2.3 Drawer intégrateur

**Accès** : Admin uniquement

Le drawer s'ouvre au clic sur une ligne du tableau. Sheet qui s'ouvre à droite.

### 2.3.1 Informations générales

**Comportement cible** :
- Statut (persona) : Select éditable, auto-save debounce → `PATCH /api/integrators/:id`
- Créé le, Nom, Prénom, Email : lecture seule

**API** : `PATCH /api/integrators/:id`
- Body : `{ persona?: 'integrator_delta' | 'integrator_external', first_name?: string, last_name?: string }`
- Réponse : compte mis à jour
- Audit : `integrator.update`

**État actuel du front** :
- ❌ `useUpdateIntegratorPersona()` → `PATCH /api/integrators/role/{roleId}` — **endpoint inexistant**
- ❌ Utilise `roleId` au lieu de l'account `id`
- ✅ Auto-save debounce fonctionne côté front (500ms)

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Affichage infos | ✅ | ✅ données dans GET | ✅ Affiche nom/email/date | ✅ OK | — |
| Modifier persona | ✅ | ✅ `PATCH /:id` | ❌ `PATCH /role/{roleId}` inexistant | **REFACTO FRONT** | Changer hook → `PATCH /api/integrators/${accountId}` avec `{ persona }` |

### 2.3.2 Clients associés (intégrateur non-admin uniquement)

**Comportement cible** :
- Section visible uniquement si `persona !== 'admin_delta'` (admin a accès à tout)
- Titre : "Clients associés ({count})" avec bouton "Associer un +"
- Liste des clients avec bouton 🗑 pour retirer
- Bouton "Associer un client" → dialog de sélection

**APIs cibles** :
- Lister : `GET /api/integrators/:id/clients`
  - Réponse : `[{ assignment_id, assigned_at, assigned_by, client_id, client_name, client_is_active }]`
- Assigner : `POST /api/integrators/:id/clients` — Body : `{ client_id: uuid }`
  - Réponse 201, erreur 409 si déjà assigné
  - Audit : `integrator.client.assign`
- Retirer : `DELETE /api/integrators/:id/clients/:clientId`
  - Réponse : `{ success: true }`
  - Audit : `integrator.client.remove`

**État actuel du front** :
- ❌ Lister : appelle `GET /api/integrators/assignments` — **inexistant**
- ❌ Assigner : appelle `POST /api/integrators/assign` — **inexistant** (le back a `POST /:id/clients`)
- ❌ Retirer : appelle `DELETE /api/integrators/assignments/{assignmentId}` — **inexistant** (le back a `DELETE /:id/clients/:clientId`)

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Lister clients | ✅ | ✅ `GET /:id/clients` | ❌ `GET /assignments` inexistant | **REFACTO FRONT** | Créer hook `useIntegratorClients(accountId)` → `GET /api/integrators/${id}/clients` |
| Assigner | ✅ | ✅ `POST /:id/clients` | ❌ `POST /assign` inexistant | **REFACTO FRONT** | Créer hook `useAssignClient()` → `POST /api/integrators/${id}/clients` avec `{ client_id }` |
| Retirer | ✅ | ✅ `DELETE /:id/clients/:clientId` | ❌ `DELETE /assignments/:id` inexistant | **REFACTO FRONT** | Créer hook `useRemoveClient()` → `DELETE /api/integrators/${id}/clients/${clientId}` |
| Masquer si admin_delta | — | — | ✅ Condition `persona !== 'admin_delta'` | ✅ OK | — |

### 2.3.3 ~~Retirer le rôle d'intégrateur~~ — SUPPRIMÉ

**Décision** : Un utilisateur a toujours un rôle sur la plateforme. On ne retire pas le rôle d'intégrateur. Un intégrateur sans client assigné voit simplement un tableau vide.

| Élément | Front | Status | Refacto |
|---------|:---:|---|---|
| Bouton "Retirer le rôle" | ✅ Existe | **SUPPRIMER** | Supprimer le bouton + le dialog de confirmation + le hook `useRemoveSystemRole()` |

---

## Récapitulatif complet des refactos

### Back-end (API)

| # | Fichier | Modification |
|---|---------|-------------|
| B1 | `routes/integrators.ts` — `GET /` | Ajouter param `search` (WHERE email/first_name/last_name ILIKE) |
| B2 | `routes/integrators.ts` — `GET /` | Ajouter param `client_id` (JOIN assignments WHERE client_id = ?) |
| B3 | `routes/integrators.ts` — `GET /` | Ajouter `client_count` dans la réponse (sous-requête COUNT sur assignments) |
| B4 | `routes/integrators.ts` — `POST /invite` | Accepter `admin_delta` en plus de `integrator_delta` / `integrator_external` dans le schema persona |

### Base de données

Aucune modification nécessaire. Le schéma supporte déjà tout.

### Front-end

| # | Fichier(s) | Modification |
|---|-----------|-------------|
| F1 | `hooks/useAdminData.ts` | Supprimer `useIsAdminDelta()` — utiliser le persona du JWT local à la place |
| F2 | `hooks/useAdminData.ts` | Refaire `useIntegrators()` : accepter params `{ page, per_page, search, client_id }`, aligner types sur snake_case |
| F3 | `hooks/useAdminData.ts` | Supprimer `useIntegratorAssignments()` (endpoint inexistant, inutile) |
| F4 | `hooks/useAdminData.ts` | Créer `useIntegratorClients(accountId)` → `GET /api/integrators/${id}/clients` |
| F5 | `hooks/useAdminData.ts` | Refaire `useAssignIntegratorToClient()` → `POST /api/integrators/${id}/clients` avec `{ client_id }` |
| F6 | `hooks/useAdminData.ts` | Refaire `useRemoveIntegratorFromClient()` → `DELETE /api/integrators/${id}/clients/${clientId}` |
| F7 | `hooks/useAdminData.ts` | Supprimer `useRemoveSystemRole()` (feature supprimée — on ne retire pas un rôle) |
| F8 | `hooks/useAdminData.ts` | Refaire `useUpdateIntegratorPersona()` → `PATCH /api/integrators/${id}` avec `{ persona }` |
| F9 | `hooks/useAdminData.ts` | Supprimer `useUsersWithoutRole()` (endpoint inexistant) |
| F10 | `hooks/useAdminData.ts` | Refaire types TS : `IntegratorRole` et `IntegratorAssignment` en snake_case, aligner sur réponse API |
| F11 | `pages/admin/AdminIntegratorsPage.tsx` | Brancher pagination serveur, recherche serveur, filtre client serveur |
| F12 | `pages/admin/AdminIntegratorsPage.tsx` | Remplacer check `useIsAdminDelta()` par persona du JWT |
| F13 | `pages/admin/AdminIntegratorsPage.tsx` | Supprimer colonne "Créé le", colonne "Nb clients" : utiliser `client_count` de la réponse API |
| F14 | `components/admin/platform/AddIntegratorDialog.tsx` | 3 options persona : `admin_delta` / `integrator_delta` / `integrator_external` |
| F15 | `components/admin/platform/AddIntegratorDialog.tsx` | Envoyer body en snake_case (`first_name`, `last_name`) |
| F16 | `components/admin/platform/IntegratorDetailsDrawer.tsx` | Reconnecter aux hooks corrigés (F4, F5, F6, F8) + supprimer bouton "Retirer le rôle" |
| F17 | `components/admin/platform/IntegratorDetailsDrawer.tsx` | Afficher clients via `useIntegratorClients()` au lieu de filtrer `assignments` |
| F18 | `components/admin/platform/IntegratorDetailsDrawer.tsx` | Protéger auto-rétrogradation : un admin ne peut pas changer son propre persona |

---

## Décisions prises

- [x] Persona dans le dialog d'invitation : 3 options → `admin_delta` / `integrator_delta` / `integrator_external` (back doit accepter `admin_delta`)
- [x] Pas de retrait de rôle : un intégrateur sans client = tableau vide, le bouton "Retirer le rôle" est supprimé
- [x] Un admin ne peut PAS se retrograder lui-même (protection front + back)
- [x] Check admin : utiliser le `persona` du JWT local (pas d'endpoint dédié)
