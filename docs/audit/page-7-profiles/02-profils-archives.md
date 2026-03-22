# Spec : MO — Profils archives

Route : `/dashboard/:clientId/profiles/archived`

## Maquettes

### Page profils archives

```
+-----------------------------------------------------------------------+
|  [<- Retour profils actifs]                                           |
|  Archives -- Profils                                                  |
+-----------------------------------------------------------------------+
|  [Rechercher un profil archive...]                                    |
+-----------------------------------------------------------------------+
|  Nom                    | Utilisateurs      | Actions                 |
| ----------------------- | ----------------- | ----------------------- |
|  Admin RH               | [Users] 3         | [Restaurer ->]          |
| ----------------------- | ----------------- | ----------------------- |
|  Lecteur                | [Users] 0         | [Restaurer ->]          |
+-----------------------------------------------------------------------+

Colonnes du tableau :
- Nom : font-medium
- Utilisateurs : Chip variant="outline" avec icone Users + compteur
- Actions : bouton "Restaurer"

Recherche : filtre par nom (searchColumn="name")
Navigation retour : vers la page liste des profils actifs
```

### Etat sans client selectionne

```
+-----------------------------------------------------------------------+
|  +-- EmptyState text-center --+                                       |
|  | [UserCog h-12 w-12]       |                                        |
|  | Selectionnez un client     |                                        |
|  +----------------------------+                                        |
+-----------------------------------------------------------------------+
```

Note : utiliser le composant `EmptyState` (pas un div custom) pour la coherence.

## Regles metier

1. **Restauration** : remet `is_archived` a `false`. Le profil redevient visible dans la liste des profils actifs avec toutes ses associations (EOs, roles, groupes) intactes.

2. **Confirmation avant restauration** : ajouter un dialog de confirmation (exigence CAC 40). Texte : "Etes-vous sur de vouloir restaurer le profil '{nom}' ? Il sera a nouveau visible et assignable."

3. **Pas de suppression definitive** : aucun bouton de suppression dans cette page. Correct.

4. **Compteur utilisateurs** : meme `_userCount` que la page liste. Affiche le nombre d'utilisateurs qui etaient assignes au moment de l'archivage.

5. **Champ `is_archived`** : la BDD utilise `is_archived: boolean`. Le filtrage doit se faire sur ce champ (pas `is_active`).

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---|---|---|
| GET | `/api/clients/:clientId/profiles` | Lister les profils (mais filtre en dur `is_archived = false`) |
| PATCH | `/api/clients/:clientId/profiles/:id/archive` | Archiver un profil |

## Endpoints API (a creer)

| Methode | Endpoint | Description | Raison |
|---|---|---|---|
| GET | `/api/clients/:clientId/profiles?is_archived=true` | Lister les profils archives | Le filtre `is_archived = false` est en dur, pas de moyen de lister les archives |
| PATCH | `/api/clients/:clientId/profiles/:id/restore` | Restaurer un profil (set `is_archived = false`) | Aucune route de restauration n'existe |

## Comportements attendus

### Loading states
- Tableau : skeleton rows pendant le chargement
- Bouton "Restaurer" : loading pendant la mutation
- Dialog de confirmation : bouton en etat `isPending`

### Gestion d'erreurs
- Restauration echouee : toast d'erreur avec message explicite
- Aucun profil archive : etat vide "Aucun profil archive"

### Pagination
- Pagination serveur (le backend supporte `parsePaginationParams`)
- Pagination par defaut : 20 par page

### Permissions
- Seul un Module Owner peut restaurer un profil

## Points d'attention backend

1. **Lister les archives** : le `GET /profiles` filtre en dur `eq(clientProfiles.isArchived, false)`. Il faut ajouter un parametre `?is_archived=true` ou creer une route separee `GET /profiles/archived`.
2. **Route restauration** : creer `PATCH /:id/restore` qui set `is_archived = false`. Le schema Zod du PATCH generique n'accepte pas `is_archived` actuellement.
3. **`_userCount`** : doit etre retourne aussi pour les profils archives (meme `LEFT JOIN` + `COUNT` que la page liste).
4. **Tri** : les profils archives doivent etre tries par date d'archivage decroissante (`updated_at DESC`).
