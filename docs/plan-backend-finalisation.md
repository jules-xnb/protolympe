# Plan de finalisation backend — Delta RM

## 1. Harmonisation des routes

**Objectif :** Tous les fichiers de routes suivent exactement le même pattern pour la lisibilité et la maintenabilité.

**Standard à appliquer sur chaque fichier :**
- Type Hono : `new Hono<Env>()` avec `type Env = { Variables: { user: JwtPayload } }`
- Middleware : `authMiddleware` puis `requireClientAccess()` ou vérification module
- Validation : Zod inline avec `safeParse` (pas de `zValidator`)
- Réponses : `toSnakeCase()` systématique depuis `lib/case-transform.ts`
- Erreurs : format uniforme `{ error: 'Message en français' }` avec code HTTP approprié
- Nommage : schémas Zod en camelCase, clés de réponse en snake_case
- Pas de `select()` sans colonnes explicites (éviter le over-fetch de colonnes sensibles)
- Pagination sur tous les GET de listing via `parsePaginationParams` + `paginatedResponse`
- Audit log sur toutes les opérations d'écriture sensibles

**Fichiers à auditer et harmoniser :**
- `routes/auth.ts`
- `routes/clients.ts`
- `routes/integrators.ts`
- `routes/modules.ts`
- `routes/eo.ts`
- `routes/profiles.ts`
- `routes/users.ts`
- `routes/lists.ts`
- `routes/design.ts`
- `routes/translations.ts`
- `routes/cv-config.ts`
- `routes/cv-campaigns.ts`
- `routes/display-configs.ts`
- `routes/admin-audit.ts`

---

## 2. Configuration .env

**Objectif :** Le serveur démarre correctement en dev avec toutes les variables nécessaires.

**Fichiers :**
- Créer `server/.env` avec les variables requises
- Créer `server/.env.example` (sans secrets, versionné) comme documentation

**Variables :**
```
DATABASE_URL=postgresql://...
JWT_SECRET=<64 chars hex>
ENCRYPTION_KEY=<64 chars hex = 32 bytes>
NODE_ENV=development
PORT=3001
```

**Actions :**
- Générer un JWT_SECRET et ENCRYPTION_KEY aléatoires
- Vérifier que `server/.env` est dans `.gitignore`
- Vérifier que le serveur démarre sans crash

---

## 3. Soft delete sur les tables de liaison

**Objectif :** Aucune suppression physique de données métier. Seules les données de configuration pure peuvent être supprimées physiquement.

**Règle :**
- Tables de **configuration** (transitions, form fields, validation rules, display configs, translation upserts) → suppression physique OK
- Tables de **liaison métier** (profile ↔ user, profile ↔ eo, profile ↔ group, profile ↔ role, group ↔ member) → soft delete avec `deleted_at` timestamp

**Tables à modifier (ajout colonne `deleted_at`) :**
- `client_profile_users` — ajout `deleted_at timestamptz`
- `client_profile_eos` — ajout `deleted_at timestamptz`
- `client_profile_eo_groups` — ajout `deleted_at timestamptz`
- `client_profile_module_roles` — ajout `deleted_at timestamptz`
- `eo_group_members` — ajout `deleted_at timestamptz`

**Modifications routes :**
- `DELETE` → `PATCH` qui set `deleted_at = now()` au lieu de supprimer
- Tous les `SELECT` sur ces tables doivent filtrer `WHERE deleted_at IS NULL`
- Mettre à jour les contraintes d'unicité pour inclure `deleted_at IS NULL` (index partiel)

**Schema Drizzle :**
- Ajouter `deletedAt: timestamp('deleted_at', { withTimezone: true })` sur chaque table
- Modifier les routes correspondantes

**Neon :**
- ALTER TABLE pour ajouter les colonnes
- Recréer les index uniques comme index partiels : `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL`

---

## 4. SSO OIDC complet

**Objectif :** Implémenter le flow SSO complet pour que les utilisateurs clients puissent se connecter via leur provider (Azure AD, Okta, etc.).

**Dépendance :** `openid-client` (librairie OIDC standard pour Node.js)

**Routes à implémenter :**

### GET /auth/sso/:clientId
1. Lire `client_sso_configs` pour le client
2. Déchiffrer `client_secret`
3. Utiliser `openid-client` pour découvrir le provider (Issuer.discover)
4. Générer un `state` aléatoire + `nonce`, stocker en session/cookie temporaire
5. Construire l'URL d'autorisation avec `redirect_uri`, `scope: openid email profile`, `state`, `nonce`
6. Redirect 302 vers le provider

### GET /auth/sso/callback
1. Récupérer `code` et `state` des query params
2. Vérifier le `state` contre le cookie temporaire
3. Échanger le code contre des tokens auprès du provider
4. Extraire l'email et les infos du `id_token`
5. Chercher ou créer le compte dans `accounts` (persona = `client_user`)
6. Chercher ou créer le `user_client_membership`
7. Générer access token + refresh token
8. Set le refresh token en cookie httpOnly
9. Redirect vers le frontend avec l'access token (via query param ou post-message)

**Sécurité :**
- Validation du `state` pour prévenir CSRF
- Validation du `nonce` dans l'id_token
- Vérification de la signature du id_token
- `redirect_uri` configuré en dur (pas dynamique)

---

## 5. Import/Export CSV

**Objectif :** Implémenter l'import et l'export CSV pour les entités principales.

**Dépendance :** `papaparse` ou implémentation manuelle (CSV est simple)

### Export

Pattern commun pour tous les exports :
1. Vérifier les permissions
2. Récupérer les données filtrées (périmètre EO si client_user)
3. Si client_user : filtrer les colonnes selon `display_config_fields.show_in_export`
4. Générer le CSV avec headers
5. Retourner avec `Content-Type: text/csv` et `Content-Disposition: attachment`
6. Logger dans l'historique d'export si applicable (`eo_export_history`)

**Endpoints à implémenter :**
- `GET /clients/:clientId/eo/export`
- `GET /clients/:clientId/profiles/export`
- `GET /clients/:clientId/users/export`
- `GET /modules/:moduleId/cv/campaigns/:id/export`

### Import

Pattern commun :
1. Vérifier les permissions
2. Parser le CSV (multipart/form-data)
3. Valider chaque ligne (Zod)
4. Insérer en batch (transaction)
5. Retourner le résultat : `{ imported: N, errors: [...] }`

**Endpoints à implémenter :**
- `POST /clients/:clientId/eo/import`
- `POST /clients/:clientId/profiles/import`
- `POST /clients/:clientId/users/import`
- `POST /modules/:moduleId/cv/campaigns/:id/import`

---

## 6. Test du serveur

**Objectif :** Vérifier que le serveur démarre et que les routes de base fonctionnent.

**Actions :**
- Démarrer le serveur avec `npm run dev` dans le dossier server
- Tester `GET /health`
- Tester `POST /auth/signin` avec un compte existant
- Tester `GET /auth/me` avec le token reçu
- Tester `GET /clients` en tant qu'admin
- Vérifier que les erreurs 401/403 sont correctement retournées

---

## Ordre d'exécution

1. **Configuration .env** (5min) — débloquer le démarrage du serveur
2. **Test du serveur** — vérifier que ça tourne
3. **Harmonisation des routes** — qualité et cohérence du code
4. **Soft delete sur tables de liaison** — intégrité des données
5. **SSO OIDC** — fonctionnalité clé pour les clients
6. **Import/Export CSV** — fonctionnalité utile mais pas bloquante
