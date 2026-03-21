# 13. Admin audit

| API | Description | Persona | Règles |
|---|---|---|---|
| `GET /admin/audit` | Lister le journal d'audit admin | `admin_delta` uniquement | Paginé. Retourne toutes les actions admin (création/modification clients, intégrateurs, modules, permissions, etc.) triées par date décroissante |

### Détails

L'endpoint retourne les entrées de la table `admin_audit_log` :
- `actor_id` — qui a fait l'action (FK → accounts, nullable si compte supprimé)
- `action` — type d'action (ex: `client.create`, `integrator.invite`, `module.permissions.update`)
- `target_type` — type de cible (ex: `client`, `account`, `module`, `permission`)
- `target_id` — identifiant de la cible (uuid)
- `details` — détails de l'action (jsonb)
- `created_at` — date de l'action

### Actions loggées

| Action | Déclencheur |
|---|---|
| `client.create` | POST /clients |
| `client.update` | PATCH /clients/:id |
| `client.deactivate` | PATCH /clients/:id/deactivate |
| `client.sso.create` | PUT /clients/:id/sso (création) |
| `client.sso.update` | PUT /clients/:id/sso (modification) |
| `integrator.invite` | POST /integrators/invite |
| `integrator.update` | PATCH /integrators/:id |
| `integrator.client.assign` | POST /integrators/:id/clients |
| `integrator.client.remove` | DELETE /integrators/:id/clients/:clientId |
| `module.activate` | POST /clients/:clientId/modules |
| `module.update` | PATCH /clients/:clientId/modules/:id |
| `module.role.create` | POST /modules/:moduleId/roles |
| `module.role.update` | PATCH /modules/:moduleId/roles/:id |
| `module.permissions.update` | PUT /modules/:moduleId/permissions |
