# [2-3-2] Gestion des intégrateurs d'un client

## Référence Figma

- [home-clients-drawer](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=87-2221)

## Description

Dans le drawer d'édition d'un client, permettre à l'Admin Delta de consulter, ajouter et retirer les intégrateurs assignés à ce client.

## Détails fonctionnels

- Section "Intégrateurs (n)" dans le drawer, affichant :
  - Liste des intégrateurs assignés au client (avatar, nom complet, email)
  - Bouton "Ajouter" pour assigner un nouvel intégrateur
  - Bouton de suppression (icône corbeille) sur chaque intégrateur pour le désassigner
- État vide : message "Aucun intégrateur assigné à ce client"
- Dialog d'ajout :
  - Liste des intégrateurs disponibles (non encore assignés au client)
  - Les admins Delta sont exclus de cette liste (accès global déjà)
  - Sélection par clic sur le nom

## Critères de done

- [ ] Section intégrateurs visible dans le drawer
- [ ] Compteur d'intégrateurs affiché dans le titre de section
- [ ] Ajout d'un intégrateur fonctionnel
- [ ] Retrait d'un intégrateur fonctionnel
- [ ] Liste se met à jour sans rechargement de page

## Dépendances

- task-01-drawer-edition
