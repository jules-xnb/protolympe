# 1. Auth

| API | Description | Auth requise | Règles |
|---|---|---|---|
| `POST /auth/signin` | Connexion email + mot de passe | Non | Retourne access token (15min) + refresh token (7j) |
| `GET /auth/sso/:clientId` | Redirige vers le provider SSO du client | Non | Lit la config SSO du client |
| `GET /auth/sso/callback` | Callback SSO — crée ou récupère le compte | Non | Retourne les tokens |
| `POST /auth/refresh` | Renouveler le token | Non (refresh token requis) | Rotation : ancien invalidé, nouveau généré |
| `POST /auth/signout` | Déconnexion | Oui | Supprime le refresh token en base |
| `PATCH /auth/password` | Changer son mot de passe | Oui | Vérifie l'ancien mot de passe |
| `POST /auth/forgot-password` | Demande de reset mot de passe | Non | Envoie un email avec token de reset |
| `POST /auth/reset-password` | Reset avec token | Non | Token à usage unique, expire après X minutes |
| `GET /auth/me` | Infos de l'utilisateur connecté (persona, clients accessibles) | Oui | |
| `GET /auth/sso/:clientId/check` | Vérifie si le SSO est configuré pour un client | Non | Endpoint public, retourne juste { enabled, provider } |
| `GET /auth/me/profiles` | Lister mes profils disponibles | Oui | Profils non archivés, `deletedAt IS NULL`. Pour la page de sélection de profil avant d'entrer dans le FO |
| `POST /auth/select-profile` | Sélectionner un profil actif | Oui (`client_user` uniquement) | Body: `{profile_id}`. Vérifie que le profil appartient à l'utilisateur et n'est pas archivé. Retourne un nouveau JWT avec `activeProfileId` |
| `POST /auth/check-auth-method` | Détermine le mode d'auth pour un email ou hostname | Non | Reçoit `{ email }` ou `{ hostname }` → retourne `{ method: 'password' \| 'sso', provider?, client_id?, client_name? }` |
| `POST /auth/2fa/setup` | Générer secret TOTP + QR code | temp_token | Retourne `{ secret, qr_code_url, otpauth_uri }`. Uniquement admin/intégrateurs. |
| `POST /auth/2fa/setup/confirm` | Confirmer config 2FA avec code valide | temp_token | Vérifie le code, active le 2FA, retourne `{ access_token }` + codes de récupération |
| `POST /auth/2fa/verify` | Vérifier un code TOTP au login | temp_token | Si valide → `{ access_token }` + cookie refresh. Rate limit 5/60s. |

### Règles `POST /auth/check-auth-method`
- Si `hostname` fourni : cherche un client par `subdomain` ou `custom_hostname` → si trouvé et SSO activé → `sso`, sinon → `password`
- Si `email` fourni : cherche le compte par email → retrouve son client via `user_client_memberships` → si client trouvé et SSO activé → `sso`, sinon → `password`
- Ne leak pas si l'email existe ou non (retourne toujours une réponse valide)
- Rate limit : 10 req/60s

### Tables associées
- `refresh_tokens` — stocke les refresh tokens hashés, avec expiration
- `password_reset_tokens` — tokens de reset à usage unique
- `client_sso_configs` — config SSO par client (provider, issuer URL, client_id OIDC, client_secret)
- `clients.subdomain` — sous-domaine dédié pour accès direct
- `clients.custom_hostname` — hostname CNAME personnalisé
- `accounts.totp_secret` — secret TOTP chiffré (null si 2FA pas configuré)
- `accounts.totp_enabled` — booléen, 2FA activé ou non

### Règles 2FA
- **Obligatoire** pour `admin_delta`, `integrator_delta`, `integrator_external`
- **Pas de 2FA** pour `client_user`
- **Pas de 2FA si SSO** — le provider SSO gère sa propre sécurité
- `POST /signin` : si admin/intégrateur avec `totp_enabled = false` → `{ requires_2fa_setup: true, temp_token }` ; si `totp_enabled = true` → `{ requires_2fa: true, temp_token }`
- Le `temp_token` est un JWT court (5 min) qui ne donne accès qu'aux routes `/auth/2fa/*`

### Règles profil actif
- Si le `client_user` a **1 seul profil** → auto-sélectionné au signin (le JWT contient `activeProfileId` directement)
- Si **plusieurs profils** → le JWT n'a pas `activeProfileId`, l'utilisateur doit appeler `POST /auth/select-profile`
- Tous les droits (périmètre EO, rôles, permissions) sont scopés au profil actif uniquement
- **Pas d'union entre profils** — l'utilisateur switch entre ses profils
- Lors du `POST /auth/refresh`, le profil est aussi auto-détecté (1 profil = auto)
- Voir `docs/regles-acces-detail.md` pour le modèle complet
