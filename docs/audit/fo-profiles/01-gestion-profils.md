# Spec : FO — Gestion des profils (`/dashboard/:clientId/user/profiles`)

## Maquettes

### Page avec profils disponibles

```
+---------------------------------------------------------------------+
|  <- Retour        Mes profils                         [Archives >]  |
+---------------------------------------------------------------------+
|                                                                     |
|  +-------------------+  +-------------------+  +-------------------+|
|  | * Profil Compta   |  | Profil RH         |  | Profil IT         ||
|  |   [Actif]         |  |                   |  |                   ||
|  | 3 entites . 2 ro- |  | 1 entite . 4 ro-  |  | 5 entites . 1 ro- ||
|  | les               |  | les . 2 groupes   |  | le                 ||
|  | ...               |  | ...               |  | ...               ||
|  | ─────────────────  |  | ─────────────────  |  | ─────────────────  ||
|  |                   |  |     [Activer >]   |  |     [Activer >]   ||
|  +-------------------+  +-------------------+  +-------------------+|
|                                                                     |
+---------------------------------------------------------------------+
```

### Card profil detaillee (avec EOs, roles, groupes affiches)

```
+--- Card (hover:shadow-md) -----------------------------------------------+
|                                                                           |
|  CardHeader :                                                             |
|  +-------------------------------------------------------------------+   |
|  |  Profil Comptable                                                  |   |
|  |  3 entites . 2 roles . 1 groupe                                    |   |
|  +-------------------------------------------------------------------+   |
|                                                                           |
|  CardContent :                                                            |
|                                                                           |
|  --- EOs ──────────────────────────────────────────────────────────────   |
|  [Building2] Entites                                                      |
|  [Siege d]  [Filiale A]  [Filiale B]                                      |
|  <- Chip variant="outline", "d" = include_descendants                     |
|  <- Si > 3 EOs : [+N] chip supplementaire                                |
|                                                                           |
|  --- Roles ────────────────────────────────────────────────────────────   |
|  [Shield] Roles                                                           |
|  [- Conformite: Lecteur]  [- RH: Editeur]                                |
|  <- Chip outline avec pastille couleur (role_color)                       |
|  <- Format : "{role_category_name}: {role_name}" si categorie             |
|  <- Si > 3 roles : [+N] chip supplementaire                              |
|                                                                           |
|  --- Groupes (si template.groups.length > 0) ─────────────────────────   |
|  [Users] Groupes                                                          |
|  [Grp France]  [Grp Europe]                                               |
|  <- Chip outline, group_name                                              |
|  <- Si > 3 groupes : [+N] chip supplementaire                            |
|                                                                           |
|  ──────────────── border-t ──────────────────────────────────────────    |
|                                       [Activer >]                         |
|                                       <- Button default size="sm"         |
+───────────────────────────────────────────────────────────────────────────+
```

### Page sans profils (empty state)

```
+---------------------------------------------------------------------+
|  <- Retour        Mes profils                                       |
+---------------------------------------------------------------------+
|                                                                     |
|                    [UserCog icon]                                    |
|                                                                     |
|              Aucun profil disponible                                |
|         Aucun profil n'est configure pour                          |
|         votre compte. Contactez votre                              |
|         administrateur.                                            |
|                                                                     |
+---------------------------------------------------------------------+
```

### Page sans client selectionne

```
+---------------------------------------------------------------------+
|                                                                     |
|            Veuillez selectionner un client                          |
|                                                                     |
+---------------------------------------------------------------------+
```

### Etat "activation en cours" (loading)

```
+--- Card -----------------------------------+
|  Profil Comptable                          |
|  3 entites . 2 roles                        |
|  ...                                        |
|  ────────────────────────────────────────  |
|       [Loader2 ~ Activation...]            |
|       <- Button disabled + spinner          |
+---------------------------------------------+
```

---

## Regles metier

### Activation d'un profil

1. Appel `POST /auth/select-profile { profile_id }`
2. Le backend verifie que le profil est assigne a l'utilisateur, non archive, non soft-deleted
3. Le backend sauvegarde `accounts.last_active_profile_id = profile_id`
4. Le backend retourne un nouveau `access_token` avec `activeProfileId` dans le JWT
5. Le front stocke le nouveau token et redirige vers `USER_HOME`
6. Le front ne calcule jamais le perimetre EO lui-meme — le backend est la seule source de verite via le JWT

### Tables BDD impliquees

| Table | Colonnes cles | Usage |
|-------|---------------|-------|
| `client_profiles` | `id`, `client_id`, `name`, `description`, `is_archived` | Profils templates |
| `client_profile_eos` | `profile_id`, `eo_id`, `include_descendants`, `deleted_at` | EOs du profil |
| `client_profile_eo_groups` | `profile_id`, `group_id`, `deleted_at` | Groupes du profil |
| `client_profile_module_roles` | `profile_id`, `module_role_id`, `deleted_at` | Roles du profil |
| `client_profile_users` | `user_id`, `profile_id`, `deleted_at` | Assignation user<->profil |
| `accounts` | `last_active_profile_id` | Dernier profil actif |

### Profil actif

- La card du profil actif affiche un badge "Actif" et une bordure accent
- Le bouton "Activer" est masque pour le profil deja actif
- Comparer `activeProfile.id` avec `template.id` pour determiner le profil actif

### Empty state

- Un `client_user` ne cree pas de profils
- L'empty state doit dire "Aucun profil ne vous a ete attribue. Contactez votre administrateur."
- Pas de redirection vers une page MO/admin

### Bouton Archives

- Bouton dans le header pour naviguer vers `/user/profiles/archived`

---

## Endpoints API (existants)

| Methode | Route | Usage |
|---------|-------|-------|
| `GET` | `/auth/me/profiles` | Liste les profils de l'utilisateur connecte (non archives, non soft-deleted) |
| `POST` | `/auth/select-profile` | Active un profil, sauvegarde `last_active_profile_id`, retourne un nouveau JWT |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---------|-------|-------|--------|
| - | - | - | Enrichir `GET /auth/me/profiles` pour inclure les EOs, groupes et roles dans la reponse (lecture seule pour l'affichage dans les cards) |

---

## Comportements attendus

### Loading states
- **Chargement initial** : skeleton de 3 cards pendant le chargement des profils
- **Activation en cours** : bouton "Activer" remplace par un spinner + texte "Activation..." (button disabled)
- **Erreur de chargement** : message d'erreur avec bouton "Reessayer"

### Gestion d'erreurs
- **Echec activation** : toast d'erreur avec message explicite (profil archive, non assigne, etc.)
- **Echec chargement** : message d'erreur centre avec bouton "Reessayer"
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- Le bouton "Activer" ne doit pas etre cliquable deux fois (prevention du double-clic)
- Le profil doit etre assigne a l'utilisateur et non archive

### Permissions
- Seuls les profils assignes a l'utilisateur connecte sont affiches (pas tous les profils du client)

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Enrichir `GET /auth/me/profiles` | HAUTE | Ajouter les EOs, groupes et roles dans la reponse pour l'affichage dans les cards (lecture seule) |
