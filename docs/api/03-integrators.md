# 3. Intégrateurs

| API | Description | Persona | Règles |
|---|---|---|---|
| `GET /integrators` | Lister tous les intégrateurs (admin + intégrateurs) | `admin_delta` | Params : `page`, `per_page`, `search` (ILIKE email/nom/prénom), `client_id` (filtre par client assigné). Retourne `client_count` par intégrateur |
| `POST /integrators/invite` | Inviter un intégrateur (crée le compte + assigne persona) | `admin_delta` | Persona : `admin_delta` / `integrator_delta` / `integrator_external`. Rate limit 5/60s |
| `PATCH /integrators/:id` | Modifier (persona, infos) | `admin_delta` | Persona : `admin_delta` / `integrator_delta` / `integrator_external`. Un admin ne peut pas modifier son propre compte |
| `GET /integrators/:id/clients` | Lister ses clients assignés | `admin_delta` | |
| `POST /integrators/:id/clients` | Assigner à un client | `admin_delta` | 409 si déjà assigné |
| `DELETE /integrators/:id/clients/:clientId` | Retirer l'assignation | `admin_delta` | Soft delete |
