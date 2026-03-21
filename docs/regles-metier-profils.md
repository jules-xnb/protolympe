# Règles métier — Profils client

## Qu'est-ce qu'un profil ?

Un **profil client** est un template de droits partagé. Il définit :
- **Quelles entités organisationnelles** sont accessibles (avec ou sans descendants)
- **Quels regroupements** d'entités sont accessibles
- **Quels rôles** dans quels modules sont accordés

Un profil est **partagé** : modifier un rôle ou une EO dans un profil impacte **tous les utilisateurs** qui ont ce profil.

Un utilisateur peut avoir **plusieurs profils**. Il **switch** entre ses profils dans le FO — ses droits sont **uniquement ceux du profil actif sélectionné**, pas l'union de tous ses profils. L'union se fait à l'intérieur d'un profil (EOs + groupes + rôles).

---

## Règle 1 : Pas de profil vide

Un profil doit toujours contenir :
- **Au moins 1 entité OU 1 regroupement** (sinon pas de périmètre)
- **ET au moins 1 rôle module** (sinon pas d'accès à aucun module)

### Quand cette règle est vérifiée

| Action | Vérification |
|---|---|
| Création via `POST /profiles/create-full` | Validation avant insertion (400 si vide) |
| Suppression d'une EO du profil | Vérifie que le profil ne sera pas vide après. Rollback si oui (400) |
| Suppression d'un regroupement du profil | Idem |
| Suppression d'un rôle module du profil | Idem |

---

## Règle 2 : Pas de doublons

Deux profils dans le même client ne peuvent pas être **identiques**. Deux profils sont identiques si et seulement si ils ont exactement :
- Les mêmes EOs avec les mêmes flags `include_descendants`
- Les mêmes regroupements
- Les mêmes rôles modules

### Ce qui n'est PAS considéré comme un doublon

- Même EOs mais descendance activée d'un côté et pas de l'autre → profils différents
- Même EOs et rôles mais un regroupement en plus → profils différents
- Même contenu mais noms différents → **doublons** (le nom n'est pas un critère de différenciation)

### Comment le doublon est détecté

Un **fingerprint** est calculé pour chaque profil :
```
fingerprint = {
  eos: JSON trié de [{eoId, includeDescendants}],
  groups: JSON trié de [groupId],
  roles: JSON trié de [moduleRoleId]
}
```

Si deux profils ont le même fingerprint → doublon.

### Quand cette règle est vérifiée

| Action | Vérification |
|---|---|
| Création via `POST /profiles/create-full` | Comparaison AVANT insertion. Retourne 409 avec le nom du profil existant |
| Ajout d'une EO au profil (`POST /:id/eos`) | Comparaison APRÈS insertion. Rollback si doublon (409) |
| Modification de descendance (`PATCH /:id/eos/:eoId`) | Comparaison APRÈS update. Rollback si doublon (409) |
| Suppression d'une EO (`DELETE /:id/eos/:eoId`) | Comparaison APRÈS soft delete. Rollback si doublon (409) |
| Ajout/suppression de regroupement | Idem |
| Ajout/suppression de rôle module | Idem |

---

## Règle 3 : Profil partagé (pas de copie)

Quand un utilisateur configure les droits pour un autre utilisateur, le système doit :

1. Vérifier si un profil existant correspond à la configuration souhaitée
2. Si **oui** → proposer d'**associer** le profil existant (pas de création)
3. Si **non** → créer un nouveau profil

### API pour le flow UX

**Étape 1 : Recherche de correspondance**
```
POST /clients/:clientId/profiles/find-match
Body: {
  eos: [{ eo_id: "...", include_descendants: true }],
  eo_groups: ["group-id-1"],
  module_roles: ["role-id-1", "role-id-2"]
}
Response: {
  matches: [{ id: "profile-id", name: "Chef de service" }]
}
```

**Étape 2a : Si match trouvé → associer**
```
POST /clients/:clientId/users/:userId/profiles
Body: { profile_id: "profile-id" }
```

**Étape 2b : Si pas de match → créer et associer**
```
POST /clients/:clientId/profiles/create-full
Body: {
  name: "Nouveau profil",
  eos: [...],
  eo_groups: [...],
  module_roles: [...]
}
// Puis associer le profil créé à l'utilisateur
```

---

## Impact de la modification d'un profil

| Modification | Impact |
|---|---|
| Ajouter un rôle module au profil | Tous les utilisateurs ayant ce profil gagnent les permissions de ce rôle |
| Retirer un rôle module du profil | Tous les utilisateurs perdent les permissions (max 1 min, cache TTL) |
| Ajouter une EO au profil | Tous les utilisateurs voient cette EO et ses données |
| Activer la descendance sur une EO | Tous les utilisateurs voient les sous-entités |
| Archiver le profil | Tous les utilisateurs perdent tous les droits de ce profil |

---

## Tables impliquées

```
client_profiles
├── client_profile_users (user ↔ profil, deleted_at)
├── client_profile_eos (profil ↔ EO + include_descendants, deleted_at)
├── client_profile_eo_groups (profil ↔ groupe, deleted_at)
└── client_profile_module_roles (profil ↔ rôle module, deleted_at)
```

## Implémentation

- `lib/profile-duplicate-check.ts` : `findDuplicateProfile()`, `findMatchingProfiles()`, `isProfileEmpty()`, `isConfigEmpty()`
- `routes/profiles.ts` : tous les endpoints avec vérifications intégrées
