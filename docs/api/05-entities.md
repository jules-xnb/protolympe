# 5. Entités organisationnelles

Deux contextes : le **socle** (intégrateur) et le **module Organisation** (FO, régi par permissions + display configs).

| API | Description | Persona | Règles |
|---|---|---|---|
| **Entités** | | | |
| `GET /clients/:clientId/eo` | Lister les entités | `admin_delta`, `integrator_*` assigné | Toutes les entités du client |
| `GET /clients/:clientId/eo` | Lister les entités | `client_user` | Filtrées par périmètre (profils → EO + groupes + descendants) |
| `GET /clients/:clientId/eo/:id` | Détail d'une entité | Authentifié avec accès client | Vérifie périmètre |
| `POST /clients/:clientId/eo` | Créer | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/eo` | Créer | `client_user` | Permission `can_create` module Organisation |
| `PATCH /clients/:clientId/eo/:id` | Modifier | `admin_delta`, `integrator_*` assigné | Toujours |
| `PATCH /clients/:clientId/eo/:id` | Modifier | `client_user` | Permission `can_edit` + champs vérifiés contre `module_org_display_config_fields.can_edit` |
| `PATCH /clients/:clientId/eo/:id/archive` | Archiver | `admin_delta`, `integrator_*` assigné | Toujours |
| `PATCH /clients/:clientId/eo/:id/archive` | Archiver | `client_user` | Permission `can_archive` |
| `POST /clients/:clientId/eo/import` | Import CSV | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/eo/import` | Import CSV | `client_user` | Permission `can_import` |
| `GET /clients/:clientId/eo/export` | Export CSV | `admin_delta`, `integrator_*` assigné | Toujours, crée entrée dans `eo_export_history` |
| `GET /clients/:clientId/eo/export` | Export CSV | `client_user` | Permission `can_export`, colonnes filtrées par `display_config_fields.show_in_export` |
| **Champs custom** | | | |
| `GET /clients/:clientId/eo/fields` | Lister les définitions | `admin_delta`, `integrator_*` assigné | |
| `POST /clients/:clientId/eo/fields` | Créer un champ | `admin_delta`, `integrator_*` assigné | Toujours |
| `POST /clients/:clientId/eo/fields` | Créer un champ | `client_user` | Permission `can_manage_fields` module Organisation |
| `PATCH /clients/:clientId/eo/fields/:id` | Modifier | Mêmes règles que création | |
| `PATCH /clients/:clientId/eo/fields/:id/deactivate` | Désactiver | Mêmes règles | |
| `POST /clients/:clientId/eo/:id/values` | Sauvegarder une valeur | Authentifié | Mêmes règles que PATCH entité |
| `GET /clients/:clientId/eo/:id/values` | Lire les valeurs | Authentifié | Filtrées par display config si client_user |
| **Groupes** | | | |
| `GET /clients/:clientId/eo/groups` | Lister | `admin_delta`, `integrator_*` assigné | Toujours |
| `GET /clients/:clientId/eo/groups` | Lister | `client_user` | Permission `can_manage_fields` module Organisation |
| `POST /clients/:clientId/eo/groups` | Créer | Mêmes règles | |
| `PATCH /clients/:clientId/eo/groups/:id` | Modifier | Mêmes règles | |
| `PATCH /clients/:clientId/eo/groups/:id/deactivate` | Désactiver | Mêmes règles | |
| `GET /clients/:clientId/eo/groups/:id/members` | Lister les membres | Mêmes règles | |
| `POST /clients/:clientId/eo/groups/:id/members` | Ajouter un membre | Mêmes règles | |
| `DELETE /clients/:clientId/eo/groups/:id/members/:memberId` | Retirer un membre | Mêmes règles | |
| **Audit & Commentaires** | | | |
| `GET /clients/:clientId/eo/:id/audit` | Historique | Authentifié avec accès | |
| `GET /clients/:clientId/eo/:id/comments` | Commentaires | Authentifié avec accès | |
| `POST /clients/:clientId/eo/:id/comments` | Ajouter un commentaire | Authentifié | Obligatoire si `comment_on_change = required` |
