# [4-1-1] Affichage du profil utilisateur

## Référence Figma

- [home-paramètres](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=90-4706)

## Description

Implémenter la page Paramètres affichant les informations personnelles de l'utilisateur connecté en mode lecture seule.

## Détails fonctionnels

- Page accessible depuis la navigation
- Titre : "Paramètres"
- Section "Informations personnelles" avec les champs suivants (tous en lecture seule) :
  - **Nom**
  - **Prénom**
  - **Adresse mail**
  - **Date de création du compte** (format "dd/MM/yyyy")
- Tous les champs sont visuellement désactivés (non éditables)

## Critères de done

- [ ] Page accessible depuis la navigation
- [ ] Les 4 informations du profil affichées
- [ ] Champs en lecture seule (non modifiables)
- [ ] Date de création formatée correctement

## Dépendances

- task-01-page-connexion (epic-01 / feature-01) — l'utilisateur doit être connecté
