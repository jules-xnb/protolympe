# Modèle d'accès détaillé — Delta RM

## Principe fondamental

Un utilisateur final (`client_user`) accède au FO en **sélectionnant un profil actif**. Ses droits sont **uniquement ceux du profil sélectionné**, pas l'union de tous ses profils.

**Pas d'union de profils.** L'utilisateur switch entre ses profils dans le FO.

---

## Le tryptique d'accès (dans un profil)

```
Profil actif = EO(s) (descendance on/off) × Regroupement(s) (EO(s) + descendance on/off) × Module_role(s)
```

L'**union** se fait **à l'intérieur** du profil :
- Union des EOs directes + EOs via regroupements → périmètre EO
- Union des rôles modules → rôles et permissions

---

## Flow utilisateur

### Cas 1 : utilisateur avec 1 seul profil (90% des cas)
1. L'utilisateur se connecte → le backend détecte qu'il a 1 seul profil
2. Le profil est **automatiquement activé** dans le JWT → `activeProfileId` est set
3. L'utilisateur accède directement au FO, pas de page de sélection

### Cas 2 : utilisateur avec plusieurs profils
1. L'utilisateur se connecte → reçoit un access token **sans** profil actif
2. Le front détecte que `activeProfileId` est absent → affiche la page de sélection
3. Il appelle `GET /auth/me/profiles` → voit la liste de ses profils disponibles
4. Il sélectionne un profil → appelle `POST /auth/select-profile` avec `{profile_id}`
5. Il reçoit un **nouveau access token** avec `activeProfileId` dans le JWT
6. Il peut changer de profil en rappelant `POST /auth/select-profile`

---

## Résolution du périmètre EO (pour le profil actif)

```
Profil actif sélectionné :
  ├── client_profile_eos (EO directes du profil)
  │   ├── EO id=A (include_descendants=false) → {A}
  │   └── EO id=B (include_descendants=true)  → {B, B1, B2, B1a, ...}
  │
  └── client_profile_eo_groups (Regroupements du profil)
      └── Groupe id=G (si isActive=true)
          └── eo_group_members (si deletedAt IS NULL)
              ├── EO id=C (include_descendants=false) → {C}
              └── EO id=D (include_descendants=true)  → {D, D1, D2, ...}

Périmètre EO du profil = UNION de tout ci-dessus
```

**Filtres appliqués :**
- EO archivées (`isArchived=true`) → exclues
- EO inactives (`isActive=false`) → exclues
- Groupes inactifs (`eoGroups.isActive=false`) → exclus
- Membres soft-deleted (`deletedAt IS NOT NULL`) → exclus
- EOs du profil soft-deleted → exclus
- Groupes du profil soft-deleted → exclus

---

## Résolution des rôles modules (pour le profil actif)

```
Profil actif :
  └── client_profile_module_roles (si deletedAt IS NULL)
      └── module_roles (si isActive=true)
          └── module_permissions (isGranted=true)
```

Les rôles inactifs sont exclus. Les permissions sont l'union des permissions de tous les rôles actifs du profil dans chaque module.

---

## Cache

Clé de cache : `userId:activeProfileId`

Le cache stocke pour un couple (user, profil) :
- `clientIds` — clients accessibles
- `moduleRoles` — rôles dans les modules (pour ce profil)
- `permissionsByModule` — permissions agrégées
- `eoIds` — set d'IDs des EOs accessibles (périmètre)

TTL : 1 minute. Invalidation : `invalidateUserCache(userId)` supprime toutes les entrées de l'utilisateur.

---

## Matrice d'accès par persona

### admin_delta
- Pas de profil actif
- Accès à tous les clients, modules, EOs, champs
- Bypass de toutes les vérifications

### integrator_delta / integrator_external
- Pas de profil actif
- Accès limité aux clients assignés (`integrator_client_assignments.deletedAt IS NULL`)
- Accès à tous les modules/EOs des clients assignés
- Bypass des vérifications de permissions et display config

### client_user (AVEC profil actif)
- Accès uniquement au client du profil sélectionné
- Modules : uniquement ceux où le profil a un rôle
- EOs : uniquement le périmètre du profil
- Champs : vérifiés contre display_config_fields
- Permissions : vérifiées par module

### client_user (SANS profil actif)
- Peut uniquement : `GET /auth/me/profiles`, `POST /auth/select-profile`
- Pas d'accès aux données client

---

## Endpoints auth liés

| API | Description |
|---|---|
| `GET /auth/me/profiles` | Liste des profils disponibles (non archivés, non soft-deleted) |
| `POST /auth/select-profile` | Sélectionner un profil → reçoit nouveau JWT avec `activeProfileId` |

---

## JWT

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "persona": "client_user",
  "activeProfileId": "profile-id"  // null si pas de profil sélectionné
}
```

`activeProfileId` est ajouté au JWT uniquement après `POST /auth/select-profile`. Les tokens émis au signin n'ont pas de profil actif.
