# Spec : Business Objects -- Import

## Maquettes

### Import definitions BO (wizard 3 etapes)

```
Etape 1 : Upload
+---------------------------------------------------------------------+
|  [<-]  Import d'objets metiers                                       |
+---------------------------------------------------------------------+
|  Etape 1/3 : Upload                                                  |
|                                                                      |
|  [Telecharger le template CSV]                                       |
|                                                                      |
|  +-----------------------------------------------+                  |
|  |  Glissez un fichier CSV ici                    |                  |
|  |  ou cliquez pour selectionner                  |                  |
|  +-----------------------------------------------+                  |
+---------------------------------------------------------------------+

Etape 2 : Mapping
+---------------------------------------------------------------------+
|  Colonnes CSV         ->    Champs systeme                           |
|  "Nom de l'objet"     ->    [Nom de l'objet v]                      |
|  "Type"               ->    [Type de champ v]                        |
|  "Description"        ->    [Description champ v]                    |
+---------------------------------------------------------------------+

Etape 3 : Preview + Import
+---------------------------------------------------------------------+
|  [Objet(s): 2]  [Champ(s): 7]  [Existant(s): 1]                    |
|                                                                      |
|  Apercu de l'import                                                  |
|  +-- Incident [Existe]  (4 champs)        [v]                       |
|  |   Champ      | Type    | Obligatoire | Description               |
|  |   Titre      | Texte   | x           | Titre de l'incident       |
|  |   Desc.      | Textarea| x           | Description detaillee     |
|  +-- Demande  (3 champs)                 [v]                        |
|  |   ...                                                             |
|                                                                      |
|  [Annuler]                              [Importer 7 champ(s)]       |
+---------------------------------------------------------------------+
```

### Import instances

```
Etape 1 : Upload
+---------------------------------------------------------------------+
|  [<-]  Import d'instances - Incident                                 |
+---------------------------------------------------------------------+
|  +-- [icon] Incident                                                 |
|  |   5 champs configures                                             |
|                                                                      |
|  [Telecharger le template CSV]                                       |
|  [Zone upload fichier]                                               |
+---------------------------------------------------------------------+

Etape 3 : Preview
+---------------------------------------------------------------------+
|  Erreurs detectees (2)                                               |
|  - Ligne 3: Entite "XYZ" non trouvee                                |
|  - Ligne 5: Code entite manquant                                     |
|                                                                      |
|  Statut | Entite   | Champs remplis                                 |
|  [ok]   | EO-001   | 3 / 5                                          |
|  [ok]   | EO-002   | 5 / 5                                          |
+---------------------------------------------------------------------+
```

## Regles metier

### Import definitions BO
- **Detection doublons** : comparaison avec les BO existants par nom/slug
- **Wizard** : upload -> mapping colonnes CSV -> apercu avec stats -> import
- **Slug** : genere cote serveur, pas de timestamp dans le slug
- **Import transactionnel** : toute l'operation (BO + champs) doit etre atomique. En cas d'erreur, rollback complet (pas de donnees partielles).

### Import instances
- **Template CSV** : genere a partir des field definitions du BO cible (headers = slugs des champs)
- **Resolution EO** : le code EO du CSV est resolu vers l'ID de l'entite organisationnelle. Erreur explicite si l'EO n'est pas trouvee.
- **`created_by_user_id`** : extrait du JWT cote serveur, jamais envoye dans le body
- **`reference_number`** : genere cote serveur pour chaque instance importee
- **Validation** : champs obligatoires verifies, types de donnees valides, erreurs par ligne
- **Import transactionnel** : toutes les instances + valeurs de champs en une seule transaction

## Endpoints API (a construire)

| Methode | Route | Description | Notes |
|---|---|---|---|
| `POST` | `/api/business-object-definitions/import` | Import batch definitions + champs | Transactionnel, slug genere serveur |
| `POST` | `/api/business-objects/:definitionId/instances/import` | Import batch instances | Transactionnel, reference_number genere serveur, created_by depuis JWT |
| `GET` | `/api/business-object-definitions/:id/import-template` | Template CSV pour import instances | Genere depuis les field definitions |

### Endpoints existants utilises

| Methode | Route | Description | Statut |
|---|---|---|---|
| `GET` | `/api/clients/:clientId/eo` | Liste entites organisationnelles | Existant |

## Comportements attendus

- **Loading** : barre de progression pendant l'import (nombre de lignes traitees / total)
- **Erreurs** : affichage des erreurs par ligne dans l'etape preview (ligne X : erreur Y), blocage de l'import si erreurs critiques
- **Succes** : toast de confirmation avec le nombre d'elements importes, redirection vers la liste BO ou le detail
- **Template CSV** : telechargement du template avec headers corrects et une ligne d'exemple
- **Validation front** : verification du format CSV, des colonnes obligatoires, preview avant import
- **Permissions** : verifier que l'integrateur a acces au client

## Points d'attention backend

- **Transaction** : import atomique -- tout ou rien. Pas de donnees partielles en cas d'erreur.
- **Slug** : generer cote serveur, garantir l'unicite, pas de timestamp
- **`created_by_user_id`** : extraire du JWT, jamais du body
- **`reference_number`** : generer cote serveur pour chaque instance
- **Validation** : valider chaque ligne (types, champs obligatoires, EO existante) et retourner toutes les erreurs d'un coup (pas d'arret au premier echec)
- **Performance** : utiliser des inserts batch pour les gros imports
- **Limites** : definir une limite max de lignes par import (ex: 5000) pour eviter les timeouts
