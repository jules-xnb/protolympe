# Modèle d'accès détaillé — Delta RM

## Le tryptique d'accès

Chaque utilisateur final (`client_user`) accède aux fonctionnalités via ses **profils client**. Un profil définit trois dimensions :

```
Profil = EO(s) (descendance on/off) × Regroupements (EO(s) + descendance on/off) × Module_role(s)
```

Un utilisateur peut avoir **plusieurs profils**. Ses droits sont l'**union** de tous ses profils actifs (non archivés, non soft-deleted).

---

## 1. Résolution du périmètre EO

### Sources du périmètre

Pour un utilisateur donné, le périmètre EO est calculé ainsi :

```
Pour chaque profil non archivé de l'utilisateur :
  ├── client_profile_eos (EO directes)
  │   ├── EO id=A (include_descendants=false) → {A}
  │   └── EO id=B (include_descendants=true)  → {B, B1, B2, B1a, B1b, ...}
  │
  └── client_profile_eo_groups (Regroupements)
      └── Groupe id=G
          └── eo_group_members
              ├── EO id=C (include_descendants=false) → {C}
              └── EO id=D (include_descendants=true)  → {D, D1, D2, ...}

Périmètre final = UNION de tous les sets ci-dessus
```

### Résolution des descendants

Quand `include_descendants = true` pour une entité :

1. On récupère le `path` et l'`id` de l'entité
2. On construit le préfixe : `{path}/{id}` (ou juste `{id}` si l'entité est racine)
3. On requête : `SELECT id FROM eo_entities WHERE client_id = ? AND path LIKE '{prefix}%'`
4. Tous les résultats sont ajoutés au périmètre

**Exemple concret :**

```
Entreprise (path='', id=1)
├── Direction RH (path='1', id=2)
│   ├── Service Paie (path='1/2', id=5)
│   └── Service Formation (path='1/2', id=6)
├── Direction Finance (path='1', id=3)
│   └── Comptabilité (path='1/3', id=7)
└── Direction IT (path='1', id=4)
```

Si le profil a `EO id=2 (include_descendants=true)` :
- Préfixe = `1/2`
- LIKE `1/2%` → trouve id=5 (path='1/2') et id=6 (path='1/2')
- Périmètre = {2, 5, 6}

### Implémentation

Le périmètre est calculé dans `lib/cache.ts` → `getUserPermissions()` et mis en cache pour 1 minute (`eoIdsByClient: Record<string, Set<string>>`).

### Vérification à chaque requête

| Route | Vérification |
|---|---|
| `GET /clients/:clientId/eo` | Filtre les résultats : seules les entités dans le périmètre sont retournées |
| `GET /clients/:clientId/eo/:id` | Vérifie que l'entité est dans le périmètre |
| `POST /clients/:clientId/eo` | Permission `can_create` requise (pas de filtre périmètre sur la création) |
| `PATCH /clients/:clientId/eo/:id` | Vérifie périmètre + permission `can_edit` + champs autorisés par display config |
| `GET /clients/:clientId/users` | Filtre les utilisateurs dont au moins un profil donne accès à une EO du périmètre |
| `GET /modules/:moduleId/cv/campaigns/:id/responses` | Filtre les réponses dont l'`eo_id` est dans le périmètre |

---

## 2. Résolution des rôles modules

### Sources des rôles

```
Pour chaque profil non archivé de l'utilisateur :
  └── client_profile_module_roles
      ├── module_role id=R1 (dans client_module M1)
      ├── module_role id=R2 (dans client_module M1)
      └── module_role id=R3 (dans client_module M2)

Rôles par module = {
  M1: [R1, R2],
  M2: [R3],
}
```

Un utilisateur peut avoir **plusieurs rôles dans le même module** (via différents profils).

### Conséquences des rôles

| Dimension | Ce que les rôles déterminent |
|---|---|
| **Accès au module** | Un utilisateur ne voit un module dans le menu FO que s'il a au moins un rôle dedans |
| **Permissions** | Chaque rôle a des permissions (`module_permissions`). Si un rôle a `can_edit = true`, l'utilisateur peut éditer. Les permissions sont l'union de tous ses rôles dans le module |
| **Display config** | Chaque rôle est assigné à une display config. Si l'utilisateur a plusieurs rôles, il prend la display config du premier rôle trouvé (un rôle ne peut être assigné qu'à une seule config) |
| **Transitions workflow (CV)** | Chaque transition a des rôles autorisés. L'utilisateur peut exécuter une transition si au moins un de ses rôles est dans `module_cv_status_transition_roles` |

### Implémentation

Les rôles sont calculés dans `lib/cache.ts` → `getUserPermissions()` :
- `moduleRolesByClient` : rôles par client par module
- `permissionsByModule` : permissions agrégées par module

---

## 3. Display configs — Contrôle champ par champ

### Principe

Chaque module a ses propres tables de display config :
- `module_{slug}_display_configs` → une config nommée
- `module_{slug}_display_config_roles` → quels rôles utilisent cette config
- `module_{slug}_display_config_fields` → quels champs, avec quels droits

### Résolution pour un utilisateur

```
1. Récupérer les roleIds de l'utilisateur dans le module
2. Chercher dans module_{slug}_display_config_roles quel display_config_id est associé à ces rôles
3. Charger les fields de cette config
4. Appliquer :
   - show_in_table → colonnes visibles dans le tableau
   - show_in_drawer → champs visibles dans le détail
   - show_in_export → colonnes dans l'export CSV
   - can_edit → champs modifiables (vérifié côté API sur PATCH)
   - can_view (CV forms) → champs visibles dans le formulaire
   - is_anonymized (Users) → champs masqués
```

### Vérification côté API (sécurité)

Sur chaque `PATCH` pour un `client_user` :

```
1. Extraire les champs du body de la requête
2. Appeler getEditableFieldSlugs(userId, moduleId, moduleSlug) ou getEditableCvFormFieldIds(...)
3. Pour chaque champ dans le body :
   - Si c'est un champ fixe : vérifier que le field_slug est dans le set
   - Si c'est un champ custom : vérifier que le field_definition_id est dans le set
4. Si un champ non autorisé est trouvé → 403 avec le nom du champ
```

**Important :** Les `admin_delta` et `integrator_*` **bypassen** cette vérification. Ils ont accès à tous les champs.

### Implémentation

`lib/field-access.ts` :
- `getEditableFieldSlugs(userId, moduleId, moduleSlug)` → pour Organisation, Users, Profils
- `getEditableCvFormFieldIds(userId, moduleId, formId)` → pour CV formulaires

---

## 4. Matrice complète des accès par persona

### admin_delta

| Dimension | Accès |
|---|---|
| Clients | Tous |
| Modules | Tous |
| EO | Toutes (pas de filtre périmètre) |
| Champs | Tous (pas de vérification display config) |
| Actions | Toutes (pas de vérification permissions) |

### integrator_delta / integrator_external

| Dimension | Accès |
|---|---|
| Clients | Uniquement ses clients assignés (`integrator_client_assignments`) |
| Modules | Tous les modules des clients assignés |
| EO | Toutes les EO des clients assignés (pas de filtre périmètre) |
| Champs | Tous (pas de vérification display config) |
| Actions | Toutes sauf les actions réservées FO (lancement campagnes, etc.) |

### client_user

| Dimension | Accès |
|---|---|
| Clients | Uniquement ses clients (`user_client_memberships` actifs) |
| Modules | Uniquement les modules où il a un rôle (via profils) |
| EO | Uniquement son périmètre (via profils → EOs + groupes + descendants) |
| Champs | Uniquement les champs autorisés par sa display config |
| Actions | Uniquement les permissions accordées à ses rôles |

---

## 5. Flux complet — Exemple concret

**Scénario :** L'utilisateur Marie, client Total, veut modifier une entité organisationnelle.

```
1. Marie s'authentifie → JWT avec {sub, email, persona: 'client_user'}

2. Marie appelle PATCH /clients/total-id/eo/entity-123
   ├── authMiddleware → vérifie le JWT ✓
   ├── requireClientAccess() → vérifie que Marie a un membership actif chez Total ✓
   │
   ├── Vérification périmètre EO :
   │   ├── Cache → getUserPermissions(marie-id)
   │   ├── Profil "Chef RH" → EO "Direction RH" (descendants=true) → {2, 5, 6}
   │   ├── Profil "Gestionnaire IT" → Groupe "Sites Île-de-France" → {10, 11, 12}
   │   ├── Périmètre total = {2, 5, 6, 10, 11, 12}
   │   └── entity-123 est-il dans le périmètre ? → OUI (entity-123 = id 5) ✓
   │
   ├── Vérification permission :
   │   ├── Module Organisation pour Total → module-org-id
   │   ├── Marie a le rôle "Editeur" dans ce module (via profil "Chef RH")
   │   ├── "Editeur" a la permission can_edit = true ✓
   │
   ├── Vérification champs :
   │   ├── getEditableFieldSlugs(marie-id, module-org-id, 'organisation')
   │   ├── Display config "Vue Editeur" → champs éditables : {name, description, custom_field_1}
   │   ├── Marie envoie {name: "Nouveau nom", custom_field_2: "valeur"}
   │   └── custom_field_2 n'est PAS dans le set → 403 REFUSÉ ✗
   │
   └── Si tous les champs sont autorisés → UPDATE en base ✓
```

---

## 6. Tables impliquées dans la chaîne d'accès

```
accounts
  └── user_client_memberships (quel client)
      └── client_profile_users (quels profils)
          ├── client_profile_eos (quelles EO directes + descendants)
          ├── client_profile_eo_groups → eo_group_members (quelles EO via groupes + descendants)
          └── client_profile_module_roles (quels rôles dans quels modules)
              ├── module_permissions (quelles actions autorisées)
              └── module_{slug}_display_config_roles → module_{slug}_display_config_fields (quels champs)
```

---

## 7. Filtres soft delete

Toutes les tables de liaison dans la chaîne d'accès ont un `deleted_at`. **Chaque requête DOIT filtrer `WHERE deleted_at IS NULL`** :

| Table | Filtre obligatoire |
|---|---|
| `client_profile_users` | `isNull(clientProfileUsers.deletedAt)` |
| `client_profile_eos` | `isNull(clientProfileEos.deletedAt)` |
| `client_profile_eo_groups` | `isNull(clientProfileEoGroups.deletedAt)` |
| `client_profile_module_roles` | `isNull(clientProfileModuleRoles.deletedAt)` |
| `eo_group_members` | `isNull(eoGroupMembers.deletedAt)` |

**Où vérifier :**
- `lib/cache.ts` → `getUserPermissions()` (toutes les 5 tables)
- `lib/field-access.ts` → `getEditableFieldSlugs()` (tables _roles)
- Routes avec queries sur ces tables (profiles.ts, users.ts, eo.ts, modules.ts)
