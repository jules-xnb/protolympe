# [5-2-2] Édition d'un objet métier

## Description

Permettre à l'intégrateur de modifier le nom et la description d'un objet métier existant depuis la page de détail.

## Détails fonctionnels

- Accessible depuis le menu déroulant (⋮) de la page de détail → "Modifier"
- Le dialog s'ouvre pré-rempli avec les données existantes
- Le slug n'est pas modifiable en mode édition
- À la soumission : mise à jour en base, fermeture du dialog, rafraîchissement des données

## Critères de done

- [ ] Accès via le menu déroulant de la page de détail
- [ ] Formulaire pré-rempli avec les valeurs existantes
- [ ] Slug en lecture seule
- [ ] Mise à jour et rafraîchissement après sauvegarde

## Dépendances

- 5-3-1
