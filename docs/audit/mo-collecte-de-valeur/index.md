# Spec MO -- Module Collecte de Valeur

## Vue d'ensemble

Le module "Collecte de Valeur" regroupe trois domaines fonctionnels dans la vue MO (Integrateur) :

| Domaine | Pages | Statut backend |
|---|---|---|
| **Business Objects** | Liste, Detail, Structure, Champs archives, Instances archivees, Historique, Import BO, Import instances | **A construire** (API + tables DB) |
| **Modules** | Liste (Navigation), Config (Affichage, BO, Workflows, Roles, Permissions), Display config edit | Fonctionnel |
| **Workflows** | Liste, Detail (graphe + formulaires) | **A construire** (API + tables DB) |

## Stack technique backend

- **Serveur** : Hono
- **ORM** : Drizzle
- **BDD** : Neon (PostgreSQL)

### Etat du backend

**Routes existantes :**
- `/api/clients/:clientId/modules/*` -- modules, activation, navigation
- `/api/modules/:moduleId/roles` -- CRUD roles
- `/api/modules/:moduleId/permissions` -- matrice permissions
- `/api/modules/:moduleId/display-configs/*` -- CRUD display configs

**A construire :**
- `/api/business-object-definitions` -- CRUD definitions BO
- `/api/field-definitions` -- CRUD definitions champs
- `/api/business-objects` -- CRUD instances BO
- `/api/workflows` -- CRUD workflows, noeuds, transitions, formulaires
- Tables DB correspondantes dans le schema Drizzle

## Fichiers de specs detailles

1. [01-business-objects-liste.md](01-business-objects-liste.md) -- Liste + Archives
2. [02-business-objects-detail.md](02-business-objects-detail.md) -- Detail BO + instances
3. [03-business-objects-structure.md](03-business-objects-structure.md) -- Structure champs + archives champs
4. [04-business-objects-import.md](04-business-objects-import.md) -- Import BO + Import instances
5. [05-modules-liste.md](05-modules-liste.md) -- Navigation / Modules
6. [06-module-config.md](06-module-config.md) -- Config module (onglets Display, BO, Workflows, Roles, Permissions)
7. [07-workflows.md](07-workflows.md) -- Liste + Detail (graphe + formulaires)
