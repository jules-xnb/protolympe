# Spec : MO — Navigation (Sidebar, Routing, Guards, Breadcrumbs)

## Maquettes

### Sidebar expandue

```
┌─────────────────────────────────┐
│  [Logo Delta RM]      [◁ close] │
├─────────────────────────────────┤
│  ← Retour Admin  👑             │
│  Espace {nom client}            │
├─────────────────────────────────┤
│                                 │
│  🗂 Navigation                  │  ← lien vers /modules
│  ─────────────────────────────  │
│  🌳 Organisation                │  ← /entities
│  👤 Profils                     │  ← /profiles
│  👥 Utilisateurs                │  ← /users
│  ─────────────────────────────  │
│  📋 Listes                      │  ← /listes
│  🎨 Affichage & Design          │  ← /design
│                                 │
│  ─────────────────────────────  │
│  👤 Mode User Final             │  ← switch mode
│                                 │
├─────────────────────────────────┤
│  [Avatar] Nom Utilisateur  [▲]  │
│           email@delta.com       │
│  ─────── dropdown ────────────  │
│  ⚙ Parametres                   │
│  🚪 Deconnexion                  │
└─────────────────────────────────┘
```

### Sidebar collapsee (mode icone)

```
┌──────┐
│ [Δ]  │
│ [▷]  │
├──────┤
│  🗂  │
│ ───  │
│  🌳  │
│  👤  │
│  👥  │
│ ───  │
│  📋  │
│  🎨  │
│ ───  │
│  👤  │  ← Mode User Final
├──────┤
│ [AB] │  ← avatar + dropdown
└──────┘
```

### Menu dropdown utilisateur (parametres, deconnexion)

```
┌─── SidebarFooter (p-2) ──────────────────────────────────────┐
│                                                                │
│  ┌── SidebarMenuButton (h-12, border rounded-lg) ──────────┐ │
│  │                                                           │ │
│  │  [Avatar h-8 w-8]   Jules Dupont         [ChevronUp ▲]  │ │
│  │   ← AvatarFallback  jules@example.com                    │ │
│  │     bg-primary       ← NAVBAR_STYLES.profileEmail        │ │
│  │     text-xs "JD"     ← truncate                          │ │
│  │                                                           │ │
│  │  (en mode collapsed : avatar seul, pas de texte ni ▲)    │ │
│  └───────────────────────────────────────────────────────────┘ │
│      |                                                         │
│      v  DropdownMenu (side="top", align="start", w-56)        │
│  ┌───────────────────────────────────────────────────────┐    │
│  │                                                       │    │
│  │  [Settings ⚙] Parametres                             │    │
│  │  ← NavLink to="/dashboard/settings"                   │    │
│  │                                                       │    │
│  │  ──────────── DropdownMenuSeparator ────────────────  │    │
│  │                                                       │    │
│  │  [LogOut 🚪] Deconnexion                              │    │
│  │  ← text-destructive focus:text-destructive            │    │
│  │  ← onClick={() => signOut()}                          │    │
│  │                                                       │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Note : le dropdown n'inclut pas de "switch mode" — les boutons de switch sont dans `SidebarContent` (zone `mt-auto`), pas dans le footer.

### ClientSelectionDialog (selection client)

```
┌─── Dialog ──────────────────────────────────────────────────────┐
│                                                                  │
│  DialogHeader :                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Selectionner un client                                    │ │
│  │  Choisissez le client sur lequel vous souhaitez            │ │
│  │  travailler en mode integrateur.                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Recherche :                                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  [🔍] Rechercher un client...                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Liste (ScrollArea h-[400px]) :                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  3 clients trouves                  ← text-xs muted        │ │
│  │                                                            │ │
│  │  ┌── Button ghost (w-full, h-auto, py-3) ──────────────┐ │ │
│  │  │  [🏢]  Acme Corp                                     │ │ │
│  │  │   ↑     acme-corp             ← slug, text-xs muted  │ │ │
│  │  │  bg-primary/10                                        │ │ │
│  │  │  h-8 w-8 rounded-lg                                  │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌── Button ghost ─────────────────────────────────────┐ │ │
│  │  │  [🏢]  Total Energies                               │ │ │
│  │  │         total-energies                               │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌── Button ghost ─────────────────────────────────────┐ │ │
│  │  │  [🏢]  BNP Paribas                    [Inactif]     │ │ │
│  │  │         bnp-paribas                     ← badge      │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Etats vides :                                                   │
│  - Aucun client : "Aucun client disponible" (text-center py-8)  │
│  - Aucun resultat : 'Aucun client ne correspond a "{search}"'   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Callback :
  onSelectClient(client) :
    → switchToIntegratorMode(client)
    → navigate(`/dashboard/${client.id}/modules`)
    → ferme le dialog + reset search
```

---

## Regles metier

### Structure de routing
- Trois niveaux de routes : auth (top-level), admin (sous `/dashboard/admin`), client-scoped (sous `/dashboard/:clientId`)
- Les routes integrator et user_final cohabitent sous `:clientId`
- Les routes user_final sont isolees sous `/user` avec un wrapper de theme client
- La page d'accueil integrator est `/modules` (Navigation)

### Sidebar integrator
- Navigation statique en 3 groupes avec labels de section :
  - Groupe 1 (ex. "Configuration") : Navigation (modules), Workflows
  - Groupe 2 (ex. "Donnees") : Organisation, Profils, Utilisateurs
  - Groupe 3 (ex. "Apparence") : Listes, Affichage & Design, Traductions
- Header avec bandeau client (nom + bouton retour admin)
- Footer avec avatar, dropdown (Parametres, Deconnexion)
- Bouton "Mode User Final" en bas de la sidebar
- Sidebar collapsible (mode icone avec tooltips)
- Detection d'item actif par prefix match (`pathname.startsWith(path + '/')`) pour que les sous-pages marquent l'item parent comme actif

### Coherence sidebar / routing
| Item sidebar | Route | Sous-routes |
|---|---|---|
| Navigation | `/modules` | `/modules/:moduleId`, `/modules/:moduleId/display/:configId` |
| Organisation | `/entities` | `/entities/new`, `/entities/import`, `/entities/fields`, etc. |
| Profils | `/profiles` | `/profiles/archived` |
| Utilisateurs | `/users` | `/users/import`, `/users/fields`, etc. |
| Listes | `/listes` | `/listes/import`, `/listes/archived` |
| Affichage & Design | `/design` | — |
| Workflows | `/workflows` | A definir |
| Traductions | `/translations` | — |

### Modes de vue
- 3 modes : `admin`, `integrator`, `user_final`
- Persistence dans localStorage (mode, clientId, activeProfileId)
- Restauration du client et du profil au rechargement
- Le switch user_final -> integrator redirige vers `/modules`
- La redirection par defaut en mode user_final est `/user/profiles`

### Bandeau client (expanded vs collapsed)
- Expanded : afficher "Espace {client}" + bouton "Retour Admin"
- Collapsed : afficher une version compacte (initiales du client, icone retour admin en tooltip)

### Indicateur visuel de mode
- En mode integrator, un indicateur visuel (badge, couleur de fond, bordure) doit distinguer le mode meme quand la sidebar est collapsed

---

## Endpoints API (existants)

Pas d'endpoint specifique a la navigation MO — la sidebar integrator est statique (hardcodee).

## Endpoints API (a creer)

Pas d'endpoint supplementaire necessaire pour la sidebar MO.

---

## A construire

### CRITIQUE

#### S5-01 : Guard de persona sur les routes admin et integrator
- Le guard admin doit verifier que l'utilisateur est `admin_delta` (via persona JWT). Si non, rediriger vers `/dashboard`.
- Un guard integrator doit verifier que l'utilisateur est admin ou integrator avant d'afficher les pages de configuration.
- Les routes user_final sous `/user` ne doivent pas etre accessibles sans profil actif (sauf la page de selection de profil).

#### S5-02 : Detection d'item actif par prefix match
- Utiliser un prefix match (`pathname.startsWith(path + '/')` ou egalite stricte) au lieu d'une egalite stricte seule pour les items integrator.
- Quand l'utilisateur est sur `/entities/fields`, l'item "Organisation" (`/entities`) doit etre marque comme actif.

#### S5-03 : Pas de flash de contenu au mauvais mode
- Les guards de route ne doivent rendre le contenu enfant (`<Outlet />`) que lorsque le mode est effectif. Afficher un loader pendant la transition.

### IMPORTANT

#### S5-04 : Ajouter Workflows et Traductions dans la sidebar integrator
- Ajouter `Workflows` dans le groupe 1 (a cote de Navigation/Modules).
- Ajouter `Traductions` dans le groupe 3 (a cote de Design).

#### S5-05 : Fil d'Ariane (breadcrumbs) visible dans le layout MO
- Un composant `<Breadcrumb />` visible en haut de la zone de contenu.
- Chaque page MO doit alimenter le fil d'Ariane avec ses segments.
- Format : `Espace {Client}` > `Organisation` > `Champs` (exemple pour `/entities/fields`).

#### S5-06 : Labels de groupe dans la sidebar integrator
- Groupe 1 : label "Configuration" (ou equivalent metier).
- Groupe 2 : label "Donnees" (ou equivalent metier).
- Groupe 3 : label "Apparence" (ou equivalent metier).

#### S5-07 : Redirection coherente au switch user_final -> integrator
- Rediriger vers `/modules` (Navigation) au lieu de `/business-objects`.

#### S5-08 : Redirection par defaut en mode user_final
- Rediriger vers `/user/profiles` au lieu de `/user/simulation-config`.

#### S5-09 : Erreur explicite si le provider ViewMode est absent
- Lancer une erreur dans `useViewMode()` si le provider est absent, au lieu d'un fallback silencieux.
- Si necessaire pour le HMR, conditionner a `import.meta.env.DEV`.

#### S5-10 : Persistence centralisee du mode
- Persister le mode uniquement via un `useEffect` centralise, pas en doublon dans chaque methode `switchTo*`.

### MINEUR

#### S5-11 : Indicateur visuel de mode (integrator vs admin)
- Afficher un badge ou couleur de fond differente quand la sidebar est collapsed en mode integrator.

#### S5-12 : Bandeau client harmonise (collapsed vs expanded)
- Afficher une version compacte du bandeau client en mode collapsed (initiales du client, icone retour admin en tooltip).

---

## Comportements attendus

### Loading states
- Les guards de route affichent un loader pendant la verification du mode et des permissions
- La sidebar affiche les items de navigation seulement apres que le contexte est initialise

### Gestion d'erreurs
- Si le `clientId` de l'URL ne correspond a aucun client valide, redirection propre vers `/dashboard/admin/clients` avec un toast d'information
- Si un guard de persona echoue, redirection vers `/dashboard` avec message explicatif (pas de page blanche)
- Erreur explicite si `useViewMode()` est utilise hors du provider

### Validation
- Le guard admin verifie la persona `admin_delta` (pas seulement le mode)
- Le guard integrator verifie que l'utilisateur est admin ou integrator
- Le guard user_final verifie qu'un profil actif existe

### Permissions
- `admin_delta` : acces a toutes les routes admin + integrator
- `integrator_delta`, `integrator_external` : acces aux routes integrator uniquement
- `client_user` : acces aux routes user_final uniquement, avec profil actif requis
- Verification front (guards de route) + API (middleware)

---

## Points d'attention backend

- Aucune modification backend necessaire pour la sidebar MO (navigation statique).
- Le contexte `ViewMode` persiste dans localStorage et restaure le mode au rechargement.
- La persona doit etre disponible dans le JWT pour que les guards front puissent la verifier.
