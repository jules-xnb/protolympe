# Règle : interdit d'avoir un enfant ouvert sous un parent fermé

**Statut : ❌ Manquant**
**Réf. client : ORG-CO-009, US-Orga-001, US-Orga-104**

## Exigence client

Règle de cohérence hiérarchique bloquante : **impossible de fermer un parent qui a des enfants ouverts**. Inversement, impossible de créer ou rouvrir un enfant sous un parent fermé.

## Couverture actuelle

Pour les valeurs de référentiels, l'archivage est bloqué si la valeur a des enfants actifs (implémenté dans ReferentialValuesDrawer). Mais cette règle n'est pas encore documentée ni implémentée pour les entités organisationnelles.

## Manques

1. **Validation à la fermeture** : avant de passer une entité à "Fermé", vérifier qu'aucun de ses enfants directs ou descendants n'est "Ouvert". Si c'est le cas : message d'erreur bloquant
2. **Validation à la création/réouverture** : lors de la création d'une entité enfant ou de la réouverture d'une entité, vérifier que le parent est "Ouvert"
3. **Signalement en anomalie** : si des données importées violent cette règle (enfant ouvert sous parent fermé), les signaler dans le rapport d'anomalies (voir [15-detection-anomalies.md])

## Proposition

- Côté backend : requête Supabase vérifiant l'existence de descendants ouverts avant d'autoriser la fermeture
- Côté UI : message d'erreur explicite dans le dialog de fermeture : "Impossible de fermer cette entité car elle a N entités enfants ouvertes"
- À la création d'une entité : griser les entités fermées dans le sélecteur de parent ou afficher un warning si un parent fermé est sélectionné
