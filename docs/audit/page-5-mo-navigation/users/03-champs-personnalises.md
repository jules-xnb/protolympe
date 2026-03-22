# Spec : MO — Champs personnalises

Route : `/dashboard/:clientId/users/fields`

## Maquettes

### Page principale

```
+-----------------------------------------------------------------------+
|  [<-] Champs utilisateurs          [Archives] [Import/Export v]       |
|  Definissez les champs des fiches   [Ajouter un champ +]             |
|  utilisateurs de {clientName}                                         |
+-----------------------------------------------------------------------+
|  [Rechercher un champ...]                                             |
+-----------------------------------------------------------------------+
|  Nom                    | Type         | Obligatoire | Unique | Perso |
| ----------------------- | ------------ | ----------- | ------ | ----- |
|  [lock] Prenom          | [A] Texte    |   [check]   |   -    |       |
|  first_name             |              |             |        |       |  <- bg grise (systeme)
| ----------------------- | ------------ | ----------- | ------ | ----- |
|  [lock] Nom             | [A] Texte    |   [check]   |   -    |       |
|  last_name              |              |             |        |       |  <- bg grise
| ----------------------- | ------------ | ----------- | ------ | ----- |
|  [lock] Adresse e-mail  | [@] Email    |   [check]   | [warn] |       |
|  email                  |              |             |        |       |  <- bg grise
| ----------------------- | ------------ | ----------- | ------ | ----- |
|  Departement            | [v] Select   |    -        |   -    |       |
|  departement            |              |             |        |       |  <- bg blanc (custom)
| ----------------------- | ------------ | ----------- | ------ | ----- |
|  [lock] Matricule       | [A] Texte    |   [check]   | [warn] | [->] |
|  matricule              |              |             |        |       |  <- bg grise (system, pas builtin -> bouton "perso")
+-----------------------------------------------------------------------+
```

Note : icones a droite du texte dans le dropdown Import/Export (convention CLAUDE.md).

### Dialog creation/edition de champ

```
+--- Dialog (480px max) --------------------------------+
|  Nouveau champ utilisateur / Modifier le champ        |
|                                                       |
|  [Nom du champ *     ] [Description        ]          |
|                                                       |
|  Type de champ                                        |
|  [v Texte                                  ]          |
|     (liste: texte, email, nombre, date,               |
|      boolean, select, multiselect, initiales)         |
|                                                       |
|  (si select/multiselect:)                             |
|  Options                                              |
|  [Nouvelle option    ] [+]                            |
|  [Option A] [Option B] [Option C]   <- chips          |
|                                                       |
|  Valeur par defaut                                    |
|  [v Aucune                         ]                  |
|                                                       |
|  (si initiales:)                                      |
|  +-- config initiales (bg grise) --+                  |
|  | Configuration des initiales  [JP]|                 |
|  | Apercu pour "Jean-Pierre Dupont" |                 |
|  | Source: [Prenom + Nom v]         |                 |
|  | Caracteres/mot: [1]              |                 |
|  | Casse: [MAJUSCULES v]            |                 |
|  | Separateur: [ ]                  |                 |
|  | Prenoms composes: [=== toggle]   |                 |
|  +----------------------------------+                 |
|                                                       |
|  (sauf initiales:)                                    |
|  Obligatoire                          [=== toggle]    |
|  Valeur unique                        [=== toggle]    |
|                                                       |
|  [Archiver]                  [Annuler] [Creer/MAJ]    |
+-------------------------------------------------------+
```

### Menu dropdown Import/Export

```
+------------------------+
| Importer (CSV)   [^]   |
| Exporter (CSV)   [v]   |
+------------------------+
```

## Regles metier

1. **Champs builtin** : Prenom, Nom, Email sont des champs systeme toujours presents. Ils doivent venir d'une API (pas en dur cote front) pour rester synchronises avec le serveur.

2. **Champs systeme vs custom** :
   - Systeme (bg grise, icone lock) : non editables par l'utilisateur, definis par la plateforme
   - Custom (bg blanc) : editables, archivables, supprimables
   - Distinction visuelle claire via le background

3. **Promouvoir un champ** : le bouton `[->]` sur un champ systeme non-builtin le rend `is_user_editable: true` (l'utilisateur final peut le modifier). C'est un PATCH standard.

4. **Types de champs** : texte, email, nombre, date, boolean, select, multiselect, initiales.

5. **Slug** : genere automatiquement a la creation via `generateUniqueFieldSlug(name)`. Non modifiable en edition. Doit etre unique — a valider cote serveur.

6. **Archivage** : soft delete via `PATCH .../field-definitions/:id/deactivate` (met `is_active: false`). Jamais de suppression physique.

7. **Options select/multiselect** : ajout d'options par chips. La valeur par defaut est optionnelle.

8. **Initiales** : champ en lecture seule, calcule automatiquement. Configuration : source (prenom+nom), caracteres/mot, casse, separateur, prenoms composes.

9. **Reordonnement** : le champ `display_order` existe en BDD. A terme, prevoir une UI de reordonnement (drag & drop). Pour la V1, ordre par `display_order` puis `name`.

10. **Validation slug unique** : verifier l'unicite du slug cote serveur a la creation. Retourner une erreur 409 si conflit.

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---|---|---|
| GET | `/api/clients/:clientId/users/field-definitions` | Lister definitions champs |
| POST | `/api/clients/:clientId/users/field-definitions` | Creer definition champ |
| PATCH | `/api/clients/:clientId/users/field-definitions/:id` | Modifier definition |
| PATCH | `/api/clients/:clientId/users/field-definitions/:id/deactivate` | Archiver definition |

## Endpoints API (a creer)

| Methode | Endpoint | Description | Raison |
|---|---|---|---|
| GET | `/api/clients/:clientId/users/field-definitions?archived=true` | Supporter le filtre `?archived=true` | Le serveur retourne tout sans filtrer par `is_active` actuellement |
| PATCH | `/api/clients/:clientId/users/field-definitions/:id/reactivate` | Restaurer un champ archive | Necessaire pour la page archives |
| GET | `/api/clients/:clientId/users/field-definitions/builtin` | Retourner les champs builtin depuis le serveur | Evite de les hardcoder cote front |

## Comportements attendus

### Loading states
- Tableau : skeleton rows pendant le chargement des definitions
- Dialog creation/edition : bouton "Creer/MAJ" en etat `isPending`
- Archivage : loading pendant la mutation

### Gestion d'erreurs
- Creation : erreurs de validation Zod sous chaque champ
- Slug en doublon : message d'erreur explicite (409 du serveur)
- Archivage : toast d'erreur si la mutation echoue
- Import : redirection vers le wizard d'import generique

### Pagination
- Le tableau n'a pas besoin de pagination serveur (les definitions de champs sont peu nombreuses par client)
- Recherche cote client sur le champ `name`

### Validation
- Nom du champ : obligatoire, non vide
- Type : obligatoire, parmi la liste des types autorises
- Options (select/multiselect) : au moins une option obligatoire
- Slug : genere automatiquement, unique (validation serveur)

## Points d'attention backend

1. **Filtre `is_active`** : le `GET /field-definitions` doit supporter un parametre `?archived=true` pour retourner uniquement les champs archives, et par defaut ne retourner que les actifs.
2. **Archivage = PATCH deactivate** : utiliser la route existante `PATCH .../deactivate`. Ne jamais accepter de DELETE.
3. **Validation slug unique** : verifier l'unicite du slug a la creation. Retourner 409 si conflit.
4. **Champs builtin depuis l'API** : les champs builtin (Prenom, Nom, Email) doivent etre retournes par l'API pour eviter le hardcoding front.
5. **Ordre d'affichage** : retourner les champs tries par `display_order` puis `name`.
