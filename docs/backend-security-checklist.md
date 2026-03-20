# Backend Security & Performance — Checklist CAC40
## Stack : Hono + Drizzle + PostgreSQL (Scaleway)

---

## 1. Authentification & Autorisation

### Authentification
- OAuth2 / OpenID Connect avec un provider éprouvé (Keycloak, Auth0, ou Azure AD si le client est déjà dessus)
- Jamais de système JWT maison — utiliser des librairies auditées (`jose`, `arctic`)
- Access tokens courte durée (15 min max), refresh tokens en base avec rotation
- Refresh token rotation : chaque usage invalide l'ancien et émet un nouveau
- Stockage des tokens côté client : httpOnly + secure + sameSite=strict cookies (jamais localStorage)
- MFA obligatoire pour les comptes à privilèges (admin, ops)
- Brute force protection : verrouillage temporaire après N tentatives (progressive delay)
- Invalidation de toutes les sessions à la réinitialisation du mot de passe

### Autorisation
- RBAC (Role-Based Access Control) minimum, ABAC si les règles métier sont complexes
- Vérification des permissions côté serveur à chaque requête (jamais se fier au front)
- Middleware Hono dédié : `app.use('/admin/*', requireRole('admin'))`
- Principe du moindre privilège : chaque rôle n'a accès qu'au strict nécessaire
- Isolation des données par tenant si multi-tenant (row-level security PostgreSQL ou filtrage Drizzle systématique)
- Audit log de chaque action sensible (qui, quoi, quand, depuis quelle IP)

---

## 2. Sécurité des API

### Validation des entrées
- Validation stricte de TOUTES les entrées avec `zod` (intégration native Hono via `@hono/zod-validator`)
- Schémas Zod pour chaque route : body, query params, path params, headers
- Whitelist > blacklist : n'accepter que ce qui est explicitement attendu
- Limiter la taille des payloads (`app.use(bodyLimit({ maxSize: 1024 * 1024 }))`)
- Rejeter les content-types inattendus
- Sanitiser les entrées texte libre contre XSS (`dompurify` côté serveur si le contenu est restitué en HTML)

### Rate Limiting & Throttling
- Rate limiting global par IP (`@hono-rate-limiter` ou custom middleware avec Redis)
- Rate limiting par endpoint sensible (login, reset password, API publique) : plus restrictif
- Rate limiting par utilisateur authentifié pour les endpoints normaux
- Slow down progressif plutôt que block brutal (429 avec Retry-After header)
- Protection DDoS : Scaleway Load Balancer + règles WAF ou Cloudflare en frontal

### Headers de sécurité
```typescript
import { secureHeaders } from 'hono/secure-headers'

app.use(secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
  },
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  }
}))
```

### CORS
```typescript
import { cors } from 'hono/cors'

app.use(cors({
  origin: ['https://app.client.com'], // Jamais '*' en prod
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}))
```

### Protection CSRF
- SameSite=Strict sur les cookies couvre la majorité des cas
- Double Submit Cookie ou token CSRF synchronisé pour les formulaires critiques
- Vérifier l'header `Origin` / `Referer` sur les mutations

---

## 3. Sécurité Base de Données

### Configuration PostgreSQL
- Utilisateur applicatif avec permissions minimales (SELECT, INSERT, UPDATE, DELETE sur ses tables uniquement)
- Utilisateur séparé pour les migrations (avec ALTER, CREATE)
- Pas de superuser dans l'application
- SSL/TLS obligatoire pour la connexion (`sslmode=require` minimum, `verify-full` idéalement)
- Connection pooling via PgBouncer (Scaleway le propose en managed)
- Timeout des connexions inactives
- `statement_timeout` pour éviter les queries infinies

### Drizzle — bonnes pratiques
- Utiliser les requêtes paramétrées (Drizzle le fait par défaut, ne jamais utiliser `sql.raw()` avec des inputs utilisateur)
- Pagination obligatoire sur tous les SELECT de liste (`limit` + `offset` ou cursor-based)
- Ne jamais exposer les IDs auto-incrémentés : utiliser des UUIDs v7 (ordonnés chronologiquement)
- Sélectionner uniquement les colonnes nécessaires (pas de `SELECT *`)
- Transactions pour les opérations multi-tables

### Données sensibles
- Chiffrement applicatif (AES-256-GCM) pour les données sensibles avant insertion (PII, données financières)
- Hashage bcrypt ou argon2 pour les mots de passe (cost factor ≥ 12)
- Jamais de données sensibles en clair dans les logs
- Masquage des données dans les environnements hors-prod
- Politique de rétention : suppression automatique des données expirées (RGPD)

---

## 4. Gestion des Secrets

- Aucun secret en dur dans le code ou les fichiers `.env` versionnés
- Scaleway Secret Manager, Doppler, Infisical ou HashiCorp Vault en prod
- Rotation régulière des secrets (API keys, DB credentials)
- Variables d'environnement injectées au runtime (pas build-time)
- `.env` dans `.gitignore` + `.env.example` avec des valeurs factices
- Secrets différents par environnement (dev ≠ staging ≠ prod)
- Audit trail des accès aux secrets

---

## 5. Logging, Monitoring & Audit

### Logging structuré
```typescript
// Logger structuré JSON pour chaque requête
app.use(async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: duration,
    user_id: c.get('userId') || 'anonymous',
    ip: c.req.header('x-forwarded-for'),
    user_agent: c.req.header('user-agent'),
    request_id: c.get('requestId'),
  }))
})
```

### Ce qu'il faut logger
- Toutes les tentatives d'authentification (succès ET échecs)
- Les changements de permissions / rôles
- Les accès aux données sensibles
- Les erreurs 4xx et 5xx avec contexte
- Les opérations CRUD sur les ressources critiques
- Les appels API sortants

### Ce qu'il ne faut JAMAIS logger
- Mots de passe, tokens, secrets
- Données personnelles non nécessaires (numéros de carte, SSN)
- Corps complet des requêtes contenant des données sensibles

### Monitoring
- Health check endpoint (`/health` avec vérification DB)
- Métriques : latence p50/p95/p99, taux d'erreur, throughput
- Alerting sur les anomalies (pic d'erreurs 5xx, latence dégradée, tentatives de brute force)
- APM (Datadog, Grafana Cloud, ou Scaleway Cockpit)
- Uptime monitoring externe

### Audit Trail
- Table dédiée `audit_logs` immuable (INSERT only, jamais UPDATE/DELETE)
- Chaque entrée : user_id, action, resource_type, resource_id, old_value, new_value, ip, timestamp
- Rétention longue durée (exigence légale variable, souvent 5 ans pour le financier)

---

## 6. Scalabilité & Performance

### Architecture
- Stateless : aucun état en mémoire entre les requêtes (sessions en Redis/DB)
- Horizontal scaling : plusieurs instances derrière le load balancer Scaleway
- Cache Redis pour les données chaudes (sessions, config, résultats fréquents)
- Queue (BullMQ / Redis) pour les tâches longues (emails, exports, calculs)
- Séparation read/write si forte charge lecture (read replicas PostgreSQL)

### Optimisation des requêtes
- Index sur toutes les colonnes utilisées dans WHERE, JOIN, ORDER BY
- Index composites pour les requêtes fréquentes
- `EXPLAIN ANALYZE` systématique sur les requêtes critiques
- Connection pooling correctement dimensionné (pool_size adapté au nombre d'instances)
- Pagination cursor-based pour les gros datasets (plus performant que offset)
- Requêtes N+1 : utiliser les `with` de Drizzle (relations) ou des JOINs

### Temps de réponse
- Budget : < 100ms p95 pour les endpoints critiques
- Cache HTTP (`Cache-Control`, `ETag`) pour les réponses stables
- Compression (`hono/compress` — gzip/brotli)
- Réponses partielles : ne retourner que les champs nécessaires
- Lazy loading des relations (ne charger que si demandé via query params)
- Timeouts sur tous les appels externes (DB, APIs tierces) — 5s max par défaut
- Circuit breaker pour les dépendances externes instables

### Gestion de la charge
- Graceful shutdown : terminer les requêtes en cours avant d'arrêter l'instance
- Backpressure : rejeter proprement (503) plutôt que s'écrouler
- Auto-scaling basé sur CPU/mémoire/latence (Scaleway Containers le supporte)
- Load testing régulier (k6, Artillery) simulant la charge attendue × 3

---

## 7. Gestion des Erreurs

```typescript
// Error handler global — ne jamais exposer les détails internes
app.onError((err, c) => {
  const requestId = c.get('requestId')

  // Log complet côté serveur
  console.error(JSON.stringify({
    request_id: requestId,
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  }))

  // Réponse client sans détails internes
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message,
      request_id: requestId,
    }, err.status)
  }

  return c.json({
    error: 'Internal Server Error',
    request_id: requestId,
  }, 500)
})
```

- Jamais de stack traces en prod côté client
- Request ID unique propagé partout (header `X-Request-Id`)
- Messages d'erreur génériques pour le client, détaillés dans les logs
- Distinguer erreurs client (4xx) vs serveur (5xx)
- Retry automatique avec exponential backoff pour les appels externes

---

## 8. CI/CD & Supply Chain

### Pipeline
- Lint + type-check + tests à chaque PR
- SAST (analyse statique de sécurité) : `semgrep` ou `snyk code`
- Dependency audit : `npm audit` + `snyk` en CI
- Container scanning : `trivy` sur l'image Docker
- Pas de merge sans review + CI verte
- Déploiement automatisé (pas de SSH en prod pour déployer)
- Environnement de staging identique à la prod

### Docker
- Image multi-stage (build séparé du runtime)
- Base image minimale (`node:22-alpine` ou `distroless`)
- Non-root user dans le container
- Pas de secrets dans l'image (injectés au runtime)
- `.dockerignore` strict (node_modules, .env, .git)
- Health check dans le Dockerfile

### Dépendances
- Lock file (`package-lock.json`) versionné
- Mise à jour régulière (Renovate ou Dependabot)
- Audit des licences (compatibilité avec usage commercial)
- Nombre de dépendances minimisé (Hono est bon pour ça)

---

## 9. Conformité & RGPD

- Privacy by design : ne collecter que le strict nécessaire
- Registre des traitements documenté
- Consentement explicite pour les données personnelles
- Droit à l'effacement implémenté (endpoint de suppression des données utilisateur)
- Droit à la portabilité (export JSON/CSV des données utilisateur)
- DPO (Data Protection Officer) identifié côté client
- DPIA (Data Protection Impact Assessment) si données sensibles à grande échelle
- Sous-traitants listés et contractualisés (Scaleway = sous-traitant, il faut un DPA)
- Notification de breach sous 72h (process défini à l'avance)
- Localisation des données en EU (Scaleway Paris ✓)

---

## 10. Sécurité Réseau & Infrastructure

- TLS 1.3 partout (terminaison au load balancer Scaleway)
- Certificats auto-renouvelés (Let's Encrypt via Scaleway)
- Network policies : la base de données n'est accessible que depuis les containers applicatifs (private network Scaleway)
- Pas de port exposé inutilement
- DNS sécurisé (DNSSEC si possible)
- WAF en frontal pour les attaques courantes (SQLi, XSS, path traversal)
- IP whitelisting pour les endpoints d'admin si possible
- VPN ou bastion pour l'accès infra (jamais de SSH direct depuis internet)

---

## 11. Plan de Réponse aux Incidents

- Procédure documentée : détection → containment → éradication → recovery → post-mortem
- Contacts d'urgence définis (équipe sécu client + toi)
- Backup DB automatisé (Scaleway le fait, vérifier la fréquence et tester les restaurations)
- RTO (Recovery Time Objective) et RPO (Recovery Point Objective) définis avec le client
- Test de restauration régulier (au moins trimestriel)
- Runbooks pour les incidents courants (DB down, breach suspectée, DDoS)

---

## Récapitulatif des middlewares Hono recommandés

```typescript
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { cors } from 'hono/cors'
import { compress } from 'hono/compress'
import { bodyLimit } from 'hono/body-limit'
import { requestId } from 'hono/request-id'
import { timing } from 'hono/timing'

const app = new Hono()

// Ordre recommandé
app.use(requestId())           // Traçabilité
app.use(timing())              // Server-Timing header
app.use(secureHeaders())       // Headers sécu
app.use(cors({ /* config */ }))
app.use(compress())            // Compression gzip/brotli
app.use(bodyLimit({ maxSize: 1024 * 1024 })) // 1MB max
// + rate limiter custom
// + auth middleware
// + logger middleware
```
