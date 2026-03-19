# [6-2-1] Page de création d'une entité

## Description

Page dédiée permettant de créer une nouvelle entité organisationnelle avec ses informations de base et ses champs personnalisés.

## Détails fonctionnels

- Section **Informations générales** :
  - **Nom** (requis, minimum 2 caractères)
  - **Code** (optionnel, auto-généré si laissé vide)
  - **Entité parente** (sélecteur déroulant, optionnel — vide = entité racine)
  - **Actif** (toggle, activé par défaut)
- Section **Détails** (affichée uniquement si des champs personnalisés existent) :
  - Un champ par définition de champ personnalisé actif, avec le contrôle adapté au type :
    - Texte, texte long, nombre, date, case à cocher, liste déroulante, liste multiple, email, URL
  - Champs requis marqués d'un astérisque rouge
  - Description du champ affichée sous chaque input
- À la soumission :
  - Le slug est auto-généré à partir du nom
  - Le code est auto-généré si non renseigné
  - L'entité est créée, puis les valeurs des champs personnalisés sont enregistrées
  - Redirection vers la page de liste des entités

## Critères de done

- [ ] Formulaire avec les 4 champs de base
- [ ] Section détails avec champs personnalisés
- [ ] Validation des champs requis
- [ ] Code auto-généré si vide
- [ ] Redirection après création
- [ ] État de chargement pendant la sauvegarde

## Dépendances

- 6-1-1
