# Spec : FO Profiles — Module Profils User Final

## Portee

Ce dossier couvre les 3 sous-pages FO liees aux profils utilisateur final :

| # | Page | Route |
|---|------|-------|
| 1 | Gestion des profils | `/dashboard/:clientId/user/profiles` |
| 2 | Profils archives | `/dashboard/:clientId/user/profiles/archived` |
| 3 | Parametres | `/dashboard/settings` (mode-agnostic) |

## Fichiers de spec

- [01-gestion-profils.md](01-gestion-profils.md) — Page de selection/activation des profils
- [02-profils-archives.md](02-profils-archives.md) — Page des profils archives
- [03-settings.md](03-settings.md) — Page parametres utilisateur

## Contexte metier

Un `client_user` peut avoir **plusieurs profils**. Il ne cumule pas les droits : il **switch** entre ses profils et ses droits sont uniquement ceux du profil actif. La resolution automatique au login (dernier profil ou profil unique) couvre 90% des cas. La page de gestion FO est le fallback pour les 10% restants (premiere connexion avec plusieurs profils, changement volontaire).

## Architecture cible

### Flux d'activation d'un profil (FO)

```
Page "Mes profils"
  |-- GET /auth/me/profiles               <- profils assignes a l'utilisateur
  |-- Affiche les profils actifs (non archives, non soft-deleted)
  |-- handleActivate(profileId)
  |     |-- POST /auth/select-profile {profile_id}
  |     |-- Backend verifie, sauvegarde last_active_profile_id
  |     |-- Backend retourne nouveau access_token avec activeProfileId dans le JWT
  |     |-- Stocke le nouveau token
  |     +-- navigate -> USER_HOME
  +-- Profil actif indique visuellement (badge + bordure)
```

### Flux backend (JWT + select-profile)

```
POST /auth/select-profile {profile_id}
  |-- Verifie: client_user uniquement
  |-- Verifie: profil assigne, non archive, non soft-deleted
  |-- Sauvegarde: accounts.last_active_profile_id = profile_id
  +-- Retourne: nouveau access_token avec activeProfileId dans le JWT
```
