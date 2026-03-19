# [2-4-2] Restaurer un client archivé

## Référence Figma

- [home-clients-archive](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=89-4271)

## Description

Permettre à l'Admin Delta de restaurer un client archivé pour le remettre en statut actif, directement depuis la vue "Clients archivés".

## Détails fonctionnels

- Dans la vue "Clients archivés", chaque ligne affiche uniquement le bouton "Restaurer"
- Au clic sur "Restaurer" :
  - Aucune confirmation demandée (action réversible)
  - Le client repasse en statut actif
  - Il disparaît de la vue archivés
  - Il réapparaît dans la liste des clients actifs

## Critères de done

- [ ] Bouton "Restaurer" présent sur chaque ligne dans la vue archivés
- [ ] Client restauré et retiré de la vue archivés
- [ ] Client réapparu dans la liste des actifs

## Dépendances

- task-03-vue-archives (feature-01)
