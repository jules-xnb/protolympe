# Plan de sécurisation — Delta RM Backend

## 1. Rate limiting sur les endpoints d'auth

**Fichiers :** `server/src/middleware/rate-limit.ts`, `server/src/routes/auth.ts`

- Créer un middleware de rate limiting en mémoire (Map avec IP + compteur + TTL)
- `/auth/signin` : max 5 tentatives par minute par IP
- `/auth/forgot-password` : max 3 par minute par IP
- `/auth/reset-password` : max 5 par minute par IP
- `/auth/refresh` : max 30 par minute par IP
- Retourner 429 Too Many Requests avec `Retry-After` header

---

## 2. Lockout après tentatives échouées

**Fichiers :** `server/src/db/schema.ts` (ajout colonnes), `server/src/routes/auth.ts`

- Ajouter sur `accounts` : `failed_login_attempts` (integer, default 0), `locked_until` (timestamptz, nullable)
- À chaque signin échoué : incrémenter `failed_login_attempts`
- Après 5 échecs : verrouiller le compte pendant 15 minutes (`locked_until = now + 15min`)
- À chaque signin réussi : remettre `failed_login_attempts` à 0
- Si le compte est verrouillé : retourner 423 Locked avec le temps restant
- Créer sur Neon : `ALTER TABLE accounts ADD COLUMN failed_login_attempts integer NOT NULL DEFAULT 0, ADD COLUMN locked_until timestamptz`

---

## 3. Politique de mot de passe

**Fichiers :** `server/src/lib/password-policy.ts`, `server/src/routes/auth.ts`

- Créer un validateur de mot de passe :
  - Minimum 12 caractères
  - Au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
- Appliquer sur : `POST /auth/reset-password`, `PATCH /auth/password`, et dans l'invitation intégrateur (`POST /integrators/invite`)
- Retourner des messages d'erreur explicites (quel critère n'est pas respecté)

---

## 4. Chiffrement du client_secret SSO

**Fichiers :** `server/src/lib/encryption.ts`, `server/src/routes/clients.ts`

- Créer un module de chiffrement symétrique AES-256-GCM
- Clé de chiffrement via variable d'environnement `ENCRYPTION_KEY` (obligatoire, crash si absent)
- `PUT /clients/:id/sso` : chiffrer le `client_secret` avant insertion
- `GET /clients/:id/sso` : déchiffrer le `client_secret` avant retour (ou ne pas le retourner du tout, juste `***`)
- Callback SSO : déchiffrer à la volée pour l'échange OIDC
- Migration : chiffrer les secrets existants en base

---

## 5. Refresh token en cookie httpOnly

**Fichiers :** `server/src/routes/auth.ts`

- `POST /auth/signin` : le refresh token est envoyé dans un cookie httpOnly + Secure + SameSite=Strict au lieu du body JSON
- `POST /auth/refresh` : lire le refresh token depuis le cookie, pas depuis le body
- `POST /auth/signout` : supprimer le cookie
- Le body JSON ne contient plus que l'access token
- Adapter le front pour ne plus stocker le refresh token en mémoire/localStorage

---

## 6. Résolution complète du périmètre EO

**Fichiers :** `server/src/lib/cache.ts`

- Corriger la résolution des descendants dans `getUserPermissions()` :
  - Pour chaque EO avec `includeDescendants = true`, utiliser une requête SQL avec `LIKE` sur le `path` :
    ```sql
    SELECT id FROM eo_entities
    WHERE client_id = ? AND path LIKE ?
    ```
  - Le pattern LIKE est : `{entity.path}/{entity.id}%` (tous les descendants dont le path commence par le chemin de l'entité parente)
  - Ajouter tous les descendants au Set `eoIdsByClient`
- Tester avec un arbre à 3+ niveaux de profondeur

---

## 7. Pagination systématique

**Fichiers :** `server/src/lib/pagination.ts`, toutes les routes avec des `GET /` de listing

- Créer un helper de pagination :
  - Paramètres query : `page` (défaut 1), `per_page` (défaut 20, max 100)
  - Retourne : `{ data: [...], pagination: { page, per_page, total, total_pages } }`
- Appliquer sur TOUS les endpoints de listing :
  - `GET /clients`
  - `GET /integrators`
  - `GET /clients/:clientId/eo`
  - `GET /clients/:clientId/profiles`
  - `GET /clients/:clientId/users`
  - `GET /clients/:clientId/lists`
  - `GET /clients/:clientId/lists/:id/values`
  - `GET /modules/:moduleId/cv/campaigns`
  - `GET /modules/:moduleId/cv/campaigns/:id/responses`
  - `GET /modules/:moduleId/cv/campaigns/:id/targets`
  - `GET /clients/:clientId/eo/:id/audit`
  - `GET /clients/:clientId/eo/:id/comments`
  - `GET /modules/:moduleId/cv/responses/:id/audit`
  - `GET /modules/:moduleId/cv/responses/:id/comments`
  - `GET /modules/:moduleId/cv/responses/:id/documents`
  - Toutes les routes display-configs (listing)
- Ajouter `COUNT(*)` pour le total, `LIMIT` + `OFFSET` pour la page

---

## 8. Audit log des actions admin

**Fichiers :** `server/src/db/schema.ts` (nouvelle table), `server/src/lib/audit.ts`, routes concernées

- Créer une table `admin_audit_log` :
  - `id`, `actor_id` (FK accounts), `action` (text), `target_type` (text : 'client', 'account', 'module', 'permission', etc.), `target_id` (uuid), `details` (jsonb), `created_at`
- Créer un helper `logAdminAction(actorId, action, targetType, targetId, details)`
- Logger les actions suivantes :
  - Création/modification/désactivation de client
  - Invitation/modification d'intégrateur
  - Assignation/retrait intégrateur ↔ client
  - Activation/désactivation de module
  - Création/modification/désactivation de rôle
  - Modification de permissions
  - Invitation/désactivation d'utilisateur
  - Modification de config SSO
  - Modification de design/traductions
- Créer sur Neon la table correspondante
- API `GET /admin/audit` pour l'admin_delta uniquement, avec pagination

---

## 9. Vérification display_config_fields sur les PATCH

**Fichiers :** `server/src/lib/field-access.ts`, routes EO, users, profiles, CV responses

- Créer un helper `getEditableFields(userId, moduleId, moduleSlug)` qui :
  1. Récupère les rôles de l'utilisateur dans le module
  2. Trouve la display config associée à ces rôles
  3. Retourne la liste des champs avec `can_edit = true`
- Modifier les routes PATCH pour les `client_user` :
  - `PATCH /clients/:clientId/eo/:id` — vérifier chaque champ modifié contre `module_org_display_config_fields`
  - `PATCH /clients/:clientId/users/:id` — vérifier contre `module_users_display_config_fields`
  - `PATCH /clients/:clientId/profiles/:id` — vérifier contre `module_profils_display_config_fields`
  - `PATCH /modules/:moduleId/cv/responses/:id` — vérifier chaque field_definition_id contre `module_cv_form_display_config_fields`
- Si un champ non autorisé est dans le body : retourner 403 avec le nom du champ interdit
- Les admin/intégrateurs bypassen cette vérification

---

## Ordre d'exécution recommandé

1. **Périmètre EO** (critique — faille d'accès actuelle)
2. **Vérification display_config_fields** (critique — faille de modification)
3. **Rate limiting + lockout** (protection brute force)
4. **Politique de mot de passe** (rapide, faible effort)
5. **Pagination** (performance + anti-DoS)
6. **Refresh token en cookie httpOnly** (XSS protection)
7. **Chiffrement client_secret SSO** (protection données sensibles)
8. **Audit log admin** (traçabilité)
