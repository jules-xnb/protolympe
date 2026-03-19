# [2-5-1] Accéder à la configuration d'un client

## Référence Figma

- [home-clients](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=3-4421)

## Description

Permettre à l'Admin Delta et à l'intégrateur de basculer dans le mode Intégrateur au sein du contexte d'un client spécifique, afin d'accéder à son espace de configuration complet.

## Détails fonctionnels

- Bouton "Configurer" présent sur chaque ligne de client actif dans le tableau
- Au clic :
  - Le contexte applicatif bascule vers le mode Intégrateur pour le client sélectionné
  - L'utilisateur est redirigé vers `/dashboard` (accueil de l'espace intégrateur du client)
- Le bouton "Configurer" n'est pas affiché dans la vue "Clients archivés"

## Critères de done

- [ ] Bouton "Configurer" présent sur chaque ligne client active
- [ ] Bascule vers le mode Intégrateur fonctionnelle
- [ ] Redirection vers le dashboard intégrateur du client
- [ ] Bouton absent sur les clients archivés

## Dépendances

- task-01-affichage-tableau (feature-01)
