# [2-1-1] Tableau des clients

## Référence Figma

- [home-clients](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=3-4421)

## Description

Afficher la liste des clients actifs dans un tableau avec les informations essentielles et les actions disponibles par ligne.

## Détails fonctionnels

- Colonnes du tableau :
  - **Nom** : icône entreprise + nom du client + slug affiché en sous-titre
  - **Créé le** : date de création au format "dd MMM yyyy"
  - **Actions** : boutons "Modifier" et "Configurer"
- Comportement selon le rôle :
  - **Admin Delta** : accès complet (Modifier + Configurer)
  - **Intégrateur** : uniquement le bouton "Configurer" pour basculer vers le client, sans aucune autre action disponible
- État vide : message indiquant qu'aucun client n'existe
- Loading state pendant le chargement des données

## Critères de done

- [ ] Tableau affiché avec les 3 colonnes
- [ ] Icône entreprise présente sur chaque ligne
- [ ] Slug affiché en sous-titre sous le nom
- [ ] Date formatée en français
- [ ] État de chargement visible

## Dépendances

- Aucune
