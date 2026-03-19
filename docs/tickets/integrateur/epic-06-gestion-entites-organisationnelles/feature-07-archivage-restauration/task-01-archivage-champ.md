# [6-7-1] Archivage d'un champ personnalisé d'entité

## Description

Permettre à l'intégrateur d'archiver un champ personnalisé depuis la page de structure, avec confirmation préalable.

## Détails fonctionnels

- Accessible depuis le menu d'actions de chaque champ personnalisé → "Archiver"
- L'action est marquée en rouge (destructive) dans le menu
- Dialog de confirmation indiquant le nom du champ et que l'action est réversible
- L'archivage désactive le champ (il n'apparaît plus dans les formulaires ni les tableaux)
- Le compteur d'archivés est mis à jour dans le bouton "Archives (N)" du header

## Critères de done

- [ ] Action "Archiver" dans le menu d'actions
- [ ] Dialog de confirmation
- [ ] Champ désactivé après archivage
- [ ] Disparition de la liste des champs actifs
- [ ] Compteur d'archives mis à jour

## Dépendances

- 6-3-1
