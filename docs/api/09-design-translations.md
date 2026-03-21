# 9. Design & Traductions

| API | Description | Persona | Règles |
|---|---|---|---|
| `GET /clients/:clientId/design` | Lire la config design | Authentifié avec accès client | |
| `PUT /clients/:clientId/design` | Modifier | `admin_delta`, `integrator_*` assigné | |
| `GET /clients/:clientId/translations` | Lire les traductions | Authentifié avec accès client | |
| `PUT /clients/:clientId/translations` | Mettre à jour (batch par scope/langue) | `admin_delta`, `integrator_*` assigné | |
