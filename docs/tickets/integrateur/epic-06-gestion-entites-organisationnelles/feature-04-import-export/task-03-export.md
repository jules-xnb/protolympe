# [6-4-3] Export des entités et des champs

## Description

Permettre l'export CSV des entités organisationnelles (avec leurs champs personnalisés) et de la configuration des champs.

## Détails fonctionnels

- **Export des entités** :
  - Accessible depuis le menu "Import/Export" de la page de liste
  - Fichier CSV contenant : code, nom, parent, niveau, statut + une colonne par champ personnalisé
  - Toutes les entités actives et inactives sont incluses
- **Export de la configuration des champs** :
  - Accessible depuis le menu "Import/Export" de la page de structure
  - Fichier CSV contenant la définition de chaque champ (nom, type, requis, unique, description…)
- **Export de l'historique** :
  - Accessible depuis la page d'historique via le bouton "Exporter CSV"
  - Fichier CSV avec : Date, Entité, Action, Avant, Après, Par
- **Export d'une entité individuelle** :
  - Accessible depuis le drawer de détail (bouton d'export dans le header)
  - Fichier CSV contenant les données de l'entité sélectionnée

## Critères de done

- [ ] Export CSV des entités avec champs personnalisés
- [ ] Export CSV de la configuration des champs
- [ ] Export CSV de l'historique
- [ ] Export individuel depuis le drawer
- [ ] Tous les exports téléchargent un fichier correctement formaté

## Dépendances

- 6-1-1
- 6-3-1
