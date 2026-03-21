# Spec : Import champs EO (`/dashboard/:clientId/entities/fields/import`)

## Maquettes

### Vue d'ensemble

```
+---------------------------------------------------------------------------------+
|  <- Retour                                                                       |
|  Import des champs EO                                                            |
+---------------------------------------------------------------------------------+
|  Etape 1 : Upload CSV                                                           |
|  Etape 2 : Mapping (nom, type, description, obligatoire, unique, referentiel)   |
|  Etape 3 : Preview par type de champ + erreurs                                  |
|  Etape 4 : Import                                                                |
+---------------------------------------------------------------------------------+
```

### Etape 1 : Upload CSV

```
+---------------------------------------------------------------------------------+
|  <- Retour                                                                      |
|  Import des champs EO                                                           |
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
|           |    Glissez-deposez ou cliquez pour parcourir       |                 |
|           |                                                   |                 |
|           +---------------------------------------------------+                 |
|                                                                                 |
|  [Telecharger le template CSV]                                                  |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

### Etape 2 : Mapping colonnes

```
+---------------------------------------------------------------------------------+
|  (1) Fichier -> (2) Mapping -> (3) Apercu -> (4) Import                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  Colonne CSV     | Apercu           | Champ cible                              |
|  ----------------+------------------+------------------------------------------+|
|  name            | Nom complet      | [ Nom du champ *                   v ]  ||
|  field_type      | text             | [ Type de champ *                  v ]  ||
|  description     | Nom du collab.   | [ Description                      v ]  ||
|  is_required     | oui              | [ Obligatoire                      v ]  ||
|  is_unique       | non              | [ Unique                           v ]  ||
|  referential     | Services         | [ Referentiel                      v ]  ||
|  default_value   |                  | [ Valeur par defaut                v ]  ||
|                                                                                 |
|  Les champs "Nom" et "Type" sont obligatoires.                                 |
|                                                                                 |
+---------------------------------------------------------------------------------+
|                          [Retour]  [Previsualiser ->]                           |
+---------------------------------------------------------------------------------+
```

### Etape 3 : Preview par type de champ

```
+---------------------------------------------------------------------------------+
|  (1) Fichier -> (2) Mapping -> (3) Apercu -> (4) Import                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +------------------------------------------------------------------+           |
|  | [CheckCircle] 8 champs valides | 3 types | 1 erreur             |           |
|  +------------------------------------------------------------------+           |
|                                                                                 |
|  v Texte (3 champs)                                                             |
|  +------------------------------------------------------------------+           |
|  | Nom complet    | text     | Obligatoire | Unique                 |           |
|  | Prenom         | text     | Obligatoire |                        |           |
|  | Adresse        | textarea |             |                        |           |
|  +------------------------------------------------------------------+           |
|                                                                                 |
|  v Selection (2 champs)                                                         |
|  +------------------------------------------------------------------+           |
|  | Service        | select   | Obligatoire | Ref: Services          |           |
|  | Statut         | select   |             | Ref: Statuts           |           |
|  +------------------------------------------------------------------+           |
|                                                                                 |
|  v Erreurs (1)                                                                  |
|  +------------------------------------------------------------------+           |
|  | [X] Budget     | invalid_type | Type "decimal" invalide          |           |
|  +------------------------------------------------------------------+           |
|                                                                                 |
+---------------------------------------------------------------------------------+
|              [Retour au mapping]  [Importer (8 champs)]                         |
+---------------------------------------------------------------------------------+
```

### Etape 4 : Import en cours / Resultat

```
+---------------------------------------------------------------------------------+
|  (1) Fichier -> (2) Mapping -> (3) Apercu -> (4) Import                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|                    Import en cours...                                           |
|                                                                                 |
|                    [========                ]  3 / 8                            |
|                                                                                 |
|  (en cas de succes : redirection auto vers page champs)                         |
|  (en cas d'erreurs : affichage du compteur succes/erreurs)                      |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

## Regles metier

- Wizard multi-etapes via composant generique `ImportWizard`
- Auto-mapping colonnes CSV (nom, type, description, obligatoire, unique, referentiel, valeur par defaut)
- Validations du preview :
  - Nom requis
  - Type requis et valide (enum de types autorises)
  - Detection doublons dans le CSV
  - Detection doublons avec les champs existants
  - Referentiel requis pour select/multiselect
  - Verification que le referentiel existe dans les listes du client
- Preview visuel groupe par type de champ (avec icones et labels)
- Stats : champs valides, types de champ, erreurs
- Sections collapsibles par type
- Badges pour obligatoire, unique, referentiel
- Redirection automatique vers la page champs si import sans erreurs
- Template CSV telechargeable avec exemples
- `display_order` auto-incremente a partir du max existant
- Fallback si pas de client selectionne : etat vide standard

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/organizational-entities/field-definitions` | Creation definition de champ (appele par champ) |

## Endpoints API (a creer)

Aucun endpoint supplementaire requis (un endpoint batch serait optionnel pour ameliorer les performances sur gros imports).

## Comportements attendus

- Loading state : barre de progression pendant l'import
- Gestion d'erreur : compteur succes/erreurs affiche a la fin, detail des erreurs visible
- Etat vide : etat vide standard si pas de client selectionne
- Validation : "Nom" et "Type" obligatoires au mapping
- Apres import : redirection auto vers page champs si aucune erreur

## Points d'attention backend

| # | Severite | Point |
|---|----------|-------|
| -- | Faible | Chaque champ cree individuellement. Pas d'endpoint batch. Lent sur gros imports. |
