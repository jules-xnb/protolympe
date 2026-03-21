# 12. Display configs (par module)

Pattern identique pour tous les modules. L'intégrateur crée des configs d'affichage, y associe des rôles, et définit les champs.

| API | Description | Persona | Règles |
|---|---|---|---|
| **Organisation** | | | |
| `GET /modules/:moduleId/org/display-configs` | Lister | `admin_delta`, `integrator_*` assigné | |
| `POST /modules/:moduleId/org/display-configs` | Créer | `admin_delta`, `integrator_*` assigné | |
| `PATCH /modules/:moduleId/org/display-configs/:id` | Modifier (nom, mode par défaut, filtres, pré-filtres) | `admin_delta`, `integrator_*` assigné | |
| `DELETE /modules/:moduleId/org/display-configs/:id` | Supprimer | `admin_delta`, `integrator_*` assigné | |
| `PUT /modules/:moduleId/org/display-configs/:id/roles` | Définir les rôles (batch) | `admin_delta`, `integrator_*` assigné | |
| `PUT /modules/:moduleId/org/display-configs/:id/fields` | Définir les champs (batch) | `admin_delta`, `integrator_*` assigné | |
| **Users** | | | |
| `GET /modules/:moduleId/users/display-configs` | Lister | `admin_delta`, `integrator_*` assigné | |
| `POST /modules/:moduleId/users/display-configs` | Créer | `admin_delta`, `integrator_*` assigné | |
| `PATCH /modules/:moduleId/users/display-configs/:id` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `DELETE /modules/:moduleId/users/display-configs/:id` | Supprimer | `admin_delta`, `integrator_*` assigné | |
| `PUT /modules/:moduleId/users/display-configs/:id/roles` | Définir les rôles | `admin_delta`, `integrator_*` assigné | |
| `PUT /modules/:moduleId/users/display-configs/:id/fields` | Définir les champs (+ is_anonymized) | `admin_delta`, `integrator_*` assigné | |
| **Profils** | | | |
| `GET /modules/:moduleId/profils/display-configs` | Lister | `admin_delta`, `integrator_*` assigné | |
| `POST /modules/:moduleId/profils/display-configs` | Créer | `admin_delta`, `integrator_*` assigné | |
| `PATCH /modules/:moduleId/profils/display-configs/:id` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `DELETE /modules/:moduleId/profils/display-configs/:id` | Supprimer | `admin_delta`, `integrator_*` assigné | |
| `PUT /modules/:moduleId/profils/display-configs/:id/roles` | Définir les rôles | `admin_delta`, `integrator_*` assigné | |
| `PUT /modules/:moduleId/profils/display-configs/:id/fields` | Définir les champs | `admin_delta`, `integrator_*` assigné | |
| **CV — Formulaires** | | | |
| `GET /modules/:moduleId/cv/forms/:formId/display-configs` | Lister | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `POST /modules/:moduleId/cv/forms/:formId/display-configs` | Créer | Mêmes règles | |
| `PATCH /modules/:moduleId/cv/forms/:formId/display-configs/:id` | Modifier | Mêmes règles | |
| `DELETE /modules/:moduleId/cv/forms/:formId/display-configs/:id` | Supprimer | Mêmes règles | |
| `PUT /modules/:moduleId/cv/forms/:formId/display-configs/:id/roles` | Définir les rôles | Mêmes règles | |
| `PUT /modules/:moduleId/cv/forms/:formId/display-configs/:id/fields` | Définir les champs (can_view, can_edit, display_order) | Mêmes règles | |
| **CV — Listing** | | | |
| `GET /modules/:moduleId/cv/display-configs` | Lister | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `POST /modules/:moduleId/cv/display-configs` | Créer | Mêmes règles | |
| `PATCH /modules/:moduleId/cv/display-configs/:id` | Modifier (filtres, pré-filtres) | Mêmes règles | |
| `DELETE /modules/:moduleId/cv/display-configs/:id` | Supprimer | Mêmes règles | |
| `PUT /modules/:moduleId/cv/display-configs/:id/roles` | Définir les rôles | Mêmes règles | |
| `PUT /modules/:moduleId/cv/display-configs/:id/fields` | Définir les champs (show_in_table, show_in_export, display_order) | Mêmes règles | |
