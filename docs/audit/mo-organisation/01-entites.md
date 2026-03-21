# Spec : Entites organisationnelles (`/dashboard/:clientId/entities`)

## Maquettes

### Vue liste (par defaut)

```
+---------------------------------------------------------------------------------+
|  Entites Organisationnelles                                                      |
|  Gerez la hierarchie organisationnelle (sites, departements, equipes...)         |
|                                                                                  |
|  [Archives]  [Import/Export v]  [Historique]  [Gerer les champs]  [Nouvelle entite] |
+---------------------------------------------------------------------------------+
|  [Rechercher une entite...]  [Filtres dynamiques]  [Arbre|Liste|Canvas]         |
+---------------------------------------------------------------------------------+
|  Onglets : [Entites] [Regroupements]                                            |
+---------------------------------------------------------------------------------+
|  Code  | Nom             | Parent       | Niv. | Champs perso...               |
|--------+-----------------+--------------+------+-------------------------------|
|  FR01  | France          | -            | 0    | ...                           |
|  FR02  | Ile-de-France   | France       | 1    | ...                           |
|  FR03  | Paris           | Ile-de-Fr.   | 2    | ...                           |
+---------------------------------------------------------------------------------+
```

### Drawer de detail (clic sur entite)

```
+-------------------------------------------+
|  Paris (FR03)                             |
|  Fil d'ariane : France > Ile-de-France    |
|  Enfants : Versailles, Neuilly            |
|                                           |
|  [Entite active : toggle]                 |
|                                           |
|  Onglets : [Attributs] [Utilisateurs] [Historique] |
|  Nom       : [Paris            ] inline   |
|  Code      : FR03 (lecture seule)         |
|  Parent    : [Ile-de-France    v]         |
|  Champs personnalises : edition inline    |
|                                           |
|  [Archiver]                               |
+-------------------------------------------+
```

### EntityFormDialog -- Creation d'entite

```
+-----------------------------------------------------------+
|  Creer une entite                                    [X]  |
|  Ajoutez une nouvelle entite organisationnelle.           |
+-----------------------------------------------------------+
|  Onglets : [General]  [Details]                           |
+-----------------------------------------------------------+
|                                                           |
|  Entite parente                                           |
|  [ Aucune (racine)                              v ]       |
|  L'entite parente dans la hierarchie                      |
|                                                           |
|  +-----------------------------------------------------+ |
|  | Nom *                                                | |
|  | [                                                  ] | |
|  +-----------------------------------------------------+ |
|                                                           |
|  +-----------------------------------------------------+ |
|  | Code                                                 | |
|  | [                                                  ] | |
|  | Code unique de l'entite (genere automatiquement si   | |
|  | vide)                                                | |
|  +-----------------------------------------------------+ |
|                                                           |
|  Description                                              |
|  +-----------------------------------------------------+ |
|  | Description de l'entite...                           | |
|  |                                                      | |
|  +-----------------------------------------------------+ |
|                                                           |
|  +-----------------------------------------------------+ |
|  | Active                                    [toggle]   | |
|  | Desactivez pour masquer l'entite                     | |
|  +-----------------------------------------------------+ |
|                                                           |
+-----------------------------------------------------------+
|                        [Annuler]  [Creer]                 |
+-----------------------------------------------------------+
```

Onglet "Details" (visible uniquement si champs personnalises) :

```
+-----------------------------------------------------------+
|  Onglets : [General]  [Details]                           |
+-----------------------------------------------------------+
|                                                           |
|  Ville                                                    |
|  [                                                      ] |
|                                                           |
|  Code SIRET *                                             |
|  [                                                      ] |
|  Numero SIRET de l'entite                                 |
|                                                           |
|  Secteur                                                  |
|  [ Selectionner...                              v ]       |
|                                                           |
+-----------------------------------------------------------+
|                        [Annuler]  [Creer]                 |
+-----------------------------------------------------------+
```

### EntityFormDialog -- Edition d'entite

```
+-----------------------------------------------------------+
|  Modifier l'entite                                   [X]  |
|  Modifiez les informations de l'entite organisationnelle. |
+-----------------------------------------------------------+
|  Onglets : [General]  [Details]                           |
+-----------------------------------------------------------+
|                                                           |
|  Entite parente                                           |
|  [ Ile-de-France                                v ]       |
|  L'entite parente dans la hierarchie                      |
|                                                           |
|  +-----------------------------------------------------+ |
|  | Nom *                                                | |
|  | [ Paris                                            ] | |
|  +-----------------------------------------------------+ |
|                                                           |
|  +-----------------------------------------------------+ |
|  | Code                                                 | |
|  | [ FR03                                             ] | |
|  | Code unique de l'entite (genere automatiquement si   | |
|  | vide)                                                | |
|  +-----------------------------------------------------+ |
|                                                           |
|  Description                                              |
|  +-----------------------------------------------------+ |
|  | Siege social Paris                                   | |
|  |                                                      | |
|  +-----------------------------------------------------+ |
|                                                           |
|  +-----------------------------------------------------+ |
|  | Active                                    [toggle]   | |
|  | Desactivez pour masquer l'entite                     | |
|  +-----------------------------------------------------+ |
|                                                           |
+-----------------------------------------------------------+
|                        [Annuler]  [Mettre a jour]         |
+-----------------------------------------------------------+
```

### Dialog d'archivage d'entite

```
+-----------------------------------------------------------+
|  Confirmer l'archivage                                    |
|                                                           |
|  Etes-vous sur de vouloir archiver cette entite ?         |
|                                                           |
|  (Si l'entite a des enfants, un toast bloque l'action :   |
|   "Vous ne pouvez pas archiver cette entite : elle        |
|    possede N enfants. Archivez d'abord les entites        |
|    enfants.")                                             |
|                                                           |
+-----------------------------------------------------------+
|                        [Annuler]  [Archiver]              |
+-----------------------------------------------------------+
```

### Drawer -- Onglet Historique

```
+-------------------------------------------+
|  Paris (FR03)                        [X]  |
|  Fil d'ariane : France > Ile-de-France    |
|                                           |
|  Onglets : [Attributs] [Utilisateurs] [Historique] |
+-------------------------------------------+
|                                           |
|  [Rechercher...]          [Exporter CSV ->] |
|                                           |
|  Date          | Action       | Avant    | Apres  | Par      |   |
|  --------------+--------------+----------+--------+----------+---|
|  12 Mar 14:30  | Renommage    | Paris 5e | Paris  | admin@   | [RotateCcw] |
|  11 Mar 09:00  | Reparentage  | France   | IdF    | admin@   | [RotateCcw] |
|  10 Mar 16:45  | Creation     | --       | Paris  | admin@   |   |
|                                           |
|           Voir l'historique complet       |
+-------------------------------------------+
```

Dialog de confirmation revert (depuis l'onglet historique) :

```
+-----------------------------------------------------------+
|  Annuler cette modification ?                             |
|                                                           |
|  Le champ "Renommage" sera retabli a sa valeur            |
|  precedente. Cette action creera une nouvelle entree      |
|  dans l'historique.                                       |
|                                                           |
+-----------------------------------------------------------+
|                        [Annuler]  [Confirmer]             |
+-----------------------------------------------------------+
```

### CreateGroupDialog -- Creation d'un regroupement

```
+-----------------------------------------------------------+
|  Nouveau regroupement                                [X]  |
+-----------------------------------------------------------+
|                                                           |
|  Nom                                                      |
|  [ Ex: Region Sud                                       ] |
|                                                           |
|  Description (optionnel)                                  |
|  +-----------------------------------------------------+ |
|  | Description du regroupement...                       | |
|  |                                                      | |
|  +-----------------------------------------------------+ |
|                                                           |
+-----------------------------------------------------------+
|                        [Annuler]  [Creer]                 |
+-----------------------------------------------------------+
```

### AddEoDialog -- Ajout de membres au regroupement

```
+-----------------------------------------------------------+
|  Gerer les EOs du regroupement                       [X]  |
+-----------------------------------------------------------+
|  [Rechercher...]                                          |
+-----------------------------------------------------------+
|                                                           |
|  [v] France (FR01)                             [GitBranch]|
|    [v] Ile-de-France (FR02)                    [GitBranch]|
|      [v] Paris (FR03)                                     |
|      [ ] Versailles (FR04)                                |
|      [ ] Neuilly (FR05)              Via parent           |
|    [ ] Provence (FR06)                                    |
|  [ ] Allemagne (DE01)                                     |
|    [ ] Berlin (DE02)                                      |
|                                                           |
|  Legende :                                                |
|  [v] = case cochee   [ ] = case decochee                  |
|  [GitBranch] = toggle "inclure descendants"               |
|  "Via parent" = implicitement inclus par un parent        |
|                                                           |
+-----------------------------------------------------------+
|                    [Annuler]  [Enregistrer (3)]           |
+-----------------------------------------------------------+
```

### EoGroupDetailPanel -- Detail d'un regroupement

```
+-----------------------------------------------------------+
|  [ Region Sud                   ]                    [X]  |
|  [ Description (optionnel)...                           ] |
|                                                           |
|  [Enregistrer]   (visible si nom ou desc modifie)         |
+-----------------------------------------------------------+
|  Membres (3)                    [Ajouter des EOs ->]      |
+-----------------------------------------------------------+
|  +-------------------------------------------------------+|
|  | [Building] Paris (FR03)           Niv. 2  [GitBranch] [X] ||
|  +-------------------------------------------------------+|
|  | [Building] Lyon (FR10)            Niv. 1  [GitBranch] [X] ||
|  +-------------------------------------------------------+|
|  | [Building] Marseille (FR15)       Niv. 1              [X] ||
|  +-------------------------------------------------------+|
|                                                           |
|  [GitBranch] = toggle descendance (bleu = active)         |
|  [X] = retirer du groupe                                  |
+-----------------------------------------------------------+
```

## Regles metier

- 3 modes de vue : liste (DataTable), arbre (TreeView), canvas (organigramme SVG)
- Recherche textuelle sur nom et code
- Filtres dynamiques sur champs core + champs personnalises
- Export CSV (code, nom, code_parent, actif, + champs perso)
- Clic sur une ligne ouvre le drawer de detail avec edition inline
- Onglets "Entites" / "Regroupements"
- Boutons de navigation vers sous-pages (Champs, Historique, Archives, Import)
- Drawer : edition inline nom, parent, toggle actif/inactif, champs personnalises
- Drawer : archivage avec validation (bloque si enfants actifs)
- Drawer : reparenting avec filtrage des candidats (pas de self-reference, pas de descendants)
- Drawer : onglet Historique avec revert
- Drawer : commentaires sur transition de champs select (si configure)
- Regroupements : unicite du nom de groupe par client
- Regroupements : pas de doublon de membre dans un groupe
- Regroupements : possibilite d'inclure les descendants d'une entite
- Terminologie : toujours "archiver" (jamais "supprimer")

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/clients/:clientId/eo/` | Liste des entites (paginee, `is_archived=false`) |
| PATCH | `/api/clients/:clientId/eo/:id` | Mise a jour entite (edition inline drawer) |
| GET | `/api/clients/:clientId/eo/export` | Export CSV |

## Endpoints API (a creer)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/clients/:clientId/eo/?search=` | Recherche textuelle cote API (B20) |
| GET | `/api/clients/:clientId/eo/values/all` | Endpoint batch pour les valeurs de champs (B19) |

## Comportements attendus

### Page principale
- Loading state : skeleton table pendant le chargement des entites
- Gestion d'erreur : toast + message d'erreur si l'API echoue
- Pagination : cote API (offset-based minimum, keyset-based recommande pour gros volumes)
- Etat vide : message "Aucune entite" avec bouton de creation
- Recherche : debounce 300ms, recherche cote API via `?search=`

### Drawer de detail
- Loading state : skeleton pendant le chargement des details
- Feedback sauvegarde : toast succes/erreur apres chaque edition inline
- Validation reparentage : gerer le cas ou `path` est null
- Selecteur parent : recherche avec virtualisation pour gros volumes

### Vue arbre
- Auto-expand du chemin de l'entite selectionnee
- Performance : virtualisation pour les arbres avec 1000+ noeuds

### Vue canvas
- Hauteur responsive (adapatee au viewport, pas de valeur fixe)
- Controles : zoom, pan, centrer, selection

### Export CSV
- Gerer le cas ou le slug client est absent (fallback sur l'ID ou le nom)
- Inclure ou exclure les entites archivees (decision en attente)

### Regroupements
- Preview du nombre de descendants avant ajout d'un parent au groupe
- Archivage de groupe : terminologie "archiver/desactiver" (pas "supprimer")
- Audit trail pour ajout/suppression de membres (B14)

## Points d'attention backend

| # | Severite | Point |
|---|----------|-------|
| B19 | Moyenne | Pas d'endpoint batch pour les valeurs de champs -- cause N+1 cote front |
| B20 | Moyenne | Pas de `?search=` cote API -- recherche uniquement cote front |
| B14 | Moyenne | Pas d'audit trail pour ajout/suppression de membres de groupe |
| B15 | Haute | Pas de prevention doublons membres -- meme entite ajoutee plusieurs fois |
| B16 | Moyenne | Pas de verification unicite nom de groupe par client |
| D4 | Haute | Pas de contrainte UNIQUE `(group_id, eo_id) WHERE deleted_at IS NULL` |
| -- | Faible | Pagination offset-based (lent sur gros volumes, considerer keyset) |
| -- | Faible | Export CSV inclut les entites archivees (contrairement a la liste) |
