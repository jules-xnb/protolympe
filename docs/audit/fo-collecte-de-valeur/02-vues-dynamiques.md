# Spec : Vues Dynamiques (Page Builder)

**Route** : `/dashboard/:clientId/user/views/:viewSlug` et `/dashboard/:clientId/user/views/:viewSlug/eo/:eoId`

---

## Maquettes

### DynamicViewPage — Resolution et rendu

```
+---------------------------------------------------------------------+
|  [DynamicViewPage]                                                   |
|                                                                      |
|  1. Charge viewConfig par slug (GET /api/view-configs/by-slug/:slug) |
|  2. Charge widgets (si dashboard)                                    |
|  3. Verifie permissions (useComputedViewPermissions)                 |
|  4. Verifie presence dans la navigation FO                          |
|                                                                      |
|  Si Page Builder (config.blocks) --> DynamicPageView                |
|  Si legacy dashboard             --> DynamicDashboard               |
|  Si list                         --> DynamicListView                |
|  Si form                         --> DynamicFormView                |
+---------------------------------------------------------------------+
```

### DynamicPageView — Grille 12 colonnes

```
+---------------------------------------------------+
|  Grid 12 colonnes                                  |
|  +--------------------+ +------------------------+ |
|  | Bloc survey_creator | | Bloc survey_responses  | |
|  | (colSpan=6)        | | (colSpan=6)            | |
|  | SurveyCreatorView  | | SurveyResponsesView    | |
|  +--------------------+ +------------------------+ |
|  +-----------------------------------------------+ |
|  | Bloc data_table (colSpan=12)                   | |
|  | DataTableView                                  | |
|  | [Rechercher...] [Filtres]                      | |
|  | +-------------------------------------------+  | |
|  | | Col1  | Col2  | Col3  | Status            |  | |
|  | |-------|-------|-------|-------------------|  | |
|  | | val   | val   | val   | [En cours]        |  | |
|  | +-------------------------------------------+  | |
|  | < 1/3 >  25 resultats                         | |
|  +-----------------------------------------------+ |
+---------------------------------------------------+
```

### DynamicDashboard — Widgets legacy

```
+---------------------------------------------------------------------+
|  Dashboard                                                           |
|  +-------------+ +-------------+ +------------------+               |
|  | StatsCard   | | StatsCard   | | ChartWidget       |               |
|  | 142 objets  | | 12 ce mois  | | [Graphique]       |               |
|  +-------------+ +-------------+ +------------------+               |
|  +-------------------------------+ +---------------+               |
|  | TableWidget                    | | RecentItems    |               |
|  | (derniers objets)              | | (historique)   |               |
|  +-------------------------------+ +---------------+               |
+---------------------------------------------------------------------+
```

### BlockView — Switch de type

```
BlockView(block, boDefinitions, userRoleIds, viewConfigId, clientId, eoId):
  switch (block.type):
    case "data_table"       -> DataTableView
    case "eo_card"          -> EoCardView
    case "survey_creator"   -> SurveyCreatorView
    case "survey_responses" -> SurveyResponsesView
    case "users"            -> UsersBlockView
    case "profiles"         -> ProfilesBlockView
    case "section"          -> <div> titre + enfants BlockView recursivement
    case "sub_section"      -> idem, titre plus petit
    case "separator"        -> <hr> ou <div> (style line ou space)
    default                 -> "Type de bloc inconnu"
```

### DataTableView — Bloc tableau de donnees

```
+---------------------------------------------------------------------+
|  Entites organisationnelles          [Nouveau +]                     |
|                                                                      |
|  [Rechercher...          ]                          [Filtres >]      |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Col1 (field_name)  | Col2         | Col3         | Statut      | |
|  |--------------------|--------------|--------------|-------------|  |
|  | Val A              | 42           | 2025-01-15   | [En cours]  |  |
|  | Val B              | 18           | 2024-12-01   | [Actif]     |  |
|  | Val C              | --           | --           | [Brouillon] |  |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  (vide) : "Aucune donnee disponible"                                 |
|                                                                      |
|  < 1/3 >  25 resultats                                              |
+---------------------------------------------------------------------+
```

**Logique** :
- Colonnes definies par `block.config.columns` (DataTableColumnConfig[])
- Si aucune colonne configuree, fallback : Reference, Titre, Statut
- Recherche client-side via `searchTerm`
- Filtres dynamiques (types : text, number, boolean, date, select)
- Pagination server-side via `useBusinessObjectsWithFields({ page, pageSize, prefilters })`
- Bouton "Nouveau" si `block.config.create_button.enabled` -> CreateBusinessObjectDialog
- Clic ligne -> navigation vers detail BO

### EoCardView — Bloc fiche Entite Organisationnelle

```
+---------------------------------------------------------------------+
|  Entites organisationnelles                                          |
|  [Liste] [Arborescence] [Canvas]           [Nouveau +] [Config >]   |
|                                                                      |
|  [Rechercher...          ]  [Filtres >]                              |
|                                                                      |
|  (Voir maquettes fo-organisation.md pour le detail)                  |
+---------------------------------------------------------------------+
```

### UsersBlockView — Bloc utilisateurs

```
+---------------------------------------------------------------------+
|  Utilisateurs                                [Inviter +]             |
|                                                                      |
|  [Rechercher...          ]  [Filtres >]                              |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Prenom     | Nom        | Email              | Profil  | Statut| |
|  |------------|------------|--------------------|---------|-------|  |
|  | Jean       | Dupont     | j.dupont@acme.fr   | Admin   | Actif |  |
|  | Marie      | Martin     | m.martin@acme.fr   | User    | Actif |  |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  < 1/2 >  15 resultats  [10|25|50]                                  |
+---------------------------------------------------------------------+
```

**Note** : les champs `first_name` et `last_name` peuvent etre anonymises selon `config.anonymization`.

### ProfilesBlockView — Bloc profils

```
+---------------------------------------------------------------------+
|  Profils                                     [Nouveau +]             |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Nom du profil    | Roles       | Entites       | Actions       | |
|  |------------------|-------------|---------------|---------------|  |
|  | Gestionnaire RH  | Gestionnaire| Siege, RH     | [Edit][Copy]  |  |
|  | Repondant        | Repondant   | Toutes        | [Edit][Copy]  |  |
|  +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### SectionBlock / SubSectionBlock — Blocs de structure

```
+---------------------------------------------------------------------+
|  [Section title (text-lg font-bold)]                                 |
|                                                                      |
|  +--- Bloc enfant 1 (BlockView recursif) -----------------------+   |
|  | ...                                                            |   |
|  +----------------------------------------------------------------+   |
|  +--- Bloc enfant 2 (BlockView recursif) -----------------------+   |
|  | ...                                                            |   |
|  +----------------------------------------------------------------+   |
+---------------------------------------------------------------------+
```

**Note** : `sub_section` utilise `text-base font-semibold` au lieu de `text-lg font-bold`.

### SeparatorBlock — Bloc separateur

```
+---------------------------------------------------------------------+
|  --- (style="line" -> <hr>)                                          |
|  ou                                                                  |
|       (style="space" -> <div class="h-6">)                           |
+---------------------------------------------------------------------+
```

---

## Regles metier

### Controle d'acces

Le controle d'acces est structure en 3 couches :
- **Navigation** : la vue doit etre dans le menu FO de l'utilisateur (`isInNavigation`)
- **View permissions** : `can_view` doit etre true (ou null = pas de restriction)
- **Page Builder** : les blocs respectent les roles via `userRoleIds`

Si `permissions` est null (pas de view_permissions configurees), l'acces est autorise avec un fallback sur la navigation.

### Grille CSS

- `grid-template-columns: repeat(12, minmax(0, 1fr))`
- Hauteur : `calc(100dvh - 3rem)`
- Calcul hauteur bloc : `heightPercent = (rowSpan / 4) * 100` -> rowSpan=4 = 100%, rowSpan=2 = 50%

### Legacy vs Page Builder

Le systeme a deux architectures :
- **Legacy** : DynamicDashboard + widgets
- **Page Builder** : DynamicPageView + blocs

La presence de `hasPageBuilderBlocks` decide quel systeme utiliser. Le code legacy sera deprecie une fois que tous les clients migreront vers le Page Builder.

---

## Endpoints API (existants)

| Methode | Route | Usage |
|---------|-------|-------|
| `GET` | `/api/view-configs/by-slug/:slug` | Charge la config de vue |
| `GET` | `/api/view-configs/:id/widgets` | Widgets actifs (dashboard) |
| `GET` | `/api/view-configs/:id/permissions?user_id=` | Permissions calculees |
| `GET` | `/api/navigation/user` | Navigation FO pour verification acces |
| `GET` | `/api/view-configs/:id` | Config de vue par ID |
| `GET` | `/api/bo-definitions` | Liste definitions BO |
| `GET` | `/api/business-objects` | Objets metier avec valeurs de champs |
| `GET` | `/api/bo-definitions/:id/fields` | Definitions de champs |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---------|-------|-------|--------|
| - | - | - | Tous les endpoints necessaires existent. Les points ci-dessous concernent des verifications backend. |

---

## Comportements attendus

### Loading states
- **DynamicViewPage** : skeleton de page pendant la resolution de la viewConfig
- **DynamicPageView** : skeleton par bloc pendant le chargement
- **DataTableView** : skeleton de tableau (5 lignes)
- **DynamicDashboard** : skeleton de cards de widgets
- **Erreur 403/404** : page d'erreur avec message explicite

### Gestion d'erreurs
- **Vue non trouvee** : page 404
- **Acces refuse** : page 403 avec message "Vous n'avez pas acces a cette vue"
- **Bloc inconnu** : affichage "Type de bloc inconnu" (jamais de crash)
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- Verification d'acces avant rendu (navigation + permissions)
- Validation des types de blocs

### Pagination
- DataTableView : pagination server-side obligatoire
- Tailles de page : 10, 25, 50

### Permissions
- Verification 3 couches : navigation, view permissions, roles bloc

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Filtre perimetre BO | CRITIQUE | Verifier que `GET /api/business-objects` applique le filtre EO du profil actif pour les `client_user` |
| 2 | Pagination server-side DynamicListView | HAUTE | S'assurer que les endpoints supportent `page` et `pageSize` pour eviter la pagination client-side sur gros volumes |
| 3 | Deprecation dashboard legacy | MOYENNE | Planifier la migration de tous les dashboards legacy vers Page Builder |
| 4 | Grille responsive | MOYENNE | Gerer le cas ou la somme des rowSpan depasse 4 (=100vh) |
