# Spec : Historique EO (`/dashboard/:clientId/entities/history`)

## Maquettes

### Page principale

```
+---------------------------------------------------------------------------------+
|  <- Retour                                                                      |
|  Historique des Entites                              [Exporter CSV ->]          |
|  Consultez toutes les modifications et annulez une action specifique.           |
+---------------------------------------------------------------------------------+
|  [ Filtrer par entite : Toutes les entites   v ]     42 actions                |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  Date            | Entite  | Action             | Avant      | Apres    | Par       | Actions        |
|  ----------------+---------+--------------------+------------+----------+-----------+----------------+
|  12 Mar 14:30    | Paris   | [Pencil] Renommage | Paris 5e   | Paris    | admin@    | [Eye] [RotateCcw Annuler] |
|  12 Mar 14:25    | Paris   | [Pencil] Reparent. | France     | IdF      | admin@    | [Eye] [RotateCcw Annuler] |
|  11 Mar 09:00    | France  | [Plus] Creation    | --         | France   | admin@    | [Eye]          |
|  10 Mar 16:00    | Lyon    | [Trash] Suppression| Lyon       | --       | admin@    | [Eye]          |
|  10 Mar 12:00    | Berlin  | [Pencil] is_active | Oui        | Non      | user@     | [Eye] [RotateCcw Annuler] |
|                                                                                 |
+---------------------------------------------------------------------------------+
|  < 1 / 3 >                                                                     |
+---------------------------------------------------------------------------------+
```

Note : la colonne "Entite" est masquee quand un filtre par entite specifique est actif.

### Dialog Snapshot (bouton [Eye])

```
+-----------------------------------------------------------+
|  Snapshot -- Paris                                   [X]  |
|  12 Mars 2026 14:30                                       |
+-----------------------------------------------------------+
|                                                           |
|  Champ         | Valeur                                   |
|  --------------+------------------------------------------+
|  name          | Paris                                    |
|  code          | FR03                                     |
|  parent_id     | Ile-de-France (resolu)                   |
|  is_active     | Oui                                      |
|  description   | Siege social Paris                       |
|  ...           | ...                                      |
|                                                           |
|  Champs modifies (surlignés)                              |
|  name : Paris 5e -> Paris                                 |
|                                                           |
+-----------------------------------------------------------+
|                                          [Fermer]         |
+-----------------------------------------------------------+
```

### Dialog de confirmation Revert

```
+-----------------------------------------------------------+
|  Annuler cette modification ?                             |
|                                                           |
|  Le champ "Renommage" de l'entite "Paris" sera retabli    |
|  a la valeur "Paris 5e".                                  |
|  Cette action creera une nouvelle entree dans             |
|  l'historique.                                            |
|                                                           |
+-----------------------------------------------------------+
|                        [Annuler]  [Confirmer]             |
+-----------------------------------------------------------+
```

## Regles metier

- Journal d'audit complet (create, update, delete/archive, revert)
- Filtre par entite (dropdown avec toutes les entites du client)
- Export CSV de l'historique avec audit de l'export lui-meme
- Revert de changements individuels avec confirmation (cree une nouvelle entree d'audit)
- Dialog snapshot : etat complet de l'entite a un instant T, champs modifies surlignés
- Pagination
- Chips colores par type d'action
- Icones par type d'action
- Formatage des valeurs affichees (dates, parent_id -> nom, etc.)
- Reset de page quand le filtre change
- Colonne "Entite" masquee quand un filtre par entite specifique est actif
- Bouton retour contextuel (vers la liste des entites)
- Comparaison d'entrees : utiliser un ID exact (pas de `startsWith` fragile)

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/clients/:clientId/eo/audit` | Tous les logs audit du client |
| GET | `/api/clients/:clientId/eo/:id/audit` | Logs audit d'une entite specifique |
| PATCH | `/api/clients/:clientId/eo/:id/revert` | Revert d'un champ a sa valeur precedente |
| POST | `/api/clients/:clientId/eo/export-log` | Logger l'export CSV de l'historique |

## Endpoints API (a creer)

Aucun endpoint supplementaire requis.

## Comportements attendus

- Loading state : skeleton table pendant le chargement de l'historique
- Gestion d'erreur : toast si le revert echoue
- Etat vide : message "Aucune modification enregistree" si l'historique est vide
- Pagination : composant unifie
- Export CSV : telechargement immediat avec feedback toast

## Points d'attention backend

| # | Severite | Point |
|---|----------|-------|
| B9 | Haute | Table `eo_audit_log` definie mais jamais peuplee. Les actions sont loggees dans `admin_audit_log`. L'endpoint `GET /:id/audit` doit lire `admin_audit_log` (ou peupler `eo_audit_log`). Si les logs sont vides, toute la page (revert, snapshot, export) est inutilisable. |
