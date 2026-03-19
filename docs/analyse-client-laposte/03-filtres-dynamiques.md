# Filtres dynamiques et recherche

**Statut : ✅ Couvert**
**Réf. client : US-Orga-002, US-Orga-101, US-Orga-201, US-Orga-202**

## Exigence client

Filtres sur :
- Nom (texte libre)
- Code invariant
- N° Direction Financière (DF)
- Statut (Ouvert/Fermé)
- Pays

Tri ascendant/descendant sur colonnes de la vue liste.

## Couverture actuelle

Le composant DynamicFilters est déjà implémenté avec :
- Filtres par type : texte (Contient/Égal/Différent/Commence par), nombre (=/≠/>/</ ≥/≤), booléen (Est), date (Égal/Différent/Après/Avant/À partir de/Jusqu'à)
- Logique ET/OU configurable entre règles
- Chips de filtres actifs avec suppression individuelle
- Compteur "X entité(s) sur Y"
- Filtres sur tous les champs personnalisés actifs

## Manques

- **Filtres sur les champs spécifiques client** (code invariant, DF, Pays, Statut) : couverts dès que ces champs sont configurés comme champs de l'entité (système ou personnalisé)
- **Tri sur colonnes** : à confirmer que la vue Liste intègre un tri par clic sur en-tête de colonne
