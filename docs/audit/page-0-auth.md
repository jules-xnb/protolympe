# Page 0 : Auth — Connexion, Mot de passe oublié, Reset password (`/auth`, `/reset-password`)

## Vue d'ensemble — Maquettes visuelles

### Scénario 1 : URL standard (`app.delta-rm.com/auth`) — Étape 1 : saisie email

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Connexion                                         │   primary   ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │ Adresse email                        │           │             ││
│  │ [                                ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Continuer               ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

Au clic "Continuer" → `POST /api/auth/check-auth-method` avec `{ email }` :
- Si `method: 'password'` → affiche le champ mot de passe (Étape 2a)
- Si `method: 'sso'` → affiche le bouton SSO (Étape 2b)

### Scénario 1a : URL standard — Étape 2a : mot de passe (client sans SSO)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Connexion                                         │   primary   ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │ Adresse email                        │           │             ││
│  │ [jules@acme.com              ] [✎]   │  ← retour │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │ Mot de passe                         │           │             ││
│  │ [                                ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Se connecter            ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│  Mot de passe oublié ?                             │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Scénario 1b : URL standard — Étape 2b : redirection SSO (client avec SSO)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Connexion                                         │   primary   ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │  jules@laposte.fr               [✎] │  ← retour │             ││
│  │                                      │           │             ││
│  │  Vous allez être redirigé vers       │           │             ││
│  │  votre fournisseur d'identité.       │           │             ││
│  │                                      │           │             ││
│  │  [Se connecter avec Azure AD     ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Scénario 2 : Sous-domaine/CNAME (`laposte.delta-rm.com` ou `app.laposte.com`)

Le client est identifié par le hostname → on sait déjà le mode d'auth.

#### Si SSO activé → bouton SSO direct (pas de saisie email)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Connexion                                         │   primary   ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │  Connectez-vous à La Poste           │           │             ││
│  │  via votre fournisseur d'identité.   │           │             ││
│  │                                      │           │             ││
│  │  [Se connecter avec Azure AD     ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

#### Si pas de SSO → formulaire classique email/mot de passe

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Connexion                                         │   primary   ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │ Adresse email                        │           │             ││
│  │ [                                ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │ Mot de passe                         │           │             ││
│  │ [                                ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Se connecter            ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│  Mot de passe oublié ?                             │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Mot de passe oublié

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  ← Retour                                         │   primary   ││
│                                                    │             ││
│  Mot de passe oublié                               │             ││
│  Saisissez votre adresse email pour                │             ││
│  recevoir un lien de réinitialisation.             │             ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │ Adresse email                        │           │             ││
│  │ [                                ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Envoyer le lien         ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Reset password (via lien email)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Nouveau mot de passe                              │   primary   ││
│  Choisissez un nouveau mot de passe                │             ││
│  pour votre compte.                                │             ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │ Nouveau mot de passe                 │           │             ││
│  │ [                                ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │ Confirmer le mot de passe            │           │             ││
│  │ [                                ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │ Règles :                             │           │             ││
│  │ ✓ Min 12 caractères                  │           │             ││
│  │ ✓ 1 majuscule, 1 minuscule          │           │             ││
│  │ ✓ 1 chiffre, 1 caractère spécial    │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Mettre à jour           ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Lien invalide / expiré

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Lien invalide                                     │   primary   ││
│  Ce lien de réinitialisation est                   │             ││
│  invalide ou a expiré.                             │             ││
│                                                    │             ││
│  [Retour à la connexion                        ]   │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

---

## 0.1 Connexion email/mot de passe (`/auth`)

**Accès** : Public (non authentifié)

**Comportement cible** :
- Formulaire email + mot de passe
- Bouton "Se connecter" → `POST /api/auth/signin`
- Si déjà connecté (user existant) → redirige vers `/dashboard`
- Lien "Mot de passe oublié ?" → bascule vers la vue forgot
- Labels et placeholders en **français**
- Validation front : email valide + mot de passe min 12 chars (aligné sur politique back)
- Gestion des erreurs :
  - 401 "Identifiants invalides" → toast "Email ou mot de passe incorrect"
  - 423 "Compte verrouillé" → toast "Compte temporairement verrouillé, réessayez dans X minutes"

**API** : `POST /api/auth/signin`
- Body : `{ "email": string, "password": string }`
- Réponse 200 (client_user) : `{ "access_token": string, "token_type": "Bearer" }` + cookie `refresh_token`
- Réponse 200 (admin/intégrateur, 2FA pas configuré) : `{ "requires_2fa_setup": true, "temp_token": "..." }`
- Réponse 200 (admin/intégrateur, 2FA configuré) : `{ "requires_2fa": true, "temp_token": "..." }`
- Réponse 401 : `{ "error": "Identifiants invalides" }`
- Réponse 423 : `{ "error": "Compte temporairement verrouillé", "retry_after": number }`
- Sécurité : rate limit 5 req/60s, lockout après 5 échecs (15 min)

**État actuel du front** :
- ✅ Layout correct (split screen, logo, gradient)
- ❌ Labels en anglais ("Email address", "Password", "Sign in") → doit être en français
- ❌ Validation mot de passe min 6 chars côté front vs min 12 chars + politique complète côté back
- ❌ `useAuth.signIn()` attend une réponse `{ token, user }` mais le back retourne `{ access_token, token_type }` → **désynchronisé**
- ❌ `useAuth` stocke le token dans `localStorage.auth_token` via `setToken()` mais le back envoie `access_token` dans le body JSON
- ❌ `GET /api/auth/me` : le front attend `{ user: AppUser }` mais le back retourne l'objet directement (pas wrappé dans `user`)
- ❌ Le type `AppUser` ne contient pas `persona` ni `client_ids` (retournés par le back)
- ❌ Pas de gestion du lockout (erreur 423)
- ❌ Pas de gestion du refresh token (le back le set en cookie httpOnly mais le front ne fait jamais `POST /refresh`)
- ⚠️ `signOut()` ne call pas `POST /api/auth/signout` (ne supprime que le token local, pas le refresh token côté serveur)

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Formulaire email/mdp | ✅ | ✅ (layout OK) | ⚠️ | Labels FR, validation alignée |
| Labels en français | — | ❌ En anglais | **REFACTO FRONT** | Traduire tous les labels |
| Validation mot de passe | ✅ 12 chars + majuscule + minuscule + chiffre + spécial | ❌ Min 6 chars | **REFACTO FRONT** | Aligner sur la politique back |
| Format réponse signin | ✅ `{ access_token }` | ❌ Attend `{ token, user }` | **REFACTO FRONT** | Adapter `useAuth.signIn()` au format réel |
| Stockage token | ✅ | ⚠️ Stocke `token` au lieu de `access_token` | **REFACTO FRONT** | `setToken(data.access_token)` |
| GET /me format | ✅ retourne objet direct | ❌ Attend `{ user: ... }` | **REFACTO FRONT** | Adapter le destructuring |
| Type AppUser | ✅ retourne persona + client_ids | ❌ Manque persona, client_ids | **REFACTO FRONT** | Ajouter `persona` et `client_ids` au type |
| Gestion lockout 423 | ✅ | ❌ | **REFACTO FRONT** | Afficher message + temps restant |
| Refresh token | ✅ Cookie httpOnly + rotation | ❌ Jamais appelé | **REFACTO FRONT** | Intercepteur API : sur 401 → `POST /refresh` → retry |
| Signout côté serveur | ✅ `POST /signout` | ❌ Ne call que `clearToken()` | **REFACTO FRONT** | Appeler `POST /api/auth/signout` avant de clear |
| signUp() | ❌ Pas de route `/signup` dans le back | ⚠️ Existe dans useAuth | **REFACTO FRONT** | Supprimer `signUp` (les comptes sont créés par invitation uniquement) |

### Flow signin avec 2FA (admin/intégrateur)

Après un signin réussi (email + mot de passe valides) pour un `admin_delta`, `integrator_delta` ou `integrator_external` :

1. Si le 2FA **n'est pas encore configuré** (première connexion ou jamais activé) :
   - Le back retourne `{ "requires_2fa_setup": true, "temp_token": "..." }` (pas d'access_token)
   - Le front affiche l'écran de configuration 2FA (voir section 0.7)

2. Si le 2FA **est configuré** :
   - Le back retourne `{ "requires_2fa": true, "temp_token": "..." }` (pas d'access_token)
   - Le front affiche l'écran de saisie du code TOTP (voir section 0.7)

3. L'utilisateur saisit le code TOTP → `POST /api/auth/2fa/verify` avec `{ temp_token, code }`
   - Si valide → retourne `{ access_token, token_type: "Bearer" }` + cookie refresh_token
   - Si invalide → erreur 401

**Le `temp_token` est un JWT court (5 min) qui ne donne accès à rien sauf `/auth/2fa/verify` et `/auth/2fa/setup`.**

---

## 0.2 Connexion SSO

**Accès** : Public — pour les clients avec SSO activé

**Règle métier** : Un client = un mode d'auth. SSO activé = SSO exclusif, pas d'email/mot de passe.

**Comportement cible — 3 mécanismes de détection SSO** :

1. **Par email (mécanisme principal)** :
   - L'utilisateur tape son email sur `/auth`
   - `POST /api/auth/check-auth-method` avec `{ email }` → retrouve le compte → son client via `user_client_memberships` → check SSO
   - Si SSO → affiche bouton "Se connecter avec {provider}" au lieu du formulaire mot de passe
   - Si pas SSO → formulaire email/mot de passe classique

2. **Par sous-domaine** (`laposte.delta-rm.com`) :
   - Le front détecte le hostname au chargement
   - `POST /api/auth/check-auth-method` avec `{ hostname }` → retrouve le client via `clients.subdomain`
   - Si SSO → affiche directement le bouton SSO (pas besoin de taper l'email)

3. **Par CNAME** (`app.laposte.com` → CNAME vers delta-rm) :
   - Même logique que le sous-domaine via `clients.custom_hostname`

**Impacts BDD/API** (✅ FAIT) :
- Colonnes `subdomain` (unique) et `custom_hostname` (unique) ajoutées à `clients`
- Route `POST /api/auth/check-auth-method` créée — détection par email via membership, par hostname via subdomain/custom_hostname

- Si SSO détecté : afficher bouton "Se connecter avec {provider}" → redirige vers `GET /api/auth/sso/:clientId`
- Callback SSO : `GET /api/auth/sso/callback` → redirige vers frontend avec `access_token` en query param

**APIs existantes** :
- `GET /api/auth/sso/:clientId/check` → `{ enabled: bool, provider: string|null }` (public, pas d'auth)
- `GET /api/auth/sso/:clientId` → redirige vers le provider OIDC
- `GET /api/auth/sso/callback` → traite le retour OIDC, crée/retrouve le compte, set cookies, redirige vers frontend

**État actuel du front** :
- ❌ Aucune gestion SSO — pas de route `/auth/sso/callback`, pas de détection SSO, pas de bouton SSO
- ❌ Le back redirige vers `${FRONTEND_URL}/auth/sso/callback?access_token=...` mais cette route n'existe pas côté front

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Check SSO par client | ✅ `GET /sso/:clientId/check` | ❌ | **REFACTO FRONT** | Appeler au chargement ou après saisie email |
| Bouton "Se connecter avec {provider}" | ✅ `GET /sso/:clientId` | ❌ | **REFACTO FRONT** | Afficher si SSO activé |
| Route callback SSO | ✅ Redirige vers frontend | ❌ Route n'existe pas | **REFACTO FRONT** | Créer route `/auth/sso/callback` qui récupère le token du query param |
| Détection du mode d'auth | ✅ API check dispo | ❌ | **À DÉCIDER** | Comment détecter si SSO ? (email domaine, URL param, etc.) |

---

## 0.3 Mot de passe oublié (vue dans `/auth`)

**Accès** : Public

**Comportement cible** :
- Bouton "← Retour" pour revenir au login
- Champ email + bouton "Envoyer le lien"
- `POST /api/auth/forgot-password` avec `{ "email": "..." }`
- Toujours afficher "Un email de réinitialisation vous a été envoyé" (ne pas leaker si l'email existe)
- Toast succès puis retour à la vue login

**API** : `POST /api/auth/forgot-password`
- Body : `{ "email": string }`
- Réponse 200 : `{ "success": true }` (toujours, même si email inconnu)
- Rate limit : 3 req/60s
- Crée un `password_reset_tokens` (hash du token, expire dans 1h)
- ⚠️ Ne fait **pas** l'envoi d'email (TODO dans le back : `// In production: send email with token`)

**État actuel du front** :
- ✅ UI existe (bouton retour, champ email, bouton envoyer)
- ❌ `handleForgotPassword` est un **stub** : `const error = null as Error | null` → n'appelle jamais l'API
- ❌ Labels "Email address" en anglais

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Formulaire email | ✅ | ✅ (layout OK) | ⚠️ | Labels FR |
| Appel API forgot-password | ✅ `POST /forgot-password` | ❌ Stub, pas d'appel API | **REFACTO FRONT** | Brancher sur `api.post('/api/auth/forgot-password', { email })` |
| Envoi email | ❌ TODO dans le back | — | **REFACTO API** | Implémenter l'envoi d'email (SendGrid, Resend, etc.) |
| Labels en français | — | ❌ | **REFACTO FRONT** | Traduire |

---

## 0.4 Reset password (`/reset-password`)

**Accès** : Public — via lien email avec token

**Comportement cible** :
- Vérifie le token dans l'URL (hash fragment `#type=recovery&token=...` ou query param)
- Si token invalide/absent → affiche page "Lien invalide" avec bouton retour
- Si token valide → formulaire : nouveau mot de passe + confirmation
- Afficher les règles de mot de passe en temps réel :
  - Min 12 caractères
  - Au moins 1 majuscule
  - Au moins 1 minuscule
  - Au moins 1 chiffre
  - Au moins 1 caractère spécial
- Vérifier que les deux mots de passe correspondent
- `POST /api/auth/reset-password` avec `{ "token": "...", "new_password": "..." }`

**API** : `POST /api/auth/reset-password`
- Body : `{ "token": string, "new_password": string }`
- Valide la politique de mot de passe côté serveur
- Vérifie que le token existe, n'est pas expiré, n'est pas déjà utilisé
- Réponse 200 : `{ "success": true }` → redirige vers login
- Réponse 400 : `{ "error": "Token invalide|expiré|déjà utilisé" }` ou `{ "error": "Mot de passe invalide", "details": [...] }`
- Invalide tous les refresh tokens de l'utilisateur (force re-login)
- Rate limit : 5 req/60s

**État actuel du front** :
- ✅ Layout correct, formulaire avec 2 champs
- ❌ Appelle `POST /api/auth/update-password` → **endpoint inexistant** (le back a `/reset-password` pas `/update-password`)
- ❌ Validation min 6 chars côté front vs politique 12 chars + complexité côté back
- ❌ Pas d'affichage des règles de mot de passe
- ❌ Détection du token via `window.location.hash` avec `type=recovery` → format Supabase, le back utilise un token simple
- ❌ N'envoie pas le token dans le body (le back attend `{ token, new_password }`)
- ❌ Après succès, navigue vers `/dashboard` au lieu de `/auth` (l'utilisateur n'est pas connecté après reset)

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Endpoint reset | ✅ `POST /reset-password` | ❌ Appelle `/update-password` | **REFACTO FRONT** | Corriger l'URL |
| Envoi du token | ✅ Attend `{ token, new_password }` | ❌ N'envoie pas le token | **REFACTO FRONT** | Extraire token de l'URL, l'envoyer dans le body |
| Format token URL | ✅ Token simple | ❌ Cherche hash `#type=recovery` (Supabase) | **REFACTO FRONT** | Adapter au format back (query param `?token=...`) |
| Validation mot de passe | ✅ 12+ chars, maj, min, chiffre, spécial | ❌ Min 6 chars | **REFACTO FRONT** | Aligner et afficher les règles en temps réel |
| Redirection après succès | — | ❌ Vers `/dashboard` | **REFACTO FRONT** | Rediriger vers `/auth` avec toast succès |
| Page lien invalide | — | ✅ Existe | ⚠️ | OK mais la détection du token est cassée |

---

## 0.5 Refresh token & session

**Comportement cible** :
- Le back set un cookie httpOnly `refresh_token` (7 jours) à chaque signin/refresh
- Quand l'access token expire → le front intercepte le 401 → `POST /api/auth/refresh` → nouveau access token + rotation du refresh token
- Si le refresh échoue (token expiré/invalide) → déconnexion → redirige vers `/auth`

**API** : `POST /api/auth/refresh`
- Pas de body — lit le cookie `refresh_token`
- Rotation atomique : supprime l'ancien token, crée un nouveau (protection replay)
- Réponse 200 : `{ "access_token": string, "token_type": "Bearer" }` + nouveau cookie
- Réponse 401 : token manquant/invalide/expiré

**État actuel du front** :
- ❌ `api-client.ts` n'a aucun intercepteur 401 / refresh logic
- ❌ Pas de `credentials: 'include'` sur les requêtes fetch → les cookies httpOnly ne sont pas envoyés
- ❌ Le front stocke le token en localStorage mais ne gère pas l'expiration

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Cookie httpOnly | ✅ Set par le back | ❌ Pas de `credentials: 'include'` | **REFACTO FRONT** | Ajouter `credentials: 'include'` dans `api-client.ts` |
| Intercepteur 401 → refresh | ✅ `POST /refresh` | ❌ N'existe pas | **REFACTO FRONT** | Ajouter logique de retry avec refresh |
| Redirection sur session expirée | — | ❌ | **REFACTO FRONT** | Si refresh échoue → `clearToken()` + redirect `/auth` |

---

## 0.6 Signout

**Comportement cible** :
- Appeler `POST /api/auth/signout` (avec auth) pour invalider le refresh token côté serveur
- Supprimer le token local
- Rediriger vers `/auth`

**API** : `POST /api/auth/signout`
- Auth requise (Bearer token)
- Supprime le refresh token en BDD + delete le cookie
- Réponse : `{ "success": true }`

**État actuel du front** :
- ❌ `signOut()` ne fait que `clearToken()` + `setUser(null)` — n'appelle pas l'API

| Élément | API | Front | Status | Refacto |
|---------|:---:|:---:|---|---|
| Appel API signout | ✅ `POST /signout` | ❌ Pas d'appel | **REFACTO FRONT** | `api.post('/api/auth/signout')` avant `clearToken()` |

---

## 0.7 2FA TOTP (NOUVEAU — admin et intégrateurs uniquement)

**Règle métier** :
- **Obligatoire** pour `admin_delta`, `integrator_delta`, `integrator_external`
- **Pas de 2FA** pour `client_user`
- **Pas de 2FA si SSO** — le provider SSO gère sa propre sécurité (MFA côté Azure AD/Okta)
- Méthode : TOTP uniquement (Google Authenticator, Authy, Microsoft Authenticator, etc.)

### Maquette — Configuration initiale du 2FA (première connexion)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Configurer l'authentification                     │   primary   ││
│  à deux facteurs                                   │             ││
│                                                    │             ││
│  Scannez ce QR code avec votre application         │             ││
│  d'authentification (Google Authenticator,          │             ││
│  Authy, etc.)                                      │             ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │          ┌──────────────┐            │           │             ││
│  │          │   QR CODE    │            │           │             ││
│  │          │              │            │           │             ││
│  │          └──────────────┘            │           │             ││
│  │                                      │           │             ││
│  │  Clé manuelle :                      │           │             ││
│  │  JBSW Y3DP EHPK 3PXP  [Copier]      │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │ Code de vérification                 │           │             ││
│  │ [  _  _  _  _  _  _  ]              │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Activer le 2FA          ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Maquette — Saisie du code TOTP (connexion normale)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Vérification en deux étapes                       │   primary   ││
│                                                    │             ││
│  Saisissez le code à 6 chiffres généré             │             ││
│  par votre application d'authentification.          │             ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │ Code de vérification                 │           │             ││
│  │ [  _  _  _  _  _  _  ]              │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Vérifier                ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### APIs 2FA

| API | Description | Auth | Règles |
|---|---|---|---|
| `POST /auth/2fa/setup` | Générer un secret TOTP + QR code | temp_token | Retourne `{ secret, qr_code_url, otpauth_uri }` |
| `POST /auth/2fa/setup/confirm` | Confirmer la config 2FA avec un code valide | temp_token | Vérifie le code, active le 2FA sur le compte, retourne codes de récupération |
| `POST /auth/2fa/verify` | Vérifier un code TOTP lors du login | temp_token | Si valide → retourne `{ access_token }` + cookie refresh |

### Flow complet — Première connexion admin/intégrateur (avec setup 2FA)

```
Étape 1                    Étape 2                    Étape 3                    Étape 4
┌──────────────┐           ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│  Saisie      │  POST     │  Saisie      │  POST     │  Setup 2FA   │  POST     │  Confirmer   │
│  email       │ ──────→   │  mot de      │ ──────→   │  QR code     │ ──────→   │  code TOTP   │ ──→ Dashboard
│              │ check-    │  passe       │ /signin   │  + clé       │ /2fa/     │  6 digits    │    /2fa/
│  [Continuer] │ auth-     │              │           │  manuelle    │ setup     │              │    setup/
│              │ method    │  [Connexion] │           │              │           │  [Activer]   │    confirm
└──────────────┘           └──────────────┘           └──────────────┘           └──────────────┘
       │                          │                          │                          │
       ▼                          ▼                          ▼                          ▼
  { method:                 { requires_              { secret,                  { access_token }
    'password' }              2fa_setup: true,         qr_code_url }             → connecté !
                              temp_token }
```

**Détail API** :
1. `POST /auth/check-auth-method` avec `{ email }` → `{ method: 'password' }` (ou `sso`)
2. `POST /auth/signin` avec `{ email, password }` → `{ requires_2fa_setup: true, temp_token: "..." }`
3. `POST /auth/2fa/setup` avec `{ temp_token }` → `{ secret, qr_code_url, otpauth_uri }`
4. L'utilisateur scanne le QR code dans son app d'authentification
5. `POST /auth/2fa/setup/confirm` avec `{ temp_token, code }` → `{ access_token, token_type: "Bearer" }` + cookie refresh

### Flow complet — Connexion normale admin/intégrateur (2FA déjà configuré)

```
Étape 1                    Étape 2                    Étape 3
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│  Saisie      │  POST     │  Saisie      │  POST     │  Saisie      │
│  email       │ ──────→   │  mot de      │ ──────→   │  code TOTP   │ ──→ Dashboard
│              │ check-    │  passe       │ /signin   │  6 digits    │    /2fa/
│  [Continuer] │ auth-     │              │           │              │    verify
│              │ method    │  [Connexion] │           │  [Vérifier]  │
└──────────────┘           └──────────────┘           └──────────────┘
       │                          │                          │
       ▼                          ▼                          ▼
  { method:                 { requires_2fa:            { access_token }
    'password' }              true,                    → connecté !
                              temp_token }
```

**Détail API** :
1. `POST /auth/check-auth-method` avec `{ email }` → `{ method: 'password' }`
2. `POST /auth/signin` avec `{ email, password }` → `{ requires_2fa: true, temp_token: "..." }`
3. `POST /auth/2fa/verify` avec `{ temp_token, code }` → `{ access_token, token_type: "Bearer" }` + cookie refresh

### Flow complet — Connexion client_user (pas de 2FA)

```
Étape 1                    Étape 2
┌──────────────┐           ┌──────────────┐
│  Saisie      │  POST     │  Saisie      │
│  email       │ ──────→   │  mot de      │ ──→ Dashboard
│              │ check-    │  passe       │    /signin
│  [Continuer] │ auth-     │              │
│              │ method    │  [Connexion] │
└──────────────┘           └──────────────┘
       │                          │
       ▼                          ▼
  { method:                 { access_token }
    'password' }            → connecté !
```

### Flow complet — Connexion SSO (sous-domaine)

```
Étape unique
┌──────────────┐
│  Bouton SSO  │
│  "Se         │ ──→ Redirect provider ──→ Callback ──→ Dashboard
│  connecter   │    /sso/:clientId          /sso/callback
│  avec        │
│  Azure AD"   │
└──────────────┘
```

### Impact BDD

Nouvelles colonnes sur `accounts` :
- `totp_secret` (text, nullable) — secret TOTP chiffré (null si 2FA pas configuré)
- `totp_enabled` (boolean, NOT NULL, default false) — 2FA activé ou non

### Impact front

- Nouvelle vue "Configuration 2FA" (après signin, avant dashboard)
- Nouvelle vue "Saisie code TOTP" (après signin, avant dashboard)
- Modifier `useAuth.signIn()` pour gérer les réponses `requires_2fa` et `requires_2fa_setup`
- Bibliothèque : `otpauth` côté back pour générer secrets + vérifier codes

| Élément | BDD | API | Front | Status |
|---------|:---:|:---:|:---:|---|
| Colonnes `totp_secret`, `totp_enabled` sur accounts | ✅ FAIT | — | — | ✅ Schema + migration + Neon |
| `POST /auth/2fa/setup` | — | ✅ FAIT | ❌ | **REFACTO FRONT** |
| `POST /auth/2fa/setup/confirm` | — | ✅ FAIT | ❌ | **REFACTO FRONT** |
| `POST /auth/2fa/verify` | — | ✅ FAIT | ❌ | **REFACTO FRONT** |
| Modifier `POST /auth/signin` pour retourner `requires_2fa` | — | ✅ FAIT | ❌ | **REFACTO FRONT** |
| Vue setup 2FA (QR code + saisie code) | — | — | ❌ | **REFACTO FRONT** |
| Vue saisie code TOTP | — | — | ❌ | **REFACTO FRONT** |

---

## Récapitulatif complet des refactos

### Base de données

| # | Table | Modification |
|---|-------|-------------|
| D1 | `clients` | ~~Ajouter colonnes `subdomain` (unique), `custom_hostname` (unique)~~ ✅ FAIT |
| D2 | `accounts` | ~~Ajouter colonnes `totp_secret`, `totp_enabled`~~ ✅ FAIT (schema + migration + Neon) |

### Back-end (API)

| # | Fichier | Modification |
|---|---------|-------------|
| B1 | `server/src/routes/auth.ts` — `POST /forgot-password` | Implémenter l'envoi d'email (intégrer un service email) — TODO plus tard |
| B2 | `server/src/routes/auth.ts` — `POST /forgot-password` | Définir le format du lien : `${FRONTEND_URL}/reset-password?token=${token}` |
| B3 | `server/src/routes/auth.ts` | ~~Nouvelle route `POST /api/auth/check-auth-method`~~ ✅ FAIT |
| B4 | `server/src/routes/auth.ts` | ~~Modifier `POST /signin` pour 2FA~~ ✅ FAIT |
| B5 | `server/src/routes/auth.ts` | ~~`POST /auth/2fa/setup`~~ ✅ FAIT |
| B6 | `server/src/routes/auth.ts` | ~~`POST /auth/2fa/setup/confirm`~~ ✅ FAIT |
| B7 | `server/src/routes/auth.ts` | ~~`POST /auth/2fa/verify`~~ ✅ FAIT |

### Front-end

| # | Fichier(s) | Modification |
|---|-----------|-------------|
| F1 | `src/pages/Auth.tsx` | Traduire tous les labels en français ("Adresse email", "Mot de passe", "Se connecter") |
| F2 | `src/pages/Auth.tsx` | Aligner validation mot de passe sur la politique back (12 chars + complexité) |
| F3 | `src/pages/Auth.tsx` | Ajouter gestion erreur 423 (lockout) avec affichage du temps restant |
| F4 | `src/pages/Auth.tsx` | Brancher `handleForgotPassword` sur `api.post('/api/auth/forgot-password', { email })` |
| F5 | `src/pages/Auth.tsx` | Ajouter détection SSO et bouton "Se connecter avec {provider}" |
| F6 | `src/hooks/useAuth.tsx` | Adapter `signIn()` : le back retourne `{ access_token }`, pas `{ token, user }` |
| F7 | `src/hooks/useAuth.tsx` | Adapter init : `GET /api/auth/me` retourne l'objet direct, pas `{ user: ... }` |
| F8 | `src/hooks/useAuth.tsx` | Ajouter `persona` et `client_ids` au type `AppUser` |
| F9 | `src/hooks/useAuth.tsx` | Supprimer `signUp()` (les comptes sont créés par invitation uniquement) |
| F10 | `src/hooks/useAuth.tsx` | `signOut()` : appeler `POST /api/auth/signout` avant `clearToken()` |
| F11 | `src/lib/api-client.ts` | Ajouter `credentials: 'include'` pour envoyer les cookies httpOnly |
| F12 | `src/lib/api-client.ts` | Ajouter intercepteur 401 → `POST /api/auth/refresh` → retry la requête originale |
| F13 | `src/lib/api-client.ts` | Si refresh échoue → `clearToken()` + `window.location.href = '/auth'` |
| F14 | `src/pages/ResetPassword.tsx` | Corriger endpoint : `/api/auth/update-password` → `/api/auth/reset-password` |
| F15 | `src/pages/ResetPassword.tsx` | Extraire le token depuis query param `?token=...` (pas hash `#type=recovery`) |
| F16 | `src/pages/ResetPassword.tsx` | Envoyer `{ token, new_password }` dans le body |
| F17 | `src/pages/ResetPassword.tsx` | Aligner validation mot de passe (12 chars + complexité) + afficher règles en temps réel |
| F18 | `src/pages/ResetPassword.tsx` | Rediriger vers `/auth` après succès (pas `/dashboard`) |
| F19 | `src/App.tsx` | Ajouter route `/auth/sso/callback` qui récupère `access_token` du query param et stocke |
| F20 | `src/pages/Auth.tsx` | Gérer les réponses `requires_2fa` et `requires_2fa_setup` dans le flow signin |
| F21 | `src/pages/Auth.tsx` ou nouveau composant | Créer vue "Configuration 2FA" : QR code, clé manuelle, champ code 6 digits, bouton "Activer" |
| F22 | `src/pages/Auth.tsx` ou nouveau composant | Créer vue "Vérification 2FA" : champ code 6 digits, bouton "Vérifier" |

### Décisions en attente

- [ ] **Service email** : quel provider pour l'envoi d'emails ? (SendGrid, Resend, AWS SES, etc.) — TODO pour plus tard

### Décisions prises

- [x] Un client = un mode d'auth (SSO exclusif OU email/mot de passe, jamais les deux)
- [x] Politique mot de passe : min 12 chars, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
- [x] Pas de signup public : les comptes sont créés par invitation uniquement
- [x] Refresh token : cookie httpOnly, rotation atomique, 7 jours
- [x] Lockout : 5 échecs → compte verrouillé 15 minutes
- [x] 2FA TOTP : obligatoire pour admin_delta, integrator_delta, integrator_external
- [x] Pas de 2FA pour client_user
- [x] Pas de 2FA si SSO (le provider gère sa propre sécurité)
- [x] Détection SSO : 3 mécanismes complémentaires
  - **Domaine email** : l'utilisateur entre son email → on identifie le client via son membership (un user est lié à un client) → on check si ce client a SSO activé. C'est le mécanisme principal.
  - **Sous-domaine** : le client accède via `laposte.delta-rm.com` → on identifie le client par le sous-domaine → SSO automatique si configuré
  - **CNAME** : le client accède via son propre domaine `app.laposte.com` (CNAME vers delta-rm) → même logique que le sous-domaine
