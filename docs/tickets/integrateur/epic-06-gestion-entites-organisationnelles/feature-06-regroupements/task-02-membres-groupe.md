# [6-6-2] Gestion des membres d'un groupe

## Description

Ajouter, retirer et configurer les entités membres d'un regroupement.

## Détails fonctionnels

- Depuis un groupe déplié, affichage de la liste des membres avec :
  - Nom et code de l'entité
  - Toggle "Inclure les descendants" : si activé, toutes les entités enfants sont automatiquement incluses dans le groupe
  - Bouton de retrait du membre
- Bouton "Ajouter des entités" :
  - Dialog de sélection avec recherche parmi les entités non encore membres
  - Sélection multiple possible
  - Ajout en masse des entités sélectionnées
- La modification du toggle "Inclure les descendants" est sauvegardée immédiatement

## Critères de done

- [ ] Liste des membres avec nom, code et toggle descendants
- [ ] Ajout d'entités via dialog de sélection avec recherche
- [ ] Sélection multiple et ajout en masse
- [ ] Retrait d'un membre
- [ ] Toggle "Inclure les descendants" fonctionnel

## Dépendances

- 6-6-1
