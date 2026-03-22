# Architecture Base de Données — Delta RM

Ce document décrit l'intégralité du modèle de données de la plateforme Delta RM. Chaque table est présentée avec sa description fonctionnelle et le détail de chaque colonne.

---

## 1. Socle — Utilisateurs & Accès

### accounts

**Compte de connexion.** Toute personne qui se connecte à Delta RM possède un compte. Le type d'utilisateur est défini par le champ persona.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| email | text | NON | — | Adresse e-mail de connexion (unique) |
| password_hash | text | OUI | — | Mot de passe chiffré (null si SSO) |
| first_name | text | OUI | — | Prénom |
| last_name | text | OUI | — | Nom |
| persona | enum | NON | — | Type d'utilisateur : `admin_delta`, `integrator_delta`, `integrator_external`, `client_user` |
| failed_login_attempts | integer | NON | 0 | Nombre de tentatives de connexion échouées consécutives |
| locked_until | timestamptz | OUI | — | Date jusqu'à laquelle le compte est verrouillé (null si non verrouillé) |
| totp_secret | text | OUI | — | Secret TOTP chiffré pour le 2FA (null si 2FA pas configuré) |
| totp_enabled | boolean | NON | false | 2FA activé ou non. Obligatoire pour admin/intégrateurs, ignoré pour client_user et SSO. |
| last_active_profile_id | uuid | OUI | — | Dernier profil actif sélectionné par l'utilisateur. Utilisé pour restaurer la session automatiquement à la reconnexion |
| created_at | timestamptz | NON | now() | Date de création du compte |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### clients

**Entreprise cliente.** Chaque client est une organisation (ex : Total, BNP, La Poste) qui utilise la plateforme.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| name | text | NON | — | Nom de l'entreprise (unique) |
| is_active | boolean | NON | true | Client actif ou désactivé |
| subdomain | text | OUI | — | Sous-domaine dédié (ex : `laposte` → `laposte.delta-rm.com`). Unique si renseigné. |
| custom_hostname | text | OUI | — | Hostname personnalisé via CNAME (ex : `app.laposte.com`). Unique si renseigné. |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### refresh_tokens

**Token de rafraîchissement JWT.** Stocké sous forme hashée pour renouveler les sessions sans re-authentification.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| user_id | uuid | NON | — | FK → accounts.id (cascade delete) |
| token_hash | text | NON | — | Hash du refresh token |
| expires_at | timestamptz | NON | — | Date d'expiration |
| created_at | timestamptz | NON | now() | Date de création |

---

### password_reset_tokens

**Token de réinitialisation de mot de passe.** À usage unique, expirant après une courte durée.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| user_id | uuid | NON | — | FK → accounts.id (cascade delete) |
| token_hash | text | NON | — | Hash du token de reset |
| expires_at | timestamptz | NON | — | Date d'expiration |
| used_at | timestamptz | OUI | — | Date d'utilisation (null si non encore utilisé) |
| created_at | timestamptz | NON | now() | Date de création |

---

### client_sso_configs

**Configuration SSO/OIDC par client.** Permet à un client d'authentifier ses utilisateurs via son propre fournisseur d'identité.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| provider | text | NON | — | Nom du fournisseur SSO (ex : `azure`, `okta`) |
| issuer_url | text | NON | — | URL de l'issuer OIDC |
| client_id_oidc | text | NON | — | Client ID OIDC |
| client_secret | text | NON | — | Secret OIDC |
| is_enabled | boolean | NON | true | Configuration active ou non |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### integrator_client_assignments

**Affectation d'un intégrateur à un client.** Un intégrateur peut être affecté à plusieurs clients.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| user_id | uuid | NON | — | FK → accounts.id (cascade delete) — l'intégrateur |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) — le client |
| assigned_by | uuid | OUI | — | FK → accounts.id — qui a fait l'affectation |
| created_at | timestamptz | NON | now() | Date d'affectation |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

### user_client_memberships

**Appartenance d'un utilisateur final à un client.** Un utilisateur peut être membre de plusieurs clients.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| user_id | uuid | NON | — | FK → accounts.id (cascade delete) |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| is_active | boolean | NON | true | Appartenance active |
| invited_by | uuid | OUI | — | FK → accounts.id — qui a invité cet utilisateur |
| activated_at | timestamptz | OUI | — | Date d'activation du compte |
| created_at | timestamptz | NON | now() | Date d'invitation |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

## 2. Modules & Rôles métier

### client_modules

**Module activé pour un client.** Delta RM propose des modules métier. Chaque client active les modules dont il a besoin. L'ordre d'affichage dans le menu FO est configurable.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| module_slug | text | NON | — | Identifiant technique du module (ex : `collecte_valeur`, `organisation`, `users`, `profils`) |
| is_active | boolean | NON | true | Module activé |
| display_order | integer | NON | 0 | Ordre d'affichage dans le menu FO |
| created_at | timestamptz | NON | now() | Date d'activation |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_roles

**Rôle métier dans un module.** Chaque module possède ses propres rôles configurés par l'intégrateur.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_module_id | uuid | NON | — | FK → client_modules.id (cascade delete) |
| name | text | NON | — | Nom affiché du rôle (ex : "Validateur") |
| color | text | OUI | — | Couleur associée |
| description | text | OUI | — | Description |
| is_archived | boolean | NON | false | Rôle archivé (soft delete) |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_permissions

**Permission accordée à un rôle dans un module.** Chaque module a une liste fixe de permissions définie par Delta. L'intégrateur active/désactive par rôle.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_module_id | uuid | NON | — | FK → client_modules.id (cascade delete) |
| permission_slug | text | NON | — | Identifiant de la permission |
| module_role_id | uuid | NON | — | FK → module_roles.id (cascade delete) |
| is_granted | boolean | NON | false | Permission accordée |
| deleted_at | timestamptz | OUI | — | Date de suppression (soft delete) |
| created_at | timestamptz | NON | now() | Date de création |

---

## 3. Entités organisationnelles

### eo_entities

**Entité de l'organigramme d'un client.** Sites, directions, services, équipes. Les entités forment un arbre hiérarchique.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| name | text | NON | — | Nom de l'entité (ex : "Direction Financière") |
| description | text | OUI | — | Description |
| parent_id | uuid | OUI | — | Entité parente dans l'arbre (null = racine, auto-référence) |
| path | text | NON | '' | Chemin matérialisé dans l'arbre (pour les requêtes de descendance) |
| level | integer | NON | 0 | Profondeur dans l'arbre (0 = racine) |
| is_active | boolean | NON | true | Entité active |
| is_archived | boolean | NON | false | Entité archivée |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |
| created_by | uuid | OUI | — | FK → accounts.id (set null on delete) |

---

### eo_field_definitions

**Champ personnalisé sur les entités.** L'intégrateur peut ajouter des champs supplémentaires aux entités d'un client.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| name | text | NON | — | Nom affiché du champ |
| description | text | OUI | — | Description |
| field_type | text | NON | — | Type de champ (texte, nombre, date, liste, etc.) |
| is_required | boolean | NON | false | Champ obligatoire |
| is_unique | boolean | NON | false | Valeur unique par entité |
| is_archived | boolean | NON | false | Champ archivé (soft delete) |
| comment_on_change | text | NON | 'none' | Comportement du commentaire lors d'une modification : `none`, `optional`, `required` |
| list_id | uuid | OUI | — | FK → lists.id (set null on delete) — liste source si type liste |
| settings | jsonb | OUI | — | Paramètres supplémentaires |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### eo_field_values

**Valeur d'un champ personnalisé pour une entité.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| eo_id | uuid | NON | — | FK → eo_entities.id (cascade delete) |
| field_definition_id | uuid | NON | — | FK → eo_field_definitions.id (cascade delete) |
| value | jsonb | OUI | — | Valeur stockée (format JSON pour supporter tous les types) |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |
| last_modified_by | uuid | OUI | — | FK → accounts.id (set null on delete) |

---

### eo_groups

**Groupe d'entités.** Permet de regrouper des entités qui ne sont pas dans la même branche hiérarchique.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| name | text | NON | — | Nom du groupe |
| description | text | OUI | — | Description |
| is_archived | boolean | NON | false | Groupe archivé (soft delete) |
| created_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### eo_group_members

**Membre d'un groupe d'entités.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| group_id | uuid | NON | — | FK → eo_groups.id (cascade delete) |
| eo_id | uuid | NON | — | FK → eo_entities.id (cascade delete) |
| include_descendants | boolean | NON | false | Si les sous-entités sont automatiquement incluses |
| created_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| created_at | timestamptz | NON | now() | Date d'ajout |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

### eo_field_change_comments

**Commentaire lors d'une modification de valeur.** Quand un utilisateur change la valeur d'un champ EO, il peut (ou doit) laisser un commentaire selon la configuration du champ.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| eo_id | uuid | NON | — | FK → eo_entities.id (cascade delete) |
| field_definition_id | uuid | NON | — | FK → eo_field_definitions.id (cascade delete) |
| old_value | jsonb | OUI | — | Ancienne valeur |
| new_value | jsonb | OUI | — | Nouvelle valeur |
| comment | text | OUI | — | Commentaire saisi |
| created_at | timestamptz | NON | now() | Date du changement |
| created_by | uuid | OUI | — | FK → accounts.id (set null on delete) |

---

### eo_audit_log

**Journal d'audit des entités.** Trace toutes les modifications pour la traçabilité.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| entity_id | uuid | NON | — | FK → eo_entities.id (cascade delete) |
| action | text | NON | — | Type d'action (create, update, delete, archive…) |
| changed_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| changed_fields | jsonb | OUI | — | Liste des champs modifiés |
| previous_values | jsonb | OUI | — | Valeurs avant modification |
| new_values | jsonb | OUI | — | Valeurs après modification |
| created_at | timestamptz | NON | now() | Date de l'action |

---

### eo_export_history

**Historique des exports d'entités.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| exported_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| exported_at | timestamptz | NON | now() | Date de l'export |
| row_count | integer | OUI | — | Nombre de lignes exportées |
| file_name | text | OUI | — | Nom du fichier généré |

---

### admin_audit_log

**Journal d'audit des actions admin.** Trace toutes les actions effectuées par les administrateurs et intégrateurs.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| actor_id | uuid | OUI | — | FK → accounts.id (set null on delete) |
| action | text | NON | — | Action effectuée |
| target_type | text | NON | — | Type de la cible de l'action |
| target_id | uuid | OUI | — | Identifiant de la cible |
| details | jsonb | OUI | — | Détails complémentaires de l'action |
| created_at | timestamptz | NON | now() | Date de l'action |

---

## 4. Profils client

### client_profiles

**Profil client.** Un profil définit un ensemble de droits : quelles entités sont accessibles et quels rôles dans quels modules. Un utilisateur peut avoir plusieurs profils.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| name | text | NON | — | Nom du profil (ex : "Gestionnaire HSE") |
| description | text | OUI | — | Description |
| is_archived | boolean | NON | false | Profil archivé |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### client_profile_users

**Attribution d'un profil à un utilisateur.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| user_id | uuid | NON | — | FK → accounts.id (cascade delete) |
| profile_id | uuid | NON | — | FK → client_profiles.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date d'attribution |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

### client_profile_eos

**Entités accessibles via un profil.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| profile_id | uuid | NON | — | FK → client_profiles.id (cascade delete) |
| eo_id | uuid | NON | — | FK → eo_entities.id (cascade delete) |
| include_descendants | boolean | NON | false | Si les sous-entités sont incluses |
| created_at | timestamptz | NON | now() | Date de création |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

### client_profile_eo_groups

**Groupes d'entités accessibles via un profil.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| profile_id | uuid | NON | — | FK → client_profiles.id (cascade delete) |
| group_id | uuid | NON | — | FK → eo_groups.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date de création |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

### client_profile_module_roles

**Rôles modules attribués via un profil.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| profile_id | uuid | NON | — | FK → client_profiles.id (cascade delete) |
| module_role_id | uuid | NON | — | FK → module_roles.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date de création |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

## 5. Champs utilisateur

### user_field_definitions

**Champ personnalisé sur les utilisateurs.** L'intégrateur peut définir des champs supplémentaires sur les fiches utilisateur.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| name | text | NON | — | Nom affiché du champ |
| field_type | text | NON | 'text' | Type de champ |
| description | text | OUI | — | Description |
| is_required | boolean | NON | false | Champ obligatoire |
| is_unique | boolean | NON | false | Valeur unique par utilisateur |
| is_active | boolean | NON | true | Champ actif |
| list_id | uuid | OUI | — | FK → lists.id (set null on delete) — liste source si type liste |
| settings | jsonb | OUI | — | Paramètres supplémentaires |
| default_value | jsonb | OUI | — | Valeur par défaut |
| created_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### user_field_values

**Valeur d'un champ personnalisé pour un utilisateur.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| user_id | uuid | NON | — | FK → accounts.id (cascade delete) |
| field_definition_id | uuid | NON | — | FK → user_field_definitions.id (cascade delete) |
| value | jsonb | OUI | — | Valeur stockée (format JSON) |
| updated_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| updated_at | timestamptz | NON | now() | Date de dernière modification |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

## 6. Listes

### lists

**Liste de valeurs.** Ensembles de valeurs réutilisables (ex : "Niveaux de gravité", "Types de risque"). Utilisées comme source pour les champs de type liste.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| name | text | NON | — | Nom de la liste |
| description | text | OUI | — | Description |
| is_archived | boolean | NON | false | Liste archivée |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### list_values

**Valeur dans une liste.** Les valeurs peuvent être hiérarchiques.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| list_id | uuid | NON | — | FK → lists.id (cascade delete) |
| label | text | NON | — | Libellé affiché |
| description | text | OUI | — | Description |
| color | text | OUI | — | Couleur associée |
| display_order | integer | NON | 0 | Ordre d'affichage |
| parent_id | uuid | OUI | — | Valeur parente (auto-référence, listes hiérarchiques) |
| level | integer | OUI | 0 | Profondeur dans la hiérarchie |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

## 7. Design & i18n

### client_design_configs

**Personnalisation visuelle par client.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| primary_color | text | NON | '#3B82F6' | Couleur principale |
| secondary_color | text | NON | '#6B7280' | Couleur secondaire |
| accent_color | text | OUI | — | Couleur d'accentuation |
| border_radius | integer | NON | 8 | Arrondi des bords (px) |
| font_family | text | NON | 'Inter' | Police de caractères |
| logo_url | text | OUI | — | URL du logo |
| app_name | text | OUI | — | Nom de l'application affiché |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### translations

**Traductions personnalisées par client.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_id | uuid | NON | — | FK → clients.id (cascade delete) |
| scope | text | NON | — | Contexte (ex : `navigation`, `module_cv`) |
| language | text | NON | — | Code langue (ex : `fr`, `en`) |
| key | text | NON | — | Clé de traduction |
| value | text | NON | — | Texte traduit |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

## 8. Module CV — Configuration

### module_cv_survey_types

**Type de campagne de collecte.** Un processus métier complet : objet métier, workflow, formulaires. Exemples : "Collecte annuelle DUERP", "Auto-évaluation conformité".

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_module_id | uuid | NON | — | FK → client_modules.id (cascade delete) |
| name | text | NON | — | Nom du type de campagne |
| description | text | OUI | — | Description |
| is_archived | boolean | NON | false | Type archivé (soft delete) |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_cv_field_definitions

**Champ de l'objet métier d'un type de campagne.** Un type de campagne = un objet métier = l'ensemble de tous ses champs.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| survey_type_id | uuid | NON | — | FK → module_cv_survey_types.id (cascade delete) |
| name | text | NON | — | Nom du champ |
| field_type | text | NON | — | Type de champ |
| description | text | OUI | — | Description |
| list_id | uuid | OUI | — | FK → lists.id (set null on delete) — liste source si type liste |
| is_archived | boolean | NON | false | Champ archivé (soft delete) |
| settings | jsonb | OUI | — | Paramètres supplémentaires |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_cv_statuses

**Statut possible d'une réponse.** Configurés par l'intégrateur pour chaque type de campagne.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| survey_type_id | uuid | NON | — | FK → module_cv_survey_types.id (cascade delete) |
| name | text | NON | — | Nom du statut |
| color | text | OUI | — | Couleur |
| display_order | integer | NON | 0 | Ordre d'affichage |
| is_initial | boolean | NON | false | Statut de départ du workflow |
| is_final | boolean | NON | false | Statut terminal du workflow |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_cv_status_transitions

**Transition autorisée entre deux statuts.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| survey_type_id | uuid | NON | — | FK → module_cv_survey_types.id (cascade delete) |
| from_status_id | uuid | NON | — | FK → module_cv_statuses.id (cascade delete) — statut de départ |
| to_status_id | uuid | NON | — | FK → module_cv_statuses.id (cascade delete) — statut d'arrivée |
| label | text | OUI | — | Libellé de l'action (ex : "Soumettre", "Valider") |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_cv_status_transition_roles

**Quel rôle peut exécuter quelle transition.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| transition_id | uuid | NON | — | FK → module_cv_status_transitions.id (cascade delete) |
| module_role_id | uuid | NON | — | FK → module_roles.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_cv_forms

**Formulaire lié à une étape du workflow.** Chaque statut a son propre formulaire.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| survey_type_id | uuid | NON | — | FK → module_cv_survey_types.id (cascade delete) |
| status_id | uuid | NON | — | FK → module_cv_statuses.id (cascade delete) |
| name | text | NON | — | Nom du formulaire |
| description | text | OUI | — | Description |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_cv_form_fields

**Champ dans un formulaire.** Règles métier qui s'appliquent à tous les rôles. La visibilité et l'éditabilité par rôle sont gérées via les display configs.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| form_id | uuid | NON | — | FK → module_cv_forms.id (cascade delete) |
| field_definition_id | uuid | NON | — | FK → module_cv_field_definitions.id (cascade delete) |
| is_required | boolean | NON | false | Champ obligatoire à cette étape |
| visibility_conditions | jsonb | OUI | — | Conditions d'affichage dynamique |
| conditional_coloring | jsonb | OUI | — | Coloration conditionnelle basée sur la valeur N-1 |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_cv_form_display_configs

**Configuration d'affichage d'un formulaire CV.** Définit comment un formulaire est présenté pour un groupe de rôles.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| form_id | uuid | NON | — | FK → module_cv_forms.id (cascade delete) |
| name | text | NON | — | Nom de la configuration |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_cv_form_display_config_roles

**Association rôle ↔ configuration d'affichage formulaire.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_cv_form_display_configs.id (cascade delete) |
| module_role_id | uuid | NON | — | FK → module_roles.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_cv_form_display_config_fields

**Champ dans une configuration d'affichage formulaire.** Contrôle ce que chaque groupe de rôles peut voir et éditer.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_cv_form_display_configs.id (cascade delete) |
| form_field_id | uuid | NON | — | FK → module_cv_form_fields.id (cascade delete) |
| can_view | boolean | NON | false | Champ visible |
| can_edit | boolean | NON | false | Champ modifiable |
| display_order | integer | NON | 0 | Ordre d'affichage |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_cv_display_configs

**Configuration d'affichage des tableaux listing CV.** Pour les listes de campagnes et réponses.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_module_id | uuid | NON | — | FK → client_modules.id (cascade delete) |
| name | text | NON | — | Nom de la configuration |
| filters | jsonb | OUI | — | Filtres disponibles |
| pre_filters | jsonb | OUI | — | Filtres appliqués par défaut |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_cv_display_config_roles

**Association rôle ↔ configuration d'affichage listing CV.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_cv_display_configs.id (cascade delete) |
| module_role_id | uuid | NON | — | FK → module_roles.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_cv_display_config_fields

**Champ dans une configuration d'affichage listing CV.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_cv_display_configs.id (cascade delete) |
| field_slug | text | OUI | — | Champ fixe (ex : "status", "reference_year") — null si champ custom |
| cv_field_definition_id | uuid | OUI | — | FK → module_cv_field_definitions.id (cascade delete) — null si champ fixe |
| show_in_table | boolean | NON | false | Visible comme colonne |
| show_in_export | boolean | NON | false | Inclus dans l'export |
| display_order | integer | NON | 0 | Ordre d'affichage |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_cv_validation_rules

**Règle de validation sur un champ.** Contraintes métier configurées par l'intégrateur.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| survey_type_id | uuid | NON | — | FK → module_cv_survey_types.id (cascade delete) |
| field_definition_id | uuid | OUI | — | FK → module_cv_field_definitions.id (cascade delete) — null si règle globale |
| rule_type | text | NON | — | Type de règle (ex : `min_value`, `required_if`, `regex`) |
| config | jsonb | OUI | — | Configuration de la règle |
| created_at | timestamptz | NON | now() | Date de création |

---

## 9. Module CV — Exécution

### module_cv_campaigns

**Campagne de collecte.** Lancée par un gestionnaire côté FO. Chaque campagne a une année de référence et peut être pré-remplie à partir d'une campagne précédente.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| survey_type_id | uuid | NON | — | FK → module_cv_survey_types.id (cascade delete) |
| name | text | NON | — | Nom (ex : "Collecte DUERP 2026") |
| description | text | OUI | — | Description |
| reference_year | integer | NON | — | Année de référence |
| prefill_campaign_id | uuid | OUI | — | FK → module_cv_campaigns.id (set null) — campagne N-1 source pour pré-remplissage |
| status | text | NON | 'open' | Statut de la campagne (ex : brouillon, en cours, terminée) |
| start_date | timestamptz | OUI | — | Date de début |
| end_date | timestamptz | OUI | — | Date de fin |
| created_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| is_archived | boolean | NON | false | Campagne archivée (soft delete) |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_cv_campaign_targets

**Entité ciblée par une campagne.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| campaign_id | uuid | NON | — | FK → module_cv_campaigns.id (cascade delete) |
| eo_id | uuid | NON | — | FK → eo_entities.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date d'ajout |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

### module_cv_responses

**Réponse d'une entité à une campagne.** L'objet métier instancié, qui suit le workflow de statuts.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| campaign_id | uuid | NON | — | FK → module_cv_campaigns.id (cascade delete) |
| eo_id | uuid | NON | — | FK → eo_entities.id (cascade delete) |
| status_id | uuid | NON | — | FK → module_cv_statuses.id — statut actuel dans le workflow |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_cv_response_values

**Valeur saisie dans une réponse.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| response_id | uuid | NON | — | FK → module_cv_responses.id (cascade delete) |
| field_definition_id | uuid | NON | — | FK → module_cv_field_definitions.id (cascade delete) |
| value | jsonb | OUI | — | Valeur saisie (format JSON) |
| updated_at | timestamptz | NON | now() | Date de dernière modification |
| last_modified_by | uuid | OUI | — | FK → accounts.id (set null on delete) |

---

### module_cv_field_comments

**Commentaire sur un champ d'une réponse.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| response_id | uuid | NON | — | FK → module_cv_responses.id (cascade delete) |
| field_definition_id | uuid | NON | — | FK → module_cv_field_definitions.id (cascade delete) |
| comment | text | NON | — | Contenu du commentaire |
| created_at | timestamptz | NON | now() | Date de création |
| created_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

### module_cv_response_documents

**Document joint à une réponse.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| response_id | uuid | NON | — | FK → module_cv_responses.id (cascade delete) |
| field_definition_id | uuid | NON | — | FK → module_cv_field_definitions.id (cascade delete) |
| file_name | text | NON | — | Nom du fichier |
| file_path | text | NON | — | Chemin de stockage |
| file_size | integer | NON | 0 | Taille en octets |
| mime_type | text | OUI | — | Type MIME |
| display_order | integer | NON | 0 | Ordre d'affichage |
| uploaded_at | timestamptz | NON | now() | Date d'upload |
| uploaded_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| deleted_at | timestamptz | OUI | — | Date de suppression logique (null si actif) |

---

### module_cv_response_audit_log

**Journal d'audit des modifications de réponses.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| response_id | uuid | NON | — | FK → module_cv_responses.id (cascade delete) |
| field_definition_id | uuid | OUI | — | FK → module_cv_field_definitions.id (set null on delete) |
| field_name | text | OUI | — | Nom du champ (conservé même si le champ est supprimé) |
| old_value | jsonb | OUI | — | Valeur avant modification |
| new_value | jsonb | OUI | — | Valeur après modification |
| changed_by | uuid | OUI | — | FK → accounts.id (set null on delete) |
| changed_at | timestamptz | NON | now() | Date de la modification |

---

## 10. Module Organisation — Display configs

### module_org_display_configs

**Configuration d'affichage du module Organisation.** Partageable par plusieurs rôles.

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_module_id | uuid | NON | — | FK → client_modules.id (cascade delete) |
| name | text | NON | — | Nom de la configuration (ex : "Vue Manager") |
| default_view_mode | text | NON | 'list' | Mode de vue par défaut (`list`, `tree`, `canvas`) |
| filters | jsonb | OUI | — | Filtres disponibles |
| pre_filters | jsonb | OUI | — | Filtres appliqués par défaut |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_org_display_config_roles

**Association rôle ↔ configuration Organisation.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_org_display_configs.id (cascade delete) |
| module_role_id | uuid | NON | — | FK → module_roles.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_org_display_config_fields

**Champ dans une configuration d'affichage Organisation.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_org_display_configs.id (cascade delete) |
| field_slug | text | OUI | — | Champ fixe (ex : "name", "description") — null si champ custom |
| eo_field_definition_id | uuid | OUI | — | FK → eo_field_definitions.id (cascade delete) — null si champ fixe |
| can_edit | boolean | NON | false | Champ modifiable |
| show_in_table | boolean | NON | false | Visible dans le tableau |
| show_in_drawer | boolean | NON | false | Visible dans le drawer |
| show_in_export | boolean | NON | false | Inclus dans l'export |
| display_order | integer | NON | 0 | Ordre d'affichage |
| created_at | timestamptz | NON | now() | Date de création |

---

## 11. Module Users — Display configs

### module_users_display_configs

**Configuration d'affichage du module Users.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_module_id | uuid | NON | — | FK → client_modules.id (cascade delete) |
| name | text | NON | — | Nom de la configuration |
| filters | jsonb | OUI | — | Filtres disponibles |
| pre_filters | jsonb | OUI | — | Filtres appliqués par défaut |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_users_display_config_roles

**Association rôle ↔ configuration Users.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_users_display_configs.id (cascade delete) |
| module_role_id | uuid | NON | — | FK → module_roles.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_users_display_config_fields

**Champ dans une configuration d'affichage Users.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_users_display_configs.id (cascade delete) |
| field_slug | text | OUI | — | Champ fixe (ex : "first_name", "email") — null si champ custom |
| user_field_definition_id | uuid | OUI | — | FK → user_field_definitions.id (cascade delete) — null si champ fixe |
| can_edit | boolean | NON | false | Champ modifiable |
| show_in_table | boolean | NON | false | Visible dans le tableau |
| show_in_drawer | boolean | NON | false | Visible dans le drawer |
| show_in_export | boolean | NON | false | Inclus dans l'export |
| is_anonymized | boolean | NON | false | Donnée anonymisée pour ce rôle (ex : email → ju***@…) |
| display_order | integer | NON | 0 | Ordre d'affichage |
| created_at | timestamptz | NON | now() | Date de création |

---

## 12. Module Profils — Display configs

### module_profils_display_configs

**Configuration d'affichage du module Profils.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| client_module_id | uuid | NON | — | FK → client_modules.id (cascade delete) |
| name | text | NON | — | Nom de la configuration |
| filters | jsonb | OUI | — | Filtres disponibles |
| pre_filters | jsonb | OUI | — | Filtres appliqués par défaut |
| created_at | timestamptz | NON | now() | Date de création |
| updated_at | timestamptz | NON | now() | Date de dernière modification |

---

### module_profils_display_config_roles

**Association rôle ↔ configuration Profils.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_profils_display_configs.id (cascade delete) |
| module_role_id | uuid | NON | — | FK → module_roles.id (cascade delete) |
| created_at | timestamptz | NON | now() | Date de création |

---

### module_profils_display_config_fields

**Champ dans une configuration d'affichage Profils.**

| Colonne | Type | Nullable | Défaut | Description |
|---|---|---|---|---|
| id | uuid | NON | random | Identifiant unique |
| display_config_id | uuid | NON | — | FK → module_profils_display_configs.id (cascade delete) |
| field_slug | text | NON | — | Identifiant du champ (ex : "name", "description", "roles", "entities") |
| can_edit | boolean | NON | false | Champ modifiable |
| show_in_table | boolean | NON | false | Visible dans le tableau |
| show_in_drawer | boolean | NON | false | Visible dans le drawer |
| show_in_export | boolean | NON | false | Inclus dans l'export |
| display_order | integer | NON | 0 | Ordre d'affichage |
| created_at | timestamptz | NON | now() | Date de création |
