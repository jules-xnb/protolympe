# [5-2-1] Création d'un objet métier

## Description

Permettre à l'intégrateur de créer un nouvel objet métier via un dialog de formulaire.

## Détails fonctionnels

- Bouton "Nouvel objet métier" sur la page de liste ouvre un dialog
- Champs du formulaire :
  - **Nom** (requis, champ texte)
  - **Description** (optionnel, textarea)
- Le slug est généré automatiquement à partir du nom (minuscules, accents normalisés, caractères spéciaux remplacés par des underscores)
- Le client_id est automatiquement associé au client sélectionné
- À la soumission : création en base, fermeture du dialog, rafraîchissement de la liste

## Critères de done

- [ ] Dialog de création accessible depuis le bouton dans le header
- [ ] Champ nom requis avec validation
- [ ] Slug auto-généré à partir du nom
- [ ] Client_id associé automatiquement
- [ ] Fermeture du dialog et rafraîchissement après création

## Dépendances

- 5-1-1
