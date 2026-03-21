# 7. Utilisateurs client

| API | Description | Persona | Règles |
|---|---|---|---|
| **Utilisateurs** | | | |
| `GET /clients/:clientId/users` | Lister | `admin_delta`, `integrator_*` assigné | Tous |
| `GET /clients/:clientId/users` | Lister | `client_user` | Filtrés par périmètre EO + display config module Users |
| `GET /clients/:clientId/users/:id` | Détail | Authentifié avec accès client | Champs filtrés par display config si client_user |
| `POST /clients/:clientId/users/invite` | Inviter | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/users/invite` | Inviter | `client_user` | Permission `can_invite` module Users |
| `PATCH /clients/:clientId/users/:id` | Modifier | `admin_delta`, `integrator_*` assigné | Toujours |
| `PATCH /clients/:clientId/users/:id` | Modifier | `client_user` | Permission `can_edit` + champs vérifiés contre `module_users_display_config_fields.can_edit` |
| `PATCH /clients/:clientId/users/:id/deactivate` | Désactiver (membership) | `admin_delta`, `integrator_*` assigné | Toujours |
| `PATCH /clients/:clientId/users/:id/deactivate` | Désactiver | `client_user` | Permission `can_archive` |
| `POST /clients/:clientId/users/import` | Import CSV | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/users/import` | Import CSV | `client_user` | Permission `can_import` |
| `GET /clients/:clientId/users/export` | Export CSV | `admin_delta`, `integrator_*` assigné | Toujours |
| `GET /clients/:clientId/users/export` | Export CSV | `client_user` | Permission `can_export`, colonnes filtrées, anonymisation appliquée |
| **Profils d'un utilisateur** | | | |
| `GET /clients/:clientId/users/:id/profiles` | Lister ses profils | Authentifié avec accès client | |
| `POST /clients/:clientId/users/:id/profiles` | Attribuer un profil | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/users/:id/profiles` | Attribuer | `client_user` | Permission `can_assign_profiles` |
| `DELETE /clients/:clientId/users/:id/profiles/:profileId` | Retirer | Mêmes règles | |
| **Champs custom** | | | |
| `GET /clients/:clientId/users/field-definitions` | Lister les définitions | `admin_delta`, `integrator_*` assigné | |
| `POST /clients/:clientId/users/field-definitions` | Créer | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/users/field-definitions/:id` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/users/field-definitions/:id/deactivate` | Désactiver | `admin_delta`, `integrator_*` assigné | |
| `POST /clients/:clientId/users/:id/field-values` | Sauvegarder une valeur | Authentifié | Mêmes règles que PATCH utilisateur |
| `GET /clients/:clientId/users/:id/field-values` | Lire les valeurs | Authentifié | Filtrées par display config, anonymisation |
