# Spec : Creation d'entite (`/dashboard/:clientId/entities/new`)

## Maquettes

```
+---------------------------------------------------------------------------------+
|  <- Retour                                                                       |
|  Nouvelle entite                                                                 |
|  Creez une nouvelle entite organisationnelle                                     |
+---------------------------------------------------------------------------------+
|  -- Informations generales --                                                    |
|                                                                                  |
|  [Nom *          ] [Code           ]                                             |
|  [Entite parente : Aucune (racine) v ]                                           |
|  [Active : toggle]                                                               |
|                                                                                  |
|  -- Details (champs personnalises) --                                            |
|  [Champ 1 *] [Champ 2]                                                          |
|  [Champ textarea (pleine largeur)]                                               |
|                                                                                  |
|  [Annuler]  [Creer l'entite]                                                     |
+---------------------------------------------------------------------------------+
```

## Regles metier

- Page dediee avec formulaire complet (validation Zod)
- Support du parametre `?parent=<parentId>` pour creer un enfant directement
- Auto-generation du slug depuis le nom
- Auto-generation du code si le champ est laisse vide
- Champs personnalises affiches dynamiquement selon le client
- Types de champs geres : text, textarea, number, date, checkbox, select, multiselect, email, url
- Validation : nom minimum 2 caracteres (aligner front et back)
- Le champ `description` doit etre present dans le formulaire et envoye dans le POST
- Champs textarea/multiselect affiches en pleine largeur
- Champs personnalises marques `is_required` : validation obligatoire avant soumission
- Toast succes apres creation, navigation retour vers la liste
- Sauvegarde des champs personnalises : idealement atomique avec la creation de l'entite
- Un seul chemin de creation (page dediee), pas de dialog alternatif

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/clients/:clientId/eo/` | Creation entite |
| POST | `/api/clients/:clientId/eo/:id/field-values` | Sauvegarde valeurs champs perso |

## Endpoints API (a creer)

Aucun endpoint supplementaire requis.

## Comportements attendus

- Loading state : spinner sur le bouton "Creer" pendant la soumission
- Gestion d'erreur : toast erreur si la creation echoue, avec message explicite
- Validation front : nom requis (min 2 chars), champs personnalises requis si `is_required`
- Verification doublon code : message d'erreur si le code existe deja (dependant du back D1)
- Selecteur parent : recherche avec virtualisation pour gros volumes (10000+ entites)
- Navigation retour apres creation reussie

## Points d'attention backend

| # | Severite | Point |
|---|----------|-------|
| B8 | Haute | Pas de detection de cycle parent. Un parent peut etre son propre descendant. |
| D1 | Haute | Pas de contrainte UNIQUE `(client_id, code)`. Deux entites peuvent avoir le meme code. |
| -- | Moyenne | Validation Zod server : `name` min 1 char (front exige 2). Aligner a 2. |
