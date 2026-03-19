# Intégration NIFI — Flux entrants

**Statut : 🔲 Hors périmètre UI actuel**
**Réf. client : US-Orga-020**

## Exigence client

En tant que système, Delta reçoit des flux incidents enrichis par NIFI avec le code invariant :
- Rejet si code invariant manquant + log d'erreur qualifié
- Journalisation du code invariant reçu
- Mapping code Régate → code invariant côté NIFI (hors Delta)

## Couverture actuelle

Olympe est une application React + Supabase sans layer API exposé à des systèmes externes. Aucune route d'API REST ou webhook n'est actuellement prévue pour recevoir des flux NIFI.

## Manques

Tout. C'est un besoin d'intégration système, pas une fonctionnalité UI.

## Proposition

Pour répondre à ce besoin, deux options techniques :

### Option 1 : Supabase Edge Functions
- Créer une Edge Function (`/functions/v1/nifi-intake`) exposée comme endpoint REST authentifié (API key)
- Elle valide la présence du code invariant dans la table des entités
- En cas de code manquant : log dans une table `integration_logs` avec statut "rejeté" + raison
- En cas de succès : insertion de l'incident dans la table cible + log "traité"

### Option 2 : Backend intermédiaire (Node.js / FastAPI)
- Couche API distincte si les besoins d'intégration deviennent plus complexes
- Plus flexible mais nécessite une infrastructure additionnelle

### Journalisation
Dans les deux cas, une table `integration_logs` (timestamp, source, code_invariant_reçu, statut, message_erreur) permettrait à l'Admin de consulter les flux reçus et les rejets depuis l'interface.

Note : le mapping Régate → invariant est explicitement déclaré "côté NIFI" dans le document client, donc Delta n'a pas à l'implémenter.
