# [5-6-5] Archivage d'une instance d'objet métier

## Description

Permettre à l'intégrateur d'archiver une instance d'objet métier depuis le tableau des instances ou depuis le détail de l'instance, avec confirmation préalable.

## Détails fonctionnels

- Accessible depuis :
  - Le menu déroulant (⋮) de chaque ligne du tableau des instances → "Archiver"
  - Le menu déroulant (⋮) de la page de détail de l'instance → "Archiver"
- L'action est marquée en rouge (destructive) dans le menu
- Dialog de confirmation indiquant le numéro de référence de l'instance et que l'action est réversible
- L'archivage met is_active à false sur l'instance (les données et fichiers associés sont conservés)
- L'instance archivée disparaît du tableau des instances actives
- Le compteur d'instances sur la page de détail de l'objet métier est mis à jour
- Un bouton "Archivés (N)" dans le header du tableau des instances permet d'accéder aux instances archivées

## Critères de done

- [ ] Action "Archiver" dans le menu déroulant du tableau (style destructif)
- [ ] Action "Archiver" dans le menu déroulant du détail de l'instance
- [ ] Dialog de confirmation avec numéro de référence
- [ ] Mise à jour du statut is_active
- [ ] Disparition de la liste des instances actives
- [ ] Compteur d'instances mis à jour
- [ ] Bouton "Archivés (N)" dans le header du tableau

## Dépendances

- 5-3-2
