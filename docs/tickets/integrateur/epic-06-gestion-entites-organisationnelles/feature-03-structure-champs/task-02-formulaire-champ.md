# [6-3-2] Formulaire de création/édition d'un champ d'entité

## Description

Dialog de formulaire permettant de créer ou modifier un champ personnalisé d'entité avec les options de base.

## Détails fonctionnels

- Dialog utilisé en mode création et édition
- Champs du formulaire :
  - **Nom** (requis) — le slug est auto-généré en création
  - **Type** (requis) — sélection parmi les groupes suivants :
    - **Texte** : texte court, texte long
    - **Nombre** : nombre entier, nombre décimal
    - **Date/Heure** : date, date et heure, heure
    - **Choix** : case à cocher, booléen, liste déroulante, choix multiples
    - **Autres** : email, téléphone, URL
  - **Description** (optionnel)
  - **Longueur maximale** (conditionnel : affiché si type = texte court, texte long, email, téléphone ou URL)
  - **Référentiel** (conditionnel : affiché si type = liste déroulante ou choix multiples, obligatoire) — sélecteur avec barre de recherche (Popover + Command)
  - **Obligatoire** (toggle) — masqué pour les types case à cocher et booléen (toujours true/false)
  - **Unique** (toggle) — masqué pour les types case à cocher et booléen
  - **Valeur par défaut** (optionnel, contrôle adapté au type) :
    - Pour les listes déroulantes : picker searchable parmi les valeurs du référentiel
    - Pour les choix multiples : picker searchable avec sélection multiple + bouton "Tout effacer"
  - **Labels booléen** (conditionnel : affiché si type = booléen) : label pour Vrai et label pour Faux
  - **Formatage d'affichage** (conditionnel : affiché si type = nombre entier ou nombre décimal) — zéro-padding configurable
- En édition, le formulaire est pré-rempli avec les valeurs existantes
- Étape optionnelle "Vues" : si des vues avec des blocs d'entité existent, proposer d'ajouter le champ à une ou plusieurs vues après la création
- L'ordre d'affichage est calculé automatiquement en création (dernier + 1)

## Critères de done

- [ ] Dialog fonctionnel en mode création et édition
- [ ] Types de champs disponibles avec contrôles adaptés (groupes : Texte, Nombre, Date/Heure, Choix, Autres)
- [ ] Longueur maximale pour les champs texte
- [ ] Champs conditionnels (référentiel avec recherche, labels booléen)
- [ ] Obligatoire et Unique masqués pour checkbox/booléen
- [ ] Valeur par défaut : picker searchable pour select, sélection multiple pour multiselect
- [ ] Formatage d'affichage pour les nombres (entier et décimal)
- [ ] Slug auto-généré en création
- [ ] Étape optionnelle d'ajout aux vues
- [ ] Ordre d'affichage auto-calculé

## Dépendances

- 6-3-1
