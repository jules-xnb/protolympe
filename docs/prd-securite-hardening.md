# PRD — Sécurisation Backend Post-Audit

## Contexte

Suite à l'analyse point par point de la checklist sécurité CAC 40, 14 points d'amélioration ont été identifiés et validés. Ce chantier couvre le hardening du backend existant.

## Périmètre

Renforcement du backend existant. Aucune nouvelle feature, aucun changement d'API. Transparent pour le frontend.

## Détails fonctionnels

### A. Headers et protections HTTP

**A1 — Headers de sécurité**
Le serveur doit renvoyer systématiquement les headers de sécurité standards :
- X-Frame-Options: DENY (empêche le clickjacking)
- X-Content-Type-Options: nosniff (empêche le MIME sniffing)
- Strict-Transport-Security (force HTTPS)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: caméra, micro, géoloc désactivés

**A2 — Limite de taille des requêtes**
Toute requête entrante est limitée à 1 MB. Au-delà : rejet 413.

**A3 — Compression**
Les réponses sont compressées (gzip/brotli) pour réduire la bande passante.

**A4 — Rate limiting global**
En plus des limites spécifiques (login, reset), un rate limit global de 100 requêtes/minute par IP protège contre les abus généralisés.

### B. Traçabilité

**B1 — Identifiant unique par requête**
Chaque requête reçoit un UUID unique (Request ID), renvoyé dans le header `X-Request-Id` et inclus dans tous les logs. Permet de tracer une requête de bout en bout.

**B2 — Logs structurés JSON**
Chaque requête produit une ligne de log JSON contenant : timestamp, méthode, chemin, statut, durée, userId, requestId, IP. Remplace le logger texte actuel.

**B3 — Log des tentatives d'authentification**
Chaque tentative de connexion (succès ou échec) est loggée avec : email tenté, IP, user-agent, résultat (succès/échec/compte verrouillé).

**B4 — Audit trail étendu**
Les actions suivantes génèrent une entrée dans l'audit trail (en plus des actions admin déjà couvertes) :
- Création/modification/archivage de profils
- Création/modification/archivage d'EOs
- Modifications de configuration de modules

### C. Robustesse des erreurs

**C1 — Gestionnaire d'erreurs global**
Toute erreur non gérée est interceptée. Le client reçoit `{ error: "Internal Server Error", request_id: "..." }` avec un statut 500. Le détail complet est loggué côté serveur.

**C2 — Aucun détail technique côté client**
Les catch existants sont nettoyés : plus de `String(err)` ni de messages techniques dans les réponses. Messages génériques uniquement.

### D. Vérifications et corrections

**D1 — Reset password → invalidation complète**
Quand un utilisateur réinitialise son mot de passe, TOUS ses refresh tokens sont supprimés. Toutes ses sessions existantes sont invalidées.

**D2 — Vérification des index DB**
Les colonnes fréquemment utilisées en WHERE, JOIN, ORDER BY disposent d'index appropriés. Ajout des index manquants si identifiés.

**D3 — Aucune donnée sensible dans les logs**
Vérification que les mots de passe, tokens, secrets et données personnelles ne sont jamais présents dans les logs.

## Hors périmètre

- **2FA/MFA** : Epic séparé à planifier
- **Secret Manager** (Vault, etc.) : Configuration infra
- **WAF/DDoS protection** : Configuration infra (Scaleway/Cloudflare)
- **CI/CD security** : Pipeline, pas code applicatif
- **RGPD compliance** : Process et juridique

## Critères de done

- [ ] curl -I renvoie X-Frame-Options, X-Content-Type-Options, HSTS
- [ ] Requête > 1 MB → 413
- [ ] Réponses compressées (Accept-Encoding: gzip → Content-Encoding: gzip)
- [ ] Toute requête a un header X-Request-Id
- [ ] Logs stdout en format JSON structuré
- [ ] Login réussi/échoué loggué avec IP
- [ ] Reset password supprime tous les refresh tokens de l'utilisateur
- [ ] Toute erreur 500 retourne { error: "Internal Server Error", request_id: "..." }
- [ ] Aucun String(err) dans les réponses client
- [ ] Rate limiting global actif (429 après 100 req/min par IP)
- [ ] Index DB présents sur colonnes clés
