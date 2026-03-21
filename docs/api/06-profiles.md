# 6. Profils client

## Règles métier

- **Profil = template partagé** — modifier un profil impacte tous les utilisateurs qui l'ont
- **Pas de profil vide** — min 1 EO ou 1 regroupement + min 1 rôle module
- **Pas de doublons** — deux profils identiques (mêmes EOs+descendance, mêmes groupes, mêmes rôles) interdits dans un même client
- **Vérification anti-doublon** sur toutes les mutations de sous-ressources avec rollback automatique (409 Conflict)
- **Vérification profil non vide** sur toutes les suppressions de sous-ressources avec rollback automatique (400)
- Voir `docs/regles-metier-profils.md` pour le détail complet

## Endpoints

| API | Description | Persona | Règles |
|---|---|---|---|
| **Recherche et création** | | | |
| `POST /clients/:clientId/profiles/find-match` | Recherche de profils correspondant à une configuration | Authentifié avec accès client | Body: `{eos, eo_groups, module_roles}`. Retourne `{matches: [{id, name}]}`. Valide que la config n'est pas vide |
| `POST /clients/:clientId/profiles/create-full` | Création atomique profil + sous-ressources | Authentifié avec accès client | Body: `{name, description?, eos, eo_groups, module_roles}`. Vérifie doublons AVANT création. Transaction DB. 409 si doublon |
| **Profils** | | | |
| `GET /clients/:clientId/profiles` | Lister (non archivés) | `admin_delta`, `integrator_*` assigné | Tous. Paginé |
| `GET /clients/:clientId/profiles` | Lister | `client_user` | Filtrés par display config module Profils. Paginé |
| `GET /clients/:clientId/profiles/:id` | Détail (avec EOs, groupes, rôles) | Authentifié avec accès client | |
| `POST /clients/:clientId/profiles` | Créer (nom uniquement) | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/profiles` | Créer | `client_user` | Permission `can_create` module Profils |
| `PATCH /clients/:clientId/profiles/:id` | Modifier (nom, description) | `admin_delta`, `integrator_*` assigné | Toujours |
| `PATCH /clients/:clientId/profiles/:id` | Modifier | `client_user` | Permission `can_edit` + champs vérifiés contre `module_profils_display_config_fields.can_edit` |
| `PATCH /clients/:clientId/profiles/:id/archive` | Archiver | `admin_delta`, `integrator_*` assigné | Toujours |
| `PATCH /clients/:clientId/profiles/:id/archive` | Archiver | `client_user` | Permission `can_archive` |
| `POST /clients/:clientId/profiles/import` | Import CSV | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/profiles/import` | Import CSV | `client_user` | Permission `can_import` |
| `GET /clients/:clientId/profiles/export` | Export CSV | `admin_delta`, `integrator_*` assigné | Toujours |
| `GET /clients/:clientId/profiles/export` | Export CSV | `client_user` | Permission `can_export`, colonnes filtrées par display config |
| **Entités du profil** | | | |
| `GET /clients/:clientId/profiles/:id/eos` | Lister les entités | Authentifié avec accès client | Filtre `deletedAt IS NULL` |
| `POST /clients/:clientId/profiles/:id/eos` | Ajouter une entité | `admin_delta`, `integrator_*` assigné | Body: `{eo_id, include_descendants}`. Vérifie anti-doublon après ajout |
| `POST /clients/:clientId/profiles/:id/eos` | Ajouter une entité | `client_user` | Permission `can_edit`. Même vérification |
| `PATCH /clients/:clientId/profiles/:id/eos/:eoId` | Modifier include_descendants | Authentifié avec accès client | Body: `{include_descendants}`. Vérifie anti-doublon après modification |
| `DELETE /clients/:clientId/profiles/:id/eos/:eoId` | Retirer (soft delete) | Mêmes règles | Vérifie profil non vide + anti-doublon |
| **Groupes du profil** | | | |
| `GET /clients/:clientId/profiles/:id/eo-groups` | Lister | Authentifié avec accès client | Filtre `deletedAt IS NULL` |
| `POST /clients/:clientId/profiles/:id/eo-groups` | Ajouter | `admin_delta`, `integrator_*` assigné | Body: `{group_id}`. Vérifie anti-doublon |
| `POST /clients/:clientId/profiles/:id/eo-groups` | Ajouter | `client_user` | Permission `can_edit` |
| `DELETE /clients/:clientId/profiles/:id/eo-groups/:groupId` | Retirer (soft delete) | Mêmes règles | Vérifie profil non vide + anti-doublon |
| **Rôles modules du profil** | | | |
| `GET /clients/:clientId/profiles/:id/module-roles` | Lister | Authentifié avec accès client | Filtre `deletedAt IS NULL` |
| `POST /clients/:clientId/profiles/:id/module-roles` | Ajouter un rôle | `admin_delta`, `integrator_*` assigné | Body: `{module_role_id}`. Vérifie anti-doublon |
| `POST /clients/:clientId/profiles/:id/module-roles` | Ajouter un rôle | `client_user` | Permission `can_edit` |
| `DELETE /clients/:clientId/profiles/:id/module-roles/:roleId` | Retirer (soft delete) | Mêmes règles | Vérifie profil non vide + anti-doublon |
| **Utilisateurs du profil** | | | |
| `GET /clients/:clientId/profiles/:id/users` | Lister les utilisateurs ayant ce profil | Authentifié avec accès client | Filtre `deletedAt IS NULL` |
| **Profil actif (FO)** | | | |
| `GET /auth/me/profiles` | Mes profils (sélection avant FO) | `client_user` | Profils non archivés, `deletedAt IS NULL` |
