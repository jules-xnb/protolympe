# Spec — Module `profils` : Configuration MO

## Contexte

Le bloc `profiles` du page builder expose 7 options de configuration (via `ProfilesBlockConfigSection`). Ces options migrent dans les pages de configuration du module `profils`, en suivant le même pattern que le module `organisation`.

Le module `profils` a : `hasBo: false`, `hasWorkflows: false`, `hasRoles: true`.

Pages de config visibles :
- Général
- Affichage
- Rôles
- Permissions

---

## Permissions du module

| Slug | Label | Correspond à |
|------|-------|-------------|
| `create_profile` | Créer un profil | `enable_create` |
| `edit_profile` | Modifier un profil | `enable_edit` |
| `duplicate_profile` | Dupliquer un profil | `enable_duplicate` |
| `archive_profile` | Archiver un profil | `enable_delete` |
| `import` | Importer (CSV) | `enable_import` |
| `export` | Exporter (CSV) | `enable_export` |

---

## Page Général

Contenu standard :

- **Label** : nom affiché dans la navigation FO (text, requis)
- **Icône** : sélecteur d'icône Lucide (défaut : `UserCircle`)
- **Actif** : toggle on/off du module
- **Description** : textarea optionnel

---

## Page Affichage

Liste de configurations d'affichage (`module_display_configs`), chacune assignée à des rôles du module.

### Liste des configurations

| Colonne | Description |
|---------|-------------|
| Nom | Nom de la configuration |
| Rôles | Chips des rôles associés |
| Actions | Modifier, Supprimer |

### Édition d'une configuration (`/modules/:moduleId/display/:configId`)

Onglets :

#### Colonnes

Liste ordonnée (drag-and-drop) des colonnes affichées dans le tableau des profils FO.

| Champ | ID | Visible par défaut |
|-------|----|--------------------|
| Nom | `name` | ✅ |
| Rôles | `roles` | ✅ |
| Entités organisationnelles | `eos` | ✅ |
| Regroupements | `groups` | ✅ |
| Nombre d'utilisateurs | `user_count` | ✅ |

Chaque colonne a un toggle **Visible**.

#### Drawer

Liste ordonnée des champs affichés dans le drawer de détails du profil.

Chaque champ a deux toggles : **Visible** et **Éditable**.

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

- Lignes : les 6 permissions listées ci-dessus
- Colonnes : les rôles du module
- Cellules : `Switch` toggle

---

## Mapping bloc → module

| Source bloc (actuelle) | Destination module |
|-----------------------|-------------------|
| `ProfilesBlockConfigSection` | Page **Affichage** (colonnes) |
| `enable_create` | Permission `create_profile` |
| `enable_edit` | Permission `edit_profile` |
| `enable_duplicate` | Permission `duplicate_profile` |
| `enable_delete` | Permission `archive_profile` |
| `enable_import` | Permission `import` |
| `enable_export` | Permission `export` |
| `columns` | Affichage → onglet Colonnes |

---

## Impact sur le catalogue

```typescript
profils: {
  slug: 'profils',
  label: 'Profils',
  icon: 'UserCircle',
  description: 'Gestion des profils utilisateurs',
  hasBo: false, hasWorkflows: false, hasRoles: true,
  permissions: [
    { slug: 'create_profile', label: 'Créer un profil' },
    { slug: 'edit_profile', label: 'Modifier un profil' },
    { slug: 'duplicate_profile', label: 'Dupliquer un profil' },
    { slug: 'archive_profile', label: 'Archiver un profil' },
    { slug: 'import', label: 'Importer (CSV)' },
    { slug: 'export', label: 'Exporter (CSV)' },
  ],
},
```

---

## FO — Résolution

```typescript
const config: ProfilesBlockConfig = {
  // Permissions
  enable_create: hasPermission('create_profile'),
  enable_edit: hasPermission('edit_profile'),
  enable_duplicate: hasPermission('duplicate_profile'),
  enable_delete: hasPermission('archive_profile'),
  enable_import: hasPermission('import'),
  enable_export: hasPermission('export'),
  // Affichage (depuis module_display_configs)
  columns: displayConfig.list_columns
    ?.filter(c => c.visible)
    .map(c => ({ field_id: c.field_id, field_name: c.field_name })),
};
```

Le composant `ProfilesBlockView` existant continue de fonctionner sans modification.
