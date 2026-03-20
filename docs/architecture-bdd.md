# Architecture Base de Données — Delta RM

Ce document décrit l'intégralité du modèle de données de la plateforme Delta RM. Chaque table est présentée avec sa description fonctionnelle et le détail de chaque colonne.

---

## 1. Socle — Utilisateurs & Accès

### accounts

**Compte de connexion.** Toute personne qui se connecte à Delta RM possède un compte. Le type d'utilisateur est défini par le champ persona.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| email | Adresse email de connexion (unique) |
| password_hash | Mot de passe chiffré |
| first_name | Prénom |
| last_name | Nom |
| persona | Type d'utilisateur : `admin_delta` (administrateur plateforme), `integrator_delta` (intégrateur employé Delta), `integrator_external` (intégrateur prestataire externe), `client_user` (utilisateur final d'une entreprise cliente) |
| created_at | Date de création du compte |
| updated_at | Date de dernière modification |

---

### clients

**Entreprise cliente.** Chaque client est une organisation (ex : Total, BNP, La Poste) qui utilise la plateforme.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| name | Nom de l'entreprise |
| is_active | Si le client est actif ou désactivé |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### integrator_client_assignments

**Affectation d'un intégrateur à un client.** Un intégrateur peut être affecté à plusieurs clients.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| user_id | L'intégrateur concerné |
| client_id | Le client auquel il est affecté |
| persona | Le rôle de l'intégrateur pour ce client |
| assigned_by | Qui a fait l'affectation |
| created_at | Date d'affectation |

---

### user_client_memberships

**Appartenance d'un utilisateur final à un client.** Un utilisateur peut être membre de plusieurs clients.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| user_id | L'utilisateur final |
| client_id | L'entreprise cliente |
| is_active | Si l'appartenance est active |
| invited_by | Qui a invité cet utilisateur |
| activated_at | Date d'activation du compte |
| created_at | Date d'invitation |
| updated_at | Date de dernière modification |

---

## 2. Modules & Rôles métier

### client_modules

**Module activé pour un client.** Delta RM propose des modules métier. Chaque client active les modules dont il a besoin. L'ordre d'affichage dans le menu FO est configurable.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client |
| module_slug | Identifiant technique du module (ex : `collecte_valeur`, `organisation`, `users`, `profils`) |
| is_active | Si le module est activé |
| display_order | Ordre d'affichage dans le menu FO |
| created_at | Date d'activation |
| updated_at | Date de dernière modification |

---

### module_roles

**Rôle métier dans un module.** Chaque module possède ses propres rôles configurés par l'intégrateur.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module |
| name | Nom affiché du rôle (ex : "Validateur") |
| color | Couleur associée |
| description | Description |
| is_active | Si le rôle est actif |
| created_at | Date de création |

---

### module_permissions

**Permission accordée à un rôle dans un module.** Chaque module a une liste fixe de permissions définie par Delta. L'intégrateur active/désactive par rôle.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module |
| permission_slug | Identifiant de la permission |
| module_role_id | Le rôle |
| is_granted | Si la permission est accordée |
| created_at | Date de création |

---

## 3. Entités organisationnelles

### eo_entities

**Entité de l'organigramme d'un client.** Sites, directions, services, équipes. Les entités forment un arbre hiérarchique.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client propriétaire |
| name | Nom de l'entité (ex : "Direction Financière") |
| description | Description |
| parent_id | Entité parente dans l'arbre (null = racine) |
| path | Chemin matérialisé dans l'arbre (pour les requêtes de descendance) |
| level | Profondeur dans l'arbre (0 = racine) |
| is_active | Si l'entité est active |
| is_archived | Si l'entité est archivée |
| created_at | Date de création |
| updated_at | Date de dernière modification |
| created_by | Qui a créé cette entité |

---

### eo_field_definitions

**Champ personnalisé sur les entités.** L'intégrateur peut ajouter des champs supplémentaires aux entités d'un client.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client |
| name | Nom affiché du champ |
| description | Description |
| field_type | Type de champ (texte, nombre, date, liste, etc.) |
| is_required | Si le champ est obligatoire |
| is_unique | Si la valeur doit être unique |
| is_active | Si le champ est actif |
| comment_on_change | Comportement du commentaire lors d'une modification : `none`, `optional`, `required` |
| settings | Paramètres supplémentaires |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### eo_field_values

**Valeur d'un champ personnalisé pour une entité.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| eo_id | L'entité |
| field_definition_id | Le champ |
| value | La valeur (format JSON pour supporter tous les types) |
| created_at | Date de création |
| updated_at | Date de dernière modification |
| last_modified_by | Dernier utilisateur ayant modifié |

---

### eo_groups

**Groupe d'entités.** Permet de regrouper des entités qui ne sont pas dans la même branche hiérarchique.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client |
| name | Nom du groupe |
| description | Description |
| is_active | Si le groupe est actif |
| created_by | Qui a créé ce groupe |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### eo_group_members

**Membre d'un groupe d'entités.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| group_id | Le groupe |
| eo_id | L'entité membre |
| include_descendants | Si les sous-entités sont automatiquement incluses |
| created_by | Qui a ajouté cette entité au groupe |
| created_at | Date d'ajout |

---

### eo_field_change_comments

**Commentaire lors d'une modification de valeur.** Quand un utilisateur change la valeur d'un champ, il peut laisser un commentaire.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| eo_id | L'entité |
| field_definition_id | Le champ modifié |
| old_value | Ancienne valeur |
| new_value | Nouvelle valeur |
| comment | Commentaire |
| created_at | Date du changement |
| created_by | Auteur |

---

### eo_audit_log

**Journal d'audit des entités.** Trace toutes les modifications pour la traçabilité.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| entity_id | L'entité |
| action | Type d'action (create, update, delete, archive...) |
| changed_by | Qui a fait la modification |
| changed_fields | Liste des champs modifiés |
| previous_values | Valeurs avant modification |
| new_values | Valeurs après modification |
| created_at | Date de l'action |

---

### eo_export_history

**Historique des exports d'entités.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client |
| exported_by | Qui a lancé l'export |
| exported_at | Date de l'export |
| row_count | Nombre de lignes exportées |
| file_name | Nom du fichier généré |

---

## 4. Profils client

### client_profiles

**Profil client.** Un profil définit un ensemble de droits : quelles entités sont accessibles et quels rôles dans quels modules. Un utilisateur peut avoir plusieurs profils.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client propriétaire |
| name | Nom du profil (ex : "Gestionnaire HSE") |
| description | Description |
| is_archived | Si le profil est archivé |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### client_profile_users

**Attribution d'un profil à un utilisateur.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| user_id | L'utilisateur |
| profile_id | Le profil attribué |
| client_id | Le client |
| created_at | Date d'attribution |

---

### client_profile_eos

**Entités accessibles via un profil.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| profile_id | Le profil |
| eo_id | L'entité accessible |
| include_descendants | Si les sous-entités sont incluses |
| created_at | Date de création |

---

### client_profile_eo_groups

**Groupes d'entités accessibles via un profil.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| profile_id | Le profil |
| group_id | Le groupe d'entités accessible |
| created_at | Date de création |

---

### client_profile_module_roles

**Rôles modules attribués via un profil.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| profile_id | Le profil |
| module_role_id | Le rôle module attribué |
| created_at | Date de création |

---

## 5. Champs utilisateur

### user_field_definitions

**Champ personnalisé sur les utilisateurs.** L'intégrateur peut définir des champs supplémentaires sur les fiches utilisateur.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client |
| name | Nom affiché du champ |
| field_type | Type de champ |
| description | Description |
| is_required | Si le champ est obligatoire |
| is_unique | Si la valeur doit être unique |
| is_active | Si le champ est actif |
| settings | Paramètres supplémentaires |
| default_value | Valeur par défaut |
| created_by | Qui a créé ce champ |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### user_field_values

**Valeur d'un champ personnalisé pour un utilisateur.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| user_id | L'utilisateur |
| field_definition_id | Le champ |
| value | La valeur (format JSON) |
| updated_by | Dernier utilisateur ayant modifié |
| updated_at | Date de dernière modification |

---

## 6. Listes

### lists

**Liste de valeurs.** Ensembles de valeurs réutilisables (ex : "Niveaux de gravité", "Types de risque"). Utilisées comme source pour les champs de type liste.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client propriétaire |
| name | Nom de la liste |
| description | Description |
| is_archived | Si la liste est archivée |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### list_values

**Valeur dans une liste.** Les valeurs peuvent être hiérarchiques.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| list_id | La liste |
| label | Libellé affiché |
| description | Description |
| color | Couleur associée |
| display_order | Ordre d'affichage |
| is_active | Si la valeur est active |
| parent_id | Valeur parente (listes hiérarchiques) |
| level | Profondeur dans la hiérarchie |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

## 7. Design & Internationalisation

### client_design_configs

**Personnalisation visuelle par client.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client |
| primary_color | Couleur principale |
| secondary_color | Couleur secondaire |
| accent_color | Couleur d'accentuation |
| border_radius | Arrondi des bords (en pixels) |
| font_family | Police de caractères |
| logo_url | URL du logo |
| app_name | Nom de l'application affiché |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### translations

**Traductions personnalisées par client.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client |
| scope | Contexte (ex : `navigation`, `module_cv`) |
| language | Code langue (ex : `fr`, `en`) |
| key | Clé de traduction |
| value | Texte traduit |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

## 8. Module Collecte de Valeur — Configuration

### module_cv_survey_types

**Type de campagne de collecte.** Un processus métier complet : objet métier, workflow, formulaires. Exemples : "Collecte annuelle DUERP", "Auto-évaluation conformité".

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module CV de ce client |
| name | Nom du type de campagne |
| description | Description |
| is_active | Si le type est actif |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_field_definitions

**Champ de l'objet métier d'un type de campagne.** Un type de campagne = un objet métier = l'ensemble de tous ses champs.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| name | Nom du champ |
| field_type | Type de champ |
| description | Description |
| list_id | Si type liste, vers quelle liste de valeurs |
| settings | Paramètres supplémentaires |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_statuses

**Statut possible d'une réponse.** Configurés par l'intégrateur pour chaque type de campagne.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| name | Nom du statut |
| color | Couleur |
| display_order | Ordre d'affichage |
| is_initial | Si c'est le statut de départ |
| is_final | Si c'est un statut terminal |
| created_at | Date de création |

---

### module_cv_status_transitions

**Transition autorisée entre deux statuts.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| from_status_id | Statut de départ |
| to_status_id | Statut d'arrivée |
| label | Libellé (ex : "Soumettre", "Valider") |
| created_at | Date de création |

---

### module_cv_status_transition_roles

**Quel rôle peut exécuter quelle transition.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| transition_id | La transition |
| module_role_id | Le rôle autorisé |
| created_at | Date de création |

---

### module_cv_forms

**Formulaire lié à une étape du workflow.** Chaque statut a son propre formulaire.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| status_id | Le statut associé |
| name | Nom du formulaire |
| description | Description |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_form_fields

**Champ dans un formulaire.** Règles métier qui s'appliquent à tous les rôles. La visibilité et l'éditabilité par rôle sont gérées via les display configs.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| form_id | Le formulaire |
| field_definition_id | Le champ de l'objet métier |
| is_required | Si le champ est obligatoire à cette étape |
| visibility_conditions | Conditions d'affichage dynamique (JSON) |
| conditional_coloring | Coloration conditionnelle basée sur la valeur N-1 (JSON) |
| created_at | Date de création |

---

### module_cv_form_display_configs

**Configuration d'affichage d'un formulaire CV.** Définit comment un formulaire est présenté pour un groupe de rôles.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| form_id | Le formulaire |
| name | Nom de la configuration |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_form_display_config_roles

**Association rôle ↔ configuration d'affichage formulaire.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| module_role_id | Le rôle |
| created_at | Date de création |

---

### module_cv_form_display_config_fields

**Champ dans une configuration d'affichage formulaire.** Contrôle ce que chaque groupe de rôles peut voir et éditer.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| form_field_id | Le champ du formulaire |
| can_view | Si le champ est visible |
| can_edit | Si le champ est modifiable |
| display_order | Ordre d'affichage |
| created_at | Date de création |

---

### module_cv_display_configs

**Configuration d'affichage des tableaux listing CV.** Pour les listes de campagnes et réponses.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module CV |
| name | Nom de la configuration |
| filters | Filtres disponibles (JSON) |
| pre_filters | Filtres appliqués par défaut (JSON) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_display_config_roles

**Association rôle ↔ configuration d'affichage listing.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| module_role_id | Le rôle |
| created_at | Date de création |

---

### module_cv_display_config_fields

**Champ dans une configuration d'affichage listing.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| field_slug | Champ fixe (ex : "status", "reference_year"). Null si champ custom |
| cv_field_definition_id | Champ custom. Null si champ fixe |
| show_in_table | Visible comme colonne |
| show_in_export | Inclus dans l'export CSV |
| display_order | Ordre d'affichage |
| created_at | Date de création |

---

### module_cv_validation_rules

**Règle de validation sur un champ.** Contraintes métier configurées par l'intégrateur.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| field_definition_id | Le champ (null = règle globale) |
| rule_type | Type de règle (ex : `min_value`, `required_if`, `regex`) |
| config | Configuration (JSON) |
| created_at | Date de création |

---

## 9. Module Collecte de Valeur — Exécution

### module_cv_campaigns

**Campagne de collecte.** Lancée par un gestionnaire côté FO. Chaque campagne a une année de référence et peut être pré-remplie à partir d'une campagne précédente.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| name | Nom (ex : "Collecte DUERP 2026") |
| description | Description |
| reference_year | Année de référence |
| prefill_campaign_id | Campagne N-1 choisie pour le pré-remplissage |
| status | Statut de la campagne (brouillon, en cours, terminée) |
| start_date | Date de début |
| end_date | Date de fin |
| created_by | Gestionnaire qui a lancé la campagne |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_campaign_targets

**Entité ciblée par une campagne.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| campaign_id | La campagne |
| eo_id | L'entité ciblée |
| created_at | Date d'ajout |

---

### module_cv_responses

**Réponse d'une entité à une campagne.** L'objet métier instancié, qui suit le workflow.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| campaign_id | La campagne |
| eo_id | L'entité qui répond |
| status_id | Statut actuel dans le workflow |
| submitted_at | Date de soumission |
| submitted_by | Qui a soumis |
| validated_at | Date de validation |
| validated_by | Qui a validé |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_response_values

**Valeur saisie dans une réponse.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| response_id | La réponse |
| field_definition_id | Le champ |
| value | La valeur (format JSON) |
| updated_at | Date de dernière modification |
| last_modified_by | Dernier utilisateur ayant modifié |

---

### module_cv_field_comments

**Commentaire sur un champ d'une réponse.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| response_id | La réponse |
| field_definition_id | Le champ commenté |
| comment | Le commentaire |
| created_at | Date |
| created_by | Auteur |

---

### module_cv_response_documents

**Document joint à une réponse.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| response_id | La réponse |
| field_definition_id | Le champ de type fichier |
| file_name | Nom du fichier |
| file_path | Chemin de stockage |
| file_size | Taille en octets |
| mime_type | Type MIME |
| display_order | Ordre d'affichage |
| uploaded_at | Date d'upload |
| uploaded_by | Qui a uploadé |

---

### module_cv_response_audit_log

**Journal d'audit des modifications de réponses.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| response_id | La réponse |
| field_definition_id | Le champ modifié |
| field_name | Nom du champ (conservé même si le champ est supprimé) |
| old_value | Valeur avant |
| new_value | Valeur après |
| changed_by | Qui a modifié |
| changed_at | Date de la modification |

---

## 10. Module Organisation — Configuration d'affichage

### module_org_display_configs

**Configuration d'affichage du module Organisation.** Partageable par plusieurs rôles.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module Organisation |
| name | Nom de la configuration (ex : "Vue Manager") |
| default_view_mode | Mode par défaut : `list`, `tree` ou `canvas` (tous accessibles) |
| filters | Filtres disponibles (JSON) |
| pre_filters | Filtres par défaut (JSON) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_org_display_config_roles

**Association rôle ↔ configuration Organisation.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| module_role_id | Le rôle |
| created_at | Date de création |

---

### module_org_display_config_fields

**Champ dans une configuration d'affichage Organisation.** Côté API, chaque modification est vérifiée contre cette table.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| field_slug | Champ fixe (ex : "name", "description"). Null si champ custom |
| eo_field_definition_id | Champ custom. Null si champ fixe |
| can_edit | Si le champ peut être modifié |
| show_in_table | Visible dans le tableau |
| show_in_drawer | Visible dans le drawer |
| show_in_export | Inclus dans l'export |
| display_order | Ordre d'affichage |
| created_at | Date de création |

---

## 11. Module Users — Configuration d'affichage

### module_users_display_configs

**Configuration d'affichage du module Users.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module Users |
| name | Nom de la configuration |
| filters | Filtres disponibles (JSON) |
| pre_filters | Filtres par défaut (JSON) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_users_display_config_roles

**Association rôle ↔ configuration Users.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| module_role_id | Le rôle |
| created_at | Date de création |

---

### module_users_display_config_fields

**Champ dans une configuration d'affichage Users.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| field_slug | Champ fixe (ex : "first_name", "email"). Null si champ custom |
| user_field_definition_id | Champ custom utilisateur. Null si champ fixe |
| can_edit | Si le champ peut être modifié |
| show_in_table | Visible dans le tableau |
| show_in_drawer | Visible dans le drawer |
| show_in_export | Inclus dans l'export |
| is_anonymized | Si le champ est masqué (ex : email → ju***@...) |
| display_order | Ordre d'affichage |
| created_at | Date de création |

---

## 12. Module Profils — Configuration d'affichage

### module_profils_display_configs

**Configuration d'affichage du module Profils.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module Profils |
| name | Nom de la configuration |
| filters | Filtres disponibles (JSON) |
| pre_filters | Filtres par défaut (JSON) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_profils_display_config_roles

**Association rôle ↔ configuration Profils.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| module_role_id | Le rôle |
| created_at | Date de création |

---

### module_profils_display_config_fields

**Champ dans une configuration d'affichage Profils.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration |
| field_slug | Identifiant du champ (ex : "name", "description", "roles", "entities") |
| can_edit | Si le champ peut être modifié |
| show_in_table | Visible dans le tableau |
| show_in_drawer | Visible dans le drawer |
| show_in_export | Inclus dans l'export |
| display_order | Ordre d'affichage |
| created_at | Date de création |
