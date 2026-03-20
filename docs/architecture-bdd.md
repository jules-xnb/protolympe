# Architecture Base de Données — Delta RM

Ce document décrit l'intégralité du modèle de données de la plateforme Delta RM. Chaque table est présentée avec sa description fonctionnelle et le détail de chaque colonne.

---

## 1. Socle — Utilisateurs & Accès

### profiles

**Compte utilisateur.** Toute personne qui se connecte à Delta RM possède un profil. Le type d'utilisateur (admin, intégrateur, utilisateur final) est défini par le champ persona.

| Colonne | Description |
|---|---|
| id | Identifiant unique du profil |
| email | Adresse email de connexion (unique) |
| password_hash | Mot de passe chiffré |
| first_name | Prénom |
| last_name | Nom |
| persona | Type d'utilisateur : `admin_delta` (administrateur de la plateforme), `integrator_delta` (intégrateur employé Delta), `integrator_external` (intégrateur prestataire externe), `client_user` (utilisateur final d'une entreprise cliente) |
| created_at | Date de création du compte |
| updated_at | Date de dernière modification |

---

### clients

**Entreprise cliente.** Chaque client est une organisation (ex : Total, BNP, La Poste) qui utilise la plateforme pour ses besoins métier.

| Colonne | Description |
|---|---|
| id | Identifiant unique du client |
| name | Nom de l'entreprise |
| is_active | Si le client est actif ou désactivé |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### integrator_client_assignments

**Affectation d'un intégrateur à un client.** Définit quel intégrateur (Delta ou externe) travaille pour quel client. Un intégrateur peut être affecté à plusieurs clients.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| user_id | L'intégrateur concerné |
| client_id | Le client auquel il est affecté |
| persona | Le rôle de l'intégrateur pour ce client (`integrator_delta` ou `integrator_external`) |
| assigned_by | Qui a fait l'affectation |
| created_at | Date d'affectation |

---

### user_client_memberships

**Appartenance d'un utilisateur final à un client.** Quand un utilisateur final est invité dans une entreprise cliente, cette table enregistre son appartenance. Un utilisateur peut être membre de plusieurs clients.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| user_id | L'utilisateur final |
| client_id | L'entreprise cliente |
| is_active | Si l'appartenance est active |
| invited_by | Qui a invité cet utilisateur |
| activated_at | Date à laquelle l'utilisateur a activé son compte |
| created_at | Date d'invitation |
| updated_at | Date de dernière modification |

---

## 2. Modules & Rôles métier

### client_modules

**Module activé pour un client.** Delta RM propose des modules métier (ex : Collecte de Valeur). Chaque client active les modules dont il a besoin. Les modules sont définis par Delta, pas par les clients.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client qui utilise ce module |
| module_slug | Identifiant technique du module (ex : `collecte_valeur`) |
| is_active | Si le module est activé |
| created_at | Date d'activation |
| updated_at | Date de dernière modification |

---

### module_roles

**Rôle métier dans un module.** Chaque module possède ses propres rôles (ex : dans Collecte de Valeur → "Gestionnaire", "Contributeur", "Validateur"). Ces rôles sont configurés par l'intégrateur pour chaque client.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module dans lequel ce rôle existe |
| name | Nom affiché du rôle (ex : "Validateur") |
| color | Couleur associée au rôle (pour l'affichage) |
| description | Description du rôle |
| is_active | Si le rôle est actif |
| created_at | Date de création |

---

### module_permissions

**Permission accordée à un rôle dans un module.** Chaque module a une liste fixe de permissions (définies par Delta). L'intégrateur décide quels rôles ont quelles permissions.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module concerné |
| permission_slug | Identifiant de la permission (ex : `can_launch_campaign`) |
| module_role_id | Le rôle qui reçoit cette permission |
| is_granted | Si la permission est accordée ou non |
| created_at | Date de création |

---

### module_workflows

**Workflow rattaché à un module.** Décrit un processus métier au sein d'un module (ex : le workflow de collecte avec ses étapes).

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module auquel ce workflow appartient |
| name | Nom du workflow |
| description | Description |
| is_active | Si le workflow est actif |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

---

## 3. Entités organisationnelles

### organizational_entities

**Entité de l'organigramme d'un client.** Représente la structure organisationnelle : sites, directions, services, équipes. Les entités forment un arbre hiérarchique.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client propriétaire |
| name | Nom de l'entité (ex : "Direction Financière") |
| code | Code interne optionnel (ex : "DF-001") |
| description | Description |
| parent_id | Entité parente dans l'arbre (null = racine) |
| path | Chemin matérialisé dans l'arbre (pour les requêtes de descendance) |
| level | Profondeur dans l'arbre (0 = racine) |
| slug | Identifiant technique |
| is_active | Si l'entité est active |
| is_archived | Si l'entité est archivée |
| created_at | Date de création |
| updated_at | Date de dernière modification |
| created_by | Qui a créé cette entité |

---

### eo_field_definitions

**Champ personnalisé sur les entités organisationnelles.** L'intégrateur peut ajouter des champs supplémentaires aux entités d'un client (ex : "Code comptable", "Responsable site").

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client concerné |
| name | Nom affiché du champ |
| slug | Identifiant technique |
| description | Description du champ |
| field_type | Type de champ (texte, nombre, date, liste, etc.) |
| is_required | Si le champ est obligatoire |
| is_unique | Si la valeur doit être unique par entité |
| is_system | Si c'est un champ système (non modifiable par l'intégrateur) |
| is_hidden | Si le champ est masqué dans l'interface |
| is_active | Si le champ est actif |
| display_order | Ordre d'affichage |
| comment_on_change | Comportement du commentaire lors d'une modification : `none` (pas de commentaire), `optional` (commentaire proposé), `required` (commentaire obligatoire) |
| settings | Paramètres supplémentaires (format libre) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### eo_field_values

**Valeur d'un champ personnalisé pour une entité.** Stocke la valeur saisie pour un champ donné sur une entité donnée.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| eo_id | L'entité concernée |
| field_definition_id | Le champ concerné |
| value | La valeur saisie |
| created_at | Date de création |
| updated_at | Date de dernière modification |
| last_modified_by | Dernier utilisateur ayant modifié cette valeur |

---

### eo_groups

**Groupe d'entités organisationnelles.** Permet de regrouper des entités qui ne sont pas forcément dans la même branche hiérarchique (ex : "Toutes les usines", "Sites certifiés ISO").

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client concerné |
| name | Nom du groupe |
| description | Description |
| is_active | Si le groupe est actif |
| created_by | Qui a créé ce groupe |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### eo_group_members

**Membre d'un groupe d'entités.** Lie une entité à un groupe, avec la possibilité d'inclure automatiquement ses descendants.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| group_id | Le groupe |
| eo_id | L'entité membre |
| include_descendants | Si les sous-entités sont automatiquement incluses |
| created_at | Date d'ajout |

---

### eo_field_change_comments

**Commentaire lors d'une modification de valeur sur une entité.** Quand un utilisateur change la valeur d'un champ personnalisé, il peut laisser un commentaire expliquant pourquoi.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| eo_id | L'entité concernée |
| field_definition_id | Le champ modifié |
| old_value | Ancienne valeur |
| new_value | Nouvelle valeur |
| comment | Commentaire de l'utilisateur |
| created_at | Date du changement |
| created_by | Auteur du changement |

---

### eo_audit_log

**Journal d'audit des entités.** Trace toutes les modifications faites sur les entités (création, modification, suppression) pour la traçabilité.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| entity_id | L'entité concernée |
| action | Type d'action (create, update, delete, archive...) |
| changed_by | Qui a fait la modification |
| changed_fields | Liste des champs modifiés |
| previous_values | Valeurs avant modification |
| new_values | Valeurs après modification |
| created_at | Date de l'action |

---

### eo_export_history

**Historique des exports d'entités.** Trace chaque export réalisé par un utilisateur (pour audit et suivi).

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client concerné |
| exported_by | Qui a lancé l'export |
| exported_at | Date de l'export |
| row_count | Nombre de lignes exportées |
| file_name | Nom du fichier généré |

---

## 4. Profils (Templates)

### profile_templates

**Modèle de profil.** Un profil type (ex : "Chef de service", "Directeur RSE") qui définit un ensemble de droits : quelles entités sont accessibles et quels rôles dans quels modules. Un utilisateur peut avoir plusieurs profils.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client propriétaire |
| name | Nom du profil (ex : "Gestionnaire HSE") |
| description | Description |
| is_active | Si le profil est actif |
| is_archived | Si le profil est archivé |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### user_profile_templates

**Attribution d'un profil à un utilisateur.** Lie un utilisateur à un profil template dans le contexte d'un client.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| user_id | L'utilisateur |
| template_id | Le profil attribué |
| client_id | Le client dans lequel ce profil s'applique |
| created_at | Date d'attribution |

---

### profile_template_eos

**Entités accessibles via un profil.** Définit quelles entités organisationnelles un utilisateur peut voir/gérer grâce à ce profil.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| template_id | Le profil |
| eo_id | L'entité accessible |
| include_descendants | Si les sous-entités sont automatiquement incluses |
| created_at | Date de création |

---

### profile_template_eo_groups

**Groupes d'entités accessibles via un profil.** Même principe que ci-dessus, mais via un groupe d'entités (plutôt qu'une entité individuelle).

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| template_id | Le profil |
| group_id | Le groupe d'entités accessible |
| created_at | Date de création |

---

### profile_template_module_roles

**Rôles modules attribués via un profil.** Définit quels rôles métier (dans quels modules) sont accordés par ce profil.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| template_id | Le profil |
| module_role_id | Le rôle module attribué |
| created_at | Date de création |

---

## 5. Champs utilisateur

### user_field_definitions

**Champ personnalisé sur les utilisateurs.** L'intégrateur peut définir des champs supplémentaires sur les fiches utilisateur d'un client (ex : "Matricule", "Date d'entrée", "Département").

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client concerné |
| name | Nom affiché du champ |
| slug | Identifiant technique |
| field_type | Type de champ (texte, nombre, date, liste, etc.) |
| description | Description |
| is_required | Si le champ est obligatoire |
| is_unique | Si la valeur doit être unique |
| is_active | Si le champ est actif |
| is_user_editable | Si l'utilisateur final peut modifier lui-même ce champ |
| display_order | Ordre d'affichage |
| options | Options possibles (pour les champs de type liste) |
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
| user_id | L'utilisateur concerné |
| field_definition_id | Le champ concerné |
| value | La valeur (format JSON pour supporter tous les types) |
| updated_by | Dernier utilisateur ayant modifié |
| updated_at | Date de dernière modification |

---

## 6. Navigation

### navigation_configs

**Élément de navigation.** Représente un élément du menu de l'application (menu, sous-menu, lien). Les éléments forment un arbre hiérarchique configurable par client.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client concerné |
| parent_id | Élément parent dans le menu (null = racine) |
| label | Libellé technique |
| display_label | Libellé affiché (peut être traduit) |
| slug | Identifiant technique |
| icon | Icône associée |
| type | Type d'élément : `group` (dossier), `link` (lien), `module` (accès module) |
| client_module_id | Si type = module, vers quel module ce menu pointe |
| url | Si type = link, URL de destination |
| display_order | Ordre d'affichage |
| is_active | Si l'élément est visible |
| created_at | Date de création |
| updated_at | Date de dernière modification |
| created_by | Qui a créé cet élément |

---

### nav_permissions

**Permission de visibilité sur un élément de navigation.** Définit quel rôle peut voir quel élément de menu.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| navigation_config_id | L'élément de navigation |
| role_id | Le rôle module concerné |
| category_id | Catégorie (usage futur) |
| is_visible | Si l'élément est visible pour ce rôle |
| created_at | Date de création |

---

## 7. Listes

### referentials

**Liste de valeurs.** Les listes permettent de définir des ensembles de valeurs réutilisables (ex : "Niveaux de gravité", "Types de risque", "Pays"). Elles sont utilisées comme source pour les champs de type liste.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client propriétaire |
| name | Nom de la liste |
| slug | Identifiant technique |
| description | Description |
| tag | Tag pour catégoriser les listes |
| is_active | Si la liste est active |
| is_archived | Si la liste est archivée |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### referential_values

**Valeur dans une liste.** Les valeurs peuvent être hiérarchiques (arbre) pour les listes complexes.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| referential_id | La liste à laquelle cette valeur appartient |
| label | Libellé affiché |
| code | Code interne optionnel |
| description | Description |
| color | Couleur associée (pour l'affichage) |
| icon | Icône associée |
| display_order | Ordre d'affichage |
| is_active | Si la valeur est active |
| parent_id | Valeur parente (pour les listes hiérarchiques) |
| level | Profondeur dans la hiérarchie |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

## 8. Design & Internationalisation

### client_design_configs

**Personnalisation visuelle par client.** Chaque client peut personnaliser l'apparence de son instance de la plateforme (couleurs, logo, police).

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client concerné |
| primary_color | Couleur principale |
| secondary_color | Couleur secondaire |
| text_on_primary | Couleur du texte sur fond primaire |
| text_on_secondary | Couleur du texte sur fond secondaire |
| accent_color | Couleur d'accentuation |
| border_radius | Arrondi des bords (en pixels) |
| font_family | Police de caractères |
| logo_url | URL du logo |
| app_name | Nom de l'application affiché |
| font_size_base | Taille de police de base |
| font_weight_main | Graisse de police principale |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### translations

**Traductions personnalisées par client.** Permet de surcharger les libellés de l'interface par client et par langue.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_id | Le client concerné |
| scope | Contexte de la traduction (ex : `navigation`, `module_cv`) |
| language | Code langue (ex : `fr`, `en`) |
| key | Clé de traduction |
| value | Texte traduit |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

## 9. Module Collecte de Valeur — Configuration

### module_cv_survey_types

**Type de campagne de collecte.** Chaque type de campagne représente un processus métier complet : un objet métier (= ensemble de champs), un workflow (= statuts et transitions), et des formulaires (= vues par étape). Exemples : "Collecte annuelle DUERP", "Auto-évaluation conformité".

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module Collecte de Valeur de ce client |
| name | Nom du type de campagne |
| description | Description |
| is_active | Si le type est actif |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_field_definitions

**Champ de l'objet métier d'un type de campagne.** Définit la structure des données collectées. Un type de campagne = un objet métier = l'ensemble de tous ses champs. L'intégrateur configure les champs (fixes ou customs).

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne auquel ce champ appartient |
| name | Nom affiché du champ |
| slug | Identifiant technique |
| field_type | Type de champ (texte, nombre, date, liste, fichier, etc.) |
| description | Description |
| referential_id | Si le champ est de type liste, vers quelle liste de valeurs il pointe |
| settings | Paramètres supplémentaires |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_statuses

**Statut possible d'une réponse.** Les statuts sont dynamiques et configurés par l'intégrateur pour chaque type de campagne. Exemple : "Brouillon" → "Soumis" → "Validé" → "Rejeté".

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| name | Nom du statut (ex : "En attente de validation") |
| slug | Identifiant technique |
| color | Couleur associée |
| display_order | Ordre d'affichage |
| is_initial | Si c'est le statut de départ (quand une réponse est créée) |
| is_final | Si c'est un statut terminal (le processus est terminé) |
| created_at | Date de création |

---

### module_cv_status_transitions

**Transition autorisée entre deux statuts.** Définit les chemins possibles dans le workflow : depuis quel statut on peut aller vers quel autre statut.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| from_status_id | Statut de départ |
| to_status_id | Statut d'arrivée |
| label | Libellé de la transition (ex : "Soumettre", "Valider", "Rejeter") |
| created_at | Date de création |

---

### module_cv_status_transition_roles

**Quel rôle peut exécuter quelle transition.** Contrôle qui peut faire avancer le workflow (ex : seul le "Validateur" peut exécuter la transition "Valider").

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| transition_id | La transition concernée |
| module_role_id | Le rôle autorisé |
| created_at | Date de création |

---

### module_cv_forms

**Formulaire lié à une étape du workflow.** Chaque statut a son propre formulaire qui définit ce que l'utilisateur voit à cette étape. Un formulaire est une vue sur un sous-ensemble des champs de l'objet métier.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| status_id | Le statut auquel ce formulaire est associé |
| name | Nom du formulaire (ex : "Formulaire de saisie") |
| description | Description |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_form_fields

**Champ dans un formulaire.** Définit quels champs de l'objet métier apparaissent dans ce formulaire et leurs règles métier (obligatoire, conditions de visibilité, coloration). La visibilité et l'éditabilité par rôle sont gérées via les display configs (section 14).

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| form_id | Le formulaire |
| field_definition_id | Le champ de l'objet métier |
| is_required | Si le champ est obligatoire à cette étape |
| visibility_conditions | Conditions pour afficher/masquer dynamiquement ce champ (format JSON) |
| conditional_coloring | Règles de coloration conditionnelle basées sur la comparaison avec la valeur N-1 (format JSON) |
| created_at | Date de création |

---

### module_cv_validation_rules

**Règle de validation sur un champ.** Permet à l'intégrateur de configurer des contraintes de validation métier (ex : "ce champ doit être > 0", "ce champ est requis si tel autre champ = X").

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| field_definition_id | Le champ concerné (null = règle globale) |
| rule_type | Type de règle (ex : `min_value`, `max_value`, `required_if`, `regex`) |
| config | Configuration de la règle (format JSON) |
| created_at | Date de création |

---

## 10. Module Collecte de Valeur — Exécution

### module_cv_campaigns

**Campagne de collecte.** Instance concrète d'un type de campagne, lancée par un gestionnaire côté utilisateur final. Chaque campagne a une année de référence et peut être pré-remplie à partir d'une campagne précédente du même type.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| survey_type_id | Le type de campagne |
| name | Nom de la campagne (ex : "Collecte DUERP 2026") |
| description | Description |
| reference_year | Année de référence de la campagne |
| prefill_campaign_id | Campagne précédente choisie pour le pré-remplissage des valeurs N-1 (même type, terminée) |
| status | Statut de la campagne elle-même (brouillon, en cours, terminée) |
| start_date | Date de début |
| end_date | Date de fin |
| created_by | Gestionnaire qui a lancé la campagne |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_campaign_targets

**Entité ciblée par une campagne.** Quand une campagne est lancée, le gestionnaire sélectionne les entités organisationnelles qui doivent répondre.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| campaign_id | La campagne |
| eo_id | L'entité ciblée |
| created_at | Date d'ajout |

---

### module_cv_responses

**Réponse d'une entité à une campagne.** Chaque entité ciblée a une réponse qui suit le workflow (statuts, transitions). C'est l'objet métier instancié.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| campaign_id | La campagne |
| eo_id | L'entité qui répond |
| status_id | Statut actuel de la réponse dans le workflow |
| submitted_at | Date de soumission |
| submitted_by | Qui a soumis |
| validated_at | Date de validation |
| validated_by | Qui a validé |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_response_values

**Valeur saisie dans une réponse.** Stocke chaque valeur renseignée pour chaque champ de l'objet métier, pour une réponse donnée.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| response_id | La réponse |
| field_definition_id | Le champ |
| value | La valeur saisie |
| updated_at | Date de dernière modification |
| last_modified_by | Dernier utilisateur ayant modifié |

---

### module_cv_field_comments

**Commentaire sur un champ d'une réponse.** Permet à un validateur ou contributeur de commenter une valeur spécifique (ex : "Valeur incohérente, merci de vérifier").

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| response_id | La réponse |
| field_definition_id | Le champ commenté |
| comment | Le commentaire |
| created_at | Date du commentaire |
| created_by | Auteur du commentaire |

---

### module_cv_response_documents

**Document joint à une réponse.** Pièce jointe rattachée à un champ de type fichier dans une réponse.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| response_id | La réponse |
| field_definition_id | Le champ de type fichier |
| file_name | Nom du fichier |
| file_path | Chemin de stockage |
| file_size | Taille en octets |
| mime_type | Type MIME |
| display_order | Ordre d'affichage (si plusieurs fichiers par champ) |
| uploaded_at | Date d'upload |
| uploaded_by | Qui a uploadé |

---

### module_cv_response_audit_log

**Journal d'audit des modifications de réponses.** Trace chaque modification de valeur dans une réponse pour la traçabilité complète.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| response_id | La réponse concernée |
| field_definition_id | Le champ modifié |
| field_name | Nom du champ (sauvegardé pour garder l'historique même si le champ est supprimé) |
| old_value | Valeur avant modification |
| new_value | Valeur après modification |
| changed_by | Qui a fait la modification |
| changed_at | Date de la modification |

---

## 11. Module Organisation — Configuration d'affichage

### module_org_display_configs

**Configuration d'affichage du module Organisation.** Définit comment les entités organisationnelles sont présentées pour un groupe de rôles. Chaque configuration peut être partagée par plusieurs rôles.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module Organisation de ce client |
| name | Nom de la configuration (ex : "Vue Manager", "Vue Consultant") |
| default_view_mode | Mode de vue affiché par défaut : `list`, `tree` ou `canvas` (tous restent accessibles) |
| filters | Filtres disponibles pour l'utilisateur (format JSON) |
| pre_filters | Filtres appliqués automatiquement par défaut (format JSON) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_org_display_config_roles

**Association rôle ↔ configuration d'affichage Organisation.** Plusieurs rôles peuvent partager la même configuration.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| module_role_id | Le rôle qui utilise cette configuration |
| created_at | Date de création |

---

### module_org_display_config_fields

**Champ dans une configuration d'affichage Organisation.** Définit champ par champ ce qui est visible, éditable, exportable. Côté API, chaque modification est vérifiée contre cette table.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| field_slug | Identifiant du champ fixe (ex : "name", "code"). Null si champ custom |
| eo_field_definition_id | Champ custom des entités. Null si champ fixe |
| can_edit | Si le champ peut être modifié |
| show_in_table | Visible comme colonne dans le tableau |
| show_in_drawer | Visible dans le drawer de détail |
| show_in_export | Inclus dans l'export CSV |
| display_order | Ordre d'affichage |
| created_at | Date de création |

---

## 12. Module Users — Configuration d'affichage

### module_users_display_configs

**Configuration d'affichage du module Users.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module Users de ce client |
| name | Nom de la configuration |
| filters | Filtres disponibles (format JSON) |
| pre_filters | Filtres appliqués par défaut (format JSON) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_users_display_config_roles

**Association rôle ↔ configuration d'affichage Users.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| module_role_id | Le rôle qui utilise cette configuration |
| created_at | Date de création |

---

### module_users_display_config_fields

**Champ dans une configuration d'affichage Users.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| field_slug | Identifiant du champ fixe (ex : "first_name", "email"). Null si champ custom |
| user_field_definition_id | Champ custom utilisateur. Null si champ fixe |
| can_edit | Si le champ peut être modifié |
| show_in_table | Visible comme colonne dans le tableau |
| show_in_drawer | Visible dans le drawer de détail |
| show_in_export | Inclus dans l'export CSV |
| is_anonymized | Si le champ est masqué (ex : email → ju***@...) |
| display_order | Ordre d'affichage |
| created_at | Date de création |

---

## 13. Module Profils — Configuration d'affichage

### module_profils_display_configs

**Configuration d'affichage du module Profils.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module Profils de ce client |
| name | Nom de la configuration |
| filters | Filtres disponibles (format JSON) |
| pre_filters | Filtres appliqués par défaut (format JSON) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_profils_display_config_roles

**Association rôle ↔ configuration d'affichage Profils.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| module_role_id | Le rôle qui utilise cette configuration |
| created_at | Date de création |

---

### module_profils_display_config_fields

**Champ dans une configuration d'affichage Profils.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| field_slug | Identifiant du champ (ex : "name", "description", "roles", "entities") |
| can_edit | Si le champ peut être modifié |
| show_in_table | Visible comme colonne dans le tableau |
| show_in_drawer | Visible dans le drawer de détail |
| show_in_export | Inclus dans l'export CSV |
| display_order | Ordre d'affichage |
| created_at | Date de création |

---

## 14. Module Collecte de Valeur — Configuration d'affichage

### module_cv_form_display_configs

**Configuration d'affichage d'un formulaire CV.** Définit comment un formulaire (= une étape du workflow) est présenté pour un groupe de rôles. Remplace l'ancien système `module_cv_form_field_roles`.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| form_id | Le formulaire concerné |
| name | Nom de la configuration |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_form_display_config_roles

**Association rôle ↔ configuration d'affichage formulaire CV.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| module_role_id | Le rôle qui utilise cette configuration |
| created_at | Date de création |

---

### module_cv_form_display_config_fields

**Champ dans une configuration d'affichage formulaire CV.** Contrôle ce que chaque groupe de rôles peut voir et éditer dans un formulaire.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| form_field_id | Le champ du formulaire |
| can_view | Si le champ est visible |
| can_edit | Si le champ est modifiable |
| display_order | Ordre d'affichage |
| created_at | Date de création |

---

### module_cv_display_configs

**Configuration d'affichage des tableaux listing CV.** Définit comment les listes de campagnes et réponses sont présentées.

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| client_module_id | Le module CV de ce client |
| name | Nom de la configuration |
| filters | Filtres disponibles (format JSON) |
| pre_filters | Filtres appliqués par défaut (format JSON) |
| created_at | Date de création |
| updated_at | Date de dernière modification |

---

### module_cv_display_config_roles

**Association rôle ↔ configuration d'affichage listing CV.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| module_role_id | Le rôle qui utilise cette configuration |
| created_at | Date de création |

---

### module_cv_display_config_fields

**Champ dans une configuration d'affichage listing CV.**

| Colonne | Description |
|---|---|
| id | Identifiant unique |
| display_config_id | La configuration d'affichage |
| field_slug | Identifiant du champ fixe (ex : "status", "reference_year"). Null si champ custom |
| cv_field_definition_id | Champ custom du BO. Null si champ fixe |
| show_in_table | Visible comme colonne dans le tableau |
| show_in_export | Inclus dans l'export CSV |
| display_order | Ordre d'affichage |
| created_at | Date de création |
