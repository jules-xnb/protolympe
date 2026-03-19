# [5-6-3] Archivage d'un champ personnalisé

## Description

Permettre à l'intégrateur d'archiver un champ personnalisé depuis la page de structure, avec confirmation préalable.

## Détails fonctionnels

- Bouton d'archivage (icône archive) sur chaque ligne de champ dans le DataTable
- Dialog de confirmation indiquant le nom du champ et que l'action est réversible
- L'archivage met is_active à false sur le champ
- Le champ disparaît de la liste des champs personnalisés
- Le compteur d'archivés est mis à jour dans le bouton "Archivés (N)" du header

## Critères de done

- [ ] Bouton d'archivage par ligne
- [ ] Dialog de confirmation avec nom du champ
- [ ] Mise à jour du statut is_active
- [ ] Disparition de la liste des champs personnalisés
- [ ] Compteur d'archivés mis à jour

## Dépendances

- 5-4-1
