# [6-8-0] Carte géolocalisée des entités organisationnelles

## Description

Permettre d'afficher les entités organisationnelles sur une carte interactive à partir de leurs coordonnées géographiques. L'adresse est composée via un champ calculé existant (concaténation de champs rue, code postal, ville, pays). Les coordonnées (latitude/longitude) sont obtenues automatiquement par géocodage côté serveur (Nominatim/OpenStreetMap) et stockées dans un nouveau type de champ "coordonnées". Un trigger Postgres détecte les changements sur les champs composant l'adresse pour recalculer automatiquement les coordonnées via une edge function.

Côté intégrateur : configuration du champ coordonnées et du bloc carte dans le page builder.
Côté utilisateur final : consultation de la carte avec filtres, clustering des pins, et ouverture du drawer de détail au clic.
