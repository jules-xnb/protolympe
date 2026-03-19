# [5-6-4] Page des champs archivés

## Description

Page dédiée listant les champs archivés d'un objet métier avec la possibilité de les restaurer.

## Détails fonctionnels

- Accessible depuis le bouton "Archivés (N)" dans le header de la page de structure
- PageHeader avec titre "Champs archivés — {nom de l'objet}" et bouton retour vers la structure
- DataTable avec colonnes :
  - **Nom** : nom + slug en sous-titre
  - **Type** : badge avec le libellé du type
  - **Actions** : bouton "Restaurer" (outline)
- Recherche par nom
- La restauration remet is_active à true, le champ réapparaît dans la liste des champs personnalisés

## Critères de done

- [ ] Page accessible depuis le bouton "Archivés"
- [ ] DataTable avec les 3 colonnes
- [ ] Recherche par nom
- [ ] Bouton "Restaurer" fonctionnel
- [ ] Le champ restauré réapparaît dans la liste active

## Dépendances

- 5-6-3
