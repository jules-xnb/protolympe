# [5-6-2] Page des objets métiers archivés

## Description

Page dédiée listant les objets métiers archivés avec la possibilité de les restaurer.

## Détails fonctionnels

- Accessible depuis le bouton "Archives" dans le header de la page de liste
- PageHeader avec titre "Archives — Objets Métiers" et bouton retour vers la liste
- DataTable avec colonnes :
  - **Nom** : nom + slug en sous-titre
  - **Description** : texte tronqué ou tiret
  - **Archivé le** : date de mise à jour au format français
  - **Actions** : bouton "Restaurer" (outline)
- Recherche par nom et description
- La restauration remet is_active à true, l'objet réapparaît dans la liste principale

## Critères de done

- [ ] Page accessible depuis le bouton "Archives"
- [ ] DataTable avec les 4 colonnes
- [ ] Recherche fonctionnelle
- [ ] Bouton "Restaurer" fonctionnel
- [ ] L'objet restauré réapparaît dans la liste active

## Dépendances

- 5-1-1
