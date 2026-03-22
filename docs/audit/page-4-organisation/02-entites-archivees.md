# Spec : Entites archivees (`/dashboard/:clientId/entities/archived`)

## Maquettes

```
+---------------------------------------------------------------------------------+
|  Entites archivees                                                               |
|  Entites organisationnelles archivees de {clientName}                            |
|                                                     [<- Retour entites actives]  |
+---------------------------------------------------------------------------------+
|  [Rechercher une entite...]                                                      |
+---------------------------------------------------------------------------------+
|  Nom (+ code)        | Niveau | Parent      | Actions                           |
|----------------------+--------+-------------+-----------------------------------|
|  France              | 0      | --          | [Restaurer]                       |
|   FR01               |        |             |                                   |
+---------------------------------------------------------------------------------+
```

## Regles metier

- Afficher les entites archivees du client selectionne
- Colonnes : Nom (avec code en sous-texte), Niveau, Parent
- Recherche sur le nom
- Bouton "Restaurer" avec confirmation
- Bouton retour vers la liste active
- A la restauration, verifier que le parent est toujours actif (si le parent a ete archive entre-temps, l'entite restauree pointerait vers un parent invisible)
- Fallback si pas de client selectionne : etat vide

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/clients/:clientId/eo/?is_archived=true` | Liste des entites archivees |
| PATCH | `/api/clients/:clientId/eo/:id` | Restauration (`is_archived: false`) |

## Endpoints API (a creer)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| PATCH | `/api/clients/:clientId/eo/:id/unarchive` | Endpoint dedie de restauration avec audit trail (B17) |

## Comportements attendus

- Loading state : skeleton table pendant le chargement
- Gestion d'erreur : toast si la restauration echoue
- Etat vide : message "Aucune entite archivee" si la liste est vide
- Confirmation : dialog de confirmation avant restauration
- Apres restauration : rafraichir la liste, toast succes

## Points d'attention backend

| # | Severite | Point |
|---|----------|-------|
| B17 | Moyenne | Pas d'endpoint dedie `PATCH /:id/unarchive`. La restauration utilise le PATCH generique avec `is_archived: false`, sans entree d'audit specifique "restauration". |
| -- | Faible | Pas de gestion de la hierarchie a la restauration. Si le parent a ete archive entre-temps, l'entite restauree pointe vers un parent invisible. |
