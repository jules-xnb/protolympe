# [6-8-1] Nouveau type de champ "coordonnées"

## Référence Figma

À définir

## Description

Ajouter un nouveau type de champ `coordinates` pour les EO, qui stocke une paire latitude/longitude. Ce champ est alimenté automatiquement par géocodage à partir d'un champ calculé représentant l'adresse complète.

## Détails fonctionnels

### Type de champ
- Nouveau type `coordinates` ajouté à l'enum `field_type` (DB + TypeScript)
- Valeur stockée : objet JSON `{ lat: number, lng: number }` dans `eo_field_values.value`
- Icône : `MapPin` (lucide-react)
- Groupe : "Avancé"

### Configuration intégrateur
- Dans le formulaire de création de champ EO, le type "Coordonnées" apparaît dans le groupe "Avancé"
- Un champ de configuration obligatoire : **"Champ adresse source"** — sélecteur parmi les champs calculés de l'EO (type `calculated`). C'est le champ dont la valeur sera envoyée au service de géocodage
- Le champ coordonnées est en lecture seule pour l'utilisateur final (alimenté uniquement par le géocodage)

### Affichage utilisateur final
- Dans le drawer de détail / fiche EO : affichage "48.8566, 2.3522" (lat, lng formatés)
- Le champ n'est pas éditable manuellement

## Critères de done

- [ ] Type `coordinates` ajouté à l'enum DB et aux types TypeScript
- [ ] Le type apparaît dans le sélecteur de types du formulaire champ EO
- [ ] Configuration "champ adresse source" fonctionnelle
- [ ] Valeur JSON `{ lat, lng }` stockée correctement dans `eo_field_values`
- [ ] Affichage lecture seule dans le drawer EO

## Dépendances

- Le mécanisme de champs calculés doit être opérationnel (existant)
