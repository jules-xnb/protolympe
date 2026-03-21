# Spec : MO Organisation -- Entites organisationnelles

## Vue d'ensemble

Module Organisation de la vue MO (Module Owner / Integrateur).
Gere la hierarchie organisationnelle des clients : entites, champs personnalises, groupes, historique, import/export.

**Route racine** : `/dashboard/:clientId/entities`

## Sous-pages

| # | Sous-page | Fichier spec | Route |
|---|-----------|--------------|-------|
| 01 | Entites (liste/arbre/canvas) | [01-entites.md](01-entites.md) | `/entities` |
| 02 | Entites archivees | [02-entites-archivees.md](02-entites-archivees.md) | `/entities/archived` |
| 03 | Creation d'entite | [03-creation-entite.md](03-creation-entite.md) | `/entities/new` |
| 04 | Import EO | [04-import-eo.md](04-import-eo.md) | `/entities/import` |
| 05 | Champs EO | [05-champs-eo.md](05-champs-eo.md) | `/entities/fields` |
| 06 | Import champs EO | [06-import-champs-eo.md](06-import-champs-eo.md) | `/entities/fields/import` |
| 07 | Champs EO archives | [07-champs-eo-archives.md](07-champs-eo-archives.md) | `/entities/fields/archived` |
| 08 | Historique EO | [08-historique-eo.md](08-historique-eo.md) | `/entities/history` |

## API backend

Route serveur : `/api/clients/:clientId/eo/*` (fichier `server/src/routes/eo.ts`)

## Securite -- Synthese OWASP

| Vulnerabilite | Status | Detail |
|---|---|---|
| A01 Broken Access Control | PARTIEL | Isolation client OK. Controle acces champs MANQUANT sur POST values (bypass `getEditableFieldSlugs`) |
| A02 Cryptographic Failures | OK | JWT validation presente |
| A03 Injection | OK | Requetes parametrees (Drizzle ORM) |
| A04 Insecure Design | PARTIEL | JSONB non valide (`settings`, `value`) -- accepte n'importe quel JSON |
| A05 Security Misconfiguration | OK | Middleware stack securise |
| A07 Authentication | OK | JWT + persona validation |
| A08 Data Integrity | PARTIEL | Pas de UNIQUE sur `(eo_id, field_definition_id)`, `(client_id, code)`, `(client_id, field_name)`, `(group_id, eo_id)` |
| A09 Logging & Monitoring | PARTIEL | Audit entites/champs OK. Manque : valeurs, membres groupes, commentaires |

## Recap complet des travaux

### Base de donnees (D)

| # | Table | Modification |
|---|-------|-------------|
| D1 | `eo_entities` | Index UNIQUE `(client_id, code)` -- empecher doublons de code |
| D2 | `eo_field_values` | Contrainte UNIQUE `(eo_id, field_definition_id)` |
| D3 | `eo_field_definitions` | Index UNIQUE `(client_id, name)` |
| D4 | `eo_group_members` | Contrainte UNIQUE `(group_id, eo_id) WHERE deleted_at IS NULL` |

### Back-end (B)

| # | Endpoint | Modification |
|---|----------|-------------|
| B1 | POST /:id/values | Audit trail `eo.field_value.update` |
| B2 | POST /:id/values | Appliquer `getEditableFieldSlugs()` pour client_user |
| B3 | POST /:id/values | Valider valeur selon `field_type` |
| B4 | POST /fields | Enum validation `field_type` |
| B5 | POST/PATCH /fields | Enum validation `comment_on_change` |
| B6 | POST/PATCH /fields | Valider `list_id` meme client |
| B7 | POST/PATCH /fields | Schema JSON `settings` par field_type |
| B8 | POST / (create entity) | Detection cycles parent |
| B9 | GET /:id/audit | Lire `admin_audit_log` au lieu de `eo_audit_log` (table vide) |
| B10 | POST /import | Resoudre hierarchie parent cote API |
| B11 | POST /import | Aligner `is_active = true` par defaut |
| B12 | POST /import | Audit trail `eo.import` |
| B13 | POST /import | Rate limiting |
| B14 | POST /groups/:id/members | Audit trail ajout/suppression membres |
| B15 | POST /groups/:id/members | Verifier doublon avant ajout |
| B16 | POST /groups | Verifier unicite nom par client |
| B17 | Nouveau | Endpoint `PATCH /:id/unarchive` (restauration) |
| B18 | Nouveau | Endpoint `PATCH /fields/:id/reactivate` |
| B19 | Nouveau | Endpoint batch `GET /values/all?client_id=` |
| B20 | GET / | Param `?search=` pour recherche cote API |

### Front-end (a construire)

| # | Fonctionnalite | Description |
|---|----------------|-------------|
| F1 | Formulaire creation entite | Inclure le champ `description` dans le schema de validation |
| F2 | Selecteur parent | Recherche avec virtualisation pour gros volumes (10000+ entites) |
| F3 | Drawer de detail | Afficher toast erreur si la sauvegarde echoue (pas de fail silencieux) |
| F4 | Drawer reparentage | Gerer le cas ou `path` est null dans la validation des candidats |
| F5 | Archivage entite | Utiliser PATCH `is_archived: true` (jamais de suppression physique) |
| F6 | Vue canvas | Hauteur responsive (pas de valeur hardcodee) |
| F7 | Export CSV | Gerer le cas ou le slug client est absent dans le nom du fichier |
| F8 | Serialisation JSONB | Normaliser la serialisation des valeurs de champs (pas de `JSON.stringify` / `replace`) |
| F9 | Chargement valeurs champs | Utiliser l'endpoint batch `/values/all` (pas de N+1) |
| F10 | Terminologie | Aligner sur "Archiver" / "Desactiver" partout (jamais "supprimer") |
| F11 | Regroupements | Preview du nombre de descendants avant ajout |
| F12 | Vue arbre | Auto-expand du chemin de l'entite selectionnee |
| F13 | Import champs : fallback no-client | Afficher un etat vide standard si pas de client selectionne |
| F14 | Champs archives | Toujours filtrer par `clientId` |
| F15 | Dialog archivage entite | Terminologie "archiver" (pas "supprimer"), message coherent avec le comportement (bloque si enfants) |
| F16 | Dialog archivage groupe | Terminologie "archiver/desactiver" (pas "supprimer") |

### Decisions en attente

- Archivage recursif : archiver les enfants en cascade ou bloquer ? (actuellement : bloque)
- Import atomique : rollback ou tolerance avec rapport ? (actuellement : tolerance)
- Export archives : inclure ou exclure les entites archivees ? (actuellement : incluses)
- Table audit : consolider `eo_audit_log` et `admin_audit_log`, ou supprimer `eo_audit_log` inutilisee ?
