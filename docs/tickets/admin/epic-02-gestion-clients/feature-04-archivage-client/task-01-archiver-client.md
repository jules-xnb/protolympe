# [2-4-1] Archiver un client

## Référence Figma

- [home-clients-drawer](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=87-2221)
- [home-clients-snackbar](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=88-9457)

## Description

Permettre à l'Admin Delta d'archiver un client actif. L'archivage rend le client inactif et le déplace dans la vue "Clients archivés". Une confirmation est demandée avant l'action.

## Détails fonctionnels

- Le bouton "Archiver ce client" est accessible depuis le drawer d'édition
- Au clic, un dialog de confirmation s'affiche :
  - Titre : "Archiver le client"
  - Message : "Êtes-vous sûr de vouloir archiver le client « [nom] » ? Il ne sera plus accessible mais pourra être restauré."
  - Boutons : "Annuler" et "Archiver"
- Après confirmation :
  - Le client disparaît de la liste des actifs
  - Le client apparaît dans la vue "Clients archivés"
  - Le drawer se ferme

## Critères de done

- [ ] Bouton "Archiver ce client" présent dans le drawer
- [ ] Dialog de confirmation affiché avec le nom du client
- [ ] Client retiré de la liste active après confirmation
- [ ] Client visible dans la vue archivés

## Dépendances

- task-01-drawer-edition (feature-03)
- task-03-vue-archives (feature-01)
