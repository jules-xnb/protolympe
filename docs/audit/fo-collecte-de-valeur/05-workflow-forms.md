# Spec : Workflow Forms (Configuration formulaires)

**Route** : `/dashboard/:clientId/user/workflow-forms/:workflowId`

---

## Maquettes

### Page principale

```
+---------------------------------------------------------------------+
|  [<] Configurer les formulaires                                      |
+---------------------------------------------------------------------+
|                                                                      |
|  +--- WorkflowFormBuilder ----------------------------------------+ |
|  |                                                                 | |
|  |  Etapes du workflow :                                           | |
|  |  +-----------------------------------------------------------+ | |
|  |  | [Start] Repondant -> [Step 1] Validation N1 -> [End] Valide| | |
|  |  +-----------------------------------------------------------+ | |
|  |                                                                 | |
|  |  Configuration de l'etape selectionnee :                        | |
|  |  +-----------------------------------------------------------+ | |
|  |  | Nom de l'etape : [Repondant__________]                     | | |
|  |  |                                                             | | |
|  |  | Sections :                                                  | | |
|  |  | +-------------------------------------------------------+  | | |
|  |  | | Section 1 : Informations generales                     |  | | |
|  |  | |   [x] Nom            text     [visible] [editable]     |  | | |
|  |  | |   [x] Effectif       number   [visible] [editable]     |  | | |
|  |  | |   [ ] Commentaire    text     [masque]                 |  | | |
|  |  | +-------------------------------------------------------+  | | |
|  |  | +-------------------------------------------------------+  | | |
|  |  | | Section 2 : Donnees financieres                        |  | | |
|  |  | |   [x] Budget         currency [visible] [readonly]     |  | | |
|  |  | |   [x] Depenses       currency [visible] [editable]     |  | | |
|  |  | +-------------------------------------------------------+  | | |
|  |  +-----------------------------------------------------------+ | |
|  +------------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

### Layout 3 panneaux complet

```
+---------------------------------------------------------------------+
|  [<] Configurer les formulaires                                      |
+---------------------------------------------------------------------+
|                                                                      |
|  +--- WorkflowFormBuilder (flex h-full w-full) ---------+           |
|  |                                                       |           |
|  |  +--- StepsSidebar ---+  +--- AvailableFields ---+   |           |
|  |  | (panneau gauche)   |  | (panneau central)     |   |           |
|  |  |                    |  |                        |   |           |
|  |  | [*] Repondant      |  | Champs disponibles     |   |           |
|  |  |  (editable name)   |  | [Rechercher...]        |   |           |
|  |  |                    |  |                        |   |           |
|  |  | [ ] Validation N1  |  | [Grip] Effectif       |   |           |
|  |  |                    |  |        number          |   |           |
|  |  | [ ] Validation N2  |  | [Grip] Commentaire    |   |           |
|  |  |                    |  |        text            |   |           |
|  |  | [ ] Valide         |  | [Grip] Budget         |   |           |
|  |  |  (editable name)   |  |        currency        |   |           |
|  |  |                    |  |                        |   |           |
|  |  +--------------------+  | [+ Ajouter section]   |   |           |
|  |                          +------------------------+   |           |
|  |                                                       |           |
|  |  +--- FormCanvas (panneau droit) -------------------+ |           |
|  |  |                                                   | |           |
|  |  |  Etape : Repondant                                | |           |
|  |  |  [Copier depuis : Validation N1 v]                | |           |
|  |  |                                                   | |           |
|  |  |  +--- Section 1 : Informations generales ------+ | |           |
|  |  |  | (titre editable, drag-drop pour reorder)     | | |           |
|  |  |  |                                              | | |           |
|  |  |  | [Grip] Nom       [visible v] [editable v]    | | |           |
|  |  |  |        text      [x] Requis                  | | |           |
|  |  |  |                                              | | |           |
|  |  |  | [Grip] Code      [visible v] [editable v]    | | |           |
|  |  |  |        text      [x] Requis                  | | |           |
|  |  |  |                                              | | |           |
|  |  |  | [Grip] Effectif  [visible v] [editable v]    | | |           |
|  |  |  |        number    [ ] Requis                  | | |           |
|  |  |  |                                              | | |           |
|  |  |  | [Grip] Comment.  [masque v]                  | | |           |
|  |  |  |        text                                  | | |           |
|  |  |  +----------------------------------------------+ | |           |
|  |  |                                                   | |           |
|  |  |  +--- Section 2 : Donnees financieres ----------+ | |           |
|  |  |  | (titre editable)                              | | |           |
|  |  |  |                                              | | |           |
|  |  |  | [Grip] Budget    [visible v] [readonly v]    | | |           |
|  |  |  |        currency                              | | |           |
|  |  |  |                                              | | |           |
|  |  |  | [Grip] Depenses  [visible v] [editable v]    | | |           |
|  |  |  |        currency  [ ] Requis                  | | |           |
|  |  |  +----------------------------------------------+ | |           |
|  |  |                                                   | |           |
|  |  |  Sauvegarde automatique (auto-save)               | |           |
|  |  +---------------------------------------------------+ |           |
|  +-------------------------------------------------------+           |
+---------------------------------------------------------------------+
```

**Layout 3 panneaux** :
1. **StepsSidebar** (gauche) : liste des etapes du workflow. Clic pour changer de contexte. Noms editables pour start/end nodes
2. **AvailableFieldsPanel** (centre) : champs BO disponibles non encore utilises. Recherche, selection multiple, drag vers le canvas. Bouton "+ Ajouter section"
3. **FormCanvas** (droite) : configuration de l'etape selectionnee. Sections avec champs, drag-drop pour reorder, visibilite/editable/requis par champ

---

## Regles metier

### Etapes du workflow

- Les etapes sont derivees du workflow : `startNode` (Repondant) + etapes de validation (tri par `order`) + `endNode` (Valide)
- Les champs BO requis (`is_required`) sont auto-ajoutes dans la premiere section de l'etape Repondant
- Les champs BO `is_readonly` sont forces en `is_editable=false` lors de la copie vers l'etape Repondant

### Drag-and-drop

- DnD via `@dnd-kit/core` : drag depuis AvailableFieldsPanel vers FormCanvas, reorder dans FormCanvas
- Selection multiple dans AvailableFieldsPanel : drag de N champs simultanement

### Copier depuis

- "Copier depuis" : copie les sections + champs d'une autre etape vers l'etape courante
- Confirmation si config existante

### Sauvegarde

- Sauvegarde automatique (auto-save) avec debounce
- Changement d'etape : flush save de l'etape precedente avant de charger la nouvelle

### Navigation retour

- Utiliser une route explicite de retour vers le type de collecte (pas `navigate(-1)`)

### Guard de permission

- Verifier acces module CV + permission `edit_form` avant d'afficher la page
- Un utilisateur sans cette permission qui accede a l'URL directement doit etre redirige

### i18n

- Toutes les strings doivent passer par le systeme de traduction

---

## Endpoints API (existants)

| Methode | Route | Usage |
|---------|-------|-------|
| `GET` | `/api/workflows/:id/with-nodes` | Charge workflow + noeuds + transitions |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---------|-------|-------|--------|
| - | - | - | Tous les endpoints necessaires existent. |

---

## Comportements attendus

### Loading states
- **Chargement initial** : skeleton de la page 3 panneaux pendant le chargement du workflow
- **Changement d'etape** : spinner dans le FormCanvas pendant le chargement de la configuration de l'etape
- **Sauvegarde auto** : indicateur discret "Sauvegarde..." dans le coin

### Gestion d'erreurs
- **Echec chargement** : message d'erreur avec bouton "Reessayer"
- **Echec sauvegarde auto** : toast d'erreur non bloquant, retry automatique
- **Permission refusee** : redirection ou page 403
- **Erreur reseau** : retry automatique

### Validation
- Au moins une section par etape
- Champs BO requis toujours presents dans l'etape Repondant

### Permissions
- Guard `edit_form` + acces module CV au niveau page
- Verifier que le composant WorkflowFormBuilder n'expose pas d'options reservees aux admins quand utilise par un `client_user`

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Guard permission `edit_form` | HAUTE | Verifier cote API que l'utilisateur a la permission avant d'accepter les modifications |
| 2 | Audit WorkflowFormBuilder | HAUTE | Verifier que le composant ne fuit pas des fonctionnalites admin reservees quand utilise par un `client_user` |

---

## Problemes recurrents transversaux (module Collecte de Valeur)

Les problemes suivants doivent etre traites sur **toutes** les pages du module :

| Probleme | Pages concernees | Priorite |
|----------|-----------------|----------|
| **Guard de permission au niveau page** | SurveyEditorPage, WorkflowFormsPage | HAUTE |
| **`navigate(-1)` comme retour** | SurveyEditorPage, WorkflowFormsPage, CampaignDetailPage | MOYENNE |
| **Resolution de roles par nom** | ModulePage | CRITIQUE |
| **Permissions via location.state/query params** | SurveyResponsesView -> CampaignDetailPage | HAUTE |
| **Debounce sur la recherche** | CampaignDetailPage, SurveyCreatorView, SurveyResponsesView | MOYENNE |
