# Spec : Detail Campagne + Import

**Route detail** : `/dashboard/:clientId/user/campaigns/:campaignId`
**Route import** : `/dashboard/:clientId/user/campaigns/:campaignId/import`

---

## Maquettes

### Detail campagne — Vue gestionnaire

```
+---------------------------------------------------------------------+
|  [<] Campagne Q1 2025  [3 reponses]                                  |
|                         [Importer >] [Exporter >] [Cloturer X]       |
+---------------------------------------------------------------------+
|  [Repondant (2)] [Validation N1 (1)] [Validation N2 (0)] [Valide (0)]|
|                                                                      |
|  [Rechercher...]  [Filtrer >]  [Grouper: -- v]                      |
+---------------------------------------------------------------------+
|  [x]  Entite   | Champ 1 | Champ 2 | Champ 3   | Statut   |[comm] |
|  -----|---------|---------|---------|-----------|----------|-------|
|  [ ]  RH Paris | 42      | 12.5    | [select v]| En cours | [msg] |
|  [x]  IT Lyon  | 18      | 8.3     | Oui       | Soumis   | [msg] |
|  [ ]  Finance  | --      | --      | --        | En attente|       |
+---------------------------------------------------------------------+
|  TOTAL          | 60      | 20.8    |           |          |       |
+---------------------------------------------------------------------+
|  < 1/1 >  3 resultats  [30 v] lignes/page                          |
+---------------------------------------------------------------------+
|  [2 selections]  [Soumettre les reponses >]  (ou [Valider >] si     |
|                   validateur)                                        |
+---------------------------------------------------------------------+
```

### Detail campagne — Vue gestionnaire complete

```
+---------------------------------------------------------------------+
|  [<] Campagne Q1 2025  [3 reponses]                                  |
|                         [Importer >] [Exporter >] [Cloturer X]       |
+---------------------------------------------------------------------+
|  [Repondant (2)] [Validation N1 (1)] [Validation N2 (0)] [Valide (0)]|
|                                                  [Rechercher...    ] |
+---------------------------------------------------------------------+
|  [Grouper par: -- v] [X]                [Filtres dynamiques >]       |
+---------------------------------------------------------------------+
|  [2 selectionnee(s)] [Deselectionner]                                |
|                            [Soumettre (2) >]  (ou [Valider >] etc.)  |
+---------------------------------------------------------------------+
|  [x]  Entite      | Champ 1 | Champ 2* | Calcule  | Statut  |[comm]|
|  -----|------------|---------|----------|----------|---------|------|
|  [ ]  RH Paris     | 42      | 12.5     | 54.5     | En cours| [msg]|
|       [Ouvrir >]   |  (bg bleu si editable inline)           |      |
|  [x]  IT Lyon      | 18      | 8.3      | 26.3     | Soumis  | [msg]|
|       [Ouvrir >]   |                                         |      |
|  [ ]  Finance      | --      | --       | --       | Attente |      |
+---------------------------------------------------------------------+
|  TOTAL              | 60      | 20.8     | 80.8     |         |      |
+---------------------------------------------------------------------+
|  < 1/1 >  3 resultats  [10|30|50] lignes/page                      |
+---------------------------------------------------------------------+
```

### Detail campagne — Vue repondant

```
+---------------------------------------------------------------------+
|  [<] Campagne Q1 2025  [3 reponses]                                  |
+---------------------------------------------------------------------+
|  [Repondant (2)]                                                     |
|                                                  [Rechercher...    ] |
+---------------------------------------------------------------------+
|  [x]  Entite      | Champ 1 | Champ 2* | Statut     | Action        |
|  -----|------------|---------|----------|------------|---------------|
|  [ ]  RH Paris     | [42___] | [12.5__] | En cours   | [Soumettre >] |
|       [Ouvrir >]   |                                                 |
|  [x]  IT Lyon      | 18      | 8.3      | Soumis     |               |
|       [Ouvrir >]   |                                                 |
+---------------------------------------------------------------------+
```

**Differences** :
- Pas de bouton "Cloturer", pas de bouton "Importer"/"Exporter" (sauf si permissions)
- Colonne "Action" visible : bouton Soumettre (si repondant + champs requis remplis) ou Valider/Refuser (si validateur)
- Edition inline limitee aux champs editables selon le workflow step

### Fiche reponse full-page (SurveyResponseFullPage)

```
+---------------------------------------------------------------------+
|  Section: Informations generales                                     |
|  [<]  RH Paris — Campagne Q1 2025              [Enregistrer brouillon]|
+---------------------------------------------------------------------+
|                                                                      |
|  +--- Sidebar (w-64) ----------+  +--- Formulaire ---------------+  |
|  | bg-muted/30                  |  |                               |  |
|  |  [*] Informations generales  |  |  +--- Table ---+              |  |
|  |  [ ] Donnees financieres     |  |  | Champ    | N-1 | | Valeur || |
|  |  [ ] Commentaires            |  |  |----------|-----|----------|  |
|  |                              |  |  | Nom      | --  | Jean     |  |
|  |                              |  |  |   text   |     |          |  |
|  |                              |  |  | Effectif | 40  | [42___]  |  |
|  |                              |  |  |   number |     |          |  |
|  |                              |  |  | Budget   | 100k| [120k__] |  |
|  |                              |  |  |   currenc|     |          |  |
|  |                              |  |  | Statut   | Oui | [Oui  v] |  |
|  |                              |  |  |   select |     |          |  |
|  |                              |  |  | Document |     | [Upload] |  |
|  |                              |  |  |   file   |     |          |  |
|  |                              |  |  +----------+-----|----------+  |
|  |                              |  |                               |  |
|  +------------------------------+  | Commentaires (par champ) :    |  |
|                                    | [!] Budget: "Verifier le      |  |
|                                    |     montant" — Valideur N1     |  |
|                                    |     [Marquer resolu]           |  |
|                                    |                               |  |
|                                    +-------------------------------+  |
|                                                                      |
+---------------------------------------------------------------------+
|  [Enregistrer >]  [Soumettre >]                                     |
|  -- ou (si validateur) --                                            |
|  [Enregistrer >]  [Refuser X]  [Valider >]                          |
+---------------------------------------------------------------------+
```

### Import campagne

```
+---------------------------------------------------------------------+
|  Importer — Campagne Q1 2025                                        |
|  [< Retour a la campagne]                                           |
+---------------------------------------------------------------------+
|  Etape 1 : Charger le fichier CSV                                   |
|  [Telecharger le template CSV]  [Selectionner un fichier...]        |
|                                                                      |
|  Etape 2 : Mapping des colonnes                                     |
|  +------------------------------------------------------------+     |
|  | Colonne CSV       | Champ cible                            |     |
|  |------------------------------------------------------------|     |
|  | Nom entite         | Nom de l'entite (auto)                 |     |
|  | Code               | Code de l'entite (auto)                |     |
|  | Effectif           | Effectif (auto)                        |     |
|  | Masse salariale    | -- Selectionner --                     |     |
|  +------------------------------------------------------------+     |
|                                                                      |
|  Etape 3 : Apercu                                                   |
|  +------------------------------------------------------------+     |
|  | Entite   | Code  | Statut          | Champ 1 | Champ 2     |     |
|  |----------|-------|-----------------|---------|-------------|     |
|  | RH Paris | RH01  | OK -- 3 champs  | 42      | 12.5        |     |
|  | IT Lyon  | IT01  | OK -- 2 champs  | 18      | 8.3         |     |
|  | ???      | ???   | Entite non trouvee                       |     |
|  +------------------------------------------------------------+     |
|                                                                      |
|  Etape 4 : Import                                                   |
|  [Importer X lignes]  Progression : [==========] 100%               |
|  Resultat : 2 succes, 1 erreur                                      |
+---------------------------------------------------------------------+
```

### Export Dialog — Selection multi-onglets

```
+-----------------------------------------------+
|  Exporter les reponses                   [X]   |
|------------------------------------------------|
|                                                 |
|  Selectionnez les onglets a exporter :          |
|                                                 |
|  [x] Repondant                    2 reponse(s)  |
|  [x] Validation N1               1 reponse(s)  |
|  [ ] Validation N2               0 reponse(s)  |
|  [x] Valide                      3 reponse(s)  |
|                                                 |
|------------------------------------------------|
|  [Annuler]                     [Exporter >]    |
+-----------------------------------------------+
```

---

## Regles metier

### Onglets dynamiques workflow

Les onglets sont generes dynamiquement a partir du workflow de la campagne :
- **Repondant** : reponses pending + in_progress + rejected
- **Etapes de validation** : 1 onglet par etape workflow accessible a l'utilisateur
- **Valide** : reponses en statut final (nom du end node du workflow)

### Edition inline avec conditions de visibilite

Chaque cellule editable verifie :
1. Le champ est-il `editable` selon le role/step actuel ?
2. Le champ est-il cache par une condition de visibilite ? -> `evaluateVisibilityConditions()`
3. Les champs calcules sont reevalues en temps reel via `evaluateFormula()`

### Local overrides pour reevaluation instantanee

Les modifications inline sont stockees en local pour permettre la reevaluation immediate des conditions de visibilite et des formules, sans attendre le round-trip serveur. Les overrides sont effaces quand les donnees serveur sont rafraichies.

### Actions en masse (bulk)

- Selection par checkbox sur les reponses eligibles
- Detection automatique du type d'action (submit si repondant, validate si validateur)
- **Confirmation obligatoire** via AlertDialog avant execution
- Execution parallele

### Export CSV multi-onglets

- Si 1 seul onglet -> export direct
- Si plusieurs onglets -> dialog de selection des onglets a exporter
- Le CSV inclut : entite, code, statut, onglet, + toutes les colonnes de champs
- Encodage UTF-8 avec BOM pour compatibilite Excel
- Separateur `;` (convention francaise)
- Nom fichier : `{campaign_name}_export.csv`

### Import CSV

- Auto-mapping par nom/slug de champ (normalise sans accents)
- Correspondance EO par nom ou code
- Conversion de types (number, decimal, boolean)
- Template CSV pre-rempli avec les entites de la campagne
- Apercu avec detection d'erreurs avant import

### Detail reponse (SurveyResponseFullPage)

- **Route dediee** : utiliser une route `/campaigns/:campaignId/responses/:responseId` (URL partageable)
- **Sidebar** : navigation par section, visible seulement si > 1 section
- **Formulaire** : table avec colonnes Champ, N-1 (si campagne precedente), Valeur
- **Rendu dynamique** selon `field_type` : text, number, decimal, currency, select, multiselect, checkbox, date, datetime, calculated, aggregation, file
- **Commentaires** : par champ, ajout/resolution selon le role et l'onglet actif
- **Conditions de visibilite** : filtrage des champs en temps reel selon les valeurs saisies
- **Champs calcules** : reevalues a chaque changement de valeur
- **Colonne N-1** : valeurs de la campagne precedente (si `previous_campaign_id` est set)
- **Variation** : indicateur visuel si variation > seuil (threshold + direction)
- **Actions** : Save (brouillon), Submit (respondent), Validate/Reject (validator)
- **ReadOnly** : si le role ne matche pas l'onglet actif, si statut validated, ou si le role n'est pas eligible

### Tri numerique

Les colonnes number/decimal/currency doivent utiliser une comparaison numerique (pas `localeCompare`).

### Cloture de campagne

- Seul un gestionnaire peut cloturer
- Confirmation obligatoire
- Invalidation des queries avec la bonne query key apres cloture

---

## Endpoints API (existants)

| Methode | Route | Usage |
|---------|-------|-------|
| `GET` | `/api/surveys/campaigns/:id` | Charge la campagne |
| `GET` | `/api/surveys/campaigns/:id/filtered-responses` | Reponses filtrees par perimetre EO + roles |
| `GET` | `/api/surveys/campaigns/:id/field-columns` | Colonnes de champs + valeurs par BO |
| `PATCH` | `/api/surveys/responses/:id/status` | Soumettre / Valider / Rejeter |
| `PATCH` | `/api/business-objects/:id/field-values/upsert` | Sauvegarder les valeurs de champs |
| `PATCH` | `/api/surveys/campaigns/:id` | Cloturer une campagne (status=closed) |
| `GET` | `/api/surveys/responses/:id/field-comments` | Commentaires par champ |
| `PATCH` | `/api/surveys/field-comments/:id/resolve` | Marquer commentaire comme resolu |
| `POST` | `/api/surveys/responses/:id/field-comments` | Ajouter commentaire |
| `GET` | `/api/surveys/campaigns/:id/import-data` | Charge fieldDefs + responses pour le mapping |
| `POST` | `/api/business-objects/:id/field-values/upsert` | Upsert des valeurs importees |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---------|-------|-------|--------|
| `POST` | `/api/surveys/campaigns/:id/import` | Import batch server-side | Traite tout cote serveur en une seule requete au lieu de N appels sequentiels |
| `GET` | `/api/surveys/campaigns/:id/export` | Export CSV server-side | Genere le CSV cote serveur pour gerer les gros volumes |

---

## Comportements attendus

### Loading states
- **Chargement campagne** : skeleton de page complete
- **Chargement reponses** : skeleton de tableau
- **Edition inline** : indicateur de sauvegarde discret (pas de spinner bloquant)
- **Actions en masse** : barre de progression pendant l'execution
- **Import** : barre de progression avec compteur (X/N)
- **Export** : spinner sur le bouton pendant la generation

### Gestion d'erreurs
- **Echec chargement** : message d'erreur avec bouton "Reessayer"
- **Echec sauvegarde inline** : toast d'erreur, restauration valeur precedente
- **Echec soumission/validation** : toast d'erreur par reponse en echec
- **Import erreurs** : affichage inline dans l'apercu (lignes en erreur surlignees)
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- **Soumission** : champs requis remplis avant soumission
- **Import** : correspondance EO obligatoire, detection d'erreurs avant execution
- **Cloture** : confirmation obligatoire

### Pagination
- Pagination server-side pour les reponses
- Tailles de page : 10, 30, 50
- Debounce 300ms sur la recherche

### Permissions
- Permissions chargees depuis l'API (pas via location.state ou query params)
- Verification cote serveur du droit d'ecriture par champ pour l'import

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Verification upsert par champ | HAUTE | S'assurer que `POST .../field-values/upsert` applique le controle `can_edit` par champ via `getEditableCvFormFieldIds()` |
| 2 | Import batch server-side | HAUTE | Creer un endpoint batch pour l'import au lieu de N appels sequentiels (performance sur 500+ entites) |
| 3 | Export server-side | MOYENNE | Generer le CSV cote serveur pour gerer les gros volumes (milliers de reponses) |
| 4 | Invalidation query cloture | BASSE | Corriger la query key d'invalidation apres cloture de campagne (actuellement utilise un survey_id vide) |
