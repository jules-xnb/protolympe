# Spec : MO — Champs archives

Route : `/dashboard/:clientId/users/fields/archived`

## Maquettes

### Page principale

```
+-----------------------------------------------------------------------+
|  [<- Retour champs actifs]                                            |
|  Archives -- Champs utilisateurs                                      |
+-----------------------------------------------------------------------+
|  [Rechercher un champ archive...]                                     |
+-----------------------------------------------------------------------+
|  < 1/1 >                                            2 resultats       |
+-----------------------------------------------------------------------+
|  Nom                    | Type         | Date d'archivage | Actions   |
| ----------------------- | ------------ | ---------------- | --------- |
|  Ancien matricule       | [A] Texte    | 15 jan 2025      | [Restaurer ->] |
|  ancien_matricule       |              |                  |                |
| ----------------------- | ------------ | ---------------- | -------------- |
|  Code site              | [v] Select   | 02 mar 2025      | [Restaurer ->] |
|  code_site              |              |                  |                |
+-----------------------------------------------------------------------+
```

Colonnes du tableau :
- Nom : nom (font-medium) + slug (text-xs text-muted-foreground)
- Type : icone du type + label
- Date d'archivage : `updated_at` formate
- Actions : bouton "Restaurer"

### Etat sans client selectionne

```
+-----------------------------------------------------------------------+
|  +-- EmptyState text-center --+                                       |
|  | [UserCircle h-12 w-12]    |                                        |
|  | Selectionnez un client     |                                        |
|  +----------------------------+                                        |
+-----------------------------------------------------------------------+
```

Note : utiliser le composant `EmptyState` (pas un div custom) pour la coherence.

## Regles metier

1. **Restauration** : remet `is_active` a `true` via PATCH. Coherent avec la philosophie "jamais de suppression physique".

2. **Pas de suppression definitive** : aucun bouton de suppression definitive dans cette page. Correct.

3. **Colonnes simplifiees** : pas de colonne "Unique" ni "Promouvoir" (irrelevant pour des archives). Afficher la date d'archivage a la place de "Obligatoire".

4. **Confirmation restauration** : ajouter un dialog de confirmation avant restauration (exigence CAC 40).

5. **Recherche** : filtre cote client sur le champ `name`.

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---|---|---|
| PATCH | `/api/clients/:clientId/users/field-definitions/:id` | Modifier definition (utilise pour restaurer avec `{is_active: true}`) |

## Endpoints API (a creer)

| Methode | Endpoint | Description | Raison |
|---|---|---|---|
| GET | `/api/clients/:clientId/users/field-definitions?archived=true` | Lister uniquement les champs archives | Le serveur ne filtre pas par `is_active` actuellement — le filtre est en dur `is_active = true` |
| PATCH | `/api/clients/:clientId/users/field-definitions/:id/reactivate` | Route dediee pour restaurer un champ | Plus explicite qu'un PATCH generique avec `{is_active: true}` |

## Comportements attendus

### Loading states
- Tableau : skeleton rows pendant le chargement
- Bouton "Restaurer" : loading pendant la mutation
- Dialog de confirmation : bouton en etat `isPending`

### Gestion d'erreurs
- Restauration echouee : toast d'erreur avec message explicite
- Aucun champ archive : etat vide "Aucun champ archive"

### Pagination
- Pagination serveur si plus de 20 champs archives (peu probable mais prevoir)

### Confirmation
- Ajouter un dialog de confirmation avant restauration

## Points d'attention backend

1. **Filtre `is_active`** : le `GET /field-definitions` retourne actuellement tous les champs sans filtrer. Ajouter le support du parametre `?archived=true` pour retourner uniquement les champs avec `is_active = false`.
2. **Retourner `updated_at`** : necessaire pour afficher la date d'archivage.
3. **Tri** : les champs archives doivent etre tries par date d'archivage decroissante (plus recent en premier).
