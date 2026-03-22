# Spec : Authentification (`/auth`, `/reset-password`)

## Maquettes

### Connexion — Etape 1 : saisie email (URL standard)

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
- Si `method: 'password'` → affiche le champ mot de passe (Etape 2a)
- Si `method: 'sso'` → affiche le bouton SSO (Etape 2b)

### Connexion — Etape 2a : mot de passe (client sans SSO)

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

### Connexion — Etape 2b : redirection SSO (client avec SSO)

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

### Connexion SSO — Sous-domaine/CNAME (SSO activé)

Le client est identifié par le hostname → on sait déjà le mode d'auth.

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

### Connexion — Sous-domaine/CNAME (pas de SSO)

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

### Setup 2FA — QR code + code de verification

Affiche apres la premiere connexion d'un admin/integrateur qui n'a pas encore configure le 2FA.

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Configurer l'authentification                     │   primary   ││
│  a deux facteurs                                   │             ││
│                                                    │             ││
│  Scannez ce QR code avec votre application         │             ││
│  d'authentification (Google Authenticator,         │             ││
│  Authy, etc.)                                      │             ││
│                                                    │             ││
│  ┌──────────────────┐                              │             ││
│  │                  │                              │             ││
│  │    ██ ██ ██ ██   │                              │             ││
│  │    ██ QR CODE ██ │                              │             ││
│  │    ██ ██ ██ ██   │                              │             ││
│  │                  │                              │             ││
│  └──────────────────┘                              │             ││
│                                                    │             ││
│  Ou entrez la cle manuellement :                   │             ││
│  [JBSW Y3DP EHPK 3PXP ····]  [Copier]            │             ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │ Code de verification                 │           │             ││
│  │ [                                ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Verifier et activer     ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Saisie code 2FA (connexion normale)

Affiche apres la saisie email/mot de passe reussie pour un compte avec 2FA active.

```
┌────────────────────────────────────────────────────────────────────┐
│                                                    ┌─────────────┐│
│  DELT▶                                             │             ││
│                                                    │   Gradient  ││
│  Verification en deux etapes                       │   primary   ││
│                                                    │             ││
│  Entrez le code a 6 chiffres genere par            │             ││
│  votre application d'authentification.             │             ││
│                                                    │             ││
│  ┌──────────────────────────────────────┐           │             ││
│  │ Code de verification                 │           │             ││
│  │ [  ___  ___  ___  ___  ___  ___  ]   │           │             ││
│  ├──────────────────────────────────────┤           │             ││
│  │         [Verifier                ]   │           │             ││
│  └──────────────────────────────────────┘           │             ││
│                                                    │             ││
│  Utiliser un code de recuperation                  │             ││
│                                                    │             ││
│                                                    └─────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

### Dialog codes de recuperation MFA

Affiche juste apres l'activation du 2FA. L'utilisateur doit sauvegarder ces codes en lieu sur.

```
┌─── Dialog ─────────────────────────────────────────────┐
│                                                         │
│  Codes de recuperation                                  │
│                                                         │
│  Sauvegardez ces codes en lieu sur. Chaque code         │
│  ne peut etre utilise qu'une seule fois pour vous       │
│  connecter si vous perdez l'acces a votre               │
│  application d'authentification.                        │
│                                                         │
│  ┌─────────────────────────────────────────────┐        │
│  │  a1b2-c3d4-e5f6                             │        │
│  │  g7h8-i9j0-k1l2                             │        │
│  │  m3n4-o5p6-q7r8                             │        │
│  │  s9t0-u1v2-w3x4                             │        │
│  │  y5z6-a7b8-c9d0                             │        │
│  │  e1f2-g3h4-i5j6                             │        │
│  │  k7l8-m9n0-o1p2                             │        │
│  │  q3r4-s5t6-u7v8                             │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  [Copier les codes]          [Telecharger (.txt)]      │
│                                                         │
│                                    [J'ai sauvegarde]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Règles métier

- **Langue** : tous les labels et messages en **français**
- **Pas de signup public** : les comptes sont créés par invitation uniquement
- **Un client = un mode d'auth** : SSO activé = SSO exclusif, pas d'email/mot de passe. Jamais les deux en même temps
- **Politique mot de passe** : min 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
- **Lockout** : 5 échecs de connexion → compte verrouillé 15 minutes
- **Refresh token** : cookie httpOnly, rotation atomique, durée 7 jours
- **2FA TOTP** : obligatoire pour `admin_delta`, `integrator_delta`, `integrator_external`
- **Pas de 2FA** pour `client_user`
- **Pas de 2FA si SSO** — le provider SSO gère sa propre sécurité (MFA côté Azure AD/Okta)
- **Détection SSO** : 3 mécanismes complémentaires
  - **Par email** : l'utilisateur entre son email → on identifie le client via son membership → on check si ce client a SSO activé. C'est le mécanisme principal.
  - **Par sous-domaine** : le client accède via `laposte.delta-rm.com` → on identifie le client par le sous-domaine → SSO automatique si configuré
  - **Par CNAME** : le client accède via son propre domaine `app.laposte.com` (CNAME vers delta-rm) → même logique que le sous-domaine
- **Mot de passe oublié** : toujours afficher "Un email de réinitialisation vous a été envoyé" (ne pas leaker si l'email existe)
- **Reset password** : le token est dans l'URL en query param `?token=...`, expire dans 1h, usage unique. Après reset, invalider tous les refresh tokens de l'utilisateur (force re-login)
- **Signout** : appeler l'API pour invalider le refresh token côté serveur avant de supprimer le token local

---

## Flows d'authentification

### Flow signin avec 2FA — Première connexion admin/intégrateur (setup 2FA)

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

### Flow signin avec 2FA — Connexion normale admin/intégrateur (2FA déjà configuré)

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

### Flow signin — client_user (pas de 2FA)

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

### Flow signin — SSO (sous-domaine)

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

Le `temp_token` est un JWT court (5 min) qui ne donne accès à rien sauf `/auth/2fa/verify` et `/auth/2fa/setup`.

---

## Endpoints API (existants)

### Authentification

| Méthode | Route | Description | Remarques |
|---------|-------|-------------|-----------|
| POST | `/api/auth/check-auth-method` | Détecte le mode d'auth (password ou SSO) par email ou hostname | Body : `{ email }` ou `{ hostname }` |
| POST | `/api/auth/signin` | Connexion email/mot de passe | Retourne `{ access_token }` ou `{ requires_2fa, temp_token }` ou `{ requires_2fa_setup, temp_token }`. Rate limit 5/60s, lockout 5 échecs (15 min) |
| POST | `/api/auth/forgot-password` | Demande de réinitialisation | Body : `{ email }`. Toujours retourne 200. Rate limit 3/60s |
| POST | `/api/auth/reset-password` | Réinitialiser le mot de passe | Body : `{ token, new_password }`. Valide politique mdp côté serveur. Invalide tous les refresh tokens. Rate limit 5/60s |
| POST | `/api/auth/refresh` | Rafraîchir l'access token | Lit le cookie `refresh_token`. Rotation atomique. |
| POST | `/api/auth/signout` | Déconnexion | Auth requise. Supprime le refresh token en BDD + delete cookie |
| GET | `/api/auth/me` | Profil utilisateur courant | Retourne l'objet account directement (avec `persona`, `client_ids`) |

### SSO

| Méthode | Route | Description | Remarques |
|---------|-------|-------------|-----------|
| GET | `/api/auth/sso/:clientId/check` | Vérifie si SSO est activé pour un client | Public. Retourne `{ enabled, provider }` |
| GET | `/api/auth/sso/:clientId` | Redirige vers le provider OIDC | |
| GET | `/api/auth/sso/callback` | Traite le retour OIDC | Crée/retrouve le compte, set cookies, redirige vers frontend avec `access_token` en query param |

### 2FA

| Méthode | Route | Description | Remarques |
|---------|-------|-------------|-----------|
| POST | `/api/auth/2fa/setup` | Générer un secret TOTP + QR code | Auth : temp_token. Retourne `{ secret, qr_code_url, otpauth_uri }` |
| POST | `/api/auth/2fa/setup/confirm` | Confirmer la config 2FA | Auth : temp_token. Vérifie le code, active le 2FA, retourne codes de récupération + `{ access_token }` |
| POST | `/api/auth/2fa/verify` | Vérifier un code TOTP lors du login | Auth : temp_token. Si valide → `{ access_token }` + cookie refresh |

---

## Endpoints API (à créer)

| Méthode | Route | Description |
|---------|-------|-------------|
| — | — | Aucun endpoint supplémentaire à créer |

---

## Points d'attention backend

| # | Route | Modification |
|---|-------|-------------|
| B1 | `POST /api/auth/forgot-password` | Implémenter l'envoi d'email (intégrer un service email : SendGrid, Resend, etc.) — TODO plus tard |
| B2 | `POST /api/auth/forgot-password` | Définir le format du lien : `${FRONTEND_URL}/reset-password?token=${token}` |

---

## À construire (front)

### Connexion email/mot de passe

- Layout split screen : formulaire à gauche, gradient primary à droite, logo DELT en haut
- Tous les labels en **français** : "Adresse email", "Mot de passe", "Se connecter", "Continuer"
- Etape 1 : saisie email → `POST /api/auth/check-auth-method` → détermine le flow
- Etape 2a (password) : affiche champ mot de passe + bouton "Se connecter"
- Bouton "✎" sur l'email pour revenir à l'étape 1
- Validation front : email valide + mot de passe min 12 chars (aligné sur politique back)
- Appel `POST /api/auth/signin` avec `{ email, password }`
- Réponse signin : le back retourne `{ access_token, token_type }` — stocker `access_token`
- Gérer la réponse `requires_2fa` → afficher la vue saisie code TOTP
- Gérer la réponse `requires_2fa_setup` → afficher la vue configuration 2FA
- Gestion erreur 401 : toast "Email ou mot de passe incorrect"
- Gestion erreur 423 (lockout) : toast "Compte temporairement verrouillé, réessayez dans X minutes" avec affichage du temps restant
- Si déjà connecté (token valide) → rediriger vers `/dashboard`

### Connexion SSO

- Détection SSO par email : après `check-auth-method`, si `method: 'sso'` → afficher bouton "Se connecter avec {provider}"
- Détection SSO par hostname : au chargement de la page, `POST /api/auth/check-auth-method` avec `{ hostname }` si ce n'est pas le domaine principal
- Si sous-domaine ou CNAME détecté avec SSO activé → afficher directement le bouton SSO (pas de saisie email)
- Au clic bouton SSO → redirection vers `GET /api/auth/sso/:clientId`
- Route `/auth/sso/callback` : récupérer le `access_token` du query param, le stocker, rediriger vers `/dashboard`

### 2FA — Configuration initiale

- Vue affichée après signin quand la réponse contient `requires_2fa_setup: true`
- Appeler `POST /api/auth/2fa/setup` avec le `temp_token` pour obtenir le QR code et la clé manuelle
- Afficher le QR code (image) + la clé manuelle avec bouton "Copier"
- Champ de saisie du code 6 digits pour vérification
- Bouton "Vérifier et activer" → `POST /api/auth/2fa/setup/confirm` avec `{ temp_token, code }`
- En cas de succès : afficher le dialog des codes de récupération avant de rediriger

### 2FA — Saisie code (connexion normale)

- Vue affichée après signin quand la réponse contient `requires_2fa: true`
- Champ de saisie du code 6 digits
- Bouton "Vérifier" → `POST /api/auth/2fa/verify` avec `{ temp_token, code }`
- Lien "Utiliser un code de récupération" en bas
- En cas de succès → stocker `access_token`, rediriger vers `/dashboard`

### 2FA — Codes de récupération

- Dialog modal affiché après activation du 2FA
- Liste des 8 codes de récupération
- Boutons "Copier les codes" et "Télécharger (.txt)"
- Bouton "J'ai sauvegardé" pour fermer et continuer vers le dashboard

### Mot de passe oublié

- Vue dans `/auth` (pas une page séparée), bascule depuis le lien "Mot de passe oublié ?"
- Bouton "← Retour" pour revenir au login
- Champ email + bouton "Envoyer le lien"
- Appeler `POST /api/auth/forgot-password` avec `{ email }`
- Toast succès : "Un email de réinitialisation vous a été envoyé" (toujours, même si email inconnu)
- Retour automatique à la vue login après succès

### Reset password (`/reset-password`)

- Extraire le token depuis le query param `?token=...`
- Si token absent ou invalide → afficher la page "Lien invalide" avec bouton "Retour à la connexion"
- Si token valide → formulaire : nouveau mot de passe + confirmation
- Afficher les règles de mot de passe en temps réel avec indicateurs visuels :
  - Min 12 caractères
  - Au moins 1 majuscule
  - Au moins 1 minuscule
  - Au moins 1 chiffre
  - Au moins 1 caractère spécial
- Vérifier que les deux mots de passe correspondent
- Bouton "Mettre à jour" → `POST /api/auth/reset-password` avec `{ token, new_password }`
- Après succès → rediriger vers `/auth` avec toast "Mot de passe mis à jour avec succès"

### Session & Refresh token

- Toutes les requêtes API doivent inclure `credentials: 'include'` pour envoyer les cookies httpOnly
- Intercepteur 401 : sur réponse 401, tenter `POST /api/auth/refresh` → si succès, retry la requête originale avec le nouveau token
- Si le refresh échoue (401) → supprimer le token local + rediriger vers `/auth`
- Signout : appeler `POST /api/auth/signout` avant de supprimer le token local et rediriger vers `/auth`

---

## Comportements attendus

### Loading states
- Boutons "Se connecter", "Continuer", "Envoyer le lien", "Mettre à jour", "Vérifier", "Activer" : afficher un spinner et désactiver pendant l'appel API
- Pendant le check-auth-method : désactiver le bouton "Continuer"

### Gestion d'erreurs
- 401 signin : "Email ou mot de passe incorrect"
- 423 lockout : "Compte temporairement verrouillé, réessayez dans X minutes" (afficher le `retry_after`)
- 400 reset password : afficher le message d'erreur du back (token invalide/expiré/déjà utilisé)
- 401 2FA verify : "Code invalide, veuillez réessayer"
- Erreur réseau : "Erreur de connexion, veuillez réessayer"

### Validation
- Email : format email valide (côté front)
- Mot de passe (signin) : min 12 caractères
- Mot de passe (reset) : min 12 chars + 1 majuscule + 1 minuscule + 1 chiffre + 1 caractère spécial
- Confirmation mot de passe : doit correspondre au premier champ
- Code TOTP : exactement 6 chiffres

### Permissions
- Pages `/auth` et `/reset-password` : accès public uniquement (rediriger vers dashboard si déjà connecté)
- Route `/auth/sso/callback` : accès public

---

## Décisions en attente

- [ ] **Service email** : quel provider pour l'envoi d'emails ? (SendGrid, Resend, AWS SES, etc.)
