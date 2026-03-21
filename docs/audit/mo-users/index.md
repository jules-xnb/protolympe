# Spec : Module MO — Users (vue d'ensemble)

## Routes

| Sous-page | Route |
|---|---|
| Liste utilisateurs | `/dashboard/:clientId/users` |
| Import utilisateurs | `/dashboard/:clientId/users/import` |
| Champs personnalises | `/dashboard/:clientId/users/fields` |
| Champs archives | `/dashboard/:clientId/users/fields/archived` |

## Endpoints API (existants)

Server : `server/src/routes/users.ts` monte sur `/api/clients/:clientId/users`

| Endpoint | Methode | Description |
|---|---|---|
| `/api/clients/:clientId/users` | GET | Lister les utilisateurs |
| `/api/clients/:clientId/users/invite` | POST | Inviter un utilisateur |
| `/api/clients/:clientId/users/export` | GET | Export CSV |
| `/api/clients/:clientId/users/import` | POST | Import CSV |
| `/api/clients/:clientId/users/:id` | GET | Detail utilisateur |
| `/api/clients/:clientId/users/:id` | PATCH | Modifier utilisateur |
| `/api/clients/:clientId/users/:id/deactivate` | PATCH | Desactiver |
| `/api/clients/:clientId/users/:id/profiles` | GET | Lister profils d'un user |
| `/api/clients/:clientId/users/:id/profiles` | POST | Assigner profil |
| `/api/clients/:clientId/users/:id/profiles/:profileId` | DELETE | Retirer profil |
| `/api/clients/:clientId/users/field-definitions` | GET | Lister definitions champs |
| `/api/clients/:clientId/users/field-definitions` | POST | Creer definition champ |
| `/api/clients/:clientId/users/field-definitions/:id` | PATCH | Modifier definition |
| `/api/clients/:clientId/users/field-definitions/:id/deactivate` | PATCH | Archiver definition |
| `/api/clients/:clientId/users/:id/field-values` | GET | Lire valeurs champs |
| `/api/clients/:clientId/users/:id/field-values` | POST | Upsert valeur champ |

## Endpoints API (a creer)

| Endpoint | Methode | Description | Raison |
|---|---|---|---|
| `/api/clients/:clientId/users/:id/deactivate` | PATCH | Desactiver un membership (soft delete avec `deleted_at`) | Le retrait utilisateur doit etre un soft delete, jamais de suppression physique |
| `/api/clients/:clientId/users/:id/activate` | PATCH | Activer un utilisateur | Route manquante cote serveur |
| `/api/clients/:clientId/users/field-values` | GET | Charger les valeurs de champs en bulk (avec pagination) | L'endpoint actuel est unitaire par user, besoin d'un bulk pagine pour le tableau |
| `/api/clients/:clientId/users/field-definitions` | GET | Ajouter support du parametre `?archived=true` | Le serveur retourne tout sans filtrer par `is_active` |

## Points d'attention backend

1. **Export CSV doit etre fait cote serveur** : l'endpoint `GET /export` existe mais n'etait pas utilise. Le construire cote serveur avec streaming pour supporter 10 000+ utilisateurs.
2. **Suppression physique interdite** : tout retrait d'utilisateur doit passer par un soft delete (`PATCH` avec `deleted_at`).
3. **Bulk field values** : l'endpoint unitaire par user ne scale pas pour le tableau. Prevoir un endpoint bulk avec pagination.
4. **Filtre archives** : le `GET /field-definitions` doit supporter un parametre `?archived=true` pour filtrer par `is_active`.

## Sous-specs

1. [01-liste-utilisateurs.md](01-liste-utilisateurs.md)
2. [02-import-utilisateurs.md](02-import-utilisateurs.md)
3. [03-champs-personnalises.md](03-champs-personnalises.md)
4. [04-champs-archives.md](04-champs-archives.md)
