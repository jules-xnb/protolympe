# Paramétrage des listes Branche et Métier

**Statut : ✅ Couvert**
**Réf. client : ORG-CO-005, ORG-CO-006, US-Orga-010**

## Exigence client

Listes paramétrables côté client pour les champs Branche et Métier :
- CRUD sur les valeurs
- Ordre d'affichage
- Non-suppression si la valeur est utilisée (seulement inactivation)

Administrable par l'Admin (PER-001).

## Couverture actuelle

Le système de référentiels (epic [6-0-0]) couvre exactement ce besoin :
- Création / modification / archivage des référentiels et de leurs valeurs
- Structure hiérarchique des valeurs (si besoin)
- Archivage bloqué si des enfants actifs existent

Il suffit de créer deux référentiels "Branche" et "Métier" dans l'espace client La Poste lors de l'initialisation.

## Manques

- **Inactivation si valeur utilisée** : le système actuel bloque l'archivage d'une valeur si elle a des enfants actifs, mais pas si elle est référencée dans des entités. À vérifier : y a-t-il une contrainte empêchant l'archivage d'une valeur de référentiel si elle est utilisée comme valeur d'un champ personnalisé d'entité ?
- **Pays** (ORG-CO-003) : même logique, à créer comme référentiel "Pays" (liste contrôlée)
