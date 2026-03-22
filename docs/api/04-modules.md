# 4. Modules (activation, rôles, permissions)

| API | Description | Persona | Règles |
|---|---|---|---|
| **Activation** | | | |
| `GET /clients/:clientId/modules` | Lister les modules d'un client | `admin_delta`, `integrator_*` assigné | Tous les modules |
| `GET /clients/:clientId/modules` | Lister les modules | `client_user` | Uniquement les modules où il a au moins un rôle via ses profils |
| `POST /clients/:clientId/modules` | Activer un module | `admin_delta`, `integrator_*` assigné | Vérifie que le module_slug existe |
| `PATCH /clients/:clientId/modules/:id` | Modifier (is_active, display_order) | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/modules/reorder` | Réordonner les modules (menu FO) | `admin_delta`, `integrator_*` assigné | |
| **Rôles** | | | |
| `GET /modules/:moduleId/roles` | Lister les rôles | `admin_delta`, `integrator_*` assigné | |
| `POST /modules/:moduleId/roles` | Créer un rôle | `admin_delta`, `integrator_*` assigné | |
| `PATCH /modules/:moduleId/roles/:id` | Modifier (nom, couleur, description) | `admin_delta`, `integrator_*` assigné | |
| `PATCH /modules/:moduleId/roles/:id/archive` | Archiver un rôle | `admin_delta`, `integrator_*` assigné | Soft delete — le rôle et ses permissions sont exclus du calcul des droits |
| **Permissions** | | | |
| `GET /modules/:moduleId/permissions` | Lister les permissions (avec état par rôle) | `admin_delta`, `integrator_*` assigné | |
| `PUT /modules/:moduleId/permissions` | Mettre à jour les permissions (batch) | `admin_delta`, `integrator_*` assigné | |
