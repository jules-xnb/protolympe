# Spec : FO — Profils archives (`/dashboard/:clientId/user/profiles/archived`)

## Maquettes

### Page avec profils archives

```
+---------------------------------------------------------------------+
|  <- Mes profils    Archives -- Profils                              |
+---------------------------------------------------------------------+
|  [Rechercher un profil archive...]                                  |
+---------------------------------------------------------------------+
|  Nom                           Description          Actions         |
| ─────────────────────────────────────────────────────────────────── |
|  Ancien Profil Finance         Compta groupe     [Restaurer >]     |
|                                                   (dialog confirm)  |
+---------------------------------------------------------------------+
```

### Page sans profils archives (empty state)

```
+---------------------------------------------------------------------+
|  <- Mes profils    Archives -- Profils                              |
+---------------------------------------------------------------------+
|  [Rechercher un profil archive...]                                  |
+---------------------------------------------------------------------+
|                                                                     |
|                Aucun element archive                                |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## Regles metier

### Perimetre des archives visibles

- Un `client_user` ne doit voir que les profils archives **auxquels il etait assigne** (pas tous les profils archives du client)

### Restauration

- La restauration d'un profil impacte TOUS les utilisateurs qui l'ont
- Une confirmation est obligatoire avant restauration (AlertDialog)
- La restauration doit etre soumise a une permission explicite verifiee cote API

### Decisions a prendre

1. **Un `client_user` doit-il pouvoir voir/restaurer des profils archives ?**
   - Si OUI : ajouter une permission `can_restore` dans le module Profils, verifiee cote API
   - Si NON : supprimer cette page en FO et ne la garder qu'en MO

### Bouton retour

- Le bouton retour doit pointer vers `/user/profiles` (route explicite, pas `navigate(-1)`)

### i18n

- Toutes les strings doivent passer par le systeme de traduction (titres, colonnes, labels)

---

## Endpoints API (existants)

| Methode | Route | Usage |
|---------|-------|-------|
| `GET` | `/clients/:clientId/profiles` | Liste des profils avec filtre `is_archived` cote serveur |
| `PATCH` | `/clients/:clientId/profiles/:id/archive` | Archiver un profil |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---------|-------|-------|--------|
| `PATCH` | `/clients/:clientId/profiles/:id/restore` | Restaurer un profil archive | Inverse de `/:id/archive` : met `is_archived = false`. Avec verification de permissions pour `client_user`. |
| `GET` | `/auth/me/profiles?archived=true` | Profils archives de l'utilisateur | Variante de `GET /auth/me/profiles` filtrant uniquement les profils archives assignes a l'utilisateur. |

---

## Comportements attendus

### Loading states
- **Chargement initial** : skeleton de tableau pendant le chargement
- **Restauration en cours** : bouton "Restaurer" en etat loading (spinner + disabled)

### Gestion d'erreurs
- **Echec restauration** : toast d'erreur avec detail
- **Echec chargement** : message d'erreur avec bouton "Reessayer"
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- **Confirmation** : AlertDialog obligatoire avant restauration

### Pagination
- Recherche par nom dans la liste
- Pagination si necessaire (gros volumes improbables pour cette page)

### Permissions
- Seuls les profils archives assignes a l'utilisateur sont visibles
- La restauration est conditionnee a une permission verifiee cote API

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Creer `PATCH /:id/restore` | HAUTE | Endpoint inverse de `/:id/archive` — verifie les permissions pour `client_user` |
| 2 | Verification permissions restauration | HAUTE | Un `client_user` doit avoir la permission `can_restore` pour restaurer un profil |
