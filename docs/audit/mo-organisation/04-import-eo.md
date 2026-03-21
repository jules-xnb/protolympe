# Spec : Import EO (`/dashboard/:clientId/entities/import`)

## Maquettes

### Vue d'ensemble

```
+---------------------------------------------------------------------------------+
|  <- Retour                                                                       |
|  Import des entites                                                              |
+---------------------------------------------------------------------------------+
|  Etape 1 : Upload CSV                                                           |
|  Etape 2 : Mapping colonnes -> champs                                           |
|  Etape 3 : Preview (arbre + erreurs + reparentages)                             |
|  Etape 4 : Import + rapport de controle                                         |
+---------------------------------------------------------------------------------+
```

### Etape 1 : Upload

```
+---------------------------------------------------------------------------------+
|  [FileSpreadsheet] Import des entites organisationnelles                   [X]  |
|  Importez des entites pour {clientName} depuis un fichier CSV                   |
+---------------------------------------------------------------------------------+
|  (1) Fichier -> (2) Mapping -> (3) Apercu -> (4) Import                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|           +---------------------------------------------------+                 |
|           |                                                   |                 |
|           |        [Upload icon]                              |                 |
|           |                                                   |                 |
|           |    Selectionnez un fichier CSV                     |                 |
|           |                                                   |                 |
|           |    Le fichier doit contenir les colonnes pour      |                 |
|           |    le code, le nom et le code parent               |                 |
|           |                                                   |                 |
|           |    Glissez-deposez votre fichier ici ou            |                 |
|           |    cliquez pour parcourir                          |                 |
|           |                                                   |                 |
|           +---------------------------------------------------+                 |
|                      (zone drag & drop / clic)                                  |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

### Etape 2 : Mapping

```
+---------------------------------------------------------------------------------+
|  (1) Fichier -> (2) Mapping -> (3) Apercu -> (4) Import                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +------------------------------------------------------------------+           |
|  | [AlertTriangle] Mappez les colonnes                              |           |
|  | Associez chaque colonne du CSV a un champ de la base de donnees. |           |
|  | Les champs "Code" et "Nom" sont obligatoires.                    |           |
|  +------------------------------------------------------------------+           |
|                                                    [Creer un champ ->]          |
|                                                                                 |
|  Colonne CSV     | Apercu          | Champ base de donnees                      |
|  ----------------+-----------------+------------------------------------------  |
|  code            | FR01            | [ Code *                           v ]     |
|  nom             | France          | [ Nom *                            v ]     |
|  code_parent     | --              | [ Code parent                      v ]     |
|  ville           | Paris           | [ Ville (Personnalise)             v ]     |
|  budget          | 50000           | [ Ne pas importer                  v ]     |
|                                                                                 |
|  125 lignes detectees dans le fichier                                           |
|                                                                                 |
+---------------------------------------------------------------------------------+
|                          [Retour]  [Previsualiser ->]                           |
+---------------------------------------------------------------------------------+
```

### Etape 3 : Apercu

```
+---------------------------------------------------------------------------------+
|  (1) Fichier -> (2) Mapping -> (3) Apercu -> (4) Import                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +------------------------------------------------------------------+           |
|  | [X] Erreurs detectees                                            |           |
|  | - Ligne 42 : code "XX99" en doublon                              |           |
|  | - Ligne 78 : parent "INEXISTANT" non trouve                      |           |
|  +------------------------------------------------------------------+           |
|                                                                                 |
|  +------------------------------------------------------------------+           |
|  | [CheckCircle] Apercu de l'import                                 |           |
|  | 123 entites seront importees (les entites en erreur seront       |           |
|  | ignorees)                                                        |           |
|  +------------------------------------------------------------------+           |
|                                                                                 |
|  +-------------------------------+  +-------------------------------+           |
|  | Arborescence previsionnelle   |  | Details: France               |           |
|  | [Tout deplier] [Tout replier] |  | Code : FR01                   |           |
|  |                               |  | Nom  : France                 |           |
|  | v France (FR01)          (3)  |  | Description : Siege           |           |
|  |   v Ile-de-France (FR02)(2)   |  | Ville : Paris                 |           |
|  |     Paris (FR03)              |  |                                |           |
|  |     Versailles (FR04)         |  | -- Champs personnalises --     |           |
|  |   Provence (FR06)             |  | Budget : 50000                 |           |
|  | v Allemagne (DE01) Mise a jour|  |                                |           |
|  |   Berlin (DE02)               |  |                                |           |
|  | [X] Inconnu (XX99) Err:doublon|  |                                |           |
|  +-------------------------------+  +-------------------------------+           |
|                                                                                 |
+---------------------------------------------------------------------------------+
|              [Retour au mapping]  [Confirmer l'import [CheckCircle]]            |
+---------------------------------------------------------------------------------+
```

### Etape 4 : Import en cours

```
+---------------------------------------------------------------------------------+
|  (1) Fichier -> (2) Mapping -> (3) Apercu -> (4) Import                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|                    Import en cours...                                           |
|                                                                                 |
|                    [==============          ]  73 / 123                         |
|                                                                                 |
|                    (barre de progression)                                       |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

## Regles metier

- Wizard multi-etapes (upload, mapping, preview, import)
- Auto-mapping colonnes CSV vers champs (nom, parent, statut, champs perso)
- Construction hierarchique : resolution parent par nom/code
- Preview : visualisation arbre + erreurs + reparentages
- Import avec barre de progression
- Rapport de controle CSV telechargeable apres import (Cree, Deplace, Erreur, Ignore)
- Template CSV telechargeable (headers core + champs perso actifs)
- Labels actif/inactif personnalises via champ systeme `is_active`
- Gestion des champs personnalises dans l'import (mapping dynamique)
- Redirection automatique vers la liste si import sans erreurs
- Serialisation JSONB : normaliser les valeurs (pas de double-encoding `JSON.stringify`)
- Entites creees avec `is_active = true` par defaut (aligner avec la creation manuelle)

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/clients/:clientId/eo/` | Creation entite (appele par entite) |
| POST | `/api/clients/:clientId/eo/:id/field-values` | Sauvegarde valeurs champs perso |
| PATCH | `/api/clients/:clientId/eo/:id` | Reparentage d'entites existantes |

## Endpoints API (a creer)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/clients/:clientId/eo/import` | Endpoint dedie d'import bulk avec resolution hierarchique, audit trail et rate limiting (B10, B11, B12, B13) |

## Comportements attendus

- Loading state : barre de progression pendant l'import
- Gestion d'erreur : afficher les erreurs dans l'apercu (etape 3), rapport telechargeable apres import
- Etat vide : message si le CSV est vide
- Validation : colonnes "Code" et "Nom" obligatoires au mapping
- Import non modifiable : l'utilisateur doit re-uploader un CSV corrige si des erreurs sont detectees
- Decision en attente : rollback en cas d'erreur partielle ou tolerance avec rapport

## Points d'attention backend

| # | Severite | Point |
|---|----------|-------|
| B10 | Haute | Pas de resolution hierarchique cote API. Toutes les entites importees au niveau racine (`path=""`, `level=0`). La hierarchie doit etre resolue cote API. |
| B11 | Moyenne | `is_active = false` par defaut a l'import (cote API). Incoherent avec la creation manuelle (`is_active = true`). |
| B12 | Moyenne | Pas d'audit trail pour les imports. Pas d'entree `eo.import` dans `admin_audit_log`. |
| B13 | Moyenne | Pas de rate limiting sur l'import bulk. |
