# Historique des modifications (traçabilité)

**Statut : ✅ Couvert**
**Réf. client : US-Orga-011 (partiel), exigence non fonctionnelle Traçabilité**

## Exigence client

Historiser les créations, modifications et fermetures en précisant qui, quand, et quoi. Permettre l'auditabilité et la conformité des données. Inclure un export de contrôle avec historique des exports (date, auteur).

## Couverture actuelle

La feature [7-3-0] implémente :
- Timeline chronologique des événements : création, modifications (ancienne/nouvelle valeur), archivage, restauration
- Chaque événement affiche : date, auteur, type d'action, champs modifiés
- Consultation du snapshot complet d'une version
- Restauration vers une version antérieure

## Manques

- **Export de l'historique** : le client demande un export Excel listant les anomalies par type avec bouton sur la vue Liste et historique des exports (date, auteur). La feature actuelle ne prévoit pas d'export de l'historique lui-même.
- **Historique des exports** : pas prévu — à ajouter si la DAG a besoin de savoir qui a exporté quoi et quand.


