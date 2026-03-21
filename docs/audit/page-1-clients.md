# Spec : BO — Clients (`/dashboard/admin/clients`)

## Maquettes

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
│  ◀ 1/1 ▶                                          1 résultat       │
├─────────────────────────────────────────────────────────────────────┤
│  Nom                                                                │
│ ─────────────────────────────────────────────────────────────────── │
│  OldCorp                          [Restaurer ↩] ← popup confirm    │
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
│  ─────────────────────────────────────────── │
│                                              │
│  🌐 Accès & Domaines                        │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Sous-domaine                           │  │
│  │ [laposte        ] .delta-rm.com        │  │
│  │                                        │  │
│  │ Hostname personnalisé (CNAME)          │  │
│  │ [app.laposte.com              ]        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│         [Archiver ce client 📦]              │
│                                              │
└──────────────────────────────────────────────┘
```

### Drawer client — Mode Admin (sans SSO configuré)

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
│  ...                                         │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  🔐 Configuration SSO                       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Aucune configuration SSO.             │  │
│  │  Les utilisateurs se connectent        │  │
│  │  par email et mot de passe.            │  │
│  │                                        │  │
│  │          [Configurer SSO +]            │  │
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
│  ─────────────────────────────────────────── │
│                                              │
│  🔐 Configuration SSO         (lecture seule)│
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Provider                               │  │
│  │  Azure AD               (non éditable) │  │
│  │                                        │  │
│  │ Issuer URL                             │  │
│  │  https://login.microsoft (non éditable)│  │
│  │                                        │  │
│  │ Client ID (OIDC)                       │  │
│  │  abc-123-def-456         (non éditable)│  │
│  │                                        │  │
│  │ Client Secret                          │  │
│  │  ••••••••                (non éditable)│  │
│  │                                        │  │
│  │ Activé                   ●═══ (disabled)│  │
│  │                                        │  │
│  │  (pas de bouton Supprimer)             │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  (pas de bouton Archiver)                    │
│                                              │
└──────────────────────────────────────────────┘
```

### Drawer client — Mode Intégrateur (sans SSO configuré)

```
┌─── Sheet (droite) ──────────────────────────┐
│                                              │
│  🏢  La Poste                                │
│                                              │
│  ...                                         │
│                                              │
│  ─────────────────────────────────────────── │
│                                              │
│  🔐 Configuration SSO         (lecture seule)│
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Aucune configuration SSO.             │  │
│  │  Les utilisateurs se connectent        │  │
│  │  par email et mot de passe.            │  │
│  │                                        │  │
│  │  (pas de bouton Configurer)            │  │
│  └────────────────────────────────────────┘  │
│                                              │
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

### Dialog "Restaurer le client" (Admin uniquement, vue archivés)

```
┌─── AlertDialog ─────────────────────────────┐
│                                              │
│  Restaurer le client                         │
│                                              │
│  Êtes-vous sûr de vouloir restaurer le       │
│  client « OldCorp » ? Il redeviendra         │
│  accessible sur la plateforme.               │
│                                              │
│                    [Annuler]   [Restaurer]    │
│                                              │
└──────────────────────────────────────────────┘
```

### Drawer edition client (vue complète admin)

```
┌─── SheetContent (droite) ──────────────────────────────────────┐
│                                                                 │
│  🏢 Acme Corporation                                           │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Nom                                                           │
│  [Acme Corporation                          ]  (auto-save)     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  👥 Integrateurs (2)                        [Ajouter +]        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [AB] Alice Bertrand                               🗑   │   │
│  │       alice@delta.com                                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  [CM] Charles Martin                               🗑   │   │
│  │       charles@ext.com                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  (ou si aucun integrateur assigne :)                           │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│  │  Aucun integrateur assigne a ce client                  │   │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                                 │
│                                                                 │
│               [Archiver ce client 📦]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dialog "Ajouter un integrateur a un client"

```
┌─── Dialog ─────────────────────────────────────────┐
│                                                     │
│  Ajouter un integrateur                             │
│  Recherchez et selectionnez un integrateur          │
│  a assigner a ce client.                            │
│                                                     │
│  Integrateur                                        │
│  [🔍 Rechercher par nom ou email...            ]   │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  [AB] Alice Bertrand      [Integrateur] ✓   │    │
│  │       alice@delta.com                        │    │
│  ├─────────────────────────────────────────────┤    │
│  │  [BM] Bob Martin          [Admin]           │    │
│  │       bob@delta.com                          │    │
│  ├─────────────────────────────────────────────┤    │
│  │  [CD] Charles Dupont      [Integrateur]     │    │
│  │       charles@ext.com                        │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│                    [Annuler]  [Ajouter]             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Dialog "Archiver le client"

```
┌─── AlertDialog ────────────────────────────────────┐
│                                                     │
│  Archiver le client                                 │
│                                                     │
│  Etes-vous sur de vouloir archiver                  │
│  "Acme Corporation" ? Il ne sera plus               │
│  accessible mais pourra etre restaure.              │
│                                                     │
│                 [Annuler]  [Archiver]               │
│                            (destructive)            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Règles métier

- **Accès** : Admin voit tous les clients. Intégrateur ne voit que ses clients assignés
- **Création** : Admin uniquement. Champ unique "Nom" (min 2 caractères)
- **Unicité du nom** : contrainte UNIQUE en BDD. Erreur 409 si doublon
- **Archivage** (pas de suppression physique) : `PATCH /api/clients/:id/deactivate`. Le client n'est plus accessible mais peut être restauré
- **Restauration** : `PATCH /api/clients/:id` avec `{ is_active: true }`. Dialog de confirmation obligatoire
- **Mode intégrateur** : lecture seule sur tout le drawer (nom, intégrateurs, SSO, domaines). Pas de boutons d'action (Ajouter, Supprimer, Archiver)
- **Colonnes tableau** : Nom + Actions (bouton "Configurer"). Clic sur la ligne ouvre le drawer
- **Pagination** : 50/page, toujours côté API
- **Tri** : par nom asc, fixé côté API
- **SSO** : un client = un mode d'auth (SSO exclusif OU email/mot de passe, jamais les deux)
- **SSO activé** = pas de flow "définissez votre mot de passe" à l'invitation
- **Intégrateurs assignables** : exclure les `admin_delta` de la liste (ils ont accès à tout)
- **Bouton "Configurer"** : switch le ViewMode en intégrateur pour ce client + navigue vers `/dashboard/{clientId}/modules`
- **Auto-save** : le nom du client se sauvegarde en auto-save avec debounce 1.5s

---

## Endpoints API (existants)

| Méthode | Route | Description | À corriger |
|---------|-------|-------------|------------|
| GET | `/api/clients?page=&per_page=` | Liste paginée des clients | Ajouter param `is_active` (filtre actifs/archivés) + param `search` (WHERE name ILIKE) |
| POST | `/api/clients` | Créer un client | Ajouter check unicité nom → 409 si doublon |
| PATCH | `/api/clients/:id` | Modifier un client (nom, is_active, subdomain, custom_hostname) | — |
| PATCH | `/api/clients/:id/deactivate` | Archiver un client | — |
| GET | `/api/clients/:id/integrators` | Lister les intégrateurs assignés à un client | — |
| POST | `/api/integrators/:userId/clients` | Assigner un intégrateur à un client | Body : `{ client_id }` |
| DELETE | `/api/integrators/:userId/clients/:clientId` | Retirer un intégrateur d'un client | — |
| GET | `/api/clients/:id/sso` | Lire la config SSO d'un client | Retourne `null` si pas configuré |
| PUT | `/api/clients/:id/sso` | Créer/modifier la config SSO | Body : `{ provider, issuer_url, client_id_oidc, client_secret, is_enabled }`. Secret chiffré en BDD, retourné en `***` |
| DELETE | `/api/clients/:id/sso` | Supprimer la config SSO | — |

---

## Endpoints API (à créer)

| Méthode | Route | Description |
|---------|-------|-------------|
| — | — | Aucun endpoint supplémentaire à créer |

---

## À construire (front)

### Page liste des clients

- **Tableau** avec 2 colonnes : Nom + Actions (bouton "Configurer")
- Clic sur une ligne (hors bouton) → ouvre le drawer du client
- Barre de recherche par nom → param `search` envoyé à l'API (recherche serveur)
- Toggle actifs / archivés → param `is_active` envoyé à l'API
- Pagination serveur (50/page) branchée sur la réponse `PaginatedResponse`
- **PageHeader Admin** : bouton "Nouveau client +" + bouton "Archives"
- **PageHeader Intégrateur** : pas de boutons
- **Vue archivés** : titre "Clients archivés", bouton "← Retour clients actifs", bouton "Restaurer" par ligne avec dialog de confirmation

### Dialog création client

- Champ unique "Nom" avec FloatingInput (min 2 caractères)
- Boutons "Annuler" / "Créer"
- `POST /api/clients` avec `{ name }`
- Gestion erreur 409 : "Un client avec ce nom existe déjà"
- Au succès : fermer le dialog, rafraîchir la liste

### Drawer client

**Header** : icône Building2 dans un cercle coloré + nom du client en titre

**Section Nom** (admin : éditable, intégrateur : lecture seule) :
- Champ Input "Nom" avec auto-save debounce 1.5s → `PATCH /api/clients/:id` avec `{ name }`
- Protection : ne pas sauvegarder au form.reset() initial

**Section Intégrateurs** :
- Titre "Intégrateurs ({count})" avec icône Users
- Bouton "Ajouter +" → dialog d'assignation (admin uniquement)
- Liste : avatar (initiales), nom complet, email, bouton 🗑 pour retirer (admin uniquement)
- Etat vide : "Aucun intégrateur assigné à ce client" (bordure pointillée)
- Lister via `GET /api/clients/:clientId/integrators`
- Assigner via `POST /api/integrators/:userId/clients` avec `{ client_id }`
- Retirer via `DELETE /api/integrators/:userId/clients/:clientId`
- Mode intégrateur : pas de bouton "Ajouter", pas de bouton 🗑

**Dialog "Ajouter un intégrateur"** :
- Recherche par nom/email (filtrage local sur la liste des intégrateurs)
- Liste scrollable : avatar + nom + email + chip persona + check si sélectionné
- `availableIntegrators` = tous les intégrateurs SAUF ceux déjà assignés au client ET exclut `admin_delta`
- Sélection unique. Bouton "Ajouter" disabled tant que pas de sélection, loading pendant mutation

**Section Configuration SSO** (admin : éditable, intégrateur : lecture seule) :
- Si pas de config : message "Aucune configuration SSO. Les utilisateurs se connectent par email et mot de passe." + bouton "Configurer SSO" (admin)
- Si config existante, formulaire avec :
  - **Provider** : Input text, requis, min 1 char, placeholder "Azure AD, Okta..."
  - **Issuer URL** : Input text, requis, URL valide
  - **Client ID (OIDC)** : Input text, requis, min 1 char
  - **Client Secret** : Input type=password, requis pour création, optionnel pour update. Config existante : affiche "••••••••", champ vide = ne pas modifier
  - **Activé** : Switch toggle (défaut: true)
- Bouton "Supprimer la configuration SSO" (variant destructive/ghost) → dialog de confirmation (admin uniquement)
- Lire via `GET /api/clients/:id/sso`
- Sauvegarder via `PUT /api/clients/:id/sso`
- Supprimer via `DELETE /api/clients/:id/sso`
- Mode intégrateur : tous les champs disabled, pas de bouton Supprimer ni Configurer

**Section Accès & Domaines** (admin : éditable, intégrateur : lecture seule) :
- **Sous-domaine** : Input text, optionnel, placeholder "laposte" → affichage `laposte.delta-rm.com`
- **Hostname personnalisé (CNAME)** : Input text, optionnel, placeholder "app.laposte.com"
- Auto-save via `PATCH /api/clients/:id` avec `{ subdomain, custom_hostname }`
- Mode intégrateur : lecture seule

**Bouton Archiver** (admin uniquement, en bas du drawer) :
- Variant ghost, centré, texte "Archiver ce client"
- Au clic → ferme le drawer → ouvre AlertDialog de confirmation
- Titre : "Archiver le client". Bouton de confirmation : "**Archiver**" (rouge)
- Appel `PATCH /api/clients/:id/deactivate`

### Navigation "Configurer" un client

- Bouton "Configurer" sur la ligne du tableau (colonne Actions)
- Au clic : switch le ViewMode en intégrateur pour ce client + navigue vers `/dashboard/{clientId}/modules`

---

## Comportements attendus

### Loading states
- Tableau : skeleton/spinner pendant le chargement initial et les changements de page/filtre
- Drawer : spinner pendant le chargement des intégrateurs et de la config SSO
- Boutons de mutation (Créer, Ajouter, Archiver, Restaurer, Supprimer SSO) : spinner + disabled pendant l'appel
- Auto-save nom : indicateur discret de sauvegarde en cours (pas de bloquer l'UI)

### Gestion d'erreurs
- 409 création client : "Un client avec ce nom existe déjà"
- 409 assignation intégrateur : "Cet intégrateur est déjà assigné à ce client"
- Erreur réseau : toast d'erreur générique "Une erreur est survenue, veuillez réessayer"
- Erreur auto-save : toast d'erreur non bloquant

### Validation
- Nom client : min 2 caractères (front + back)
- SSO Provider : requis, min 1 char
- SSO Issuer URL : requis, URL valide
- SSO Client ID : requis, min 1 char
- SSO Client Secret : requis en création, optionnel en update (vide = ne pas modifier)

### Pagination
- 50 éléments par page, côté serveur
- Affichage "Page X/Y" + "N résultats"
- Boutons de navigation ◀ ▶

### Permissions
- Admin : accès complet (CRUD clients, gestion intégrateurs, config SSO, archivage)
- Intégrateur : lecture seule sur ses clients assignés (drawer en lecture seule, pas de création/archivage)
- Bouton "Configurer" : accessible admin + intégrateurs

---

## Points d'attention backend

| # | Route | Modification |
|---|-------|-------------|
| B1 | `GET /api/clients` | Ajouter param `is_active` (filtre WHERE `is_active = ?`) |
| B2 | `GET /api/clients` | Ajouter param `search` (WHERE `name ILIKE '%search%'`) |
| B3 | `POST /api/clients` | Ajouter check unicité name avant insert → 409 si doublon (contrainte UNIQUE déjà en BDD) |

---

## Décisions prises

- [x] Slug : supprimé (pas de colonne en BDD)
- [x] SSO : dans le drawer client (admin éditable, intégrateur lecture seule)
- [x] Auth par client : un client = un mode d'auth (SSO exclusif OU email/mot de passe)
- [x] SSO activé = pas de flow "définissez votre mot de passe" à l'invitation
- [x] Colonnes tableau : Nom + Actions (Configurer), clic ligne ouvre drawer
- [x] Pagination : 50/page, toujours côté API
- [x] Filtrage : toujours côté API
- [x] Tri : par nom asc fixe côté API
- [x] Drawer intégrateur : lecture seule
- [x] Bouton "Configurer" : garder sur la ligne du tableau
- [x] Unicité du nom client : contrainte UNIQUE en BDD + check API 409
- [x] Détection SSO : 3 mécanismes (domaine email, sous-domaine, CNAME)
