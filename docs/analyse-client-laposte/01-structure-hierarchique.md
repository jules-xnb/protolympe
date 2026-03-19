# Structure hiérarchique jusqu'à N11 niveaux

**Statut : ✅ Couvert**
**Réf. client : ORG-CO-009, US-Orga-001**

## Exigence client

Arborescence jusqu'à 11 niveaux (N1 à N11), avec parent obligatoire pour tout nœud N>1. Interdiction de dupliquer les entités dans l'arborescence.

## Couverture actuelle

Le modèle d'entités organisationnelles (epic [7-0-0]) implémente une hiérarchie parent/enfant récursive via `parent_code`. Le niveau N est déduit de la profondeur dans l'arbre. Il n'y a pas de limite arbitraire au nombre de niveaux.

## Manques

Aucun manque fonctionnel majeur. À vérifier :
- Les performances d'affichage en Tree/Canvas avec une arborescence à 11 niveaux et ~1 000 nœuds (exigence non fonctionnelle : < 2 s)
- La validation "unicité globale" d'une entité (pas de doublon) — à confirmer en base via contrainte unique sur le code invariant
