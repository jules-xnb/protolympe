# [6-3-1] Page des champs des entités

## Description

Afficher les champs système et les champs personnalisés des entités dans un tableau avec les indicateurs de configuration.

## Détails fonctionnels

- PageHeader avec titre "Champs" et bouton retour vers la liste des entités
- Toolbar :
  - Bouton "Archives" → page des champs archivés
  - Menu "Import/Export" :
    - Importer (CSV) → page d'import de champs
    - Exporter (CSV) → téléchargement de la configuration des champs
  - Bouton "Ajouter un champ" → ouvre le dialog de création
- **Tableau unifié** (DataTable paginé avec recherche par nom et slug) regroupant champs système et personnalisés :
  - Les **champs système** apparaissent en haut du tableau avec un fond grisé et un badge "Système" :
    - **Nom** (type: Texte) — requis, modifiable
    - **ID** (type: Identifiant unique) — requis, unique, auto-généré, lecture seule (pas de menu d'actions)
    - **Statut actif** (type: Booléen) — modifiable, supporte les règles de commentaire
  - Les **champs personnalisés** suivent dans le même tableau
  - Colonnes :
    - **Nom** : nom + slug en sous-titre + badge "Système" si applicable
    - **Type** : badge avec icône du type
    - **Obligatoire** : badge Oui/Non
    - **Unique** : badge Oui/Non
    - **Commentaire** : icône si des règles de commentaire sont configurées
    - **Auto** : badge si l'auto-génération est activée
    - **Règles** : badge avec compteur si des règles de validation inter-champs existent
    - **Actions** : menu avec "Modifier" (tous sauf ID) et "Archiver" (champs personnalisés uniquement)

## Critères de done

- [ ] Tableau unifié avec champs système (fond grisé, badge Système) et personnalisés
- [ ] Colonnes avec badges et indicateurs corrects
- [ ] Actions Modifier et Archiver par champ
- [ ] Bouton d'ajout et menu Import/Export
- [ ] Export CSV fonctionnel

## Dépendances

- Aucune
