# 10. Module Collecte de Valeur — Configuration

| API | Description | Persona | Règles |
|---|---|---|---|
| **Types de campagne** | | | |
| `GET /modules/:moduleId/cv/survey-types` | Lister | `admin_delta`, `integrator_*` assigné | Toujours |
| `GET /modules/:moduleId/cv/survey-types` | Lister | `client_user` | Permission `can_configure_survey_type` ou `can_manage_campaign` |
| `GET /modules/:moduleId/cv/survey-types/:id` | Détail | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/survey-types` | Créer | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `PATCH /modules/:moduleId/cv/survey-types/:id` | Modifier | Mêmes règles | |
| `PATCH /modules/:moduleId/cv/survey-types/:id/deactivate` | Désactiver | Mêmes règles | |
| **Champs du BO** | | | |
| `GET /modules/:moduleId/cv/survey-types/:typeId/fields` | Lister | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/survey-types/:typeId/fields` | Créer | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `PATCH /modules/:moduleId/cv/survey-types/:typeId/fields/:id` | Modifier | Mêmes règles | |
| `PATCH /modules/:moduleId/cv/survey-types/:typeId/fields/:id/deactivate` | Désactiver | Mêmes règles | |
| **Statuts** | | | |
| `GET /modules/:moduleId/cv/survey-types/:typeId/statuses` | Lister | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/survey-types/:typeId/statuses` | Créer | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `PATCH /modules/:moduleId/cv/survey-types/:typeId/statuses/:id` | Modifier | Mêmes règles | |
| `PATCH /modules/:moduleId/cv/survey-types/:typeId/statuses/reorder` | Réordonner | Mêmes règles | |
| **Transitions** | | | |
| `GET /modules/:moduleId/cv/survey-types/:typeId/transitions` | Lister | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/survey-types/:typeId/transitions` | Créer | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `PATCH /modules/:moduleId/cv/survey-types/:typeId/transitions/:id` | Modifier | Mêmes règles | |
| `DELETE /modules/:moduleId/cv/survey-types/:typeId/transitions/:id` | Supprimer | Mêmes règles | Suppression physique OK (config) |
| **Rôles par transition** | | | |
| `GET /modules/:moduleId/cv/survey-types/:typeId/transitions/:id/roles` | Lister | Authentifié avec accès module | |
| `PUT /modules/:moduleId/cv/survey-types/:typeId/transitions/:id/roles` | Définir (batch) | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| **Formulaires** | | | |
| `GET /modules/:moduleId/cv/survey-types/:typeId/forms` | Lister | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/survey-types/:typeId/forms` | Créer (lié à un statut) | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `PATCH /modules/:moduleId/cv/survey-types/:typeId/forms/:id` | Modifier | Mêmes règles | |
| **Champs d'un formulaire** | | | |
| `GET /modules/:moduleId/cv/forms/:formId/fields` | Lister | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/forms/:formId/fields` | Ajouter (is_required, visibility_conditions, conditional_coloring) | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `PATCH /modules/:moduleId/cv/forms/:formId/fields/:id` | Modifier | Mêmes règles | |
| `DELETE /modules/:moduleId/cv/forms/:formId/fields/:id` | Retirer | Mêmes règles | Suppression physique OK (config) |
| **Règles de validation** | | | |
| `GET /modules/:moduleId/cv/survey-types/:typeId/validation-rules` | Lister | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/survey-types/:typeId/validation-rules` | Créer | `admin_delta`, `integrator_*` assigné, ou `can_configure_survey_type` | |
| `PATCH /modules/:moduleId/cv/survey-types/:typeId/validation-rules/:id` | Modifier | Mêmes règles | |
| `DELETE /modules/:moduleId/cv/survey-types/:typeId/validation-rules/:id` | Supprimer | Mêmes règles | Suppression physique OK (config) |
