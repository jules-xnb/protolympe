# Spec — Module `user` : Configuration MO

## Contexte

Le bloc `users` du page builder expose actuellement 10 options de configuration (via `UsersBlockConfigSection` et `UsersBlockInlineOptions`). Ces options migrent dans les pages de configuration du module `user` côté Middle Office (intégrateur), en suivant le même pattern que le module `organisation`.

Le module `user` a : `hasBo: false`, `hasWorkflows: false`, `hasRoles: true`.

Pages de config visibles :
- Général
- Affichage
- Rôles
- Permissions

---

## Permissions du module

Les options d'action du bloc deviennent des permissions dans la matrice rôles × permissions.

| Slug | Label | Correspond à |
|------|-------|-------------|
| `create_user` | Créer un utilisateur | `enable_create` |
| `edit_user` | Modifier les utilisateurs | `enable_edit` |
| `edit_user_profile` | Modifier les profils assignés | `enable_edit_profile` |
| `activate_deactivate` | Activer / désactiver | `enable_activate_deactivate` |
| `archive_user` | Archiver un utilisateur | `enable_archive` |
| `import` | Importer (CSV) | `enable_import` |
| `export` | Exporter (CSV) | `enable_export` |
| `view_history` | Voir l'historique | `enable_history` |

---

## Page Général

Contenu standard (identique à tous les modules) :

- **Label** : nom affiché dans la navigation FO (text, requis)
- **Icône** : sélecteur d'icône Lucide (défaut : `Users`)
- **Actif** : toggle on/off du module
- **Description** : textarea optionnel

---

## Page Affichage

Même pattern que le module `organisation` : liste de configurations d'affichage (`module_display_configs`), chacune assignée à des rôles du module.

### Liste des configurations

| Colonne | Description |
|---------|-------------|
| Nom | Nom de la configuration |
| Rôles | Chips des rôles associés |
| Actions | Modifier, Supprimer |

Bouton "Nouvelle configuration" → dialog avec nom + sélection de rôles.

### Édition d'une configuration (`/modules/:moduleId/display/:configId`)

Onglets :

#### Colonnes

Liste ordonnée (drag-and-drop) des champs affichés dans le tableau utilisateurs FO.

Champs de base disponibles :

| Champ | ID | Visible par défaut |
|-------|----|--------------------|
| Utilisateur | `full_name` | ✅ |
| Email | `email` | ✅ |
| Statut | `status` | ✅ |
| Profils | `profiles` | ✅ |
| Membre depuis | `member_since` | ✅ |

Les champs personnalisés du client (`user_field_definitions`) s'ajoutent dynamiquement à cette liste.

Chaque colonne a un toggle **Visible**.

#### Drawer

Liste ordonnée (drag-and-drop) des champs affichés dans le drawer de détails utilisateur.

Chaque champ a deux toggles : **Visible** et **Éditable**.

#### Filtres

Liste des champs de base avec checkbox **Filtrable**. Permet d'activer les filtres côté FO sur les colonnes sélectionnées (statut, profil, champs personnalisés).

#### Anonymisation

Configuration des champs masqués en `***`.

Champs anonymisables : `first_name`, `last_name`, `email`, `profile`.

**UI** : réutilisation du dialog `UsersAnonymizationDialog` existant (drag-and-drop entre colonnes "Anonymes" et "Visibles").

Sauvegardé dans `module_display_configs.config.anonymization`.

---

## Page Rôles

Tableau CRUD des rôles du module (`module_roles`).

| Colonne | Description |
|---------|-------------|
| Nom | Nom du rôle |
| Slug | Identifiant technique (auto-généré) |
| Couleur | Pastille couleur |
| Description | Description optionnelle |
| Actions | Modifier, Supprimer |

---

## Page Permissions

Matrice croisée permissions × rôles (`PermissionsMatrix`).

- Lignes : les 8 permissions listées ci-dessus
- Colonnes : les rôles du module
- Cellules : `Switch` toggle

---

## Mapping bloc → module

| Source bloc (actuelle) | Destination module |
|-----------------------|-------------------|
| `UsersBlockConfigSection` (page builder) | Page **Affichage** (colonnes, filtres, anonymisation) |
| `UsersBlockInlineOptions` (config par rôle) | Page **Permissions** (matrice) |
| `UsersBlockConfig.enable_filters` | Affichage → onglet Filtres |
| `UsersBlockConfig.enable_create` | Permission `create_user` |
| `UsersBlockConfig.enable_edit` | Permission `edit_user` |
| `UsersBlockConfig.enable_edit_profile` | Permission `edit_user_profile` |
| `UsersBlockConfig.enable_activate_deactivate` | Permission `activate_deactivate` |
| `UsersBlockConfig.enable_archive` | Permission `archive_user` |
| `UsersBlockConfig.enable_import` | Permission `import` |
| `UsersBlockConfig.enable_export` | Permission `export` |
| `UsersBlockConfig.enable_history` | Permission `view_history` |
| `UsersBlockConfig.anonymization` | Affichage → onglet Anonymisation |

---

## Impact sur le catalogue

```typescript
user: {
  slug: 'user',
  label: 'Utilisateurs',
  icon: 'Users',
  description: 'Gestion des utilisateurs',
  hasBo: false, hasWorkflows: false, hasRoles: true,
  permissions: [
    { slug: 'create_user', label: 'Créer un utilisateur' },
    { slug: 'edit_user', label: 'Modifier les utilisateurs' },
    { slug: 'edit_user_profile', label: 'Modifier les profils assignés' },
    { slug: 'activate_deactivate', label: 'Activer / désactiver' },
    { slug: 'archive_user', label: 'Archiver un utilisateur' },
    { slug: 'import', label: 'Importer (CSV)' },
    { slug: 'export', label: 'Exporter (CSV)' },
    { slug: 'view_history', label: "Voir l'historique" },
  ],
},
```

---

## FO — Résolution

Quand `UserModule.tsx` rend la vue FO :

1. Récupère le profil actif → rôles du module `user`
2. Charge les `module_permissions` → permissions effectives (OR sur les rôles)
3. Charge le `module_display_config` correspondant aux rôles de l'utilisateur
4. Construit la config :

```typescript
const config: UsersBlockConfig = {
  // Permissions
  enable_create: hasPermission('create_user'),
  enable_edit: hasPermission('edit_user'),
  enable_edit_profile: hasPermission('edit_user_profile'),
  enable_activate_deactivate: hasPermission('activate_deactivate'),
  enable_archive: hasPermission('archive_user'),
  enable_import: hasPermission('import'),
  enable_export: hasPermission('export'),
  enable_history: hasPermission('view_history'),
  // Affichage (depuis module_display_configs)
  enable_filters: displayConfig.filters?.length > 0,
  anonymization: displayConfig.anonymization ?? [],
};
// + colonnes visibles, drawer fields depuis displayConfig
```

Le composant `UsersBlockView` existant continue de fonctionner sans modification.
