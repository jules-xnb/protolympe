# [5-5-3] Import d'instances d'un objet métier

## Description

Wizard d'import CSV pour créer des instances d'un objet métier en masse, avec résolution des entités organisationnelles et parsing typé des valeurs.

## Détails fonctionnels

- Accessible depuis la page de détail de l'objet
- Bannière d'information affichant l'objet concerné (couleur, icône, nom, nombre de champs)
- Wizard en 4 étapes :
  1. **Upload** : sélection de fichier CSV
  2. **Mapping** : correspondance des colonnes CSV. Colonne eo_code requise, colonnes de champs auto-mappées par slug
  3. **Prévisualisation** : tableau avec statut (valide/erreur), code entité, taux de remplissage des champs (N / total) en badge
  4. **Résultats** : compteurs succès/erreurs, redirection automatique
- Colonne CSV requise :
  - eo_code : code de l'entité organisationnelle, résolu vers l'entité en base
- Colonnes dynamiques : une par champ personnalisé (identifié par slug)
- Parsing des valeurs selon le type :
  - Nombre/décimal : parsing numérique
  - Checkbox : parseBoolean (oui/yes/true/1/vrai)
  - Multiselect : séparation par | et trim
  - Autres : chaîne de texte
- Validation :
  - eo_code ne peut pas être vide
  - Le code entité doit exister en base
  - Erreurs affichées avec numéro de ligne

## Critères de done

- [ ] Wizard 4 étapes fonctionnel
- [ ] Bannière d'information de l'objet
- [ ] Auto-mapping des colonnes par slug
- [ ] Résolution des entités par code
- [ ] Parsing typé des valeurs
- [ ] Prévisualisation avec taux de remplissage
- [ ] Gestion des erreurs (entité inexistante, code vide)

## Dépendances

- 5-3-1
- 5-4-1
