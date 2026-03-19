# [6-7-2] Page des champs archivés d'entités

## Description

Page dédiée listant les champs archivés avec la possibilité de les restaurer.

## Détails fonctionnels

- Accessible depuis le bouton "Archives (N)" dans le header de la page de structure
- PageHeader avec titre "Champs archivés" et bouton retour vers la structure
- DataTable avec colonnes :
  - **Nom** : nom + slug en sous-titre
  - **Type** : badge avec icône du type
  - **Obligatoire** : badge Oui/Non
  - **Actions** : bouton "Restaurer" (outline)
- Recherche par nom
- La restauration réactive le champ, il réapparaît dans la liste des champs actifs

## Critères de done

- [ ] Page accessible depuis le bouton "Archives"
- [ ] DataTable avec les colonnes
- [ ] Recherche par nom
- [ ] Bouton "Restaurer" fonctionnel
- [ ] Le champ restauré réapparaît dans la liste active

## Dépendances

- 6-7-1
