# [6-4-2] Import de champs personnalisés d'entités

## Description

Wizard d'import CSV pour ajouter des définitions de champs personnalisés aux entités en masse.

## Détails fonctionnels

- Accessible depuis le menu "Import/Export" de la page de structure des champs
- Colonnes CSV :
  - **name** (requis) : nom du champ
  - **field_type** (requis) : type du champ (parmi les types valides)
  - **description** (optionnel)
  - **is_required** (optionnel : oui/non)
  - **is_unique** (optionnel : oui/non)
  - **referential** (optionnel, requis si type = liste ou liste multiple)
  - **default_value** (optionnel)
- Wizard en 3 étapes :
  1. **Upload** : sélection de fichier CSV
  2. **Mapping** : correspondance des colonnes avec aperçu des données
  3. **Prévisualisation** :
    - Groupement par type de champ (sections dépliables)
    - Cartes de résumé : champs valides, types de champs, erreurs
    - Validation : unicité des noms, validité du type, existence du référentiel
- L'import ne fait qu'ajouter de nouveaux champs — les noms existants sont rejetés avec erreur
- L'ordre d'affichage est auto-incrémenté

## Critères de done

- [ ] Wizard 3 étapes fonctionnel
- [ ] Validation des types et des noms
- [ ] Résolution des référentiels
- [ ] Prévisualisation groupée par type
- [ ] Noms existants rejetés avec message d'erreur
- [ ] Ordre d'affichage auto-incrémenté

## Dépendances

- 6-3-1
