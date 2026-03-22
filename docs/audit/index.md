# Specs Front — Index

> Specs de construction pour la refonte complète du front-end Delta RM. Le front a été entièrement supprimé — seul le design system reste. Chaque spec décrit ce qu'il faut construire avec maquettes ASCII, règles métier, endpoints API et comportements attendus.

## Règles d'accès globales

| Persona | BO (Admin) | MO (Intégrateur) | FO (User Final) |
|---------|:---:|:---:|:---:|
| `admin_delta` | ✅ Tous les clients | ✅ | ✅ |
| `integrator_delta` / `integrator_external` | ✅ Vue filtrée (clients assignés), pas de permissions admin | ✅ | ✅ |
| `client_user` | ❌ | ❌ | ✅ |

## Standards de l'application

- **Design system** : 0 composant custom — utiliser exclusivement `src/components/ui/`
- **Pagination** : toujours côté API, 50 éléments max par page
- **Filtrage** : toujours côté API
- **Tri** : côté API sauf indication contraire
- **Unicité** : vérifiée côté API avec erreur 409 si doublon
- **Authentification par client** : un client = un mode d'auth (SSO exclusif OU email/mot de passe, jamais les deux)
- **Archivage** : jamais de suppression physique, toujours archiver/désactiver
- **Icônes dans les boutons** : toujours à droite du texte
- **Gestion d'erreurs** : explicite, jamais de fail silencieux
- **Loading states** : skeleton ou spinner sur chaque chargement async

## Specs par section

### BO — Back Office (Admin)

| # | Page | Doc |
|---|------|-----|
| 0 | Auth (Connexion, Reset password, 2FA) | [page-0-auth.md](page-0-auth.md) |
| 1 | Clients | [page-1-clients.md](page-1-clients.md) |
| 2 | Intégrateurs | [page-2-integrateurs.md](page-2-integrateurs.md) |

### MO — Middle Office (Intégrateur)

| # | Page | Doc |
|---|------|-----|
| 3 | Listes (enabler) | [page-3-listes.md](page-3-listes.md) |
| 4 | Organisation (enabler) | [page-4-organisation/index.md](page-4-organisation/index.md) |
| 5 | Navigation MO (sidebar, routing, guards) | [page-5-mo-navigation/index.md](page-5-mo-navigation/index.md) |
| 6 | Design + Traductions | [page-6-mo-design.md](page-6-mo-design.md) |
| 7 | Profiles (enabler) | [page-7-profiles/index.md](page-7-profiles/index.md) |

**Modules MO** (configurés dans la navigation)

| Module | Doc |
|--------|-----|
| Users | [page-5-mo-navigation/users/index.md](page-5-mo-navigation/users/index.md) |
| Organisation | [page-5-mo-navigation/organisation.md](page-5-mo-navigation/organisation.md) |
| Collecte de valeur | [page-5-mo-navigation/collecte-de-valeur/index.md](page-5-mo-navigation/collecte-de-valeur/index.md) |
| Profiles | [page-5-mo-navigation/profiles.md](page-5-mo-navigation/profiles.md) |

### FO — Front Office (User Final)

**Navigation FO** — [fo-navigation/index.md](fo-navigation/index.md)

| Module | Doc |
|--------|-----|
| Users | [fo-navigation/users.md](fo-navigation/users.md) |
| Organisation | [fo-navigation/organisation.md](fo-navigation/organisation.md) |
| Collecte de valeur | [fo-navigation/collecte-de-valeur/index.md](fo-navigation/collecte-de-valeur/index.md) |
| Profiles | [fo-navigation/profiles/index.md](fo-navigation/profiles/index.md) |

### Transversal

| Doc | Description |
|-----|-------------|
| [profil-actif-front.md](profil-actif-front.md) | Gestion du profil actif (sélection, JWT, restauration) |
