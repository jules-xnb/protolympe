# Spec : FO — Sidebar (barre de menu laterale User Final)

## Maquettes

### Sidebar FO — etat deploye (avec profil actif)

```
+----------------------------------------------------+
|  [Logo Client]                       [<< Replier]   |
+----------------------------------------------------+
|                                                      |
|  NAVIGATION                                          |
|  +-------------------------------------------------+ |
|  |  {icone} Module Conformite         >            | |  <- groupe collapsible
|  |    |-- Vue Campagnes                            | |  <- sous-item (view_config)
|  |    |-- Vue Formulaires                          | |  <- sous-item (view_config)
|  |  {icone} Module Risques            >            | |  <- groupe collapsible
|  |    |-- Vue Cartographie                         | |  <- sous-item (view_config)
|  |    |-- Vue Detail                               | |  <- sous-item (view_config)
|  |  {icone} Tableau de bord                        | |  <- item feuille (view_config)
|  +-------------------------------------------------+ |
|                                                      |
|  -- (zone basse, poussee par mt-auto) -------------- |
|                                                      |
|  +-------------------------------------------------+ |
|  |  {sliders} Mon profil actif  [3 roles]          | |  <- bouton profil actif
|  |  {arrows} Mode Integrateur                      | |  <- switch vers MO
|  +-------------------------------------------------+ |
|                                                      |
+----------------------------------------------------+
|  [Avatar] Jules Dupont            [^]               |
|           jules@example.com                          |
|           > Parametres                               |
|           > Deconnexion                              |
+----------------------------------------------------+
```

### Sidebar FO — etat replie

```
+------+
| [ic] |  <- logo client (icone seule)
| [>>] |  <- trigger expand
+------+
|      |
| [ic] |  <- item nav (tooltip au hover)
| [ic] |  <- item nav
| [ic] |  <- item nav
|      |
| ---- |
| [ic] |  <- profil
| [ic] |  <- switch mode
|      |
+------+
| [Av] |  <- avatar seul
+------+
```

### Sidebar FO — etat chargement (navigation en cours de chargement)

```
+----------------------------------------------------+
|  [Logo Client]                       [<< Replier]   |
+----------------------------------------------------+
|                                                      |
|  NAVIGATION                                          |
|  +-------------------------------------------------+ |
|  |  [===== skeleton pulse =====]                   | |
|  |  [===== skeleton pulse =====]                   | |
|  |  [===== skeleton pulse =====]                   | |
|  +-------------------------------------------------+ |
|                                                      |
+----------------------------------------------------+
```

### Sidebar FO — navigation vide (aucune permission)

```
+----------------------------------------------------+
|  [Logo Client]                       [<< Replier]   |
+----------------------------------------------------+
|                                                      |
|  NAVIGATION                                          |
|  +-------------------------------------------------+ |
|  |  {icone Menu}                                   | |
|  |  Aucune navigation configuree                   | |
|  +-------------------------------------------------+ |
|                                                      |
+----------------------------------------------------+
```

### Sidebar FO — sans profil configure (redirection)

Si aucun profil actif n'est configure, le clic sur "Mode User Final" depuis MO redirige vers la page de gestion des profils (`/user/profiles`) au lieu d'activer le mode FO.

### Sidebar FO avec navigation dynamique (exemple concret)

```
┌─── Sidebar (collapsible="icon", border-r) ─────────────────────┐
│                                                                  │
│  SidebarHeader (p-0, px-4, py-4) :                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  [img logo-client max-h-8]              [PanelLeftClose]   │ │
│  │  ← logo du design config du client                         │ │
│  │  ← Si pas de logo : [img logo-delta.svg]                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  SidebarContent (px-3, py-4) :                                  │
│  ┌─── SidebarGroup ───────────────────────────────────────────┐ │
│  │  SidebarGroupLabel :                                       │ │
│  │  NAVIGATION  ← text-xs uppercase tracking-wider            │ │
│  │                                                            │ │
│  │  SidebarMenu :                                             │ │
│  │                                                            │ │
│  │  ┌── Collapsible (groupe "Conformite") ─────────────────┐ │ │
│  │  │  [shield] Conformite              [ChevronRight ▸]   │ │ │
│  │  │  ← tooltip="Conformite"                               │ │ │
│  │  │  ← icon via lookup dynamique kebab -> Lucide           │ │ │
│  │  │  ← display_label || label                             │ │ │
│  │  │  ← defaultOpen si un enfant est actif                  │ │ │
│  │  │                                                       │ │ │
│  │  │  CollapsibleContent (si ouvert) :                     │ │ │
│  │  │  SidebarMenuSub :                                     │ │ │
│  │  │    ┌── SidebarMenuSubItem ─────────────────────────┐ │ │ │
│  │  │    │  [file-text] Campagnes                        │ │ │ │
│  │  │    │  ← NavLink to="/c/{slug}/v/campagnes"         │ │ │ │
│  │  │    │  ← isActive = prefix match (pathname, url)    │ │ │ │
│  │  │    │  ← bg-sidebar-accent si actif                 │ │ │ │
│  │  │    └───────────────────────────────────────────────┘ │ │ │
│  │  │    ┌── SidebarMenuSubItem ─────────────────────────┐ │ │ │
│  │  │    │  [list] Formulaires                           │ │ │ │
│  │  │    │  ← NavLink to="/c/{slug}/v/formulaires"       │ │ │ │
│  │  │    └───────────────────────────────────────────────┘ │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌── Collapsible (groupe "Risques") ────────────────────┐ │ │
│  │  │  [alert-triangle] Risques         [ChevronRight ▸]   │ │ │
│  │  │                                                       │ │ │
│  │  │  CollapsibleContent :                                 │ │ │
│  │  │    [map] Cartographie  ← /c/{slug}/v/cartographie     │ │ │
│  │  │    [eye] Detail        ← /c/{slug}/v/detail-risque    │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌── SidebarMenuItem (feuille, pas de groupe) ──────────┐ │ │
│  │  │  [bar-chart] Tableau de bord                          │ │ │
│  │  │  ← NavLink to="/c/{slug}/v/dashboard"                 │ │ │
│  │  │  ← tooltip="Tableau de bord"                          │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── SidebarGroup (mt-auto) ─ zone basse ────────────────────┐ │
│  │                                                             │ │
│  │  ┌── SidebarMenuItem (profil actif) ────────────────────┐  │ │
│  │  │  [Sliders] Profil Comptable          [3 roles]       │  │ │
│  │  │  ← nom du profil actif                                │  │ │
│  │  │  ← Chip avec compteur de roles                        │  │ │
│  │  │  ← onClick → naviguer vers page profils               │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  ┌── SidebarMenuItem (switch mode) ─────────────────────┐  │ │
│  │  │  [ArrowLeftRight] Mode Integrateur                    │  │ │
│  │  │  ← text-primary hover:bg-primary/10                   │  │ │
│  │  │  ← onClick : switch vers mode integrator              │  │ │
│  │  │    → naviguer vers /modules                            │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  SidebarFooter (p-2) :                                          │
│  ┌── DropdownMenu (identique a tous les modes) ───────────────┐ │
│  │  [Avatar JD]  Jules Dupont           [▲]                    │ │
│  │               jules@example.com                              │ │
│  │  ─── dropdown (side=top, w-56) ───                           │ │
│  │  [⚙] Parametres  ← NavLink vers /dashboard/settings         │ │
│  │  ────── separator ──────                                     │ │
│  │  [🚪] Deconnexion ← text-destructive, signOut()             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Resolution des URLs :
- Si `view_config_id` + `view_config.slug` -> `/user/views/{slug}` (prefixe par `cp()`)
- Si `client_module_id` -> `/user/modules/{moduleId}`
- Si `url` brute -> url directe
- Sinon -> '#' (fallback)

### Menu dropdown utilisateur FO

Le dropdown utilisateur FO est strictement identique au dropdown admin/integrator (meme composant, meme rendu, pas de variation par mode).

```
┌─── Footer dropdown (identique 3 modes) ──────────────────────┐
│                                                                │
│  Trigger :                                                     │
│  ┌── SidebarMenuButton h-12 border rounded-lg ──────────────┐ │
│  │  [Avatar h-8 w-8]                                         │ │
│  │   AvatarFallback bg-primary text-xs                       │ │
│  │   initiales de full_name ou 1ere lettre email              │ │
│  │                                                            │ │
│  │  (si expanded) :                                           │ │
│  │    Nom complet          ← truncate                         │ │
│  │    email@example.com    ← truncate                         │ │
│  │    [ChevronUp ▲]                                           │ │
│  │                                                            │ │
│  │  (si collapsed) :                                          │ │
│  │    avatar seul, pas de texte, pas de chevron               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  Contenu (side="top", align="start", w-56) :                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  [Settings] Parametres  ← NavLink vers /dashboard/settings │ │
│  │  ──────── separator ─────────                              │ │
│  │  [LogOut] Deconnexion   ← text-destructive, signOut()      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  Note : pas de "Switch de mode" dans le dropdown.              │
│  Le switch de mode est dans la zone mt-auto du SidebarContent. │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Regles metier

### Navigation dynamique
- La navigation FO est entierement dynamique, construite depuis `navigation_configs` (BDD)
- Les items sont filtres par les permissions du profil actif
- Arborescence a N niveaux (recursif) : groupes collapsibles + items feuilles
- Les groupes s'ouvrent automatiquement si un enfant est actif
- Detection d'item actif par prefix match
- Icones Lucide resolues dynamiquement depuis un identifiant kebab-case
- Label affiche : `display_label` (si defini) sinon `label`
- Seuls les items avec `is_active === true` sont affiches

### Profil actif
- Un profil actif est requis pour acceder au mode FO
- Le bouton "Profil actif" en bas de la sidebar affiche le nom du profil et le nombre de roles
- Clic sur le bouton profil -> naviguer vers la page de gestion des profils
- Le switch MO -> FO est bloque si aucun profil n'est configure (redirection vers `/user/profiles`)

### Switch de mode
- Le bouton "Mode Integrateur" en bas de la sidebar permet de basculer en mode MO
- Au switch, naviguer vers `/modules` (page d'accueil integrator)
- Le bouton "Mode Integrateur" n'est visible que pour les utilisateurs admin ou integrator

### Theme client
- Le logo client est affiche en haut de la sidebar (via design config du client)
- Si pas de logo client, afficher le logo Delta RM par defaut
- Les couleurs du theme client doivent s'appliquer a la sidebar FO (pas uniquement au contenu)

### Flux de donnees
1. `ViewModeContext` fournit : mode, selectedClient, activeProfile
2. Construction du contexte de permissions a partir du profil actif (roleIds, eoIds, categoryIds)
3. Fetch des navigation_configs du client + permissions par item
4. Filtrage par permissions du profil actif
5. Construction de l'arbre de navigation (parent_id -> children, tri par display_order)
6. Rendu recursif des items

### Tables BDD impliquees

| Table | Role dans la sidebar FO |
|---|---|
| `navigation_configs` | Items de navigation (groupes, pages, modules) avec parent_id, display_order, icon, slug |
| `nav_permissions` | Permissions par item : role_id, category_id, is_visible (allow/deny) |
| `view_configs` | Configuration des vues associees (type, slug, bo_definition_id) |
| `client_modules` | Modules actives pour le client |
| `module_roles` | Roles disponibles par module |
| `client_profile_users` | Association profils <-> utilisateurs |
| `client_profile_module_roles` | Roles du profil actif |
| `client_profile_eos` | EOs du profil actif |
| `client_design_configs` | Logo client affiche en haut de la sidebar FO |
| `accounts` | last_active_profile_id pour la restauration automatique |

---

## Endpoints API (existants)

| Methode | Route | Description | A corriger |
|---------|-------|-------------|------------|
| GET | `/api/navigation?client_id=X&include_view_configs=true` | Tous les nav configs + view_configs jointes | Ajouter filtrage `is_active` cote serveur |
| GET | `/api/view-configs/nav-permissions?nav_config_ids=...` | Permissions par item de navigation | — |
| GET | `/api/module-roles/by-client?client_id=X` | Tous les roles modules du client | — |
| GET | `/api/organizational-entities?client_id=X` | Toutes les EOs du client | Over-fetching pour les gros clients (cf. endpoint dedie) |
| GET | `/api/profiles/restore?template_id=X&client_id=X` | Restauration du profil actif au refresh | — |
| GET | `/api/clients/:id/design` | Logo client (logo_url) | — |

## Endpoints API (a creer)

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/navigation/user?client_id=X` | Endpoint dedie FO : retourne uniquement les items de navigation autorises pour le profil actif (JWT), avec view_configs. Elimine le filtrage client et la fuite d'information sur la structure de navigation. |
| GET | `/api/auth/me/permissions` | Contexte de permissions du profil actif (roleIds, eoIds, categoryIds). Remplace les 2 requetes over-fetch `module-roles/by-client` + `organizational-entities`. |

---

## Comportements attendus

### Loading states
- Skeleton pulse (3 barres) pendant le chargement de la navigation dynamique
- Les zones header et footer restent visibles pendant le chargement

### Gestion d'erreurs
- Si le fetch de la navigation echoue : afficher un message d'erreur explicite ("Erreur de chargement de la navigation") avec bouton de retry, au lieu de "Aucune navigation configuree"
- Si `selectedClient` est null au moment du switch FO -> MO : ne pas crasher, afficher un message ou rediriger vers l'admin
- Si `getFirstNavUrl` retourne null (arbre vide apres filtrage) : afficher une page "Aucune vue accessible" au lieu d'une page blanche

### Validation
- Le profil actif doit etre present pour acceder au mode FO
- Les permissions sont evaluees cote serveur (endpoint dedie) et non uniquement cote client

### Pagination
- Pas de pagination pour la navigation (volume faible par client)

### Permissions
- Les items de navigation sont filtres par les permissions du profil actif
- Le filtrage doit se faire cote serveur (endpoint `/api/navigation/user`) pour eviter la fuite d'information
- Factoriser la logique de permissions en un seul endroit (pas de duplication)
- Le bouton "Mode Integrateur" n'est visible que pour les personas admin ou integrator

---

## Points d'attention backend

| # | Sujet | Action |
|---|-------|--------|
| C1 | Logique de permissions dupliquee 3 fois cote front | Factoriser dans un seul utilitaire, ou mieux : filtrer cote serveur via l'endpoint dedie |
| C2 | Permissions evaluees cote client uniquement | Creer l'endpoint `GET /api/navigation/user` qui filtre cote serveur |
| C3 | Pas de filtrage `is_active` dans les nav_configs retournes | Ajouter le filtre `is_active === true` dans l'endpoint de navigation |
| M1 | Over-fetching massif (`module-roles/by-client` + `organizational-entities`) | Creer l'endpoint `GET /api/auth/me/permissions` base sur le JWT |
| M2 | Sidebar FO non themee (couleurs du client non appliquees) | Injecter les CSS variables directement dans la sidebar quand mode = user_final |

### Architecture recommandee
- Separer le composant sidebar en 3 composants distincts par mode (AdminSidebar, IntegratorSidebar, UserFinalSidebar) pour simplifier la maintenance
- Le composant principal fait un switch sur le mode
- L'import dynamique des icones Lucide (`* as LucideIcons`) empeche le tree-shaking : envisager un mapping statique ou un chargement lazy
