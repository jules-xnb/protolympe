# 6. Profils client

| API | Description | Persona | Règles |
|---|---|---|---|
| **Profils** | | | |
| `GET /clients/:clientId/profiles` | Lister | `admin_delta`, `integrator_*` assigné | Tous |
| `GET /clients/:clientId/profiles` | Lister | `client_user` | Filtrés par display config module Profils |
| `GET /clients/:clientId/profiles/:id` | Détail | Authentifié avec accès client | |
| `POST /clients/:clientId/profiles` | Créer / dupliquer | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/profiles` | Créer / dupliquer | `client_user` | Permission `can_create` module Profils |
| `PATCH /clients/:clientId/profiles/:id` | Modifier (nom, description, rôles, entités) | `admin_delta`, `integrator_*` assigné | Toujours |
| `PATCH /clients/:clientId/profiles/:id` | Modifier | `client_user` | Permission `can_edit` + champs vérifiés contre `module_profils_display_config_fields.can_edit` |
| `PATCH /clients/:clientId/profiles/:id/archive` | Archiver | `admin_delta`, `integrator_*` assigné | Toujours |
| `PATCH /clients/:clientId/profiles/:id/archive` | Archiver | `client_user` | Permission `can_archive` |
| `POST /clients/:clientId/profiles/import` | Import CSV | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/profiles/import` | Import CSV | `client_user` | Permission `can_import` |
| `GET /clients/:clientId/profiles/export` | Export CSV | `admin_delta`, `integrator_*` assigné | Toujours |
| `GET /clients/:clientId/profiles/export` | Export CSV | `client_user` | Permission `can_export`, colonnes filtrées par display config |
| **Entités du profil** | | | |
| `GET /clients/:clientId/profiles/:id/eos` | Lister les entités | Authentifié avec accès client | |
| `POST /clients/:clientId/profiles/:id/eos` | Ajouter une entité | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/profiles/:id/eos` | Ajouter une entité | `client_user` | Permission `can_edit` |
| `DELETE /clients/:clientId/profiles/:id/eos/:eoId` | Retirer | Mêmes règles | |
| **Groupes du profil** | | | |
| `GET /clients/:clientId/profiles/:id/eo-groups` | Lister | Authentifié avec accès client | |
| `POST /clients/:clientId/profiles/:id/eo-groups` | Ajouter | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/profiles/:id/eo-groups` | Ajouter | `client_user` | Permission `can_edit` |
| `DELETE /clients/:clientId/profiles/:id/eo-groups/:groupId` | Retirer | Mêmes règles | |
| **Rôles modules du profil** | | | |
| `GET /clients/:clientId/profiles/:id/module-roles` | Lister | Authentifié avec accès client | |
| `POST /clients/:clientId/profiles/:id/module-roles` | Ajouter un rôle | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/profiles/:id/module-roles` | Ajouter un rôle | `client_user` | Permission `can_edit` |
| `DELETE /clients/:clientId/profiles/:id/module-roles/:roleId` | Retirer | Mêmes règles | |
| **Profil actif (FO)** | | | |
| `GET /auth/me/profiles` | Mes profils (sélection avant FO) | `client_user` | Ses profils non archivés |
