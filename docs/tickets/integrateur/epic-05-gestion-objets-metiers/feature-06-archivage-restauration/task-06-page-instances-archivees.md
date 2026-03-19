# [5-6-6] Page des instances archivées

## Description

Page dédiée listant les instances archivées d'un objet métier avec la possibilité de les restaurer.

## Détails fonctionnels

- Accessible depuis le bouton "Archivés (N)" dans le header du tableau des instances
- PageHeader avec titre "Instances archivées — {nom de l'objet}" et bouton retour vers la page de détail
- DataTable avec colonnes :
  - **Identifiant** : numéro de référence de l'instance
  - **Entité** : nom de l'EO rattachée
  - **Archivé le** : date de mise à jour au format français
  - **Actions** : bouton "Restaurer" (outline)
- Recherche par numéro de référence
- La restauration remet is_active à true, l'instance réapparaît dans le tableau des instances actives

## Critères de done

- [ ] Page accessible depuis le bouton "Archivés"
- [ ] DataTable avec les 4 colonnes
- [ ] Recherche par numéro de référence
- [ ] Bouton "Restaurer" fonctionnel
- [ ] L'instance restaurée réapparaît dans le tableau actif

## Dépendances

- 5-6-5
