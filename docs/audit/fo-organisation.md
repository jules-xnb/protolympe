# Spec : Module Organisation FO (Entites organisationnelles)

## Maquettes

### Page principale — Vue liste (defaut)

```
+------------------------------------------------------------------------------+
|  Organisation                        [Configuration >]  [Import/Export v]    |
|  2 EOs                               [Historique >]     [Nouveau +]          |
+------------------------------------------------------------------------------+
|  [Rechercher par nom ou ID...]        [Filtres v]  [Liste|Arbre|Canvas]      |
+------------------------------------------------------------------------------+
|  < 1/1 >                                              12 resultats           |
|  (12 au total)    <- affiche si filtres actifs                                |
+------------------------------------------------------------------------------+
|  Nom              | Code           | Parent         | Champs perso...        |
| ──────────────────|────────────────|────────────────|──────────────────────── |
|  France           | FR01           | —              | ...           <- clic  |
| ──────────────────|────────────────|────────────────|──────────────────────── |
|  Ile-de-France    | FR02           | France         | ...           <- clic  |
| ──────────────────|────────────────|────────────────|──────────────────────── |
|  Paris            | FR03           | Ile-de-Fr.     | ...           <- clic  |
+------------------------------------------------------------------------------+
```

### Page principale — Vue arbre

```
+------------------------------------------------------------------------------+
|  [Tout deployer v]  [Tout replier v]                                          |
+------------------------------------------------------------------------------+
|  > France (FR01)                                                              |
|    v Ile-de-France (FR02)                                                     |
|      |-- Paris (FR03)                             <- clic = drawer            |
|      +-- Versailles (FR04)                                                    |
|    > Provence-Alpes-Cote d'Azur (FR05)                                        |
|  > Belgique (BE01)                                                            |
+------------------------------------------------------------------------------+
|  12 entites sur 15                  <- si filtres actifs                       |
+------------------------------------------------------------------------------+
```

### Page principale — Vue canvas (organigramme SVG)

```
+------------------------------------------------------------------------------+
|  +───────────+                                                                |
|  |  France   |                                                                |
|  +─────┬─────+                                                                |
|    +───┴───+                                                                  |
|  +─┤       ├─+                                                                |
|  |IDF|   |PACA|                                                               |
|  +─┬─+   +───+                                                               |
|  +─┴──+                                                                       |
|  |Paris|                                                                      |
|  +────+                                                                       |
+------------------------------------------------------------------------------+
|  12 entites sur 15                                                            |
+------------------------------------------------------------------------------+
```

### Drawer detail entite

```
+--- Sheet (droite) ───────────────────────────────────+
|                                                       |
|  Ile-de-France                                        |
|      FR02                                <- code      |
|                        [Historique >]                  |
|  Detail de l'entite                                   |
|                                                       |
|  France / Ile-de-France       <- fil d'Ariane clic.   |
|                                                       |
|  --- Hierarchie ────────────────────────────────────  |
|                                                       |
|  Niveau 1                                             |
|                                                       |
|  Parent : France      <- cliquable, edition possible  |
|                        [Modifier]                     |
|                                                       |
|  Entites enfants (3 / 4) :                            |
|    Paris               - actif    <- cliquable        |
|    Versailles          - actif    <- cliquable        |
|    Lyon                - actif    <- cliquable        |
|    [Afficher 1 de plus...]                            |
|    [Afficher 1 inactif(s)]                            |
|                                                       |
|  --- Champs ────────────────────────────────────────  |
|                                                       |
|  Nom        [Ile-de-France    ]  <- auto-save on blur |
|  ID         FR02                 <- lecture seule      |
|  Statut     [==o] Actif          <- Switch + Chip     |
|                                                       |
|  Secteur    [Industrie      v]   <- champ custom      |
|  Budget     [1 250 000     ]     <- champ custom      |
|  ...                                                  |
|                                                       |
|  --- Metadonnees ────────────────────────────────────  |
|  Cree le 15 janvier 2025 a 10:30                      |
|  Modifie le 20 mars 2026 a 14:15                      |
|                                                       |
+-------------------------------------------------------+
```

### Dialog commentaire de changement

```
+--- Dialog ──────────────────────────────────────────+
|  Commentaire de modification                         |
|  Le champ "Secteur" a ete modifie.                   |
|                                                      |
|  [Industrie]  ->  [Services]                         |
|                                                      |
|  Motif *                                             |
|  [Correction suite au rachat de la filiale...]       |
|                                                      |
|            [Annuler]  [Confirmer]                     |
+------------------------------------------------------+
```

### Dialog creation entite

```
+--- Dialog ──────────────────────────────────────────+
|  Nouvelle entite                                     |
|                                                      |
|  [Nom *          ]  [ID            ]                 |
|                                                      |
|  Entite parente                                      |
|  [-- France        v]  <- Combobox avec recherche    |
|                                                      |
|  --- Details ──────────────────────────────────────  |
|  [Secteur       v]   [Budget         ]               |
|  [x Reglemente   ]   [Date creation  ]               |
|  ...                                                 |
|                                                      |
|            [Annuler]  [Creer]                         |
+------------------------------------------------------+
```

### Overlay configuration (plein ecran)

```
+--- Overlay plein ecran ─────────────────────────────+
|  [<- Retour]  Configuration                          |
|              Colonnes et champs                      |
|                                                      |
|  [Colonnes]  [Champs]   <- onglets                   |
|                                                      |
|  +--- Disponibles ──────+─── Selectionnees ────────+|
|  |  Code             [+]|  = Nom          (fixe)   ||
|  |  Parent           [+]|  = Code         [X]      ||
|  |  Niveau           [+]|  = Secteur      [X]      ||
|  |  Budget           [+]|  = Parent       [X]      ||
|  |  ...                 |                           ||
|  +──────────────────────+──────────────────────────+|
|                                                      |
|            [Annuler]  [Enregistrer]                   |
|                                                      |
|  Onglet "Champs" :                                   |
|  +──────────────────────────────────────────────────+|
|  |  [Rechercher...]  [Archives] [Nouveau +]         ||
|  |  +─────────+──────+──────+───────+─────+────+   ||
|  |  | Nom     | Type |Requis|Unique | Max | .. |   ||
|  |  |─────────|──────|──────|───────|─────|────|   ||
|  |  | Secteur | Sel. | Oui  | Non   | —   | .. |   ||
|  |  | Budget  | Num. | Non  | Non   | —   | .. |   ||
|  |  +─────────+──────+──────+───────+─────+────+   ||
|  +──────────────────────────────────────────────────+|
+------------------------------------------------------+
```

### Historique EO

```
+--- Dialog (large) ──────────────────────────────────+
|  Historique — Ile-de-France                          |
|                                                      |
|  +─────────+──────────+───────────+──────────+─────+|
|  | Date    | Champ    | Ancienne  | Nouvelle | Par ||
|  |─────────|──────────|───────────|──────────|─────||
|  | 20/03   | Secteur  | Industrie | Services | J.D.||
|  | 15/01   | Nom      | IDF       | Ile-de-F.| A.M.||
|  +─────────+──────────+───────────+──────────+─────+|
|                                                      |
|                                         [Fermer]     |
+------------------------------------------------------+
```

---

## Regles metier

### Perimetre EO — filtrage par profil actif

Le filtrage par profil actif est le mecanisme central de securite du FO :

1. **JWT** contient `activeProfileId` (resolu au login ou via `POST /auth/select-profile`)
2. Le backend resout le perimetre via `getUserPermissions(userId, activeProfileId)`
3. Le perimetre retourne `eoIds` (IDs des EOs autorisees) et `eoPaths` (paths pour resolution descendants)
4. L'API filtre cote serveur : `WHERE id IN (eoIds du profil actif)`

### Resolution perimetre backend

```
Profil actif :
  +-- client_profile_eos (EO directes)
  |     EO A (include_descendants=false) -> {A}
  |     EO B (include_descendants=true)  -> {B, B1, B2, ...}
  +-- client_profile_eo_groups (regroupements)
        Groupe G (si actif, non supprime)
          EO C (include_descendants=false) -> {C}
          EO D (include_descendants=true)  -> {D, D1, ...}

Perimetre = UNION de tout
```

### Filtres exclus

- EO archivees (`isArchived=true`) : exclues
- EO inactives (`isActive=false`) : exclues par defaut (sauf si l'integrateur configure autrement)
- Groupes inactifs / soft-deleted : exclus

### Configuration du bloc (Page Builder)

| Option | Type | Default | Description |
|---|---|---|---|
| `available_views` | `EoViewMode[]` | `['list','tree','canvas']` | Vues disponibles |
| `default_view` | `EoViewMode` | `'list'` | Vue par defaut |
| `show_children` | `boolean` | `false` | Afficher les descendants des EOs du perimetre |
| `list_columns` | `EoListColumnConfig[]` | `[{name}]` | Colonnes du tableau |
| `list_page_size` | `10|25|50` | `50` | Taille de page |
| `enable_search` | `boolean` | `true` | Barre de recherche |
| `enable_filters` | `boolean` | | Filtres dynamiques |
| `filters` | `EoFilterConfig[]` | | Filtres configurables |
| `prefilters` | `EoPreFilterConfig[]` | | Pre-filtres (fixes ou editables) |
| `field_visibility` | `EoFieldVisibilityConfig[]` | | Visibilite + editabilite champ par champ dans le drawer |
| `enable_create` | `boolean` | `false` | Autoriser creation EO |
| `enable_archive` | `boolean` | `false` | Autoriser archivage EO |
| `enable_reparent` | `boolean` | `false` | Autoriser reparentage DnD |
| `enable_import` | `boolean` | `false` | Autoriser import |
| `enable_export` | `boolean` | `false` | Autoriser export CSV |
| `enable_history` | `boolean` | `false` | Acces historique audit |
| `allow_user_column_config` | `boolean` | `false` | Reordonnancement colonnes par l'utilisateur |
| `allow_user_field_management` | `boolean` | `false` | Gestion champs custom par l'utilisateur |

### Interactions et flux utilisateur

**Recherche** :
- Champ de recherche en haut (si `enable_search=true`)
- Filtre cote client sur `name` et `code` (case-insensitive)
- Debounce de 300ms
- Bouton X pour effacer
- Reset pagination a la page 1 sur changement

**Filtres dynamiques** :
- Filtres natifs (nom, code, is_active, ville, etc.) : appliques cote client
- Filtres champs custom : appliques cote serveur via `POST /api/organizational-entities/field-values`
- Pre-filtres fixes : non modifiables par l'utilisateur
- Pre-filtres editables : pre-remplis mais modifiables
- Logique AND/OR configurable

**Tri** :
- Clic sur en-tete de colonne : asc -> desc -> aucun tri
- Tri natif : cote client
- Tri champ custom : fetch valeurs via API puis tri client

**Pagination** :
- Affiche "X-Y sur Z resultats"
- Indique "(N au total)" si filtres actifs et nombre different du total

**Selection entite / Drawer** :
1. Clic sur une ligne du tableau / noeud de l'arbre / noeud du canvas
2. Ouvre le drawer a droite
3. URL mise a jour : `/c/:clientSlug/v/:viewSlug/eo/:eoId`
4. Si EO pas en cache local, fetch via API
5. Fermeture du drawer : retour URL sans `eoId`

**Edition inline (drawer)** :
- **Nom** : Input editable (si `field_visibility[name].editable`), auto-save on blur
- **Code** : toujours lecture seule
- **Statut (is_active)** : Switch editable, validation hierarchie avant changement
- **Champs custom** : InlineFieldEditor (select, text, number, date, checkbox, etc.)
- **Parent** : Combobox editable (si `field_visibility[parent].editable`)
- Verification unicite sur nom et champs custom marques `is_unique`
- Flash "Enregistre" pendant 1.5s apres chaque sauvegarde

**Commentaires de changement** :
- Configure par champ custom via `comment_rules` dans les settings
- Si `comment_rules.enabled` : dialog modale avant sauvegarde
- Si `comment_rules.required` : commentaire obligatoire
- Si `comment_rules.transitions` : commentaire uniquement pour certaines transitions (from -> to)
- Stockage via `POST /clients/:clientId/eo/:eoId/comments`

**Validation hierarchie (activation/desactivation)** :
- **Desactivation** : verifie pas d'enfants actifs referencies
- **Activation** : verifie que le parent est actif
- Erreur : toast d'erreur, pas de changement

**Creation entite** :
1. Clic "Nouveau +" (si `enable_create=true`)
2. Dialog avec : Nom*, ID (optionnel, auto-genere sinon), Parent (Combobox), champs custom
3. Validation parent actif avant creation
4. Verification unicite nom (si systeme configure)
5. Verification unicite champs custom (`is_unique`)
6. Validation inter-champs (`validateCrossFieldRules`)
7. Code auto-genere si non fourni
8. Slug genere a partir du nom
9. Sauvegarde champs custom apres creation
10. Auto-generation champs custom si `auto_generate` configure dans settings

**Export CSV** :
- Clic "Exporter" (si `enable_export=true`)
- Colonnes : code, nom, code_parent, actif, + tous champs custom actifs
- Separateur : point-virgule (`;`)
- Encodage : UTF-8 avec BOM
- Fichier : `entites_{clientSlug}.csv`

**Configuration colonnes (overlay)** :
1. Clic "Configuration" (si `allow_user_column_config=true`)
2. Overlay plein ecran avec onglets Colonnes / Champs
3. Colonnes : Drag & Drop entre "Disponibles" et "Selectionnees"
4. Colonne "Nom" toujours fixe (non supprimable)
5. Champs : CRUD champs custom (DataTable + formulaire)

**Vue arbre** :
- Deux variantes : arbre pre-charge ou arbre progressif (chargement a la demande)
- Boutons "Tout deployer" / "Tout replier"
- Filtrage : montre uniquement les entites filtrees (garde l'arbre parent pour le contexte)
- DnD reparentage (si `enable_reparent=true`) avec protection contre : drop sur soi-meme, drop sur descendant, drop sur parent actuel

**Vue canvas** :
- Organigramme SVG avec interactions (clic sur noeud = drawer)

---

## Endpoints API (existants)

### Lecture

| Methode | Endpoint | Usage |
|---|---|---|
| `POST` | `/api/organizational-entities/by-ids` | Fetch EOs du perimetre par IDs |
| `POST` | `/api/organizational-entities/descendants` | Fetch descendants par paths |
| `GET` | `/api/organizational-entities/:id` | Fetch EO individuelle |
| `POST` | `/api/organizational-entities/field-values` | Valeurs champs custom (filtrage + tri) |
| `POST` | `/api/organizational-entities/field-values/batch` | Valeurs champs custom batch (colonnes tableau) |
| `POST` | `/api/organizational-entities/tree/roots` | Noeuds racines pour arbre progressif |
| `GET` | `/api/organizational-entities/tree/children` | Enfants d'un noeud (arbre progressif) |
| `GET` | `/api/clients/:clientId/eo` | Liste entites client (paginee, filtree par perimetre) |
| `GET` | `/api/clients/:clientId/eo/:id/values` | Valeurs champs custom d'une EO |
| `GET` | `/api/clients/:clientId/eo/:id/audit` | Journal audit d'une EO |
| `GET` | `/api/clients/:clientId/eo/:id/comments` | Commentaires de changement d'une EO |
| `GET` | `/api/clients/:clientId/eo/fields` | Definitions champs custom |

### Ecriture

| Methode | Endpoint | Usage |
|---|---|---|
| `POST` | `/api/clients/:clientId/eo` | Creer une entite |
| `PATCH` | `/api/clients/:clientId/eo/:id` | Mettre a jour une entite (nom, description, is_active) |
| `PATCH` | `/api/clients/:clientId/eo/:id/archive` | Archiver une entite |
| `POST` | `/api/clients/:clientId/eo/:id/values` | Upsert valeur champ custom |
| `POST` | `/api/clients/:clientId/eo/:id/comments` | Ajouter un commentaire de changement |
| `POST` | `/api/clients/:clientId/eo/fields` | Creer un champ custom |
| `PATCH` | `/api/clients/:clientId/eo/fields/:id` | Modifier un champ custom |
| `PATCH` | `/api/clients/:clientId/eo/fields/:id/deactivate` | Archiver un champ custom |
| `PATCH` | `/api/view-configs/:viewConfigId/block/:blockId/columns` | Sauvegarder config colonnes user |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---|---|---|---|
| - | - | - | Tous les endpoints necessaires existent deja. Les points ci-dessous concernent des correctifs backend. |

---

## Comportements attendus

### Loading states
- **Vue liste** : skeleton de lignes (5 lignes) pendant le chargement initial
- **Vue arbre** : spinner par noeud en cours d'expansion (arbre progressif)
- **Vue canvas** : spinner centre pendant le chargement des entites
- **Drawer** : skeleton des sections (hierarchie, champs) pendant le chargement
- **Creation entite** : bouton "Creer" en etat loading (spinner + disabled)
- **Sauvegarde inline** : flash "Enregistre" pendant 1.5s apres chaque sauvegarde
- **Export CSV** : indicateur de progression pour les gros volumes

### Gestion d'erreurs
- **Echec chargement entites** : message d'erreur avec bouton "Reessayer"
- **Echec sauvegarde champ** : toast d'erreur, restauration de la valeur precedente
- **Echec creation** : toast d'erreur avec detail (unicite, parent invalide, etc.)
- **Echec validation hierarchie** : toast d'erreur explicite (ex: "Impossible de desactiver : des enfants actifs existent")
- **Echec filtrage serveur** : toast d'erreur (actuellement absent)
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- **Creation** : Nom obligatoire, unicite nom si configure, parent actif, champs custom requis, validation inter-champs
- **Edition** : unicite champs `is_unique`, validation hierarchie pour activation/desactivation
- **Commentaire de changement** : obligatoire si `comment_rules.required`, motif non vide

### Pagination
- Pagination server-side pour la vue liste
- Tailles de page : 10, 25, 50
- Affichage "X-Y sur Z resultats"

### Permissions
- Chaque action conditionnee par la config du bloc Page Builder
- Verification perimetre EO cote serveur pour toute operation CRUD

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Verification perimetre sur `GET /:id` | CRITIQUE | Ajouter `AND id IN (eoIds)` pour `client_user` — actuellement seul le `clientId` est verifie, un utilisateur FO pourrait acceder au detail d'une EO hors perimetre via URL directe |
| 2 | Verification perimetre sur `POST /:id/values` | CRITIQUE | Verifier que l'EO est dans le perimetre de l'utilisateur et que le champ est editable selon la display config |
| 3 | Verification perimetre sur `POST /:id/comments` | HAUTE | Verifier que l'EO est dans le perimetre |
| 4 | Verification permissions sur `POST /fields` et `PATCH /fields/:id` | HAUTE | Verifier permission `allow_user_field_management` ou role module — actuellement tout utilisateur authentifie avec acces client peut creer/modifier des definitions de champs |
| 5 | Import/Export serveur sans filtre perimetre | HAUTE | Ajouter verification perimetre pour `client_user` sur les routes import et export |
| 6 | Export CSV parallelisation | MOYENNE | Paralleliser les batches de 50 EOs pour les gros volumes |
| 7 | Filtrage champs custom parallelisation | MOYENNE | Paralleliser les fetches quand plusieurs filtres custom sont actifs |
