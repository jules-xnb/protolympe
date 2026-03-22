# 8. Listes

| API | Description | Persona | Règles |
|---|---|---|---|
| **Listes** | | | |
| `GET /clients/:clientId/lists` | Lister | `admin_delta`, `integrator_*` assigné | |
| `GET /clients/:clientId/lists/:id` | Détail (avec valeurs) | `admin_delta`, `integrator_*` assigné | |
| `POST /clients/:clientId/lists` | Créer | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id/archive` | Archiver | `admin_delta`, `integrator_*` assigné | Vérifie qu'aucun champ actif ne l'utilise |
| **Valeurs** | | | |
| `GET /clients/:clientId/lists/:id/values` | Lister les valeurs | Authentifié avec accès client | Les client_user en ont besoin pour les formulaires |
| `POST /clients/:clientId/lists/:id/values` | Ajouter | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id/values/:valueId` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `DELETE /clients/:clientId/lists/:id/values/:valueId` | Supprimer (soft delete) | `admin_delta`, `integrator_*` assigné | |
| `PATCH /clients/:clientId/lists/:id/values/reorder` | Réordonner | `admin_delta`, `integrator_*` assigné | |
