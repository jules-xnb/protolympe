# PRD Backend — Index

Ce dossier définit toutes les APIs backend de Delta RM avec leurs règles de sécurité. Aucun code ne doit être écrit sans PRD validé.

## Architecture de sécurité

### Authentification
- JWT access token : **15 minutes** (HS256, contient sub/email/persona)
- Refresh token : **7 jours**, stocké en base, rotation à chaque usage, révocable
- Secret JWT **obligatoire** en env var, crash au démarrage si absent
- Pas de signup public — comptes créés par invitation uniquement
- SSO par client (OIDC) — chaque client peut avoir son propre provider
- **Un client = un mode d'auth** : SSO exclusif OU email/mot de passe, jamais les deux
- Détection du mode d'auth via 3 mécanismes :
  - **Email** : l'utilisateur tape son email → on retrouve son client via `user_client_memberships` → on check si SSO activé
  - **Sous-domaine** : `laposte.delta-rm.com` → champ `subdomain` sur `clients`
  - **CNAME** : `app.laposte.com` → champ `custom_hostname` sur `clients`

### Middlewares
- **Auth middleware** : vérifie le JWT, injecte le user (sub, email, persona)
- **Persona middleware** : vérifie le persona depuis le JWT (pas de requête DB)
- **Client middleware** : vérifie l'accès au client via cache (TTL 1min)
- **Module middleware** : vérifie le rôle + permission dans le module via cache
- **Périmètre middleware** : filtre les EO accessibles via cache

### Cache permissions (TTL 1min)
À la première requête d'un utilisateur, on charge en cache :
- Ses client_ids (via `user_client_memberships` ou `integrator_client_assignments`)
- Ses module_roles par client (via `client_profiles` → `client_profile_module_roles`)
- Ses permissions par module (via `module_permissions`)
- Son périmètre EO par client (via `client_profile_eos` + `client_profile_eo_groups`, avec résolution des descendants)

### Règle générale
- Aucune suppression physique — toujours archiver/désactiver
- Validation des entrées systématique (Zod)
- Chaque modification de champ est vérifiée contre les display_config_fields du rôle

## Domaines API

| # | Domaine | Doc | Routes |
|---|---------|-----|--------|
| 1 | Auth | [01-auth.md](01-auth.md) | signin, sso, refresh, signout, password, me, check-auth-method |
| 2 | Clients | [02-clients.md](02-clients.md) | CRUD clients, SSO config, intégrateurs assignés |
| 3 | Intégrateurs | [03-integrators.md](03-integrators.md) | invite, CRUD, assignations clients |
| 4 | Modules | [04-modules.md](04-modules.md) | activation, rôles, permissions |
| 5 | Entités (EO) | [05-entities.md](05-entities.md) | CRUD, champs, groupes, audit, import/export |
| 6 | Profils | [06-profiles.md](06-profiles.md) | CRUD, entités, groupes, rôles modules |
| 7 | Utilisateurs | [07-users.md](07-users.md) | invite, CRUD, champs custom, profils |
| 8 | Listes | [08-lists.md](08-lists.md) | CRUD, valeurs |
| 9 | Design & Traductions | [09-design-translations.md](09-design-translations.md) | design config, traductions |
| 10 | CV — Configuration | [10-cv-config.md](10-cv-config.md) | survey types, champs, statuts, transitions, formulaires, validation |
| 11 | CV — Exécution | [11-cv-execution.md](11-cv-execution.md) | campagnes, cibles, réponses, commentaires, documents, audit |
| 12 | Display configs | [12-display-configs.md](12-display-configs.md) | configs par module (org, users, profils, CV) |
