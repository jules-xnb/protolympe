# Spec : Page Module Collecte de Valeur

**Route** : `/dashboard/:clientId/user/modules/:moduleId`

---

## Maquettes

### Page gestionnaire (permissions create_campaign / edit_campaign / view_responses)

```
+---------------------------------------------------------------------+
|  Collecte de valeur                                                  |
|                                                                      |
|  +--- SurveyCreatorView ------------------------------------------+ |
|  |  Collecte de valeur                                             | |
|  |  [Rechercher...          ]  [Trier: Tous v]                    | |
|  |                                                                 | |
|  |  +------------------------------------------------------------+ | |
|  |  | Type de collecte    | Campagnes actives | Campagnes cloturees| |
|  |  |------------------------------------------------------------|  | |
|  |  | Bilan social 2025   | 3                 | 1             [>] |  | |
|  |  | Enquete RH          | 0                 | 2             [>] |  | |
|  |  | Reporting ESG       | 1                 | 0             [>] |  | |
|  |  +------------------------------------------------------------+  | |
|  +------------------------------------------------------------------+ |
|                                                                      |
|  +--- SurveyResponsesView ----------------------------------------+ |
|  |  (visible si permission "respond")                              | |
|  |  Mes types de collecte                                          | |
|  |  ...                                                            | |
|  +------------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### Drill-down type de collecte (CampaignTypeDetailView)

```
+---------------------------------------------------------------------+
|  [<] Bilan social 2025              [Configurer les formulaires >]   |
|                                      [Lancer une campagne +]         |
|  [Campagnes en cours (3)] [Campagnes cloturees (1)]                  |
|                                                                      |
|  [Rechercher...]                                                     |
|                                                                      |
|  +------------------------------------------------------------+     |
|  | Nom campagne      | Date debut | Date fin  | Progression   |     |
|  |------------------------------------------------------------|     |
|  | Campagne Q1 2025  | 01/01/25   | 31/03/25  | [====>  ] 60% |     |
|  | Campagne Q2 2025  | 01/04/25   | 30/06/25  | [=>     ] 20% |     |
|  +------------------------------------------------------------+     |
|  Lignes par page [10 v]  1-2 sur 2  [< >]                          |
+---------------------------------------------------------------------+
```

### SurveyCreatorView — Liste des types de collecte (niveau 1)

```
+---------------------------------------------------------------------+
|  Collecte de valeur                                                  |
|                                                                      |
|  [Rechercher...            ]  [Trier: Tous v]                        |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Type de collecte              | Camp. actives | Camp. cloturees | |
|  |-------------------------------|---------------|-----------------|  |
|  | Bilan social 2025             | 3             | 1           [>] |  |
|  | Enquete RH                    | 0             | 2           [>] |  |
|  | Reporting ESG                 | 1             | 0           [>] |  |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  (vide) :                                                            |
|    [FileText]                                                        |
|    Aucun type de collecte configure                                  |
|    Contactez votre administrateur                                    |
+---------------------------------------------------------------------+
```

**Logique** :
- Les types proviennent de `workflow_ids` resolus via `POST /api/workflows/by-ids`
- Les campagnes sont chargees via `GET /api/surveys/campaigns?source_view_config_id=...&with_progress=true`
- Le tri filtre : `all` (tous), `active` (avec campagnes), `empty` (sans campagnes)
- Clic sur un type -> drilldown `CampaignTypeDetailView`

### SurveyResponsesView — Vue repondant (niveau 1)

```
+---------------------------------------------------------------------+
|  Mes types de collecte                                               |
|  [Campagnes en cours] [Campagnes terminees]  (si enable_history)     |
|                                                                      |
|  [Rechercher...            ]  [Trier: Tous v]                        |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Nom campagne  | Type collecte  | Debut    | Fin      | EO      | |
|  |---------------|----------------|----------|----------|---------|  |
|  | Camp. Q1      | Bilan social   | 01/01/25 | 31/03/25 | [RH]    |  |
|  |               |                |          |          | [IT]    |  |
|  | Camp. Q2      | Enquete RH     | 01/04/25 | 30/06/25 | [Fin]   |  |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  (vide) :                                                            |
|    [FileCheck]                                                       |
|    Aucun questionnaire a completer                                   |
|                                                                      |
|  Lignes/page [5|10|25|50]  1-2 sur 2  [< >]                        |
+---------------------------------------------------------------------+
```

**Logique** :
- Colonnes : Nom campagne, Type collecte, Date debut, Date fin, Entite a declarer (badges EO), chevron
- Les EO sont affichees en badges (max 2 + "+N")
- Onglets actives/terminees bases sur `endDate < now`
- Pagination server-side
- Clic -> navigation vers CampaignDetailPage

### NewCampaignDialog — Wizard 4 etapes

**Etape 1 : Selection du type**

```
+-----------------------------------------------+
|  Nouvelle campagne                        [X]  |
|------------------------------------------------|
|                                                 |
|  (o) Bilan social 2025                          |
|      Description du type bilan...               |
|      5 champs - 2 etapes de validation          |
|                                                 |
|  ( ) Enquete RH                                 |
|      Description de l'enquete...                |
|      3 champs                                   |
|                                                 |
|  ( ) Reporting ESG                              |
|      Reporting ESG trimestriel                  |
|      8 champs - 1 etape de validation           |
|                                                 |
|------------------------------------------------|
|  [Annuler]                      [Continuer >]  |
+-----------------------------------------------+
```

**Note** : Si un seul type actif, il est pre-selectionne. Si `preSelectedTypeId` est fourni, cette etape est sautee.

**Etape 2 : Informations**

```
+-----------------------------------------------+
|  Lancer une campagne                      [X]  |
|------------------------------------------------|
|                                                 |
|  (1)--- Informations                            |
|  |                                              |
|  (2)   Perimetre         Nom de la campagne     |
|  |                       [____________________] |
|  (3)   Verification                             |
|                          Date debut   Date fin   |
|                          [__/__/____] [__/__/___]|
|                                                 |
|                          Campagne precedente     |
|                          [-- Aucune --       v] |
|                                                 |
|------------------------------------------------|
|  [Annuler]                       [Suivant >]   |
+-----------------------------------------------+
```

**Etape 3 : Perimetre (selection EO)**

```
+-----------------------------------------------+
|  Lancer une campagne                      [X]  |
|------------------------------------------------|
|                                                 |
|  (v)   Informations                             |
|  |                       [Rechercher...       ] |
|  (2)--- Perimetre        [Filtres >]            |
|  |                       [Groupe EO: -- v]      |
|  (3)   Verification                             |
|                          +---------------------+|
|                          | [x] Siege (+ desc.) ||
|                          |   [x] RH Paris      ||
|                          |   [x] IT Lyon       ||
|                          | [ ] Finance          ||
|                          |   [ ] Finance Nord   ||
|                          +---------------------+|
|                                                 |
|                          3 entites selectionnees |
|                          [Reinitialiser]        |
|                                                 |
|------------------------------------------------|
|  [Annuler]                       [Suivant >]   |
+-----------------------------------------------+
```

**Etape 4 : Verification**

```
+-----------------------------------------------+
|  Lancer une campagne                      [X]  |
|------------------------------------------------|
|                                                 |
|  (v)   Informations                             |
|  |                                              |
|  (v)   Perimetre        [OK] Toutes les 3      |
|  |                       entites sont valides.  |
|  (3)--- Verification     -- ou --               |
|                          [!] 2 valides,         |
|                           1 avec roles manquants|
|                          [Exporter manquants >] |
|                                                 |
|                          +---------------------+|
|                          | Filiale | Etape |Stat||
|                          |---------|-------|----||
|                          | RH Paris|  -    | OK ||
|                          | IT Lyon | Val N1|[!] ||
|                          | Finance |  -    | OK ||
|                          +---------------------+|
|                                                 |
|------------------------------------------------|
|  [Annuler] [< Precedent]  [Lancer campagne >]  |
+-----------------------------------------------+
```

**Logique** :
- Le stepper vertical affiche 3 etapes : Informations, Perimetre, Verification
- Etape 1 (type) n'affiche pas le stepper
- La verification appelle la resolution des roles workflow pour chaque EO selectionnee
- Bouton "Exporter manquants" genere un CSV des roles absents
- Le submit final appelle `POST /api/surveys/campaigns` avec `{ name, start_date, end_date, previous_campaign_id, targets, workflow_id, client_id, source_view_config_id }`

---

## Regles metier

### Resolution des roles module

Le backend doit retourner directement les `module_role_ids` de l'utilisateur via la chaine `client_profile_module_roles -> module_roles`. Le front ne doit jamais faire de matching par nom de role.

### Permissions transport

Les permissions (`enable_import`, `enable_export`) ne doivent pas etre passees via `location.state` ou query params (perdus au refresh). Elles doivent etre chargees cote front via un hook dedie depuis l'API.

### Display config

Les champs `displayConfig.gestionnaire.*` et `displayConfig.repondant.*` doivent etre types dans un schema Zod pour une validation au chargement.

---

## Endpoints API (existants)

| Methode | Route | Usage |
|---------|-------|-------|
| `GET` | `/api/client-modules/:id` | Charge le module client |
| `GET` | `/api/modules/:id/display-configs` | Configs d'affichage par role |
| `GET` | `/api/modules/:id/permissions` | Permissions par role |
| `GET` | `/api/modules/:id/roles` | Roles du module |
| `GET` | `/auth/me/permissions` | Contexte permissions utilisateur |
| `GET` | `/api/surveys/my-responses` | Reponses du repondant connecte |
| `POST` | `/api/surveys/campaigns` | Creation campagne |
| `POST` | `/api/workflows/by-ids` | Resolution des workflows par IDs |
| `GET` | `/api/surveys/campaigns` | Liste campagnes (avec query params) |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---------|-------|-------|--------|
| `GET` | `/api/modules/:id/my-roles` | Roles module du profil actif | Retourne les module_role_ids du profil actif de l'utilisateur pour le module donne |

---

## Comportements attendus

### Loading states
- **SurveyCreatorView** : skeleton de tableau (3 lignes) pendant le chargement des types
- **SurveyResponsesView** : skeleton de tableau pendant le chargement des campagnes
- **CampaignTypeDetailView** : skeleton de tableau pendant le chargement des campagnes du type
- **NewCampaignDialog** : bouton "Lancer campagne" en etat loading pendant la creation

### Gestion d'erreurs
- **Echec chargement types** : message d'erreur avec bouton "Reessayer"
- **Echec creation campagne** : toast d'erreur avec detail
- **Echec verification roles** : affichage inline dans l'etape de verification
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- **Wizard campagne** : nom obligatoire, dates valides (debut < fin), au moins 1 EO selectionnee
- **Verification roles** : alerte visuelle pour les EOs sans roles suffisants, mais non bloquant

### Pagination
- Pagination server-side pour la table des campagnes
- Tailles de page : 5, 10, 25, 50
- Debounce 300ms sur la recherche

### Permissions
- Verification des permissions module au niveau de la page (pas seulement au bouton)
- Les permissions determinent quelles vues (gestionnaire/repondant) sont affichees

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Endpoint `GET /api/modules/:id/my-roles` | CRITIQUE | Le front ne doit pas resoudre les roles par matching de noms — le backend doit retourner les module_role_ids du profil actif |
| 2 | Typage display config | MOYENNE | Definir un schema Zod `collecteValeurDisplayConfig` et valider cote serveur |
