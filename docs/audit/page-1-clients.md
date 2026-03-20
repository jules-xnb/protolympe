# Page 1 : BO — Clients (`/dashboard/admin/clients`)

## Vue d'ensemble — Maquettes visuelles

### Page en mode Admin (vue actifs)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Clients                                          [Archives]       │
│  Créez et gérez les clients de la plateforme.  [Nouveau client +]  │
├─────────────────────────────────────────────────────────────────────┤
│  [🔍 Rechercher un client...]                                      │
├─────────────────────────────────────────────────────────────────────┤
│  ◀ 1/3 ▶                                          3 résultats      │
├─────────────────────────────────────────────────────────────────────┤
│  Nom                                            Actions            │
│ ─────────────────────────────────────────────────────────────────── │
│  Acme Corporation              ← clic = drawer  [Configurer ⚙]    │
│ ─────────────────────────────────────────────────────────────────── │
│  La Poste                      ← clic = drawer  [Configurer ⚙]    │
│ ─────────────────────────────────────────────────────────────────── │
│  TotalEnergies                 ← clic = drawer  [Configurer ⚙]    │
└─────────────────────────────────────────────────────────────────────┘
```

### Page en mode Admin (vue archivés)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Clients archivés                        [← Retour clients actifs] │
│  Clients archivés pouvant être restaurés.                          │
├─────────────────────────────────────────────────────────────────────┤
│  [🔍 Rechercher un client...]                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Nom                                                                │
│ ─────────────────────────────────────────────────────────────────── │
│  OldCorp                                       [Restaurer ↩]       │
└─────────────────────────────────────────────────────────────────────┘
```

### Page en mode Intégrateur

```
┌─────────────────────────────────────────────────────────────────────┐
│  Clients                                                            │
│  Consultez les clients de la plateforme.                           │
│  (pas de bouton "Nouveau client", pas de bouton "Archives")        │
├─────────────────────────────────────────────────────────────────────┤
│  [🔍 Rechercher un client...]                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Nom                                            Actions            │
│ ─────────────────────────────────────────────────────────────────── │
│  La Poste                      ← clic = drawer  [Configurer ⚙]    │
│  (ne voit que ses clients assignés)                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Drawer client — Mode Admin

```
┌─── Sheet (droite) ──────────────────────────┐
│                                              │
│  🏢  Acme Corporation                        │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Nom                                    │  │
│  │ [Acme Corporation          ]  auto-save│  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  👥 Intégrateurs (2)              [Ajouter +]│
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ [AB] Alice Bertrand                 🗑  │  │
│  │     alice@delta-rm.com                 │  │
│  ├────────────────────────────────────────┤  │
│  │ [CD] Charles Dupont                 🗑  │  │
│  │     charles@ext.com                    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  🔐 Configuration SSO                       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Provider                               │  │
│  │ [Azure AD                  ]           │  │
│  │                                        │  │
│  │ Issuer URL                             │  │
│  │ [https://login.microsoft...]           │  │
│  │                                        │  │
│  │ Client ID (OIDC)                       │  │
│  │ [abc-123-def-456           ]           │  │
│  │                                        │  │
│  │ Client Secret                          │  │
│  │ [••••••••••••••••          ]           │  │
│  │                                        │  │
│  │ Activé                          [═══●] │  │
│  │                                        │  │
│  │            [Supprimer la config SSO]   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│         [Archiver ce client 📦]              │
│                                              │
└──────────────────────────────────────────────┘
```

### Drawer client — Mode Intégrateur (lecture seule)

```
┌─── Sheet (droite) ──────────────────────────┐
│                                              │
│  🏢  La Poste                                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Nom                                    │  │
│  │  La Poste               (non éditable) │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  👥 Intégrateurs (2)    (pas de btn Ajouter)│
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ [AB] Alice Bertrand       (pas de 🗑)  │  │
│  │     alice@delta-rm.com                 │  │
│  ├────────────────────────────────────────┤  │
│  │ [CD] Charles Dupont       (pas de 🗑)  │  │
│  │     charles@ext.com                    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  (pas de section SSO)                        │
│  (pas de bouton Archiver)                    │
│                                              │
└──────────────────────────────────────────────┘
```

### Dialog "Nouveau client" (Admin uniquement)

```
┌─── Dialog ──────────────────────────────────┐
│                                              │
│  Créer un client                             │
│  Ajoutez un nouveau client à la plateforme.  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Nom                                    │  │
│  │ [                          ]           │  │
│  │ Min 2 caractères                       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│                      [Annuler]    [Créer +]  │
│                                              │
└──────────────────────────────────────────────┘
```

### Dialog "Ajouter un intégrateur" (Admin uniquement)

```
┌─── Dialog ──────────────────────────────────┐
│                                              │
│  Ajouter un intégrateur                      │
│  Recherchez et sélectionnez un intégrateur   │
│  à assigner à ce client.                     │
│                                              │
│  Intégrateur                                 │
│  [🔍 Rechercher par nom ou email...]         │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ [EF] Eve Faure     [Intégrateur]      │  │
│  │     eve@delta-rm.com                   │  │
│  ├────────────────────────────────────────┤  │
│  │ [GH] Guy Henri     [Intégrateur]  ✓   │  │
│  │     guy@ext.com        (sélectionné)   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│                      [Annuler]  [Ajouter +]  │
│                                              │
└──────────────────────────────────────────────┘
```

### Dialog "Archiver le client" (Admin uniquement)

```
┌─── AlertDialog ─────────────────────────────┐
│                                              │
│  Archiver le client                          │
│                                              │
│  Êtes-vous sûr de vouloir archiver le        │
│  client « Acme Corporation » ? Il ne sera    │
│  plus accessible mais pourra être restauré.  │
│                                              │
│                    [Annuler]    [Archiver]    │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 1.1 Lister les clients

**Accès** : Admin (tous) / Intégrateurs (clients assignés uniquement)

**Comportement cible** :
- Colonnes : **Nom** + **Actions** (bouton "Configurer ⚙" à droite)
- Clic sur la ligne (hors bouton) → ouvre le drawer du client
- Barre de recherche par nom → param `search` envoyé à l'API
- Toggle actifs / archivés → param `is_active` envoyé à l'API
- Pagination serveur (50/page) via `serverPagination` prop du DataTable
- Bouton "Nouveau client" (admin) / "Archives" (admin) dans le PageHeader
- Vue archivés : bouton "Restaurer" par ligne + "← Retour aux clients actifs"

**API cible** : `GET /api/clients?page=1&per_page=50&is_active=true&search=acme`

**Réponse API** (format `PaginatedResponse`) :
```json
{
  "data": [
    { "id": "uuid", "name": "Acme Corp", "is_active": true, "created_at": "...", "updated_at": "..." }
  ],
  "pagination": { "page": 1, "per_page": 50, "total": 1, "total_pages": 1 }
}
```

**État actuel du front** :
- `useClients()` → `GET /api/clients` sans params → retourne **tout** d'un coup (pas paginé côté front)
- Front filtre `clients.filter(c => c.is_active)` / `clients.filter(c => !c.is_active)` en mémoire
- DataTable fait la recherche, le tri et la pagination **côté client** (getFilteredRowModel, getSortedRowModel, getPaginationRowModel)
- 3 colonnes : Nom (400px), Créé le (120px), Actions (boutons Modifier + Configurer)
- Clic sur bouton "Modifier" ouvre le drawer (pas clic sur la ligne)

**État actuel de l'API** :
- `GET /api/clients` supporte `page` et `per_page` → retourne `PaginatedResponse`
- ❌ Pas de param `is_active` → retourne actifs ET archivés mélangés
- ❌ Pas de param `search` → pas de recherche côté serveur
- Le tri est fixé par nom (`orderBy(clients.name)`) → OK

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Pagination serveur | ✅ | ✅ `page`, `per_page` | ❌ Pagination côté client | **REFACTO FRONT** | Brancher `serverPagination` du DataTable sur la réponse API |
| Filtre `is_active` | ✅ colonne `is_active` | ❌ Pas de param | ❌ Filtre côté client | **REFACTO API + FRONT** | Ajouter param `is_active` à l'API |
| Recherche `search` | ✅ colonne `name` | ❌ Pas de param | ❌ Recherche côté client | **REFACTO API + FRONT** | Ajouter param `search` à l'API (WHERE name ILIKE) |
| Tri par nom | ✅ | ✅ Fixé asc | ⚠️ Côté client | **OK** | Le tri est fixé asc par nom côté API, suffisant |
| Colonnes | — | — | ⚠️ 3 colonnes (Nom, Créé le, Actions) | **REFACTO FRONT** | 2 colonnes : Nom + Actions (bouton Configurer) |
| Clic ligne → drawer | — | — | ❌ Clic seulement sur bouton "Modifier" | **REFACTO FRONT** | Utiliser `onRowClick` du DataTable |
| Bouton Restaurer en vue archivés | ✅ | ✅ `PATCH /:id` | ✅ Présent | ✅ OK | — |
| Bouton Configurer sur la ligne | — | — | ✅ Existe | ✅ OK | Garder, supprimer le bouton "Modifier" |

---

## 1.2 Créer un client

**Accès** : Admin uniquement

**Comportement cible** :
- Bouton "Nouveau client +" dans le PageHeader → ouvre un Dialog
- Champ unique : **Nom** (min 2 chars, FloatingInput)
- Boutons : "Annuler" / "Créer"
- `POST /api/clients` avec `{ "name": "..." }`
- Erreur 409 si nom déjà existant → afficher message d'erreur
- Le dialog se ferme au succès, la liste se rafraîchit

**API** : `POST /api/clients`
- Body : `{ "name": string }` (min 2 chars)
- Réponse 201 : `{ "id", "name", "is_active": true, "created_at", "updated_at" }`
- Réponse 409 : `{ "error": "Un client avec ce nom existe déjà" }` (NOUVEAU)
- Audit : `logAdminAction('client.create', ...)`

**État actuel du front** :
- Dialog `ClientFormDialog` avec champ `name` (min 2) + switch `is_active` (caché en mode création) → ✅ OK
- ⚠️ `AdminClientsPage.handleCreateSubmit` génère un `slug` et l'envoie → code mort, back l'ignore
- ⚠️ Le Dialog accepte aussi un prop `client` pour l'édition, mais n'est utilisé qu'en création ici

**État actuel de l'API** :
- `POST /api/clients` valide min 1 char (pas 2)
- ❌ Pas de vérification d'unicité du nom

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Dialog création | — | — | ✅ Fonctionne | ✅ OK | — |
| Champ name (min 2) | ✅ | ⚠️ min 1 côté API | ✅ min 2 côté front | **REFACTO API** | Harmoniser min à 2 côté API |
| Slug auto-généré | ❌ Pas de colonne | ❌ Ignoré | ⚠️ Généré et envoyé | **REFACTO FRONT** | Supprimer les lignes 59-66 de AdminClientsPage.tsx |
| Switch is_active en mode création | ✅ | ✅ | ✅ Caché | ✅ OK | — |
| Unicité du nom | ❌ Pas de contrainte UNIQUE | ❌ Pas de check | ❌ | **REFACTO API + BDD** | Ajouter contrainte UNIQUE sur name + check API avec 409 |

---

## 1.3 Drawer client

**Accès** : Admin (lecture/écriture) / Intégrateurs (lecture seule — champs disabled, pas de boutons d'action, pas de section SSO)

Le drawer s'ouvre au clic sur une ligne du tableau. C'est un `Sheet` (shadcn) qui s'ouvre à droite.

### 1.3.1 Header du drawer

- Icône Building2 dans un cercle coloré + nom du client en titre (SheetTitle)

**État actuel** : ✅ OK, rien à changer.

### 1.3.2 Modifier le nom (Admin)

**Comportement cible** :
- Champ Input "Nom" avec placeholder "Acme Corporation"
- Auto-save avec debounce 1.5s via `form.watch()` → valide → `PATCH /api/clients/:id`
- Protection : ne sauvegarde pas au `form.reset()` initial (via `isResettingRef`)
- Mode intégrateur : champ disabled (lecture seule)

**API** : `PATCH /api/clients/:id` — Body : `{ "name": "nouveau nom" }` — Réponse : client mis à jour
- Autorisé pour `admin_delta` + `integrator_delta`/`integrator_external` (si assigné)
- Audit : `logAdminAction('client.update', ...)`

**État actuel du front** :
- ✅ Auto-save fonctionne correctement
- ⚠️ Le form envoie aussi `is_active` à chaque auto-save (car `form.getValues()` retourne tout) → pas grave mais inutile
- ❌ Pas de mode lecture seule pour les intégrateurs

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Auto-save name | ✅ | ✅ | ✅ | ✅ OK | — |
| Mode lecture seule (intégrateurs) | — | — | ❌ Pas implémenté | **REFACTO FRONT** | Désactiver le champ si non-admin |

### 1.3.3 Archiver (Admin)

**Comportement cible** :
- Bouton "Archiver ce client 📦" en bas du drawer (variant ghost, centré)
- Au clic → ferme le drawer → ouvre `DeleteConfirmDialog` avec :
  - Titre : "Archiver le client"
  - Description : "Êtes-vous sûr de vouloir archiver le client « {nom} » ? Il ne sera plus accessible mais pourra être restauré."
  - Boutons : "Annuler" / "**Archiver**" (rouge)
- `PATCH /api/clients/:id/deactivate`

**État actuel du front** :
- ⚠️ Appelle `PATCH /api/clients/:id` avec `{ is_active: false }` au lieu de l'endpoint dédié
- ⚠️ Le texte du bouton de confirmation dit "Supprimer" → devrait dire "Archiver"
- ✅ Le dialog de confirmation existe et fonctionne

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Endpoint archivage | ✅ | ✅ `PATCH /:id/deactivate` | ⚠️ Utilise `PATCH /:id` | **REFACTO FRONT** | Créer hook `useDeactivateClient()` → `PATCH /api/clients/${id}/deactivate` |
| Texte bouton confirmation | — | — | ⚠️ "Supprimer" | **REFACTO FRONT** | Changer en "Archiver" dans le DeleteConfirmDialog (props custom) |
| Restaurer (vue archivés) | ✅ | ✅ `PATCH /:id` + `is_active: true` | ✅ | ✅ OK | — |

### 1.3.4 Intégrateurs assignés (Admin — lecture seule pour intégrateurs)

**Comportement cible** :
- Titre : "Intégrateurs ({count})" avec icône Users
- Bouton "Ajouter +" → ouvre dialog `AssignIntegratorToClientDialog` (admin uniquement)
- Liste des intégrateurs assignés, chacun avec :
  - Avatar (initiales du nom)
  - Nom complet (`first_name` + `last_name`)
  - Email
  - Bouton 🗑 pour retirer (admin uniquement)
- État vide : "Aucun intégrateur assigné à ce client" (bordure pointillée)
- Mode intégrateur : pas de bouton "Ajouter", pas de bouton 🗑

**APIs cibles** :
- Lister : `GET /api/clients/:clientId/integrators`
  - Réponse : `[{ assignment_id, assigned_at, assigned_by, account_id, email, first_name, last_name, persona }]`
- Assigner : `POST /api/integrators/:userId/clients`
  - Body : `{ "client_id": "uuid" }`
  - Réponse 201 : `{ id, user_id, client_id, assigned_by, created_at }`
- Retirer : `DELETE /api/integrators/:userId/clients/:clientId`
  - Réponse : `{ success: true }`

**État actuel du front** :
- ❌ `useIntegratorAssignments()` appelle `GET /api/integrators/assignments` — **n'existe pas dans le back**
- ❌ `useAssignIntegratorToClient()` appelle `POST /api/integrators/assign` — **n'existe pas**
- ❌ `useRemoveIntegratorFromClient()` appelle `DELETE /api/integrators/assignments/:assignmentId` — **n'existe pas**
- ❌ Types dans `useAdminData.ts` en camelCase (`userId`, `clientId`, `fullName`) vs API snake_case
- ⚠️ `useIntegrators()` → `GET /api/integrators` fonctionne (liste tous les intégrateurs pour la dialog d'assignation)
- ⚠️ Front filtre côté client `allAssignments.filter(a => a.client_id === client.id)` → devrait appeler endpoint par client
- ⚠️ Pour l'assignation, le back attend `{ client_id }` dans body + `userId` en path, mais le front envoie `{ userId, clientId, persona }` dans body

| Élément | BDD | API | Front | Status | Refacto détaillé |
|---------|:---:|:---:|:---:|---|---|
| Lister par client | ✅ | ✅ `GET /clients/:id/integrators` | ❌ `GET /integrators/assignments` | **REFACTO** | Créer hook `useClientIntegrators(clientId)` → `GET /api/clients/${clientId}/integrators` |
| Assigner | ✅ | ✅ `POST /integrators/:id/clients` | ❌ `POST /integrators/assign` | **REFACTO** | Modifier mutation : `api.post('/api/integrators/${userId}/clients', { client_id: clientId })` |
| Retirer | ✅ | ✅ `DELETE /integrators/:id/clients/:clientId` | ❌ `DELETE /integrators/assignments/:id` | **REFACTO** | Modifier mutation : `api.delete('/api/integrators/${userId}/clients/${clientId}')` |
| Types TS | — | snake_case | ❌ camelCase | **REFACTO** | Nouveau type : `{ assignment_id, account_id, email, first_name, last_name, persona, assigned_at, assigned_by }` |
| Mode lecture seule intégrateur | — | — | ❌ | **REFACTO FRONT** | Masquer boutons "Ajouter" et 🗑 si non-admin |

**Dialog "Ajouter un intégrateur"** (composant `AssignIntegratorToClientDialog`) :
- Recherche par nom/email → filtrage local sur `availableIntegrators`
- Liste scrollable (max-h 48) : avatar + nom + email + chip persona + check si sélectionné
- Bouton "Ajouter" disabled tant que pas de sélection, loading pendant mutation
- `availableIntegrators` = tous les intégrateurs SAUF ceux déjà assignés au client ET exclut `admin_delta`

| Élément | Front | Status |
|---------|:---:|---|
| Recherche par nom/email | ✅ Filtrage local | ✅ OK |
| Affichage avatar + nom + email + chip persona | ✅ | ✅ OK |
| Sélection unique avec check | ✅ | ✅ OK |
| Bouton "Ajouter" + état loading | ✅ | ✅ OK |
| Filtrage "déjà assignés" | ⚠️ Dépend de `useIntegratorAssignments()` cassé | **REFACTO** | Recalculer avec `useClientIntegrators()` |

### 1.3.5 Configuration SSO (NOUVEAU — Admin uniquement)

**Comportement cible** :
- Section visible uniquement pour admin
- Séparateur + titre "Configuration SSO" avec icône Lock
- Si pas de config SSO : message "Aucune configuration SSO" + bouton "Configurer SSO"
- Si config existante : formulaire avec les champs suivants :
  - **Provider** : Input text, requis, min 1 char, placeholder "Azure AD, Okta..."
  - **Issuer URL** : Input text, requis, URL valide, placeholder "https://login.microsoftonline.com/..."
  - **Client ID (OIDC)** : Input text, requis, min 1 char
  - **Client Secret** : Input type=password, requis pour création, optionnel pour update
    - Si config existante : affiche "••••••••" (masqué), champ vide = ne pas modifier le secret
    - Si nouvelle config : champ obligatoire
  - **Activé** : Switch toggle (défaut: true), description "Activer l'authentification SSO pour ce client"
- Auto-save avec debounce (même pattern que le nom) OU bouton "Enregistrer" explicite (à décider)
- Bouton "Supprimer la configuration SSO" (variant destructive/ghost) → dialog de confirmation

**APIs** :
- Lire : `GET /api/clients/:id/sso`
  - Réponse : `{ id, client_id, provider, issuer_url, client_id_oidc, client_secret: "***", is_enabled, created_at, updated_at }` ou `null`
- Créer/Modifier : `PUT /api/clients/:id/sso`
  - Body : `{ provider: string, issuer_url: string(url), client_id_oidc: string, client_secret: string, is_enabled?: boolean }`
  - Réponse 201 (create) ou 200 (update) : config avec `client_secret: "***"`
  - Le secret est **chiffré** en BDD via `encrypt()`, **jamais** retourné en clair
- Supprimer : `DELETE /api/clients/:id/sso`
  - Réponse : `{ success: true }` ou 404

| Élément | BDD | API | Front | Status | Refacto |
|---------|:---:|:---:|:---:|---|---|
| Table `client_sso_configs` | ✅ FK cascade → clients | — | — | ✅ OK | — |
| Lire config SSO | ✅ | ✅ `GET /clients/:id/sso` | ❌ N'existe pas | **REFACTO FRONT** | Créer hook `useClientSso(clientId)` |
| Formulaire SSO | ✅ toutes colonnes | ✅ `PUT /clients/:id/sso` | ❌ N'existe pas | **REFACTO FRONT** | Créer composant `ClientSsoSection` |
| Supprimer SSO | ✅ | ✅ `DELETE /clients/:id/sso` | ❌ N'existe pas | **REFACTO FRONT** | Bouton + dialog confirmation |
| Secret masqué | ✅ chiffré en BDD | ✅ retourne `***` | ❌ | **REFACTO FRONT** | Afficher `••••••••`, champ vide = pas de modif |

---

## 1.4 Configurer un client (navigation)

**Comportement cible** :
- Bouton "Configurer ⚙" sur la ligne du tableau (colonne Actions)
- Au clic : switch le ViewMode en intégrateur pour ce client + navigue vers `/dashboard/{clientId}/modules`
- Disponible pour tous les utilisateurs ayant accès (admin + intégrateurs)

**État actuel** : ✅ Fonctionne — `switchToIntegratorMode(client)` + `navigate()`

| Élément | Front | Status |
|---------|:---:|---|
| Switch mode intégrateur | ✅ | ✅ OK |
| Navigation vers modules | ✅ | ✅ OK |
| Bouton sur la ligne du tableau | ✅ | ✅ OK — garder |

---

## Récapitulatif complet des refactos

### Back-end (API)

| # | Fichier | Modification |
|---|---------|-------------|
| B1 | `server/src/routes/clients.ts` — `GET /` | Ajouter param `is_active` (filtre WHERE `is_active = ?`) |
| B2 | `server/src/routes/clients.ts` — `GET /` | Ajouter param `search` (WHERE `name ILIKE '%search%'`) |
| B3 | `server/src/routes/clients.ts` — `POST /` | Changer min name de 1 à 2 chars dans le schema zod |
| B4 | `server/src/routes/clients.ts` — `POST /` | Ajouter check unicité name avant insert → 409 si doublon |

### Base de données

| # | Table | Modification |
|---|-------|-------------|
| D1 | `clients` | Ajouter contrainte UNIQUE sur `name` |

### Front-end

| # | Fichier(s) | Modification |
|---|-----------|-------------|
| F1 | `src/hooks/useClients.ts` | Refaire `useClients()` pour accepter params `{ page, per_page, is_active, search }` et retourner `PaginatedResponse` |
| F2 | `src/hooks/useClients.ts` | Ajouter hook `useDeactivateClient()` → `PATCH /api/clients/${id}/deactivate` |
| F3 | `src/hooks/useClients.ts` | Ajouter hook `useClientSso(clientId)` → `GET /api/clients/${clientId}/sso` |
| F4 | `src/hooks/useClients.ts` | Ajouter hooks `useUpsertClientSso()` et `useDeleteClientSso()` |
| F5 | `src/hooks/useClients.ts` | Ajouter hook `useClientIntegrators(clientId)` → `GET /api/clients/${clientId}/integrators` |
| F6 | `src/hooks/useAdminData.ts` ou nouveau fichier | Refaire mutations assignation : `POST /integrators/:userId/clients` avec `{ client_id }` |
| F7 | `src/hooks/useAdminData.ts` ou nouveau fichier | Refaire mutation retrait : `DELETE /integrators/:userId/clients/:clientId` |
| F8 | `src/hooks/useAdminData.ts` | Corriger types TS : `IntegratorAssignment` → snake_case aligné sur API |
| F9 | `src/pages/admin/AdminClientsPage.tsx` | Supprimer génération slug (lignes 59-66) |
| F10 | `src/pages/admin/AdminClientsPage.tsx` | Refaire colonnes : Nom + Actions (Configurer), supprimer colonne "Créé le" |
| F11 | `src/pages/admin/AdminClientsPage.tsx` | Ajouter `onRowClick` → ouvre le drawer |
| F12 | `src/pages/admin/AdminClientsPage.tsx` | Brancher pagination serveur, filtres `is_active` et `search` sur l'API |
| F13 | `src/pages/admin/AdminClientsPage.tsx` | Utiliser `useDeactivateClient()` pour l'archivage |
| F14 | `src/components/admin/clients/ClientEditDrawer.tsx` | Ajouter mode lecture seule si non-admin (disabled champs, masquer boutons) |
| F15 | `src/components/admin/clients/ClientEditDrawer.tsx` | Reconnecter aux hooks intégrateurs corrigés (F5, F6, F7) |
| F16 | `src/components/admin/clients/ClientEditDrawer.tsx` | Ajouter section SSO (nouveau composant `ClientSsoSection`) — admin uniquement |
| F17 | `src/components/admin/clients/ClientEditDrawer.tsx` | Changer texte bouton archivage : "Supprimer" → "Archiver" |

---

## Décisions prises

- [x] Slug : supprimer (pas de colonne en BDD)
- [x] SSO : ajouter dans le drawer client (admin uniquement)
- [x] Colonnes tableau : Nom + Actions (Configurer), clic ligne ouvre drawer
- [x] Pagination : 50/page, toujours côté API
- [x] Filtrage : toujours côté API
- [x] Tri : par nom asc fixe côté API
- [x] Drawer intégrateur : lecture seule
- [x] Bouton "Configurer" : garder sur la ligne du tableau
- [x] Unicité du nom client : contrainte UNIQUE en BDD + check API 409
