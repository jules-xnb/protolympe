# Configuration des modules socle — WIP

Document de travail pour définir les permissions et configurations d'affichage des modules Organisation, Users et Profils.

## Statut : EN COURS DE VALIDATION

---

## Module Organisation

### Permissions configurables par rôle

| Permission | Description | Décision |
|---|---|---|
| `can_view_list` | Voir le tableau des entités | RETIRÉ — tout le monde peut voir |
| `can_view_tree` | Voir la vue arbre | RETIRÉ — tout le monde peut voir |
| `can_view_canvas` | Voir l'organigramme graphique | RETIRÉ — tout le monde peut voir |
| `can_view_detail` | Ouvrir le drawer de détail | RETIRÉ — tout le monde peut voir |
| `can_create` | Créer une entité | À VALIDER |
| `can_edit` | Modifier une entité | À VALIDER (inclut reparent/drag & drop) |
| `can_archive` | Archiver une entité | À VALIDER |
| `can_reparent` | Déplacer une entité dans l'arbre | RETIRÉ — inclus dans can_edit |
| `can_import` | Importer des entités (CSV) | À VALIDER |
| `can_export` | Exporter des entités (CSV) | À VALIDER |
| `can_view_history` | Voir l'historique des modifications | RETIRÉ — tout le monde peut y accéder |
| `can_manage_fields` | Gérer les champs custom | À VALIDER |

### Configuration d'affichage — À VALIDER

| Config | Description |
|---|---|
| Colonnes tableau | Quelles colonnes sont visibles, dans quel ordre |
| Colonnes par rôle | Quelles colonnes un rôle peut voir |
| Filtres disponibles | Quels filtres sont proposés |
| Pré-filtres par rôle | Filtres appliqués par défaut selon le rôle |
| Modes de vue par rôle | Quels modes (liste/arbre/canvas) sont accessibles par rôle |
| Champs du drawer | Quels champs sont visibles dans le détail |
| Champs éditables par rôle | Quels champs un rôle peut modifier dans le drawer |
| Commentaire obligatoire | Sur quels champs un commentaire est requis lors d'un changement |
| Champs export | Quelles colonnes sont incluses dans l'export |

---

## Module Users

### Permissions configurables par rôle — À VALIDER

| Permission | Description |
|---|---|
| `can_view_list` | Voir le tableau des utilisateurs |
| `can_view_detail` | Ouvrir le drawer de détail |
| `can_invite` | Inviter un utilisateur |
| `can_edit` | Modifier un utilisateur |
| `can_archive` | Archiver un utilisateur |
| `can_assign_profiles` | Attribuer des profils à un utilisateur |
| `can_import` | Importer des utilisateurs |
| `can_export` | Exporter des utilisateurs |
| `can_view_anonymized` | Masquage des données personnelles activé |

### Configuration d'affichage — À VALIDER

| Config | Description |
|---|---|
| Colonnes tableau | Quelles colonnes sont visibles, dans quel ordre |
| Colonnes par rôle | Quelles colonnes un rôle peut voir |
| Filtres disponibles | Quels filtres sont proposés |
| Pré-filtres par rôle | Filtres appliqués par défaut selon le rôle |
| Champs du drawer | Quels champs sont visibles dans le détail |
| Champs éditables par rôle | Quels champs un rôle peut modifier |
| Anonymisation par champ | Quels champs sont anonymisés pour quel rôle |
| Champs export | Quelles colonnes sont incluses dans l'export |

---

## Module Profils

### Permissions configurables par rôle — À VALIDER

| Permission | Description |
|---|---|
| `can_view_list` | Voir le tableau des profils |
| `can_view_detail` | Ouvrir le drawer de détail |
| `can_create` | Créer un profil |
| `can_edit` | Modifier un profil |
| `can_duplicate` | Dupliquer un profil |
| `can_archive` | Archiver un profil |
| `can_assign_roles` | Modifier les rôles modules d'un profil |
| `can_assign_eos` | Modifier les entités d'un profil |
| `can_import` | Importer des profils |
| `can_export` | Exporter des profils |

### Configuration d'affichage — À VALIDER

| Config | Description |
|---|---|
| Colonnes tableau | Quelles colonnes sont visibles, dans quel ordre |
| Colonnes par rôle | Quelles colonnes un rôle peut voir |
| Filtres disponibles | Quels filtres sont proposés |
| Pré-filtres par rôle | Filtres appliqués par défaut selon le rôle |
| Champs du drawer | Quels champs sont visibles dans le détail |
| Champs éditables par rôle | Quels champs un rôle peut modifier |
| Champs export | Quelles colonnes sont incluses dans l'export |

---

## Décisions en attente

- Supprimer `module_display_configs` et `module_display_config_roles` du schéma
- Définir les tables spécifiques par module pour les configs d'affichage une fois les permissions/configs validées
- Mettre à jour `architecture-bdd.md` et le schéma en conséquence
