# Design — Système de Modules

## Contexte

L'application Delta RM est divisée en 3 vues :
- **Back Office (Admin)** : gestion clients + intégrateurs
- **Middle Office (Intégrateur)** : configuration des clients
- **Front Office (User Final)** : application des users clients

Le système de builder actuel (blocs drag-and-drop dans une grille 12 colonnes) n'est plus adapté : 95% des pages n'ont qu'un seul bloc, et le besoin évolue vers des affichages multi-pages complexes.

On introduit le concept de **modules** : des mini-applications prédéfinies en code, chacune avec son propre schéma DB, ses pages, sa logique métier.

## Décisions de design

1. **Modules prédéfinis en code** — chaque module correspond à un développement spécifique avec des tables dédiées
2. **Rôles et workflows cloisonnés par module** — pas de partage entre modules
3. **BO potentiellement partagés** — un BO peut être lié à plusieurs modules (futur)
4. **Builder conservé uniquement pour analytics/dashboard** — blocs métier retirés, seuls les blocs analytics resteront
5. **Navigation = page unique** — l'intégrateur gère l'arbre de nav (groupes, pages, modules) depuis une seule page
6. **Module = page de config dédiée** — clic sur un module → la sidebar change pour afficher les sous-pages de config
7. **Tout dans l'URL** — refresh-safe, partageable, pas d'état local pour la navigation

## Catalogue de modules (initial)

| Slug | Label | Description | BO | Workflows | Rôles |
|------|-------|-------------|----|-----------| ------|
| `organisation` | Organisation | Affichage des entités organisationnelles | ❌ | ❌ | ❌ |
| `user` | Utilisateurs | Gestion des utilisateurs | ❌ | ❌ | ❌ |
| `collecte_valeur` | Collecte de valeur | Questionnaires et collecte de réponses | ✅ | ✅ | ✅ |
| `assurance` | Assurance | Module assurance (à venir) | ❌ | ❌ | ❌ |
| `profils` | Profils | Gestion des profils utilisateurs | ❌ | ❌ | ❌ |

## Schéma de données

### Nouvelles tables

#### `client_modules`
Activation et configuration d'un module pour un client.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid PK | Identifiant unique |
| `client_id` | uuid FK → clients | Client concerné |
| `module_slug` | text | Identifie le module (`organisation`, `collecte_valeur`, etc.) |
| `config` | jsonb | Paramètres spécifiques au module |
| `is_active` | boolean (default true) | Module activé ou non |
| `created_at` | timestamp | Date de création |
| `updated_at` | timestamp | Date de modification |

Contrainte unique : `(client_id, module_slug)` — un module ne peut être activé qu'une fois par client.

#### `module_roles`
Rôles cloisonnés par module.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid PK | Identifiant unique |
| `client_module_id` | uuid FK → client_modules | Module parent |
| `name` | text | Nom du rôle (ex: "Validateur") |
| `slug` | text | Identifiant technique |
| `color` | text (nullable) | Couleur d'affichage |
| `description` | text (nullable) | Description du rôle |
| `is_active` | boolean (default true) | Rôle actif |
| `created_at` | timestamp | Date de création |

Contrainte unique : `(client_module_id, slug)`.

#### `module_permissions`
Matrice permissions × rôles par module.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid PK | Identifiant unique |
| `client_module_id` | uuid FK → client_modules | Module concerné |
| `permission_slug` | text | Identifiant de la permission (ex: `create_campaign`, `validate_response`) |
| `module_role_id` | uuid FK → module_roles | Rôle concerné |
| `is_granted` | boolean (default false) | Permission accordée ou non |
| `created_at` | timestamp | Date de création |

Contrainte unique : `(client_module_id, permission_slug, module_role_id)`.

Chaque module définit en code la liste de ses permissions possibles.

#### `module_workflows`
Workflows cloisonnés par module.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid PK | Identifiant unique |
| `client_module_id` | uuid FK → client_modules | Module parent |
| `name` | text | Nom du workflow |
| `description` | text (nullable) | Description |
| `is_active` | boolean (default true) | Workflow actif |
| `created_at` | timestamp | Date de création |
| `updated_at` | timestamp | Date de modification |

Les nœuds et transitions du workflow utiliseront des tables dédiées au module (ou des tables génériques `module_workflow_nodes`, `module_workflow_transitions`).

#### `module_bo_links`
Liaison BO ↔ module (un BO peut être dans plusieurs modules).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | uuid PK | Identifiant unique |
| `client_module_id` | uuid FK → client_modules | Module concerné |
| `bo_definition_id` | uuid FK → business_object_definitions | BO lié |
| `config` | jsonb (nullable) | Config spécifique au module pour ce BO |
| `display_order` | integer | Ordre d'affichage |
| `created_at` | timestamp | Date de création |

Contrainte unique : `(client_module_id, bo_definition_id)`.

### Tables existantes modifiées

#### `navigation_configs` — ajout de champs

| Champ ajouté | Type | Description |
|--------------|------|-------------|
| `type` | text (default 'group') | `'group'`, `'page'`, ou `'module'` |
| `client_module_id` | uuid FK → client_modules (nullable) | Rempli si `type = 'module'` |

Les champs existants (`parent_id`, `label`, `icon`, `display_order`, `is_active`, etc.) restent inchangés.

## Navigation MO — Structure des pages

### Page Navigation (`/navigation`)
L'arbre de navigation actuel, étendu avec les modules.

**Bouton "Ajouter" (dropdown) :**
- Nouveau groupe
- Nouvelle page (builder — analytics/dashboard uniquement)
- Nouveau module → dialog avec la liste des modules du catalogue non encore activés

**Dans l'arbre :**
- Les modules ont une icône distincte (🧩 ou icône du catalogue)
- Drag-and-drop pour réordonner (comme actuellement)
- Clic sur un groupe ou une page → comportement actuel (drawer/dialog)
- **Clic sur un module → navigation vers `/navigation/modules/:moduleId`**

### Page Config Module (`/navigation/modules/:moduleId/*`)

**La sidebar gauche change** pour afficher les sous-pages du module :

```
┌──────────────────────┐
│ ← Retour navigation  │  ← lien vers /navigation
│                       │
│ [Icône] Nom du module │
│ ───────────────────── │
│ Général               │  /navigation/modules/:id/general
│ Objets métiers        │  /navigation/modules/:id/bo        (si hasBo)
│ Workflows             │  /navigation/modules/:id/workflows  (si hasWorkflows)
│ Rôles                 │  /navigation/modules/:id/roles      (si hasRoles)
│ Permissions           │  /navigation/modules/:id/permissions (si hasRoles)
│ Paramètres            │  /navigation/modules/:id/settings
└──────────────────────┘
```

Les sections visibles dépendent du catalogue du module (`hasBo`, `hasWorkflows`, `hasRoles`).

**Sous-pages possibles (URL profondes) :**
```
/navigation/modules/:moduleId/bo/:boId           → config d'un BO
/navigation/modules/:moduleId/workflows/:wfId     → éditeur workflow
/navigation/modules/:moduleId/roles/:roleId       → détail d'un rôle
```

### Contenu des sous-pages

#### Général
- Nom affiché dans la nav FO
- Icône
- Actif / inactif
- Description

#### Objets métiers (si `hasBo`)
- Liste des BO liés au module
- Bouton "Lier un BO" (sélection parmi les BO du client)
- Clic sur un BO → page config BO (`/modules/:id/bo/:boId`)

#### Workflows (si `hasWorkflows`)
- Liste des workflows du module
- Bouton "Créer un workflow"
- Clic → éditeur workflow (`/modules/:id/workflows/:wfId`)

#### Rôles (si `hasRoles`)
- Liste des rôles du module
- CRUD nom, slug, couleur, description

#### Permissions (si `hasRoles`)
- Tableau croisé : permissions (lignes) × rôles (colonnes)
- Toggle par cellule
- Les permissions disponibles sont définies en code par le module

#### Paramètres
- Formulaire spécifique au module (défini en code)
- Sauvegarde dans `client_modules.config`

## Front Office — Rendu des modules

Quand le FO rencontre un `navigation_config` de type `module` :

1. Charge le `client_module` correspondant via `client_module_id`
2. Résout le composant React via le `module_slug`
3. Rend le composant du module avec sa config

```typescript
// Mapping slug → composant (en code)
const MODULE_RENDERERS: Record<string, React.LazyComponentType> = {
  organisation: lazy(() => import('./modules/OrganisationModule')),
  user: lazy(() => import('./modules/UserModule')),
  collecte_valeur: lazy(() => import('./modules/CollecteValeurModule')),
  assurance: lazy(() => import('./modules/AssuranceModule')),
  profils: lazy(() => import('./modules/ProfilsModule')),
};
```

Chaque module gère ses propres sous-pages en interne. Si le module a des sous-pages dans la navigation (type `module` avec enfants dans `navigation_configs`), le FO affiche la nav du module.

## URL Structure complète

### Middle Office (Intégrateur)
```
/navigation                                    → arbre de navigation
/navigation/modules/:moduleId/general          → config générale du module
/navigation/modules/:moduleId/bo               → BO liés
/navigation/modules/:moduleId/bo/:boId         → config d'un BO
/navigation/modules/:moduleId/workflows        → workflows du module
/navigation/modules/:moduleId/workflows/:wfId  → éditeur workflow
/navigation/modules/:moduleId/roles            → rôles du module
/navigation/modules/:moduleId/permissions      → matrice permissions
/navigation/modules/:moduleId/settings         → paramètres du module
```

### Front Office (User Final)
La navigation FO est pilotée par les `navigation_configs`. L'URL est définie par le `slug` du nav_config, comme actuellement.

## Migration depuis l'existant

1. Les pages builder existantes avec un seul bloc métier (`survey_creator`, `survey_responses`, etc.) seront remplacées par des modules
2. Les pages builder avec des blocs analytics/dashboard restent en tant que pages
3. Les rôles actuels (table `roles`) restent pour la compatibilité — les nouveaux modules utilisent `module_roles`
4. Les workflows actuels (table `workflows`) restent — les nouveaux modules utilisent `module_workflows`

## Hors scope

- Module Assurance (vide pour le moment)
- Blocs analytics dans le builder (à ajouter plus tard)
- Traductions
- Partage de BO entre modules (les tables sont prêtes mais le UI n'est pas prioritaire)
