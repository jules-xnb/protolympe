# [5-6-1] Archivage d'un objet métier

## Description

Permettre à l'intégrateur d'archiver un objet métier depuis sa page de détail, avec confirmation préalable.

## Détails fonctionnels

- Accessible depuis le menu déroulant (⋮) de la page de détail → "Archiver"
- L'action est marquée en rouge (destructive) dans le menu
- Dialog de confirmation avant archivage
- L'archivage met is_active à false (l'objet et ses données sont conservés)
- Après archivage : redirection vers la liste des objets métiers
- L'objet archivé disparaît de la liste principale

## Critères de done

- [ ] Action "Archiver" dans le menu déroulant en style destructif
- [ ] Dialog de confirmation
- [ ] Mise à jour du statut is_active
- [ ] Redirection vers la liste après archivage
- [ ] L'objet n'apparaît plus dans la liste active

## Dépendances

- 5-3-1
