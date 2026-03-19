# [3-1-1] Tableau des intégrateurs

## Référence Figma

- [home-intégrateurs](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=19-1203)

## Description

Afficher la liste des intégrateurs dans un tableau avec leurs informations principales et les actions disponibles.

## Détails fonctionnels

- Colonnes du tableau :
  - **Intégrateurs** : nom complet (cliquable, ouvre le drawer) + email en sous-titre
  - **Créé le** : date de création au format "dd/MM/yy"
  - **Nb clients** : nombre de clients assignés, affiché "Tous" pour les Admin Delta
  - **Rôle** : badge "Admin Delta" ou "Intégrateur"
  - **Actions** : bouton "Modifier" (ouvre le drawer)
- Clic sur le nom ou bouton "Modifier" ouvre le drawer de détails
- Barre de recherche avec placeholder "Rechercher un intégrateur..."
- Loading state pendant le chargement

## Critères de done

- [ ] Tableau affiché avec les 5 colonnes
- [ ] Clic sur le nom ouvre le drawer
- [ ] Badge de rôle correct (Admin Delta vs Intégrateur)
- [ ] Compteur de clients correct ("Tous" pour Admin Delta)
- [ ] État de chargement visible

## Dépendances

- Aucune
