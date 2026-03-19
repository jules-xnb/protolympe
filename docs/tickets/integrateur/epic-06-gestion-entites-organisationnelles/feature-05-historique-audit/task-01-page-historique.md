# [6-5-1] Page d'historique des entités

## Description

Page dédiée affichant le journal d'audit de toutes les modifications sur les entités, avec filtrage par entité et export.

## Détails fonctionnels

- PageHeader avec titre "Historique" et bouton retour vers la liste des entités
- Filtre par entité : sélecteur déroulant "Toutes les entités" ou une entité spécifique
- Compteur du nombre d'actions affiché à côté du filtre
- Tableau d'audit paginé (50 lignes par page) :
  - Colonnes :
    - **Date** : date et heure de la modification
    - **Entité** : nom de l'entité (affiché uniquement en mode "toutes les entités")
    - **Action** : badge avec icône (création, modification, suppression…)
    - **Avant** : ancienne valeur (texte rouge, tronqué)
    - **Après** : nouvelle valeur (texte principal, tronqué)
    - **Par** : nom de l'utilisateur ayant effectué la modification
    - **Actions** : bouton "Voir" (snapshot) + bouton "Annuler" (revert)
- Bouton "Exporter CSV" dans le header

## Critères de done

- [ ] Tableau d'audit paginé avec toutes les colonnes
- [ ] Filtre par entité fonctionnel
- [ ] Compteur d'actions
- [ ] Boutons Voir et Annuler sur chaque ligne
- [ ] Export CSV fonctionnel
- [ ] Pagination correcte

## Dépendances

- 6-1-1
