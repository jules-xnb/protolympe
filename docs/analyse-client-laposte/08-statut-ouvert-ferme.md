# Statut Ouvert / Fermé + commentaire de fermeture

**Statut : ⚠️ Partiel**
**Réf. client : ORG-CO-007, ORG-CO-103, US-Orga-003**

## Exigence client

- Deux statuts pour une entité : **Ouvert** / **Fermé**
- Les entités fermées sont masquées par défaut (toggle d'affichage)
- Lors du passage à "Fermé" : saisie obligatoire d'un **commentaire de fermeture** (texte ≤ 500 chars) pour traçabilité
- Dates d'effet / fin (AAAAMMJJ) avec contrainte : date d'effet ≤ date de fin si renseignée

## Couverture actuelle

Olympe utilise Actif / Archivé (`is_active`) — même sémantique, terminologie différente. Le mécanisme d'archivage existe déjà.

## Manques

1. **Terminologie** : renommer "Actif/Archivé" en "Ouvert/Fermé" dans l'UI (ou ajouter un champ statut enum distinct de `is_active`)
2. **Commentaire de fermeture** : à afficher dans le dialog de confirmation d'archivage — champ texte obligatoire saisi au moment du changement de statut, stocké sur l'entité
3. **Dates d'effet / fin** : champs système à ajouter sur le formulaire entité, avec validation `date_effet ≤ date_fin`. Ces champs ne sont pas des champs personnalisés car ils ont une sémantique métier forte (cohérence statut/dates, historisation)
4. **Cohérence statut/dates** : règle à implémenter — si date de fin est passée et statut Ouvert, signaler une anomalie (voir [15-detection-anomalies.md])

## Proposition

- Ajouter dans le formulaire entité : champ `statut` (enum Ouvert/Fermé), `date_effet` (date), `date_fin` (date optionnelle)
- Dans le dialog de confirmation de fermeture : ajouter un textarea "Commentaire de fermeture" (obligatoire) avant de valider
- Stocker le commentaire dans l'historique des modifications (événement "Fermeture")
