# 11. Module Collecte de Valeur — Exécution

| API | Description | Persona | Règles |
|---|---|---|---|
| **Campagnes** | | | |
| `GET /modules/:moduleId/cv/campaigns` | Lister | `admin_delta`, `integrator_*` assigné | Toutes |
| `GET /modules/:moduleId/cv/campaigns` | Lister | `client_user` | `can_manage_campaign` : toutes dans son périmètre. Sinon : uniquement celles où il est contributeur/validateur |
| `GET /modules/:moduleId/cv/campaigns/:id` | Détail | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/campaigns` | Lancer une campagne | `client_user` | Permission `can_manage_campaign`. Côté FO. Choisit type, année, campagne N-1 |
| `PATCH /modules/:moduleId/cv/campaigns/:id` | Modifier (nom, dates, statut) | `client_user` | Permission `can_manage_campaign` |
| `PATCH /modules/:moduleId/cv/campaigns/:id/close` | Clôturer | `client_user` | Permission `can_manage_campaign` |
| `PATCH /modules/:moduleId/cv/campaigns/:id/archive` | Archiver | `client_user` | Permission `can_manage_campaign` |
| **Cibles** | | | |
| `GET /modules/:moduleId/cv/campaigns/:id/targets` | Lister les cibles | Authentifié avec accès campagne | |
| `POST /modules/:moduleId/cv/campaigns/:id/targets` | Ajouter des cibles | `client_user` | Permission `can_manage_campaign` |
| `DELETE /modules/:moduleId/cv/campaigns/:id/targets/:targetId` | Retirer une cible | `client_user` | Permission `can_manage_campaign`. Uniquement si réponse pas commencée |
| **Réponses** | | | |
| `GET /modules/:moduleId/cv/campaigns/:id/responses` | Lister | `admin_delta`, `integrator_*` assigné | Toutes |
| `GET /modules/:moduleId/cv/campaigns/:id/responses` | Lister | `client_user` | Filtrées par périmètre EO + colonnes par `module_cv_display_config_fields` |
| `GET /modules/:moduleId/cv/responses/:id` | Détail (formulaire courant) | Authentifié avec accès | Champs selon formulaire du statut courant, filtrés par `module_cv_form_display_config_fields` |
| `PATCH /modules/:moduleId/cv/responses/:id` | Sauvegarder des valeurs | `client_user` | Vérifie `can_edit` par champ dans la display config du formulaire courant |
| `POST /modules/:moduleId/cv/responses/:id/transition` | Exécuter une transition | `client_user` | Vérifie rôle autorisé (`module_cv_status_transition_roles`), valide règles et champs required |
| **Pré-remplissage** | | | |
| `GET /modules/:moduleId/cv/responses/:id/prefill` | Valeurs N-1 pour comparaison | Authentifié avec accès | Lit réponse même entité dans campagne `prefill_campaign_id` |
| **Commentaires** | | | |
| `GET /modules/:moduleId/cv/responses/:id/comments` | Lister | Authentifié avec accès | |
| `POST /modules/:moduleId/cv/responses/:id/comments` | Ajouter sur un champ | `client_user` | Vérifie que le champ est visible pour son rôle |
| **Documents** | | | |
| `GET /modules/:moduleId/cv/responses/:id/documents` | Lister | Authentifié avec accès | |
| `POST /modules/:moduleId/cv/responses/:id/documents` | Uploader | `client_user` | Vérifie `can_edit` sur le champ fichier |
| `DELETE /modules/:moduleId/cv/responses/:id/documents/:docId` | Supprimer | `client_user` | Même vérification |
| **Audit** | | | |
| `GET /modules/:moduleId/cv/responses/:id/audit` | Historique | Authentifié avec accès | |
| **Export / Import** | | | |
| `GET /modules/:moduleId/cv/campaigns/:id/export` | Exporter les réponses (CSV) | `admin_delta`, `integrator_*` assigné | Toutes les colonnes |
| `GET /modules/:moduleId/cv/campaigns/:id/export` | Exporter | `client_user` | Permission `can_manage_campaign`, colonnes filtrées par `display_config_fields.show_in_export` |
| `POST /modules/:moduleId/cv/campaigns/:id/import` | Importer des réponses (CSV) | `client_user` | Permission `can_manage_campaign`, champs vérifiés par display config |
