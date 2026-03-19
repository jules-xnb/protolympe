# [5-5-1] Import de définitions d'objets métiers

## Description

Wizard d'import CSV pour créer des objets métiers et leurs champs en masse.

## Détails fonctionnels

- Accessible depuis la page de liste des objets métiers
- Wizard en 4 étapes :
  1. **Upload** : drag-drop ou sélection de fichier CSV
  2. **Mapping** : correspondance des colonnes CSV vers les champs cibles
  3. **Prévisualisation** : groupes dépliables par objet, compteurs de champs, résultats de validation
  4. **Résultats** : compteurs succès/erreurs, redirection automatique vers la liste si 100% succès
- Colonnes CSV attendues :
  - object_name (requis) : nom de l'objet
  - object_description (optionnel)
  - object_icon (optionnel)
  - object_color (optionnel)
  - field_name (requis) : nom du champ
  - field_type (requis) : type parmi les 19 types valides
  - field_description (optionnel)
  - field_required (optionnel : oui/non/true/false)
  - field_placeholder (optionnel)
- Validation :
  - object_name, field_name, field_type ne peuvent pas être vides
  - field_type doit être un type valide
  - Pas de doublons de noms de champs au sein d'un même objet
- Si un objet avec le même nom existe déjà, les champs sont ajoutés à l'objet existant
- Les slugs sont auto-générés avec un suffixe timestamp pour éviter les collisions
- L'ordre d'affichage (display_order) est calculé selon la position dans le CSV

## Critères de done

- [ ] Wizard 4 étapes fonctionnel
- [ ] Upload de fichier CSV avec drag-drop
- [ ] Mapping des colonnes avec aperçu de la première ligne
- [ ] Prévisualisation groupée par objet avec validation
- [ ] Erreurs affichées avec numéro de ligne
- [ ] Création d'objets nouveaux ou ajout à des objets existants
- [ ] Redirection après import réussi

## Dépendances

- 5-1-1
