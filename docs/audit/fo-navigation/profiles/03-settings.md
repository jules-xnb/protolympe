# Spec : FO — Parametres (`/dashboard/settings`)

## Maquettes

### Page parametres (cible)

```
+---------------------------------------------------------------------+
|  Parametres                                                         |
+---------------------------------------------------------------------+
|                                                                     |
|  Informations personnelles                                          |
|                                                                     |
|  +---------------------------+  +---------------------------+       |
|  | Nom                       |  | Prenom                    |       |
|  | [Dupont         ] (ro)    |  | [Jean            ] (ro)   |       |
|  +---------------------------+  +---------------------------+       |
|                                                                     |
|  +----------------------------------------------------------+      |
|  | Adresse mail                                              |      |
|  | [jean.dupont@example.com                      ] (ro)      |      |
|  +----------------------------------------------------------+      |
|                                                                     |
|  +----------------------------------------------------------+      |
|  | Date de creation du compte                                |      |
|  | [15/03/2024                                   ] (ro)      |      |
|  +----------------------------------------------------------+      |
|                                                                     |
|  ───────────────────────────────────────────────────────────────── |
|                                                                     |
|  Securite                                                           |
|                                                                     |
|  +----------------------------------------------------------+      |
|  | Mot de passe                                              |      |
|  | ************                    [Modifier le mot de passe]|      |
|  +----------------------------------------------------------+      |
|                                                                     |
|  ───────────────────────────────────────────────────────────────── |
|                                                                     |
|  Profil actif (visible uniquement en mode user_final)               |
|                                                                     |
|  +----------------------------------------------------------+      |
|  | Profil actuel : Profil Comptable                          |      |
|  | 3 entites . 2 roles                                       |      |
|  |                                [Changer de profil >]      |      |
|  +----------------------------------------------------------+      |
|                                                                     |
+---------------------------------------------------------------------+

(ro) = readOnly + disabled, fond grise, curseur interdit
Largeur max: max-w-xl, centre horizontalement
```

---

## Regles metier

### Source de donnees

- Utiliser `GET /auth/me` pour recuperer `{first_name, last_name, email, created_at, persona}`
- Les champs `first_name` et `last_name` sont separes en BDD (table `accounts`) — ne jamais parser un `full_name` concatene

### Sections

1. **Informations personnelles** : Nom, Prenom, Email, Date de creation — tous en lecture seule
2. **Securite** : lien vers le changement de mot de passe (l'endpoint `PATCH /auth/password` existe deja)
3. **Profil actif** (FO uniquement) : affiche le profil actif avec un lien vers la page de gestion des profils — visible uniquement en mode `user_final`

### i18n

- Toutes les strings doivent passer par le systeme de traduction

### Coherence

- Utiliser `PageHeader` comme les autres pages (pas un `<h1>` brut)

---

## Endpoints API (existants)

| Methode | Route | Usage |
|---------|-------|-------|
| `PATCH` | `/auth/password` | Changement de mot de passe |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---------|-------|-------|--------|
| `GET` | `/auth/me` | Infos du compte connecte | Retourne `{first_name, last_name, email, created_at, persona}` depuis la table `accounts` |

---

## Comportements attendus

### Loading states
- **Chargement initial** : skeleton des champs pendant le fetch `GET /auth/me`

### Gestion d'erreurs
- **Echec chargement** : toast d'erreur ou message inline avec bouton "Reessayer" — jamais de fail silencieux
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- Page en lecture seule — pas de validation de saisie

### Permissions
- Page accessible dans tous les modes (admin, integrateur, user_final)
- La section "Profil actif" n'est visible qu'en mode `user_final`

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Creer `GET /auth/me` | HAUTE | Retourne les infos du compte connecte depuis `accounts` (first_name, last_name, email, created_at, persona) |
