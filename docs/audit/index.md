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

### MO — Module Owner (Intégrateur)

| # | Page | Doc |
|---|------|-----|
| 3 | Listes | [page-3-listes.md](page-3-listes.md) |
| 5 | Navigation (sidebar, routing, guards) | [page-5-mo-navigation.md](page-5-mo-navigation.md) |
| 6 | Design + Traductions | [page-6-mo-design.md](page-6-mo-design.md) |
| 7 | Module Users | [mo-users/index.md](mo-users/index.md) |
| 8 | Module Organisation | [mo-organisation/index.md](mo-organisation/index.md) |
| 9 | Module Collecte de valeur | [mo-collecte-de-valeur/index.md](mo-collecte-de-valeur/index.md) |
| 10 | Module Profiles | [mo-profiles/index.md](mo-profiles/index.md) |

### FO — Front Office (User Final)

| # | Page | Doc |
|---|------|-----|
| 11 | Sidebar FO | [page-7-fo-sidebar.md](page-7-fo-sidebar.md) |
| 12 | Module Users | [fo-users.md](fo-users.md) |
| 13 | Module Organisation | [fo-organisation.md](fo-organisation.md) |
| 14 | Module Collecte de valeur | [fo-collecte-de-valeur/index.md](fo-collecte-de-valeur/index.md) |
| 15 | Module Profiles | [fo-profiles/index.md](fo-profiles/index.md) |

### Transversal

| Doc | Description |
|-----|-------------|
| [profil-actif-front.md](profil-actif-front.md) | Gestion du profil actif (sélection, JWT, restauration) |
