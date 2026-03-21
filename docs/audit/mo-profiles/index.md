# Spec : Module MO — Profils (vue d'ensemble)

## Scope

Vue Module Owner (Integrateur) du module Profils.

| Sous-page | Route |
|---|---|
| Liste des profils | `/dashboard/:clientId/profiles` |
| Profils archives | `/dashboard/:clientId/profiles/archived` |

## Endpoints API (existants)

Server : `server/src/routes/profiles.ts` monte sur `/api/clients/:clientId/profiles`

| Methode | Endpoint | Description |
|---|---|---|
| GET | `/api/clients/:clientId/profiles` | Lister les profils (pagine, filtre `is_archived = false`) |
| GET | `/api/clients/:clientId/profiles/:id` | Detail d'un profil |
| POST | `/api/clients/:clientId/profiles` | Creer un profil (name, description uniquement) |
| POST | `/api/clients/:clientId/profiles/create-full` | Creation atomique (name + EOs + roles + groups) |
| PATCH | `/api/clients/:clientId/profiles/:id` | Modifier un profil (name, description) |
| PATCH | `/api/clients/:clientId/profiles/:id/archive` | Archiver un profil |
| POST | `/api/clients/:clientId/profiles/:id/eos` | Ajouter des EOs |
| DELETE | `/api/clients/:clientId/profiles/:id/eos` | Retirer des EOs |
| POST | `/api/clients/:clientId/profiles/:id/module-roles` | Ajouter des roles |
| DELETE | `/api/clients/:clientId/profiles/:id/module-roles` | Retirer des roles |
| POST | `/api/clients/:clientId/profiles/:id/eo-groups` | Ajouter des groupes |
| DELETE | `/api/clients/:clientId/profiles/:id/eo-groups` | Retirer des groupes |

Fichiers backend :
- Routes : `server/src/routes/profiles.ts`
- Anti-doublon : `server/src/lib/profile-duplicate-check.ts`
- Schema BDD : `server/src/db/schema.ts` (tables `client_profiles`, `client_profile_*`)

## Points d'attention backend

### A construire

| # | Description | Impact |
|---|---|---|
| 1 | **`_userCount` dans GET /profiles** : ajouter un `LEFT JOIN` + `COUNT` sur `client_profile_users` dans la route liste pour retourner le nombre d'utilisateurs par profil. | Le tableau et le menu contextuel en ont besoin. |
| 2 | **Route pour lister les archives** : ajouter un parametre `?is_archived=true` au `GET /profiles` ou creer `GET /profiles/archived`. Actuellement le filtre `is_archived = false` est en dur. | La page archives ne peut pas fonctionner sans. |
| 3 | **Route restauration** : creer `PATCH /:id/restore` qui set `is_archived = false`, ou accepter `{is_archived: false}` dans le schema Zod du PATCH generique. | Necessaire pour la page archives. |
| 4 | **`module_slug` dans le detail** : le `GET /:id` doit joindre `client_modules` pour retourner `module_slug` avec chaque role. | Necessaire pour grouper les roles par module dans le drawer. |
| 5 | **Anti-doublon** : la verification existe dans `POST /create-full` (409). S'assurer que `PATCH /:id` et la modification de sous-ressources la declenchent aussi. | Coherence. |
| 6 | **Modification atomique** : creer `PATCH /:id/update-full` qui accepte la mise a jour de name + EOs + roles + groups en une seule transaction. | Le front doit envoyer tout en une requete, pas des appels separes par sous-ressource. |

### Champ `is_archived` (pas `is_active`)

La BDD utilise `is_archived: boolean` (pas `is_active`). Le front doit utiliser cette semantique.

### Suppression physique interdite

Aucune route DELETE sur les profils. Seul l'archivage est autorise.

## Sous-specs

1. [01-liste-profils.md](01-liste-profils.md)
2. [02-profils-archives.md](02-profils-archives.md)
