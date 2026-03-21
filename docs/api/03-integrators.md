# 3. Intégrateurs

| API | Description | Persona | Règles |
|---|---|---|---|
| `GET /integrators` | Lister tous les intégrateurs | `admin_delta` | |
| `POST /integrators/invite` | Inviter un intégrateur (crée le compte + assigne persona) | `admin_delta` | |
| `PATCH /integrators/:id` | Modifier (persona, infos) | `admin_delta` | |
| `GET /integrators/:id/clients` | Lister ses clients assignés | `admin_delta` | |
| `POST /integrators/:id/clients` | Assigner à un client | `admin_delta` | |
| `DELETE /integrators/:id/clients/:clientId` | Retirer l'assignation | `admin_delta` | |
