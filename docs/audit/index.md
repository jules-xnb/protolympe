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

## Pages auditées

| # | Section | Page | Doc | Status |
|---|---------|------|-----|--------|
| 1 | BO | Clients | [page-1-clients.md](page-1-clients.md) | ✅ Audité — 22 refactos (4 API + 1 BDD + 17 front) |
| 2 | BO | Intégrateurs | À faire | |
| 3+ | MO | Entities, Users, Profiles, BO, Listes, Modules, Workflows, Design, Traductions | À faire | |
| 40+ | FO | Profils, Modules, Vues, Workflows, Surveys, Campaigns | À faire | |
