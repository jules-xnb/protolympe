# PRD Backend — Fonctions métier & Sécurité

Ce document définit toutes les APIs backend de Delta RM avec leurs règles de sécurité. Aucun code ne doit être écrit sans ce PRD validé.

---

## Architecture de sécurité

### Authentification
- JWT access token : **15 minutes** (HS256, contient sub/email/persona)
- Refresh token : **7 jours**, stocké en base, rotation à chaque usage, révocable
- Secret JWT **obligatoire** en env var, crash au démarrage si absent
- Pas de signup public — comptes créés par invitation uniquement
- SSO par client (OIDC) — chaque client peut avoir son propre provider
- Fallback email/mot de passe si pas de SSO configuré

### Middlewares
- **Auth middleware** : vérifie le JWT, injecte le user (sub, email, persona)
- **Persona middleware** : vérifie le persona depuis le JWT (pas de requête DB)
- **Client middleware** : vérifie l'accès au client via cache (TTL 1min)
- **Module middleware** : vérifie le rôle + permission dans le module via cache
- **Périmètre middleware** : filtre les EO accessibles via cache

### Cache permissions (TTL 1min)
À la première requête d'un utilisateur, on charge en cache :
- Ses client_ids (via `user_client_memberships` ou `integrator_client_assignments`)
- Ses module_roles par client (via `client_profiles` → `client_profile_module_roles`)
- Ses permissions par module (via `module_permissions`)
- Son périmètre EO par client (via `client_profile_eos` + `client_profile_eo_groups`, avec résolution des descendants)

### Règle générale
- Aucune suppression physique — toujours archiver/désactiver
- Validation des entrées systématique (Zod)
- Chaque modification de champ est vérifiée contre les display_config_fields du rôle

---

## 1. Auth

| API | Description | Auth requise | Règles |
|---|---|---|---|
| `POST /auth/signin` | Connexion email + mot de passe | Non | Retourne access token (15min) + refresh token (7j) |
| `GET /auth/sso/:clientId` | Redirige vers le provider SSO du client | Non | Lit la config SSO du client |
| `GET /auth/sso/callback` | Callback SSO — crée ou récupère le compte | Non | Retourne les tokens |
| `POST /auth/refresh` | Renouveler le token | Non (refresh token requis) | Rotation : ancien invalidé, nouveau généré |
| `POST /auth/signout` | Déconnexion | Oui | Supprime le refresh token en base |
| `PATCH /auth/password` | Changer son mot de passe | Oui | Vérifie l'ancien mot de passe |
| `POST /auth/forgot-password` | Demande de reset mot de passe | Non | Envoie un email avec token de reset |
| `POST /auth/reset-password` | Reset avec token | Non | Token à usage unique, expire après X minutes |
| `GET /auth/me` | Infos de l'utilisateur connecté (persona, clients accessibles) | Oui | |
| `GET /auth/sso/:clientId/check` | Vérifie si le SSO est configuré pour un client | Non | Endpoint public, retourne juste { enabled, provider } |

### Tables associées
- `refresh_tokens` — stocke les refresh tokens hashés, avec expiration
- `password_reset_tokens` — tokens de reset à usage unique
- `client_sso_configs` — config SSO par client (provider, issuer URL, client_id OIDC, client_secret)

---

## 2. Clients

| API | Description | Persona | Règles |
|---|---|---|---|
| `GET /clients` | Lister les clients | `admin_delta` | Tous les clients |
| `GET /clients` | Lister les clients | `integrator_*` | Uniquement ses clients assignés |
| `GET /clients/:id` | Détail d'un client | `admin_delta`, `integrator_*` | Vérifie accès au client |
| `POST /clients` | Créer un client | `admin_delta` | |
| `PATCH /clients/:id` | Modifier un client | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:id/deactivate` | Désactiver un client | `admin_delta` | |
| `GET /clients/:id/integrators` | Lister les intégrateurs assignés à ce client | `admin_delta` | |
| `GET /clients/:id/sso` | Voir la config SSO du client | `admin_delta`, `integrator_*` assigné | |
| `PUT /clients/:id/sso` | Configurer le SSO du client | `admin_delta` | |
| `DELETE /clients/:id/sso` | Supprimer la config SSO | `admin_delta` | |

---

## 3. Intégrateurs

| API | Description | Persona | Règles |
|---|---|---|---|
| `GET /integrators` | Lister tous les intégrateurs | `admin_delta` | |
| `POST /integrators/invite` | Inviter un intégrateur (crée le compte + assigne persona) | `admin_delta` | |
| `PATCH /integrators/:id` | Modifier (persona, infos) | `admin_delta` | |
| `GET /integrators/:id/clients` | Lister ses clients assignés | `admin_delta` | |
| `POST /integrators/:id/clients` | Assigner à un client | `admin_delta` | |
| `DELETE /integrators/:id/clients/:clientId` | Retirer l'assignation | `admin_delta` | |

---

## 4. Modules (activation, rôles, permissions)

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
| `PATCH /modules/:moduleId/roles/:id/deactivate` | Désactiver un rôle | `admin_delta`, `integrator_*` assigné | |
| **Permissions** | | | |
| `GET /modules/:moduleId/permissions` | Lister les permissions (avec état par rôle) | `admin_delta`, `integrator_*` assigné | |
| `PUT /modules/:moduleId/permissions` | Mettre à jour les permissions (batch) | `admin_delta`, `integrator_*` assigné | |
---

## 5. Entités organisationnelles

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

---

## 6. Profils client

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

---

## 7. Utilisateurs client

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
| `GET /clients/:clientId/user-fields` | Lister les définitions | `admin_delta`, `integrator_*` assigné | |
| `POST /clients/:clientId/user-fields` | Créer | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/user-fields/:id` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/user-fields/:id/deactivate` | Désactiver | `admin_delta`, `integrator_*` assigné | |
| `POST /clients/:clientId/users/:id/field-values` | Sauvegarder une valeur | Authentifié | Mêmes règles que PATCH utilisateur |
| `GET /clients/:clientId/users/:id/field-values` | Lire les valeurs | Authentifié | Filtrées par display config, anonymisation |

---

## 8. Listes

| API | Description | Persona | Règles |
|---|---|---|---|
| **Listes** | | | |
| `GET /clients/:clientId/lists` | Lister | `admin_delta`, `integrator_*` assigné | |
| `GET /clients/:clientId/lists/:id` | Détail (avec valeurs) | `admin_delta`, `integrator_*` assigné | |
| `POST /clients/:clientId/lists` | Créer | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id/archive` | Archiver | `admin_delta`, `integrator_*` assigné | Vérifie qu'aucun champ actif ne l'utilise |
| **Valeurs** | | | |
| `GET /clients/:clientId/lists/:id/values` | Lister les valeurs | Authentifié avec accès client | Les client_user en ont besoin pour les formulaires |
| `POST /clients/:clientId/lists/:id/values` | Ajouter | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id/values/:valueId` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id/values/:valueId/deactivate` | Désactiver | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id/values/reorder` | Réordonner | `admin_delta`, `integrator_*` assigné | |

---

## 9. Design & Traductions

| API | Description | Persona | Règles |
|---|---|---|---|
| `GET /clients/:clientId/design` | Lire la config design | Authentifié avec accès client | |
| `PUT /clients/:clientId/design` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `GET /clients/:clientId/translations` | Lire les traductions | Authentifié avec accès client | |
| `PUT /clients/:clientId/translations` | Mettre à jour (batch par scope/langue) | `admin_delta`, `integrator_*` assigné | |

---

## 10. Module Collecte de Valeur — Configuration

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

---

## 11. Module Collecte de Valeur — Exécution

| API | Description | Persona | Règles |
|---|---|---|---|
| **Campagnes** | | | |
| `GET /modules/:moduleId/cv/campaigns` | Lister | `admin_delta`, `integrator_*` assigné | Toutes |
| `GET /modules/:moduleId/cv/campaigns` | Lister | `client_user` | `can_manage_campaign` : toutes dans son périmètre. Sinon : uniquement celles où il est contributeur/validateur |
| `GET /modules/:moduleId/cv/campaigns/:id` | Détail | Authentifié avec accès module | |
| `POST /modules/:moduleId/cv/campaigns` | Lancer une campagne | `client_user` | Permission `can_manage_campaign`. Côté FO. Choisit type, année, campagne N-1 |
| `PATCH /modules/:moduleId/cv/campaigns/:id` | Modifier (nom, dates, statut) | `client_user` | Permission `can_manage_campaign` |
| `PATCH /modules/:moduleId/cv/campaigns/:id/close` | Clôturer | `client_user` | Permission `can_manage_campaign` |
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

---

## 12. Display configs (par module)

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
