# [6-8-2] Géocodage automatique côté serveur

## Référence Figma

N/A (backend uniquement)

## Description

Mettre en place le mécanisme de géocodage automatique : quand l'adresse d'une EO change, une edge function convertit l'adresse en coordonnées GPS via l'API Nominatim (OpenStreetMap) et met à jour le champ coordonnées.

## Détails fonctionnels

### Détection des changements
- **Trigger Postgres** sur la table `eo_field_values` (INSERT / UPDATE)
- Le trigger vérifie si le `field_definition_id` modifié correspond à un champ qui est la source d'un champ coordonnées (via le setting `source_field_id` du champ coordinates)
- Si oui, il appelle une edge function via `pg_net` (appel HTTP asynchrone)

### Edge function `geocode-address`
- Reçoit : `eo_id`, `coordinates_field_definition_id`, `address` (valeur du champ calculé source)
- Appelle l'API Nominatim : `https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1`
- Headers : `User-Agent` identifiant l'application (requis par Nominatim)
- Rate limiting : respecter la limite de 1 requête/seconde (queue ou throttle si batch)
- Résultat : extrait `lat` et `lon` du premier résultat
- Upsert dans `eo_field_values` avec la valeur `{ lat, lng }`
- Si aucun résultat trouvé : stocker `null` et logger un warning

### Gestion d'erreurs
- Timeout API : retry une fois après 2 secondes
- Adresse introuvable : valeur `null`, pas de crash
- API indisponible : log l'erreur, le champ reste inchangé

### Recalcul initial (batch)
- Quand un champ coordonnées est créé et qu'il y a déjà des EO avec des adresses, proposer un recalcul batch
- Le batch respecte le rate limit Nominatim (1 req/s) via un traitement séquentiel avec délai

## Critères de done

- [ ] Trigger Postgres créé et fonctionnel sur `eo_field_values`
- [ ] Edge function `geocode-address` déployée
- [ ] Géocodage via Nominatim opérationnel
- [ ] Rate limiting respecté (1 req/s)
- [ ] Upsert des coordonnées dans `eo_field_values`
- [ ] Gestion des erreurs (adresse introuvable, timeout, API down)
- [ ] Recalcul batch initial fonctionnel

## Dépendances

- 6-8-1 (champ coordonnées)
