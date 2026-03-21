# Regles d'acces — Delta RM

## 1. Profils client

### Qu'est-ce qu'un profil ?

Un **profil client** est un template de droits partage. Il definit :
- **Quelles entites organisationnelles** sont accessibles (avec ou sans descendants)
- **Quels regroupements** d'entites sont accessibles
- **Quels roles** dans quels modules sont accordes

```
Profil = EO(s) (descendance on/off) x Regroupement(s) (EO(s) + descendance on/off) x Module_role(s)
```

Un profil est **partage** : modifier un role ou une EO dans un profil impacte **tous les utilisateurs** qui ont ce profil.

### Pas d'union de profils

Un utilisateur peut avoir **plusieurs profils**. Il **switch** entre ses profils dans le FO — ses droits sont **uniquement ceux du profil actif selectionne**, pas l'union de tous ses profils.

L'**union** se fait **a l'interieur** du profil :
- Union des EOs directes + EOs via regroupements = perimetre EO
- Union des roles modules = roles et permissions

### Resolution automatique du profil au login

A chaque connexion (signin, refresh, SSO callback), le backend resout le profil dans cet ordre :

1. **Dernier profil utilise** (`accounts.last_active_profile_id`) → si encore valide (non archive, non soft-deleted) → l'utiliser
2. **Profil unique** → si l'utilisateur n'a qu'un seul profil → l'utiliser
3. **Aucun** → si plusieurs profils et pas de dernier → l'utilisateur doit choisir

### Flow utilisateur

**Cas 1 : profil auto-resolu (90% des cas)**
1. L'utilisateur se connecte → le backend detecte son dernier profil ou son profil unique
2. Le profil est **automatiquement active** dans le JWT → `activeProfileId` est set
3. L'utilisateur accede directement au FO, pas de page de selection

**Cas 2 : premiere connexion avec plusieurs profils**
1. L'utilisateur se connecte → recoit un access token **sans** profil actif
2. Le front detecte que `activeProfileId` est absent → affiche la page de selection
3. Il appelle `GET /auth/me/profiles` → voit la liste de ses profils disponibles
4. Il selectionne un profil → appelle `POST /auth/select-profile` avec `{profile_id}`
5. Le backend **sauvegarde** ce choix dans `accounts.last_active_profile_id`
6. Il recoit un **nouveau access token** avec `activeProfileId` dans le JWT

**Switch de profil**
- En bas a gauche du menu FO, un bouton "Changer de profil"
- Appelle `POST /auth/select-profile` avec le nouveau `{profile_id}`
- Le backend met a jour `last_active_profile_id` et retourne un nouveau JWT
- A la prochaine reconnexion, le dernier profil selectionne sera restaure

### JWT

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "persona": "client_user",
  "activeProfileId": "profile-id"
}
```

`activeProfileId` est ajoute au JWT : automatiquement si dernier profil ou profil unique, sinon apres `POST /auth/select-profile`.

---

## 2. Perimetre EO

### Resolution

Pour le profil actif de l'utilisateur :

```
Profil actif selectionne :
  |-- client_profile_eos (EO directes du profil)
  |   |-- EO id=A (include_descendants=false) -> {A}
  |   +-- EO id=B (include_descendants=true)  -> {B, B1, B2, B1a, ...}
  |
  +-- client_profile_eo_groups (Regroupements du profil)
      +-- Groupe id=G (si isActive=true)
          +-- eo_group_members (si deletedAt IS NULL)
              |-- EO id=C (include_descendants=false) -> {C}
              +-- EO id=D (include_descendants=true)  -> {D, D1, D2, ...}

Perimetre EO du profil = UNION de tout ci-dessus
```

### Resolution des descendants

Quand `include_descendants = true` :
1. Recuperer le `path` et l'`id` de l'entite
2. Construire le prefixe : `{path}/{id}` (ou juste `{id}` si racine)
3. Requeter : `WHERE path LIKE '{prefix}%'`
4. Ajouter tous les resultats au perimetre

**Exemple :**
```
Entreprise (path='', id=1)
|-- Direction RH (path='1', id=2)
|   |-- Service Paie (path='1/2', id=5)
|   +-- Service Formation (path='1/2', id=6)
|-- Direction Finance (path='1', id=3)
+-- Direction IT (path='1', id=4)
```

Profil avec `EO id=2 (include_descendants=true)` -> perimetre = {2, 5, 6}

### Filtres appliques

- EO archivees (`isArchived=true`) -> exclues
- EO inactives (`isActive=false`) -> exclues
- Groupes inactifs (`eoGroups.isActive=false`) -> exclus
- Membres/EOs/groupes soft-deleted (`deletedAt IS NOT NULL`) -> exclus

### Verification cote API

| Route | Verification |
|---|---|
| `GET /clients/:clientId/eo` | Filtre : seules les entites dans le perimetre sont retournees |
| `GET /clients/:clientId/eo/:id` | Verifie que l'entite est dans le perimetre |
| `PATCH /clients/:clientId/eo/:id` | Perimetre + permission `can_edit` + champs autorises |
| `GET /clients/:clientId/users` | Filtre : seuls les utilisateurs dont un profil donne acces a une EO du perimetre |
| `GET /modules/:moduleId/cv/campaigns/:id/responses` | Filtre par `eo_id` dans le perimetre |

---

## 3. Roles modules

### Resolution

```
Profil actif :
  +-- client_profile_module_roles (si deletedAt IS NULL)
      +-- module_roles (si isActive=true)
          +-- module_permissions (isGranted=true)
```

Un utilisateur peut avoir **plusieurs roles dans le meme module** (via le meme profil).

### Ce que les roles determinent

| Dimension | Effet |
|---|---|
| **Acces au module** | L'utilisateur ne voit un module dans le menu FO que s'il a au moins un role dedans |
| **Permissions** | Union des permissions de tous ses roles dans le module |
| **Display config** | Chaque role est assigne a une display config (premier role trouve) |
| **Transitions workflow (CV)** | L'utilisateur peut executer une transition si au moins un de ses roles est autorise |

---

## 4. Display configs — Controle champ par champ

### Principe

Chaque module a ses propres tables de display config :
- `module_{slug}_display_configs` -- une config nommee
- `module_{slug}_display_config_roles` -- quels roles utilisent cette config
- `module_{slug}_display_config_fields` -- quels champs, avec quels droits

### Droits par champ

| Flag | Effet |
|---|---|
| `show_in_table` | Colonne visible dans le tableau |
| `show_in_drawer` | Champ visible dans le detail |
| `show_in_export` | Colonne dans l'export CSV |
| `can_edit` | Champ modifiable (verifie cote API sur PATCH) |
| `can_view` (CV forms) | Champ visible dans le formulaire |
| `is_anonymized` (Users) | Champ masque |

### Verification cote API (securite)

Sur chaque `PATCH` pour un `client_user` :
1. Extraire les champs du body
2. Appeler `getEditableFieldSlugs()` ou `getEditableCvFormFieldIds()`
3. Verifier chaque champ du body contre le set autorise
4. Si un champ non autorise -> 403

**Les `admin_delta` et `integrator_*` bypassen cette verification.**

---

## 5. Matrice d'acces par persona

### admin_delta

| Dimension | Acces |
|---|---|
| Clients | Tous |
| Modules | Tous |
| EO | Toutes (pas de filtre perimetre) |
| Champs | Tous (pas de verification display config) |
| Actions | Toutes |

### integrator_delta / integrator_external

| Dimension | Acces |
|---|---|
| Clients | Uniquement ses clients assignes (`integrator_client_assignments`) |
| Modules | Tous les modules des clients assignes |
| EO | Toutes les EO des clients assignes (pas de filtre perimetre) |
| Champs | Tous (pas de verification display config) |
| Actions | Toutes sauf les actions reservees FO |

### client_user (AVEC profil actif)

| Dimension | Acces |
|---|---|
| Clients | Uniquement le client du profil selectionne |
| Modules | Uniquement ceux ou le profil a un role |
| EO | Uniquement le perimetre du profil |
| Champs | Uniquement les champs autorises par sa display config |
| Actions | Uniquement les permissions accordees a ses roles |

### client_user (SANS profil actif)

| Dimension | Acces |
|---|---|
| Endpoints autorises | `GET /auth/me/profiles`, `POST /auth/select-profile` uniquement |
| Donnees client | Aucun acces |

---

## 6. Regles metier des profils

### Regle 1 : Pas de profil vide

Un profil doit toujours contenir :
- **Au moins 1 entite OU 1 regroupement** (sinon pas de perimetre)
- **ET au moins 1 role module** (sinon pas d'acces a aucun module)

Verifie a la creation et a chaque suppression d'EO/groupe/role (400 si vide apres l'operation).

### Regle 2 : Pas de doublons

Deux profils dans le meme client ne peuvent pas etre identiques. Ils sont identiques si et seulement si ils ont exactement les memes EOs (avec memes flags descendants), les memes regroupements, et les memes roles.

Detection par **fingerprint** :
```
fingerprint = {
  eos: JSON trie de [{eoId, includeDescendants}],
  groups: JSON trie de [groupId],
  roles: JSON trie de [moduleRoleId]
}
```

Verifie a la creation et a chaque modification (409 si doublon avec le nom du profil existant).

### Regle 3 : Profil partage (pas de copie)

Quand on configure les droits d'un utilisateur :
1. `POST /profiles/find-match` avec la config souhaitee -> retourne les profils correspondants
2. Si match -> associer le profil existant (pas de creation)
3. Si pas de match -> creer un nouveau profil

### Impact de la modification d'un profil

| Modification | Impact |
|---|---|
| Ajouter un role module | Tous les utilisateurs ayant ce profil gagnent les permissions |
| Retirer un role module | Tous perdent les permissions (max 1 min, cache TTL) |
| Ajouter une EO | Tous voient cette EO et ses donnees |
| Activer la descendance | Tous voient les sous-entites |
| Archiver le profil | Tous perdent tous les droits de ce profil |

---

## 7. Soft delete obligatoire

Toutes les tables de liaison dans la chaine d'acces filtrent `WHERE deleted_at IS NULL` :

| Table | Filtre |
|---|---|
| `client_profile_users` | `isNull(clientProfileUsers.deletedAt)` |
| `client_profile_eos` | `isNull(clientProfileEos.deletedAt)` |
| `client_profile_eo_groups` | `isNull(clientProfileEoGroups.deletedAt)` |
| `client_profile_module_roles` | `isNull(clientProfileModuleRoles.deletedAt)` |
| `eo_group_members` | `isNull(eoGroupMembers.deletedAt)` |

---

## 8. Chaine d'acces complete

```
accounts
  +-- user_client_memberships (quel client)
      +-- client_profile_users (quels profils)
          |-- client_profile_eos (quelles EO directes + descendants)
          |-- client_profile_eo_groups -> eo_group_members (quelles EO via groupes)
          +-- client_profile_module_roles (quels roles dans quels modules)
              |-- module_permissions (quelles actions autorisees)
              +-- module_{slug}_display_config_roles -> _fields (quels champs)
```

## 9. Implementation

| Fichier | Role |
|---|---|
| `lib/cache.ts` | `getUserPermissions()` — charge et cache le perimetre + roles + permissions |
| `lib/field-access.ts` | `getEditableFieldSlugs()`, `getEditableCvFormFieldIds()` — champs editables |
| `lib/profile-duplicate-check.ts` | `findDuplicateProfile()`, `findMatchingProfiles()`, `isProfileEmpty()` |
| `middleware/auth.ts` | Verification JWT |
| `middleware/client-access.ts` | Verification acces au client |
| `middleware/module-access.ts` | Verification acces au module + permissions |
