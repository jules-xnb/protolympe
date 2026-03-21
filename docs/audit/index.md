# Audit Front ↔ Back ↔ BDD — Index

> Document vivant. Chaque page est auditée pour vérifier l'alignement entre le front, les routes API et le schéma BDD.

## Règles d'accès globales

| Persona | BO (Admin) | MO (Intégrateur) | FO (User Final) |
|---------|:---:|:---:|:---:|
| `admin_delta` | ✅ Tous les clients | ✅ | ✅ |
| `integrator_delta` / `integrator_external` | ✅ Vue filtrée (clients assignés), pas de permissions admin | ✅ | ✅ |
| `client_user` | ❌ | ❌ | ✅ |

## Standards de l'application

- **Pagination** : toujours côté API, 50 éléments max par page
- **Filtrage** : toujours côté API (même quand l'utilisateur a des filtres en front, ça conditionne la requête)
- **Tri** : côté API sauf indication contraire
- **Unicité** : vérifiée côté API avec erreur 409 si doublon
- **Authentification par client** : un client = un mode d'auth (SSO exclusif OU email/mot de passe, jamais les deux)

## Pages auditées

| # | Section | Page | Doc | Status |
|---|---------|------|-----|--------|
| 0 | Auth | Connexion + Reset password + 2FA | [page-0-auth.md](page-0-auth.md) | ✅ Audité — 31 refactos (7 API + 2 BDD + 22 front) |
| 1 | BO | Clients | [page-1-clients.md](page-1-clients.md) | ✅ Audité — 24 refactos (4 API + 1 BDD + 19 front) |
| 2 | BO | Intégrateurs | [page-2-integrateurs.md](page-2-integrateurs.md) | ✅ Audité — 21 refactos (4 API + 0 BDD + 17 front) |
| 3 | MO | Listes | [page-3-listes.md](page-3-listes.md) | ✅ Audité — 30 refactos (8 API + 5 BDD + 17 front) |
| 4 | MO | Organisation (Entités) | [page-4-mo-organisation.md](page-4-mo-organisation.md) | ✅ Audité — 36 refactos (20 API + 4 BDD + 12 front) |
| 5+ | MO | Users, Profiles, BO, Modules, Workflows, Design, Traductions | À faire | |
| 40+ | FO | Profils, Modules, Vues, Workflows, Surveys, Campaigns | À faire | |
