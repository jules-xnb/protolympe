# Spec : BO — Intégrateurs (`/dashboard/admin/integrators`)

## Maquettes

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
└──────────────────────────────────────────────┘
```

### Dialog "Nouveau intégrateur"

```
┌─── Dialog ─────────────────────────────────────────┐
│                                                     │
│  Ajouter un integrateur                             │
│                                                     │
│  ┌───────────────────┐  ┌──────────────────────┐    │
│  │ Prenom            │  │ Nom                  │    │
│  │ [              ]  │  │ [                 ]  │    │
│  └───────────────────┘  └──────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Email                                       │    │
│  │ [                                        ]  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Role                                               │
│  [Integrateur Delta                            ▾]   │
│    Options :                                        │
│    - Integrateur Delta                              │
│    - Admin Delta                                    │
│                                                     │
│                 [Annuler]  [Creer le compte]        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Drawer intégrateur — Admin

```
┌─── SheetContent (droite) ──────────────────────────────────────┐
│                                                                 │
│  Details de l'integrateur                              [✕]     │
│                                                                 │
│  Informations generales                                        │
│                                                                 │
│  ┌─────────────────────────┐  ┌────────────────────────────┐   │
│  │ Statut                  │  │ Date de creation           │   │
│  │ [Integrateur Delta  ▾]  │  │ [20/03/26       ] (ro)    │   │
│  │       (auto-save)       │  │                            │   │
│  └─────────────────────────┘  └────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐  ┌────────────────────────────┐   │
│  │ Nom                     │  │ Prenom                     │   │
│  │ [Bertrand     ] (ro)    │  │ [Alice          ] (ro)    │   │
│  └─────────────────────────┘  └────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Adresse mail                                            │   │
│  │ [alice@delta.com                        ] (ro, grise)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Clients associes (2)                     [Associer un client +]│
│  (masque si persona = admin_delta)                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🏢 La Poste           20/03/2026                  🗑   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  🏢 TotalEnergies      15/02/2026                  🗑   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  (ou si aucun client :)                                        │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│  │  Aucun client associe                                   │   │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dialog "Associer un client" (depuis le drawer intégrateur)

```
┌─── Dialog ─────────────────────────────────────────┐
│                                                     │
│  Associer un client                                 │
│                                                     │
│  [🔍 Rechercher un client...                   ]   │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  🏢 Acme Corp                               │    │
│  ├─────────────────────────────────────────────┤    │
│  │  🏢 BNP Paribas                             │    │
│  ├─────────────────────────────────────────────┤    │
│  │  🏢 Carrefour                               │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  (clic sur un client = assignation immediate)      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Note : seuls les clients non encore assignes a cet integrateur sont affiches. Le clic sur un client declenche directement `POST /api/integrators/:id/clients` et ferme le dialog.

### Dialog "Assigner un intégrateur" (depuis l'onglet Assignations)

```
┌─── Dialog ─────────────────────────────────────────┐
│                                                     │
│  Assigner un integrateur                            │
│  Associez un integrateur Delta a un client          │
│  pour lui permettre de le configurer.               │
│                                                     │
│  Integrateur                                        │
│  [Selectionner un integrateur                  ▾]   │
│    Options :                                        │
│    - Alice Bertrand (alice@delta.com)               │
│    - Bob Martin (bob@delta.com)                     │
│                                                     │
│  Client                                             │
│  [Selectionner un client                       ▾]   │
│    Options :                                        │
│    - Acme Corporation                               │
│    - La Poste                                       │
│                                                     │
│                   [Annuler]  [Assigner]             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Dialog "Retirer une assignation"

```
┌─── AlertDialog ────────────────────────────────────┐
│                                                     │
│  Supprimer l'assignation                            │
│                                                     │
│  Etes-vous sur de vouloir retirer l'acces de        │
│  "Alice Bertrand" au client "La Poste" ?           │
│                                                     │
│                 [Annuler]  [Supprimer]              │
│                            (destructive)            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Règles métier

- **Accès** : Admin uniquement (toute la page)
- **Invitation** : crée un compte intégrateur. Champs : prénom (min 1), nom (min 1), email, persona
- **Personas disponibles à l'invitation** : `admin_delta`, `integrator_delta`, `integrator_external`
- **Unicité email** : erreur 409 si email déjà utilisé
- **Admin Delta** : a accès à tous les clients, pas de section "Clients associés" dans le drawer
- **Intégrateur** (non admin) : accès uniquement aux clients assignés, section "Clients associés" visible
- **Pas de retrait de rôle** : un utilisateur a toujours un rôle sur la plateforme. Un intégrateur sans client assigné voit simplement un tableau vide
- **Auto-rétrogradation interdite** : un admin ne peut pas changer son propre persona (protection front + back)
- **Changement de persona** : auto-save debounce 500ms via `PATCH /api/integrators/:id` avec `{ persona }`
- **Données format API** : tout en snake_case (`first_name`, `last_name`, `client_count`, etc.)
- **Check admin** : utiliser le `persona` du JWT local (pas d'endpoint dédié)
- **Rate limit invitation** : 5 req/60s

---

## Endpoints API (existants)

| Méthode | Route | Description | À corriger |
|---------|-------|-------------|------------|
| GET | `/api/integrators?page=&per_page=` | Liste paginée des intégrateurs | Ajouter param `search` (WHERE email/name ILIKE) + param `client_id` (JOIN assignments) + `client_count` dans la réponse |
| POST | `/api/integrators/invite` | Inviter un intégrateur | Accepter `admin_delta` en plus de `integrator_delta` / `integrator_external` dans le schema persona |
| PATCH | `/api/integrators/:id` | Modifier un intégrateur (persona, first_name, last_name) | — |
| GET | `/api/integrators/:id/clients` | Lister les clients assignés à un intégrateur | — |
| POST | `/api/integrators/:id/clients` | Assigner un client à un intégrateur | Body : `{ client_id }`. Erreur 409 si déjà assigné |
| DELETE | `/api/integrators/:id/clients/:clientId` | Retirer un client d'un intégrateur | — |

---

## Endpoints API (à créer)

| Méthode | Route | Description |
|---------|-------|-------------|
| — | — | Aucun endpoint supplémentaire à créer |

---

## À construire (front)

### Page liste des intégrateurs

- **Tableau** avec colonnes : Intégrateur (nom + email), Nb clients, Rôle (chip), Actions (Modifier)
- Clic sur une ligne → ouvre le drawer
- Barre de recherche → param `search` envoyé à l'API (recherche serveur par nom/email)
- Filtre par client → dropdown côté serveur via param `client_id`
- Pagination serveur (50/page) branchée sur la réponse `PaginatedResponse`
- Colonne "Nb clients" : utiliser le champ `client_count` retourné par l'API
- Pour les `admin_delta` : afficher "Tous" au lieu d'un nombre
- Bouton "Nouveau intégrateur +" dans le PageHeader
- Contrôle d'accès admin : utiliser le `persona` du JWT local

### Dialog invitation intégrateur

- Champs : Prénom, Nom, Email, Rôle (select avec 2 options : Intégrateur Delta, Admin Delta)
- Boutons "Annuler" / "Créer le compte"
- `POST /api/integrators/invite` avec `{ email, first_name, last_name, persona }` (body en **snake_case**)
- Persona values : `integrator_delta` pour "Intégrateur Delta", `admin_delta` pour "Admin Delta"
- Gestion erreur 409 : "Cet email est déjà utilisé"
- Au succès : fermer le dialog, rafraîchir la liste

### Drawer intégrateur

**Header** : icône utilisateur + nom complet

**Section Informations générales** :
- **Statut (persona)** : Select éditable, auto-save debounce 500ms → `PATCH /api/integrators/:id` avec `{ persona }`
  - Protection : un admin ne peut PAS changer son propre persona
- **Créé le** : lecture seule, format date localisé
- **Nom** : lecture seule
- **Prénom** : lecture seule
- **Email** : lecture seule

**Section Clients associés** (visible uniquement si `persona !== 'admin_delta'`) :
- Titre "Clients associés ({count})" avec bouton "Associer un +"
- Lister via `GET /api/integrators/:id/clients`
- Réponse : `[{ assignment_id, assigned_at, assigned_by, client_id, client_name, client_is_active }]`
- Chaque client : nom + date d'assignation + bouton 🗑 pour retirer
- Retirer via `DELETE /api/integrators/:id/clients/:clientId` avec dialog de confirmation
- Etat vide : "Aucun client associé" (bordure pointillée)

**Dialog "Associer un client"** :
- Recherche par nom de client
- Liste : seuls les clients non encore assignés à cet intégrateur
- Clic sur un client = assignation immédiate via `POST /api/integrators/:id/clients` avec `{ client_id }`
- Au succès : fermer le dialog, rafraîchir la liste des clients associés

---

## Comportements attendus

### Loading states
- Tableau : skeleton/spinner pendant le chargement initial et les changements de page/filtre/recherche
- Drawer : spinner pendant le chargement des clients associés
- Boutons de mutation (Créer le compte, Assigner, Supprimer) : spinner + disabled pendant l'appel
- Auto-save persona : indicateur discret de sauvegarde en cours

### Gestion d'erreurs
- 409 invitation : "Cet email est déjà utilisé"
- 409 assignation : "Ce client est déjà assigné à cet intégrateur"
- Erreur auto-save persona : toast d'erreur non bloquant
- Erreur réseau : toast d'erreur générique "Une erreur est survenue, veuillez réessayer"

### Validation
- Prénom : requis, min 1 caractère
- Nom : requis, min 1 caractère
- Email : requis, format email valide
- Persona : requis, parmi `admin_delta` / `integrator_delta` / `integrator_external`

### Pagination
- 50 éléments par page, côté serveur
- Affichage "Page X/Y" + "N résultats"
- Boutons de navigation ◀ ▶

### Permissions
- Page entière : admin uniquement
- Modification persona : admin uniquement, sauf sur soi-même (protection auto-rétrogradation)

---

## Points d'attention backend

| # | Route | Modification |
|---|-------|-------------|
| B1 | `GET /api/integrators` | Ajouter param `search` (WHERE email/first_name/last_name ILIKE) |
| B2 | `GET /api/integrators` | Ajouter param `client_id` (JOIN assignments WHERE client_id = ?) |
| B3 | `GET /api/integrators` | Ajouter `client_count` dans la réponse (sous-requête COUNT sur assignments) |
| B4 | `POST /api/integrators/invite` | Accepter `admin_delta` en plus de `integrator_delta` / `integrator_external` dans le schema persona |

---

## Décisions prises

- [x] Persona dans le dialog d'invitation : `admin_delta` / `integrator_delta` / `integrator_external` (back doit accepter `admin_delta`)
- [x] Pas de retrait de rôle : un intégrateur sans client = tableau vide
- [x] Un admin ne peut PAS se rétrograder lui-même (protection front + back)
- [x] Check admin : utiliser le `persona` du JWT local (pas d'endpoint dédié)
