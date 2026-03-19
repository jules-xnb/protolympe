# Design — Regroupements d'EO

**Date** : 2026-02-26
**Statut** : Validé

## Objectif

Permettre de créer des regroupements nommés d'entités organisationnelles (EO). Ces regroupements servent à :
1. Assigner un accès utilisateur à un ensemble d'EOs en une seule opération (au lieu d'assigner EO par EO)
2. À terme, cibler des campagnes de collecte sur un groupe spécifique d'EOs

Un regroupement peut contenir des EOs de branches différentes de l'arbre (sélection libre).

## Modèle de données

### `eo_groups` — Définition des regroupements

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| client_id | UUID | FK → clients, NOT NULL |
| name | TEXT | NOT NULL |
| description | TEXT | |
| created_by | UUID | FK → auth.users |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

### `eo_group_members` — Membres d'un regroupement

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| group_id | UUID | FK → eo_groups ON DELETE CASCADE, NOT NULL |
| eo_id | UUID | FK → organizational_entities ON DELETE CASCADE, NOT NULL |
| include_descendants | BOOLEAN | default true |
| UNIQUE | | (group_id, eo_id) |

### `user_profile_eo_groups` — Assignation de groupes aux profils

| Colonne | Type | Contraintes |
|---------|------|-------------|
| profile_id | UUID | FK → user_profiles ON DELETE CASCADE |
| group_id | UUID | FK → eo_groups ON DELETE CASCADE |
| PRIMARY KEY | | (profile_id, group_id) |

## Résolution des EOs d'un utilisateur

Quand on résout les EOs accessibles par un user (dans `useUserPermissions`), on fait l'**union** de :
- ses `user_profile_eos` directes (comportement existant inchangé)
- les EOs de ses groupes : `user_profile_eo_groups` → `eo_group_members` → `organizational_entities`

Pour les membres avec `include_descendants = true`, on inclut tous les descendants via le `path` (comme pour les EOs directes).

## Interface

### Emplacement

Onglet **"Regroupements"** dans la page EO existante de l'intégrateur (`/eo`), à côté de l'arbre d'EO.

### Onglet Regroupements

- Liste des groupes sous forme de cartes/lignes : nom, description, nombre d'EOs membres
- Bouton "+ Nouveau regroupement" → dialog de création (nom, description)
- Clic sur un groupe → panneau détail avec :
  - Nom / description éditables inline
  - Liste des EOs membres avec badge `include_descendants` toggle
  - Bouton "+ Ajouter des EOs" → sélecteur arbre EO (multi-sélection)
  - Suppression d'un membre par bouton ×

### Assignation aux profils utilisateurs

Dans le dialog d'édition utilisateur existant (section EO) :
- Ajouter une section "Regroupements" sous les EOs directes
- Dropdown multi-select pour choisir les groupes à assigner
- Badge avec le nombre d'EOs résolues par groupe

## Périmètre MVP

**Inclus :**
- Migration DB : tables `eo_groups`, `eo_group_members`, `user_profile_eo_groups`
- CRUD hooks : `useEoGroups`, `useEoGroupMembers`
- UI onglet Regroupements dans la page EO
- Assignation de groupes dans le dialog utilisateur
- Résolution dans `useUserPermissions` (union des EOs directes + groupes)

**Hors MVP :**
- Ciblage de campagnes sur un groupe
- Droit de gestion des groupes configurable par rôle
- Import/export de groupes
