# [3-4-1] Retirer le rôle d'un intégrateur

## Référence Figma

- [home-intégrateurs](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=19-1203)
- [home-admin-intégrateurs-snackbar](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=88-8018)

## Description

Permettre à l'Admin Delta de retirer définitivement le rôle d'intégrateur à un utilisateur, après confirmation. L'utilisateur perd son accès à la plateforme en tant qu'intégrateur.

## Détails fonctionnels

- Action accessible depuis la liste des intégrateurs (à préciser : bouton dédié ou dans le drawer)
- Dialog de confirmation :
  - Titre : "Retirer le rôle d'intégrateur"
  - Message : "Êtes-vous sûr de vouloir retirer le rôle de « [nom] » ?"
  - Boutons : "Annuler" et "Confirmer"
  - État de chargement sur le bouton de confirmation pendant l'opération
- Après confirmation :
  - L'utilisateur est retiré de la liste des intégrateurs
  - Ses assignments clients sont également supprimés

## Critères de done

- [ ] Dialog de confirmation affiché avec le nom de l'intégrateur
- [ ] Intégrateur retiré de la liste après confirmation
- [ ] État de chargement visible pendant l'opération

## Dépendances

- task-01-affichage-tableau (feature-01)
