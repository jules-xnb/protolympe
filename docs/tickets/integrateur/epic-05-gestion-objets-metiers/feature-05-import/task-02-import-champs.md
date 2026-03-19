# [5-5-2] Import de champs dans un objet

## Description

Wizard d'import CSV pour ajouter des champs personnalisés à un objet métier existant depuis la page de structure.

## Détails fonctionnels

- Accessible depuis la page de structure via le bouton "Importer" (toujours visible)
- L'import ne fait qu'ajouter de nouveaux champs — les champs existants portant le même nom sont rejetés avec une erreur
- Dialog avec wizard en 3 étapes :
  1. **Upload** : sélection de fichier, téléchargement de template, documentation dépliable (colonnes attendues, types de champs valides, notes sur le format CSV)
  2. **Mapping** : correspondance des colonnes CSV vers les attributs de champ (nom, type, requis, lecture seule, description, placeholder)
  3. **Prévisualisation** : tableau de prévisualisation des champs avec validation, alerte d'erreurs, barre de progression pendant l'import
- Colonnes CSV attendues :
  - name (requis)
  - type (requis)
  - required (optionnel)
  - readonly (optionnel)
  - description (optionnel)
  - placeholder (optionnel)
- Types de champs **non importables** (nécessitent une configuration supplémentaire, à créer via le formulaire) :
  - select, multiselect (nécessitent un référentiel)
  - object_reference (nécessite un objet métier cible)
  - calculated (nécessite une formule)
  - aggregation (nécessite un champ source et un champ cible)
- Types importables : text, textarea, number, decimal, date, datetime, time, checkbox, file, image, email, phone, url, document, user_reference, eo_reference
- Compteur du nombre de lignes détectées affiché à l'étape mapping
- Bouton "Importer N champ(s)" désactivé si erreurs ou aucun champ valide

## Critères de done

- [ ] Bouton "Importer" toujours visible dans le header de la page structure
- [ ] Les champs dont le nom existe déjà sont rejetés avec message d'erreur
- [ ] Wizard 3 étapes dans un dialog
- [ ] Template CSV téléchargeable
- [ ] Documentation dépliable avec colonnes et types
- [ ] Mapping avec aperçu de données
- [ ] Prévisualisation avec validation et compteur
- [ ] Barre de progression pendant l'import

## Dépendances

- 5-4-1
