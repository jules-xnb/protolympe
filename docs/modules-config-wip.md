# Configuration des modules — VALIDÉ

Rappel architecture :
- **Socle transverse** = données et gestion (orga, users, profils, listes) — côté intégrateur/admin
- **Modules** = vues FO qui exploitent le socle — côté utilisateur final
- Chaque module a ses propres rôles (`module_roles`), permissions (`module_permissions`), et ses propres tables de config d'affichage
- Les configs d'affichage sont **par rôle** : chaque rôle peut avoir sa propre vue dans un module

---

## Module Organisation

Permet aux utilisateurs finaux de consulter et gérer l'organigramme de leur entreprise.

### Permissions (liste fixe)

| Permission | Description |
|---|---|
| `can_create` | Créer une entité |
| `can_edit` | Modifier une entité (inclut réorganisation arbre) |
| `can_archive` | Archiver une entité |
| `can_import` | Importer des entités (CSV) |
| `can_export` | Exporter des entités (CSV) |
| `can_manage_fields` | Gérer les champs custom des entités |

Tout le monde peut voir (liste, arbre, canvas, détail, historique).

### Configuration d'affichage (par rôle)

| Config | Description |
|---|---|
| Colonnes tableau | Quelles colonnes sont visibles, dans quel ordre |
| Filtres disponibles | Quels filtres sont proposés |
| Pré-filtres | Filtres appliqués par défaut |
| Mode de vue par défaut | Quel mode (liste/arbre/canvas) est affiché par défaut (tous accessibles) |
| Champs du drawer | Quels champs sont visibles dans le détail |
| Champs export | Quelles colonnes sont incluses dans l'export |

Note : si un rôle a `can_edit`, il peut modifier tous les champs visibles. Pas de granularité champ × rôle.

Note : le commentaire obligatoire/optionnel au changement est configuré au niveau du champ (`eo_field_definitions.comment_on_change` = none/optional/required).

---

## Module Users

Permet aux utilisateurs finaux de consulter et gérer les utilisateurs de leur entreprise.

### Permissions (liste fixe)

| Permission | Description |
|---|---|
| `can_invite` | Inviter un utilisateur |
| `can_edit` | Modifier un utilisateur |
| `can_archive` | Archiver un utilisateur |
| `can_assign_profiles` | Attribuer et retirer des profils à un utilisateur |
| `can_import` | Importer des utilisateurs |
| `can_export` | Exporter des utilisateurs |

Tout le monde peut voir (liste et détail).

### Configuration d'affichage (par rôle)

| Config | Description |
|---|---|
| Colonnes tableau | Quelles colonnes sont visibles, dans quel ordre |
| Filtres disponibles | Quels filtres sont proposés |
| Pré-filtres | Filtres appliqués par défaut |
| Champs du drawer | Quels champs sont visibles dans le détail |
| Anonymisation par champ | Quels champs sont masqués (ex : email → ju***@...) |
| Champs export | Quelles colonnes sont incluses dans l'export |

---

## Module Profils

Permet aux utilisateurs finaux de consulter et gérer les profils (modèles de droits). Sert aussi de page de sélection de profil actif avant d'entrer dans le FO.

### Permissions (liste fixe)

| Permission | Description |
|---|---|
| `can_create` | Créer / dupliquer un profil |
| `can_edit` | Modifier un profil (inclut rôles et entités) |
| `can_archive` | Archiver un profil |
| `can_import` | Importer des profils |
| `can_export` | Exporter des profils |

Tout le monde peut voir (liste et détail).

### Configuration d'affichage (par rôle)

| Config | Description |
|---|---|
| Colonnes tableau | Quelles colonnes sont visibles, dans quel ordre |
| Filtres disponibles | Quels filtres sont proposés |
| Pré-filtres | Filtres appliqués par défaut |
| Champs du drawer | Quels champs sont visibles dans le détail |
| Champs export | Quelles colonnes sont incluses dans l'export |

---

## Module Collecte de Valeur

### Permissions (liste fixe, en cours de définition)

| Permission | Description |
|---|---|
| `can_configure_survey_type` | Configurer les types de campagne (champs, workflow, formulaires). Implique `can_manage_campaign` |
| `can_manage_campaign` | Lancer, gérer et clôturer les campagnes |

Note : d'autres permissions seront ajoutées au fur et à mesure.

### Configuration déjà en place

- `module_cv_form_fields` + display configs formulaires (champs × rôle × formulaire)
- `module_cv_status_transition_roles` (qui peut exécuter quelle transition)
- Display configs listing (tableaux campagnes/réponses)

---

## Prochaines étapes

- Créer les tables de config d'affichage par module dans le schéma
- Mettre à jour `architecture-bdd.md`
