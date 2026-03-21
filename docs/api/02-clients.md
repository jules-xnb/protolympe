# 2. Clients

| API | Description | Persona | Règles |
|---|---|---|---|
| `GET /clients` | Lister les clients | `admin_delta` | Tous les clients |
| `GET /clients` | Lister les clients | `integrator_*` | Uniquement ses clients assignés |
| `GET /clients/:id` | Détail d'un client | `admin_delta`, `integrator_*` | Vérifie accès au client |
| `POST /clients` | Créer un client | `admin_delta` | Unicité du nom (409 si doublon). Min 2 chars. |
| `PATCH /clients/:id` | Modifier un client | `admin_delta`, `integrator_*` assigné | Champs éditables : name, subdomain, custom_hostname |
| `GET /clients` | Lister les clients | `admin_delta`, `integrator_*` | Params : `is_active`, `search` (ILIKE sur name), `page`, `per_page` |
| `PATCH /clients/:id/deactivate` | Désactiver un client | `admin_delta` | |
| `GET /clients/:id/integrators` | Lister les intégrateurs assignés à ce client | `admin_delta` | |
| `GET /clients/:id/sso` | Voir la config SSO du client | `admin_delta`, `integrator_*` assigné | |
| `PUT /clients/:id/sso` | Configurer le SSO du client | `admin_delta` | |
| `DELETE /clients/:id/sso` | Supprimer la config SSO | `admin_delta` | |
