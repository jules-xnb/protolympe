# [3-3-2] Gestion des clients associés à un intégrateur

## Référence Figma

- [home-intégrateurs-drawer](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=87-2544)

## Description

Dans le drawer de détails d'un intégrateur, permettre à l'Admin Delta de consulter, ajouter et retirer les clients associés à cet intégrateur.

## Détails fonctionnels

- Section "Clients associés (n)" dans le drawer :
  - Liste des clients avec : nom du client + date d'association
  - Bouton de suppression (icône corbeille) pour désassocier un client
  - Bouton "Associer un client" si des clients non encore assignés existent
  - État vide : "Aucun client associé"
- Dialog d'association :
  - Barre de recherche pour filtrer les clients disponibles
  - Liste des clients non encore associés à cet intégrateur
  - Sélection par clic sur le nom du client
  - Fermeture automatique après sélection

## Critères de done

- [ ] Section clients associés visible dans le drawer
- [ ] Compteur de clients mis à jour
- [ ] Association d'un client fonctionnelle
- [ ] Désassociation d'un client fonctionnelle
- [ ] Dialog de recherche de clients fonctionnel
- [ ] Bouton "Associer un client" masqué si tous les clients sont déjà assignés

## Dépendances

- task-01-drawer-details
