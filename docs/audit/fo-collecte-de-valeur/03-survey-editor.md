# Spec : Editeur de Survey (Questionnaire)

**Routes** : `/dashboard/:clientId/user/surveys/new` et `/dashboard/:clientId/user/surveys/:surveyId/edit`

---

## Maquettes

### Mode creation

```
+---------------------------------------------------------------------+
|  [<]  Nouveau questionnaire                          [Enregistrer >] |
|       Configurez votre questionnaire de collecte.                    |
+---------------------------------------------------------------------+
|                                                                      |
|  +--- Colonne gauche (2/3) ----------+  +--- Colonne droite (1/3) -+|
|  |                                    |  |                          ||
|  |  +- Informations generales ------+|  |  +- Resume -------------+||
|  |  | Nom du questionnaire          ||  |  | Champs totaux    : 5  |||
|  |  | [_________________________]   ||  |  | Champs verrouilles: 3 |||
|  |  |                               ||  |  | Champs ajoutes   : 2  |||
|  |  | Description                   ||  |  +-----------------------+||
|  |  | [_________________________]   ||  |                          ||
|  |  | [_________________________]   ||  +---------------------------+|
|  |  |                               ||                               |
|  |  | Source de donnees              ||                               |
|  |  | [Entite organisationnelle v]   ||                               |
|  |  | Les champs obligatoires seront ||                               |
|  |  | ajoutes automatiquement.       ||                               |
|  |  +-------------------------------+|                               |
|  |                                    |                               |
|  |  +- Champs a afficher -----------+|                               |
|  |  | [Ajouter un champ +]          ||                               |
|  |  |                               ||                               |
|  |  | [Lock] Nom        Requis  BO  ||                               |
|  |  |        text                    ||                               |
|  |  | [Lock] Code        Requis  BO ||                               |
|  |  |        text                    ||                               |
|  |  | [Grip] Effectif          [X]  ||                               |
|  |  |        number                  ||                               |
|  |  | [Grip] Commentaire       [X]  ||                               |
|  |  |        text                    ||                               |
|  |  +-------------------------------+|                               |
|  +------------------------------------+                               |
+---------------------------------------------------------------------+
```

### Mode edition

Identique a la creation, sauf :
- Le titre affiche "Modifier le questionnaire"
- Le select source (bo_definition_id) est desactive
- Les champs existants sont pre-charges depuis le survey existant

### Editeur complet avec dialogs

```
+---------------------------------------------------------------------+
|                                                                      |
|  [SurveyFieldSelector dialog]                                        |
|  +-------------------------------------------+                      |
|  | Selectionner un champ               [X]   |                      |
|  | Liste des champs BO non encore ajoutes    |                      |
|  | [Champ A]  [Champ B]  [Champ C]           |                      |
|  | [Creer un nouveau champ >]                |                      |
|  +-------------------------------------------+                      |
|                                                                      |
|  [SurveyFieldCreateDialog]                                           |
|  +-------------------------------------------+                      |
|  | Creer un nouveau champ              [X]   |                      |
|  | Nom, type, options...                     |                      |
|  +-------------------------------------------+                      |
+---------------------------------------------------------------------+
```

**Logique champs** :
- Champs BO requis (`is_required`) : ajoutes automatiquement au chargement, fond bleu, icone Lock, non supprimables
- Champs ajoutes manuellement : icone GripVertical, bouton Trash2 pour supprimer
- Chaque champ affiche : label, chips Requis/BO, type en sous-texte
- Bouton "Ajouter un champ" desactive si aucune source selectionnee

**Dialogs** :
- `SurveyFieldSelector` : liste des champs BO disponibles (hors ceux deja ajoutes), avec option "Creer un nouveau champ"
- `SurveyFieldCreateDialog` : formulaire de creation de champ sur le `bo_definition_id` selectionne

---

## Regles metier

### Schema de validation

```
surveySchema:
  name: string, min 1, max 200 — "Le nom est requis"
  description: string, optionnel
  bo_definition_id: string, min 1 — "La source est requise"
```

### Validation champs

- Au moins un champ doit etre present dans le formulaire
- Les champs BO requis (`is_required`) ne peuvent pas etre supprimes
- Le formulaire resultant doit etre coherent (pas de duplication de champs)

### Changement de source BO

- Si l'utilisateur change de BO avec des champs deja ajoutes, demander confirmation
- Les champs requis du nouveau BO sont automatiquement ajoutes
- Les champs de l'ancien BO sont retires

### Mode edition

- En mode edition, les champs existants doivent etre charges depuis le survey existant
- Le select source (bo_definition_id) est desactive

### Navigation retour

- Apres sauvegarde, naviguer vers une route explicite (page du type de collecte), jamais `navigate(-1)`

### Guard de permission

- Verifier la permission `edit_form` au niveau de la page (pas seulement au bouton)
- Un utilisateur sans cette permission qui accede a l'URL directement doit etre redirige

### Drag-and-drop

- L'ordre des champs est important pour le formulaire
- Implementer le reordonnement avec `@dnd-kit/sortable`

---

## Endpoints API (existants)

| Methode | Route | Usage |
|---------|-------|-------|
| `GET` | `/api/surveys/:id` | Charge un survey existant (mode edition) |
| `POST` | `/api/surveys` | Creation de survey |
| `PATCH` | `/api/surveys/:id` | Mise a jour de survey |
| `GET` | `/api/bo-definitions` | Liste des types d'objets metier |
| `GET` | `/api/bo-definitions/:id/fields` | Champs du type d'objet selectionne |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---------|-------|-------|--------|
| - | - | - | Tous les endpoints necessaires existent. |

---

## Comportements attendus

### Loading states
- **Chargement initial (edition)** : skeleton du formulaire pendant le chargement du survey
- **Chargement champs BO** : spinner dans la section "Champs a afficher" pendant le chargement des definitions
- **Sauvegarde** : bouton "Enregistrer" en etat loading (spinner + disabled)

### Gestion d'erreurs
- **Echec chargement survey** : message d'erreur avec bouton "Reessayer"
- **Echec sauvegarde** : toast d'erreur avec detail
- **Permission refusee** : redirection ou page 403
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- Validation Zod au submit (nom requis, source requise)
- Au moins 1 champ present
- Champs BO requis non supprimables
- Feedback visuel inline sur les erreurs de validation

### Permissions
- Guard `edit_form` au niveau page
- Pas d'acces sans la permission meme via URL directe

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Verification permission `edit_form` | HAUTE | Verifier cote API que l'utilisateur a la permission avant d'accepter POST/PATCH |
