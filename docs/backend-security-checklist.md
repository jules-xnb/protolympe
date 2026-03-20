# Backend Security & Performance — Checklist CAC40
## Stack : Hono + Drizzle + PostgreSQL (Scaleway)

**Légende** : OK = en place | INFRA = configuration infrastructure (pas code) | EPIC = feature séparée à planifier

---

## 1. Authentification & Autorisation

### Authentification
- OAuth2 / OpenID Connect avec un provider éprouvé — **N/A** — On EST le provider auth. SSO configurable par client (Google, Microsoft, etc.) via `ssoProviders` + matching email pré-enregistré
- Jamais de système JWT maison — utiliser des librairies auditées (`jose`, `arctic`) — **OK** — `jose` pour HS256
- Access tokens courte durée (15 min max), refresh tokens en base avec rotation — **OK** — Access 15 min, refresh 7j en base, rotation atomique en transaction
- Refresh token rotation : chaque usage invalide l'ancien et émet un nouveau — **OK** — Transaction DB atomique dans `/refresh`
- Stockage des tokens côté client : httpOnly + secure + sameSite=strict cookies (jamais localStorage) — **OK** — Les 3 flags présents sur le refresh cookie
- MFA obligatoire pour les comptes à privilèges (admin, ops) — **EPIC** — 2FA à planifier comme epic séparé (TOTP, recovery codes, enforcement policy, UI)
- Brute force protection : verrouillage temporaire après N tentatives (progressive delay) — **OK** — Rate limiting login 5/60s, forgot-password 3/60s, reset 5/60s
- Invalidation de toutes les sessions à la réinitialisation du mot de passe — **OK** — Vérifié : `db.delete(refreshTokens)` sur reset-password ET changement de mot de passe

### Autorisation
- RBAC (Role-Based Access Control) minimum, ABAC si les règles métier sont complexes — **OK** — 4 personas + module roles + permissions granulaires par slug
- Vérification des permissions côté serveur à chaque requête (jamais se fier au front) — **OK** — `authMiddleware` + `requireClientAccess` + `requireModuleAccess` sur toutes les routes
- Middleware Hono dédié : `app.use('/admin/*', requireRole('admin'))` — **OK** — `requirePersona()`, `requireClientAccess()`, `requireModuleAccess()`, `requireModulePermission()`
- Principe du moindre privilège : chaque rôle n'a accès qu'au strict nécessaire — **OK** — Scope limité client → module → permissions
- Isolation des données par tenant si multi-tenant (row-level security PostgreSQL ou filtrage Drizzle systématique) — **OK** — Filtrage systématique par `clientId` dans toutes les queries
- Audit log de chaque action sensible (qui, quoi, quand, depuis quelle IP) — **OK** — Table `admin_audit_logs` INSERT-only + `logAdminAction()` sur admin, profils, EOs

---

## 2. Sécurité des API

### Validation des entrées
- Validation stricte de TOUTES les entrées avec `zod` — **OK** — Zod `safeParse` sur toutes les routes
- Schémas Zod pour chaque route : body, query params, path params, headers — **OK** — Body + params UUID validés systématiquement
- Whitelist > blacklist : n'accepter que ce qui est explicitement attendu — **OK** — Zod ne laisse passer que les champs déclarés
- Limiter la taille des payloads (`app.use(bodyLimit({ maxSize: 1024 * 1024 }))`) — **OK** — `bodyLimit(1MB)` dans index.ts
- Rejeter les content-types inattendus — **OK** — Hono gère implicitement (routes JSON ne parsent que du JSON)
- Sanitiser les entrées texte libre contre XSS (`dompurify` côté serveur si le contenu est restitué en HTML) — **N/A** — Pas de restitution HTML côté serveur, React escape par défaut côté front

### Rate Limiting & Throttling
- Rate limiting global par IP — **OK** — `globalRateLimit(100, 60_000)` dans index.ts, compteurs en mémoire (suffisant mono-instance, Redis si multi-instance)
- Rate limiting par endpoint sensible (login, reset password, API publique) : plus restrictif — **OK** — Login 5/60s, reset 5/60s, forgot-password 3/60s
- Rate limiting par utilisateur authentifié pour les endpoints normaux — **N/A** — Usage interne CAC 40, pas d'API publique. À ajouter si besoin détecté
- Slow down progressif plutôt que block brutal (429 avec Retry-After header) — **OK** — Header `Retry-After` renvoyé sur 429
- Protection DDoS : Scaleway Load Balancer + règles WAF ou Cloudflare en frontal — **INFRA**

### Headers de sécurité
- `secureHeaders()` de Hono — **OK** — X-Frame-Options DENY, nosniff, HSTS 2 ans, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/micro/geoloc désactivés)

### CORS
- Origin whitelist, jamais `*` en prod — **OK** — `CORS_ORIGINS` configurable via env var
- `credentials: true` — **OK**

### Protection CSRF
- SameSite=Strict sur les cookies — **OK** — En place sur le refresh cookie
- Double Submit Cookie ou token CSRF synchronisé — **N/A** — Auth par Bearer token en header (pas envoyé automatiquement par le navigateur), SameSite suffit pour le cookie
- Vérifier l'header `Origin` / `Referer` sur les mutations — **N/A** — Même raison, Bearer token protège déjà

---

## 3. Sécurité Base de Données

### Configuration PostgreSQL
- Utilisateur applicatif avec permissions minimales — **INFRA** — Configuration au niveau du PostgreSQL managé
- Utilisateur séparé pour les migrations — **INFRA**
- Pas de superuser dans l'application — **INFRA**
- SSL/TLS obligatoire pour la connexion — **OK** — Neon force SSL, identique sur Scaleway Managed PostgreSQL
- Connection pooling via PgBouncer — **OK** — Géré par Neon Serverless, sera géré par Scaleway Managed
- Timeout des connexions inactives — **INFRA** — Configuration PostgreSQL managé
- `statement_timeout` pour éviter les queries infinies — **INFRA**

### Drizzle — bonnes pratiques
- Requêtes paramétrées (jamais `sql.raw()` avec des inputs utilisateur) — **OK** — Drizzle paramétrise par défaut, aucun `sql.raw()` avec input user
- Pagination obligatoire sur tous les SELECT de liste — **OK** — `Math.min(100, ...)` partout, helper `pagination.ts`
- Ne jamais exposer les IDs auto-incrémentés : utiliser des UUIDs — **OK** — UUIDs partout
- Sélectionner uniquement les colonnes nécessaires (pas de `SELECT *`) — **OK** — Drizzle sélectionne les colonnes déclarées
- Transactions pour les opérations multi-tables — **OK** — Utilisé pour refresh token rotation, etc.

### Données sensibles
- Chiffrement applicatif (AES-256-GCM) pour les données sensibles avant insertion — **OK** — Secrets SSO chiffrés via `encryption.ts` (AES-256-GCM)
- Hashage bcrypt ou argon2 pour les mots de passe (cost factor ≥ 12) — **OK** — Bcrypt
- Jamais de données sensibles en clair dans les logs — **OK** — Vérifié et corrigé (suppression d'un console.log de token DEV, console.error structurés)
- Masquage des données dans les environnements hors-prod — **INFRA**
- Politique de rétention : suppression automatique des données expirées (RGPD) — **INFRA** — Process à définir avec le client

---

## 4. Gestion des Secrets

- Aucun secret en dur dans le code ou les fichiers `.env` versionnés — **OK** — Vérifié, tout en env vars
- Scaleway Secret Manager, Doppler, Infisical ou HashiCorp Vault en prod — **INFRA**
- Rotation régulière des secrets (API keys, DB credentials) — **INFRA** — Process opérationnel
- Variables d'environnement injectées au runtime (pas build-time) — **OK**
- `.env` dans `.gitignore` + `.env.example` avec des valeurs factices — **OK** — `.env.example` avec valeurs factices
- Secrets différents par environnement (dev ≠ staging ≠ prod) — **INFRA** — Process opérationnel
- Audit trail des accès aux secrets — **INFRA** — Feature du Secret Manager choisi

---

## 5. Logging, Monitoring & Audit

### Logging structuré
- Logger structuré JSON pour chaque requête — **OK** — Middleware custom JSON dans index.ts (timestamp, method, path, status, duration, userId, ip, user-agent, requestId)

### Ce qu'il faut logger
- Toutes les tentatives d'authentification (succès ET échecs) — **OK** — 5 événements loggués (success, account_not_found, locked, no_password_sso, invalid_credentials, sso_success)
- Les changements de permissions / rôles — **OK** — Via audit trail `logAdminAction`
- Les accès aux données sensibles — **OK** — Via logs structurés par requête
- Les erreurs 4xx et 5xx avec contexte — **OK** — Global error handler + logger
- Les opérations CRUD sur les ressources critiques — **OK** — Audit trail sur admin, profils, EOs
- Les appels API sortants — **N/A** — Pas d'appels API sortants (sauf SSO callback)

### Ce qu'il ne faut JAMAIS logger
- Mots de passe, tokens, secrets — **OK** — Vérifié et corrigé
- Données personnelles non nécessaires — **OK**
- Corps complet des requêtes contenant des données sensibles — **OK** — Le logger ne log que method/path/status, jamais les body

### Monitoring
- Health check endpoint (`/health` avec vérification DB) — **OK** — `/health` endpoint en place
- Métriques : latence p50/p95/p99, taux d'erreur, throughput — **INFRA** — APM à configurer (Scaleway Cockpit, Datadog, Grafana)
- Alerting sur les anomalies — **INFRA**
- APM (Datadog, Grafana Cloud, ou Scaleway Cockpit) — **INFRA**
- Uptime monitoring externe — **INFRA**

### Audit Trail
- Table dédiée `audit_logs` immuable (INSERT only, jamais UPDATE/DELETE) — **OK** — Table `admin_audit_logs`, INSERT-only
- Chaque entrée : user_id, action, resource_type, resource_id, old_value, new_value, ip, timestamp — **OK** — Colonnes : actorId, action, targetType, targetId, details (JSON), createdAt
- Rétention longue durée — **INFRA** — Process à définir avec le client

---

## 6. Scalabilité & Performance

### Architecture
- Stateless : aucun état en mémoire entre les requêtes — **OK** — Seul le rate limiter utilise de la mémoire (acceptable mono-instance)
- Horizontal scaling : plusieurs instances derrière le load balancer — **INFRA** — Scaleway Containers le supporte
- Cache Redis pour les données chaudes — **N/A** — Cache permissions en mémoire (TTL 1 min) suffisant pour la charge actuelle
- Queue (BullMQ / Redis) pour les tâches longues — **N/A** — Pas de tâches longues actuellement (pas d'envoi d'emails, exports limités)
- Séparation read/write si forte charge lecture — **INFRA** — Read replicas PostgreSQL si besoin futur

### Optimisation des requêtes
- Index sur toutes les colonnes utilisées dans WHERE, JOIN, ORDER BY — **OK** — 55 index ajoutés sur 45 tables
- Index composites pour les requêtes fréquentes — **OK** — Ex: `(clientId, moduleSlug)`, `(userId, clientId)`, `(eoId, fieldDefinitionId)`
- `EXPLAIN ANALYZE` systématique sur les requêtes critiques — **INFRA** — Process de review perf
- Connection pooling correctement dimensionné — **OK** — Géré par Neon, sera géré par Scaleway
- Pagination cursor-based pour les gros datasets — **OK** — Pagination offset avec cap à 100 items, cursor-based si besoin futur
- Requêtes N+1 : utiliser les `with` de Drizzle ou des JOINs — **OK** — Pas de pattern N+1 détecté

### Temps de réponse
- Budget : < 100ms p95 pour les endpoints critiques — **INFRA** — À valider avec monitoring APM
- Cache HTTP (`Cache-Control`, `ETag`) — **N/A** — Données dynamiques, peu de cache HTTP pertinent
- Compression (`hono/compress` — gzip/brotli) — **OK** — `compress()` dans index.ts
- Réponses partielles : ne retourner que les champs nécessaires — **OK** — Drizzle sélection explicite
- Lazy loading des relations — **OK** — Relations chargées uniquement si demandé
- Timeouts sur tous les appels externes — **INFRA** — Configuration PostgreSQL/runtime
- Circuit breaker pour les dépendances externes instables — **N/A** — Pas de dépendances externes instables

### Gestion de la charge
- Graceful shutdown — **INFRA** — Configuration container runtime
- Backpressure : rejeter proprement (503) — **OK** — Rate limiter renvoie 429
- Auto-scaling basé sur CPU/mémoire/latence — **INFRA**
- Load testing régulier — **INFRA** — Process opérationnel

---

## 7. Gestion des Erreurs

- Global error handler — ne jamais exposer les détails internes — **OK** — `app.onError()` avec log JSON structuré + réponse générique
- Jamais de stack traces en prod côté client — **OK** — Masqué par le global handler
- Request ID unique propagé partout (header `X-Request-Id`) — **OK** — `requestId()` middleware
- Messages d'erreur génériques pour le client, détaillés dans les logs — **OK** — Tous les `String(err)` éliminés
- Distinguer erreurs client (4xx) vs serveur (5xx) — **OK** — HTTPException gérée distinctement
- Retry automatique avec exponential backoff pour les appels externes — **N/A** — Pas d'appels externes à retry

---

## 8. CI/CD & Supply Chain — **INFRA** (intégralité)

### Pipeline
- Lint + type-check + tests à chaque PR — **INFRA**
- SAST : `semgrep` ou `snyk code` — **INFRA**
- Dependency audit : `npm audit` + `snyk` en CI — **INFRA**
- Container scanning : `trivy` sur l'image Docker — **INFRA**
- Pas de merge sans review + CI verte — **INFRA**
- Déploiement automatisé — **INFRA**
- Environnement de staging identique à la prod — **INFRA**

### Docker
- Image multi-stage — **INFRA**
- Base image minimale (`node:22-alpine`) — **INFRA**
- Non-root user dans le container — **INFRA**
- Pas de secrets dans l'image — **INFRA**
- `.dockerignore` strict — **INFRA**
- Health check dans le Dockerfile — **INFRA**

### Dépendances
- Lock file versionné — **OK** — `package-lock.json` versionné
- Mise à jour régulière (Renovate ou Dependabot) — **INFRA**
- Audit des licences — **INFRA**
- Nombre de dépendances minimisé — **OK** — Stack légère (Hono, Drizzle, jose, bcryptjs, zod)

---

## 9. Conformité & RGPD — **INFRA** (intégralité, process juridique/organisationnel)

- Privacy by design : ne collecter que le strict nécessaire — **OK** — Schema minimaliste
- Registre des traitements documenté — **INFRA**
- Consentement explicite pour les données personnelles — **INFRA**
- Droit à l'effacement implémenté — **OK** — Soft delete (archivage) sur tous les objets métier
- Droit à la portabilité (export JSON/CSV des données utilisateur) — **OK** — Export CSV en place
- DPO identifié côté client — **INFRA**
- DPIA si données sensibles à grande échelle — **INFRA**
- Sous-traitants listés et contractualisés — **INFRA**
- Notification de breach sous 72h — **INFRA**
- Localisation des données en EU — **OK** — Neon EU (Frankfurt), Scaleway Paris demain

---

## 10. Sécurité Réseau & Infrastructure — **INFRA** (intégralité)

- TLS 1.3 partout — **INFRA**
- Certificats auto-renouvelés — **INFRA**
- Network policies : DB accessible uniquement depuis les containers applicatifs — **INFRA**
- Pas de port exposé inutilement — **INFRA**
- DNS sécurisé (DNSSEC) — **INFRA**
- WAF en frontal — **INFRA**
- IP whitelisting pour les endpoints d'admin — **INFRA**
- VPN ou bastion pour l'accès infra — **INFRA**

---

## 11. Plan de Réponse aux Incidents — **INFRA** (intégralité, process opérationnel)

- Procédure documentée — **INFRA**
- Contacts d'urgence définis — **INFRA**
- Backup DB automatisé — **INFRA**
- RTO et RPO définis avec le client — **INFRA**
- Test de restauration régulier — **INFRA**
- Runbooks pour les incidents courants — **INFRA**
