# Spec : Champs EO (`/dashboard/:clientId/entities/fields`)

## Maquettes

### Page principale

```
+---------------------------------------------------------------------------------+
|  <- Retour                                                                       |
|  Champs personnalises des EO                                                     |
|  Definissez les champs personnalises pour les entites de {clientName}            |
|                                                                                  |
|  [Archives]  [Import/Export v]  [Ajouter un champ]                              |
+---------------------------------------------------------------------------------+
|  [Rechercher un champ...]                                                        |
+---------------------------------------------------------------------------------+
|  Nom (+ slug)    | Type        | Obligatoire | Unique | Commentaire | Auto | Regles | Actions |
|------------------+-------------+-------------+--------+-------------+------+--------+---------|
|  Nom [Systeme]   | Texte       | Oui         | Non    | Non         | Non  | Non    | [Modifier] |
|  ID [Systeme]    | UUID        | Oui         | Oui    | Non         | Auto | Non    | --      |
|  Statut [Systeme]| Boolean     | Oui         | Non    | Non         | Non  | Non    | [Modifier] |
|  Ville           | Texte       | Non         | Non    | Non         | Non  | Non    | [Modifier] [Archiver] |
+---------------------------------------------------------------------------------+
```

### EoFieldFormDialog -- Formulaire complet

#### Etape 1 : Formulaire (creation)

```
+-----------------------------------------------------------+
|  Nouveau champ                                       [X]  |
+-----------------------------------------------------------+
|                                                           |
|  Nom du champ *               | Description               |
|  [ Ex: Numero SIRET         ] | [ Aide pour les utili.  ] |
|                                                           |
|  Type de champ                                            |
|  [ Texte court                                  v ]       |
|  (Types groupes : Texte, Nombre, Date, Selection, Autre) |
|                                                           |
+-- Section : Longueur maximale (types texte uniquement) ---+
|  [ _________ ] Laisser vide pour aucune limite            |
+-----------------------------------------------------------+
|                                                           |
+-- Section : Formatage d'affichage (text/number/decimal) --+
|  [# Formatage d'affichage]                    [toggle]    |
|  (si active :)                                            |
|    Type de formatage : [ Zeros a gauche         v ]       |
|    Longueur totale   : [ 5                        ]       |
|    Apercu : 00042                                         |
+-----------------------------------------------------------+
|                                                           |
+-- Section : Referentiel (select/multiselect uniquement) --+
|  Source des options                                        |
|  [ Selectionner une liste                       v ]       |
|  (ou options manuelles pour checkbox)                     |
+-----------------------------------------------------------+
|                                                           |
+-- Section : Labels booleen (type boolean uniquement) -----+
|  Label "Vrai"   : [ Oui                                 ] |
|  Label "Faux"   : [ Non                                 ] |
|  Valeur par defaut a la creation : [toggle] Non par defaut|
+-----------------------------------------------------------+
|                                                           |
+-- Section : Commentaire au changement (select/is_active) -+
|  [MessageSquare] Commentaire au changement                |
|  [toggle] Demander un commentaire lors du changement      |
|  (si active :)                                            |
|    [toggle] Commentaire obligatoire                       |
|    Transitions concernees (vide = toutes)                 |
|    [ De...    v ] -> [ Vers...  v ]                  [X]  |
|    [ De...    v ] -> [ Vers...  v ]                  [X]  |
|    [Ajouter une transition ->]                            |
+-----------------------------------------------------------+
|                                                           |
+-- Section : Generation automatique -----------------------+
|  [Zap] Generation automatique                             |
|  [toggle] Generer automatiquement si le champ est vide    |
|  (si active :)                                            |
|    Mode de generation                                     |
|    [ Compteur                                   v ]       |
|    (Options : Compteur, UUID, Date du jour, Valeur fixe)  |
|                                                           |
|    - Compteur : genere 1, 2, 3...                         |
|    - UUID : identifiant unique                            |
|    - Date : format configurable [ yyyy-MM-dd    v ]       |
|    - Valeur fixe : [ valeur par defaut            ]       |
+-----------------------------------------------------------+
|                                                           |
+-- Section : Validation ------------------------------------+
|  [toggle] Champ obligatoire                               |
|  [toggle] Valeur unique                                   |
|                                                           |
|  [ShieldCheck] Regles de validation inter-champs          |
|  +-------------------------------------------------------+|
|  | [ Type de regle         v ] [ Champ cible        v ] [X]||
|  +-------------------------------------------------------+|
|  [Ajouter une regle ->]                                   |
|  Les regles seront verifiees a chaque modification.       |
+-----------------------------------------------------------+
|                        [Annuler]  [Suivant]               |
+-----------------------------------------------------------+
```

Note : le bouton est "Suivant" en creation (si des vues eo_card existent),
"Enregistrer" en edition, ou "Creer" si pas de vues.

#### Etape 2 : Selection des vues (creation uniquement)

```
+-----------------------------------------------------------+
|  Ajouter "Numero SIRET" aux vues                     [X]  |
|  Selectionnez les vues ou ajouter ce champ, ou passez     |
|  cette etape                                              |
+-----------------------------------------------------------+
|                                                           |
|            | Colonne tableau | Visibilite fiche |          |
|  [v] Tout  | [v]             | [v]               |         |
|  ----------+-----------------+-------------------+         |
|  Vue RH    | [v]             | [v]               |         |
|  Vue Compta| [ ]             | [v]               |         |
|  Vue Admin | [v]             | [ ]               |         |
|                                                           |
+-----------------------------------------------------------+
|     [<- Retour]  [Passer cette etape]  [Creer et ajouter] |
+-----------------------------------------------------------+
```

#### Mode systeme (champ systeme is_active)

```
+-----------------------------------------------------------+
|  Modifier le champ                                   [X]  |
+-----------------------------------------------------------+
|                                                           |
|  +-----------------------------------------------------+ |
|  | [Lock] Champ systeme                                 | |
|  | Nom  : [ Statut actif                              ] | |
|  | Slug : __system_is_active                            | |
|  | Type : Booleen                                       | |
|  +-----------------------------------------------------+ |
|                                                           |
|  Labels des options                                       |
|  Valeur "Vrai"  : [ Actif                              ]  |
|  Valeur "Faux"  : [ Inactif                            ]  |
|                                                           |
|  --- Commentaire au changement ---                        |
|  [toggle] Demander un commentaire lors du changement      |
|  (transitions : [ Actif v ] -> [ Inactif v ])             |
|                                                           |
+-----------------------------------------------------------+
|                        [Annuler]  [Enregistrer]           |
+-----------------------------------------------------------+
```

## Regles metier

### Affichage unifie

- Champs systeme (Nom, ID, Statut actif) + champs personnalises dans la meme table
- Auto-creation des champs systeme si manquants
- Badges pour chaque propriete : is_required, is_unique, comment_rules, auto_generate, validation_rules
- Icones et labels par type de champ
- Champs systeme avec badge "Systeme" et fond distinct
- Menu actions : Modifier, Archiver (sauf champs systeme statiques)
- Export CSV des definitions
- Recherche sur nom/slug
- Terminologie : "Archiver" ou "Desactiver" de maniere coherente (pas "supprimer")

### Commentaires au changement

Disponibilite : uniquement pour les types `select`, `multiselect`, et le champ systeme `is_active` (boolean).

Proprietes stockees (`settings.comment_rules`) :

| Propriete | Type | Description |
|-----------|------|-------------|
| `enabled` | boolean | Active/desactive la demande de commentaire |
| `required` | boolean | Si `true`, le commentaire est obligatoire (bloquant). Si `false`, le commentaire est propose mais facultatif. |
| `transitions` | `{ from: string; to: string }[]` | Liste des transitions specifiques qui declenchent la demande. **Si vide = commentaire demande pour TOUT changement de valeur**. |

Difference `comment_enabled` vs `comment_required` :
- `comment_enabled = true` + `comment_required = false` : champ commentaire affiche, mais facultatif
- `comment_enabled = true` + `comment_required = true` : champ commentaire affiche et bloquant
- `comment_enabled = false` : aucun commentaire demande

Options de transition :
- Pour `select`/`multiselect` : valeurs issues des options du champ (manuelles ou referentiel)
- Pour `is_active` : labels boolean (`boolean_true_label` / `boolean_false_label`, par defaut "Actif" / "Inactif")

### Validation inter-champs

Types de regles (`CrossFieldRule.type`) :

| Type | Label | Champs source compatibles | Champs cible compatibles | Logique de validation |
|------|-------|--------------------------|--------------------------|----------------------|
| `date_before` | Doit etre avant | `date`, `datetime` | `date`, `datetime` | Valeur strictement anterieure a la cible |
| `date_after` | Doit etre apres | `date`, `datetime` | `date`, `datetime` | Valeur strictement posterieure a la cible |
| `number_less_than` | Inferieur a | `number`, `decimal` | `number`, `decimal` | Valeur strictement inferieure a la cible |
| `number_greater_than` | Superieur a | `number`, `decimal` | `number`, `decimal` | Valeur strictement superieure a la cible |
| `required_if_filled` | Obligatoire si rempli | Tous types | Tous types (actifs) | Si la cible a une valeur non vide, le champ courant devient obligatoire |

Structure de donnee (`validation_rules.cross_field_rules[]`) :

| Propriete | Type | Description |
|-----------|------|-------------|
| `type` | enum | Un des 5 types ci-dessus |
| `target_field_id` | string (UUID) | ID du champ cible dans le meme client |
| `message` | string (optionnel) | Message d'erreur personnalise |

Filtrage des champs cible :
- Exclut le champ courant
- Exclut les champs inactifs (`is_active = false`)
- Filtre par compatibilite de type selon la regle selectionnee

### Matrice type de champ EO -> configurations disponibles

| Type | Label | Format affichage | Longueur max | Liste / Options | Labels boolean | Commentaire changement | Auto-generation | Regles inter-champs |
|------|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `text` | Texte court | Oui (zero_pad) | Oui | -- | -- | -- | Oui (counter, uuid, date, fixed) | Oui (required_if_filled) |
| `textarea` | Texte long | -- | Oui | -- | -- | -- | Oui (counter, uuid, date, fixed) | Oui (required_if_filled) |
| `email` | Email | -- | Oui | -- | -- | -- | Oui (fixed) | Oui (required_if_filled) |
| `phone` | Telephone | -- | Oui | -- | -- | -- | Oui (fixed) | Oui (required_if_filled) |
| `url` | URL | -- | Oui | -- | -- | -- | Oui (fixed) | Oui (required_if_filled) |
| `number` | Nombre entier | Oui (zero_pad) | -- | -- | -- | -- | Oui (counter, fixed) | Oui (number_less/greater, required_if_filled) |
| `decimal` | Nombre decimal | Oui (zero_pad) | -- | -- | -- | -- | Oui (counter, fixed) | Oui (number_less/greater, required_if_filled) |
| `date` | Date | Format date | -- | -- | -- | -- | Oui (date, fixed) | Oui (date_before/after, required_if_filled) |
| `datetime` | Date et heure | Format date | -- | -- | -- | -- | Oui (date, fixed) | Oui (date_before/after, required_if_filled) |
| `time` | Heure | -- | -- | -- | -- | -- | Oui (fixed) | Oui (required_if_filled) |
| `checkbox` | Case a cocher | -- | -- | Oui (manuelles) | -- | -- | Oui (fixed) | -- |
| `select` | Liste deroulante | -- | -- | Oui (referentiel) | -- | Oui | Oui (fixed parmi valeurs) | Oui (required_if_filled) |
| `multiselect` | Liste choix multiples | -- | -- | Oui (referentiel) | -- | Oui | Oui (fixed parmi valeurs) | Oui (required_if_filled) |
| `boolean` | Booleen | -- | -- | -- | Oui | -- | Oui (fixed) | -- |

Notes sur les modes d'auto-generation par type :
- `counter` : text, textarea, number, decimal
- `uuid` : text, textarea
- `date` : text, textarea, date, datetime
- `fixed_value` : tous les types
- Pour `select`/`multiselect` : seul `fixed_value` disponible, avec picker parmi les valeurs du referentiel ou options manuelles

Notes sur is_required / is_unique :
- Masques pour les types `checkbox` et `boolean`
- "Valeur unique" egalement masque pour le champ systeme `is_active`
- Pour les champs systeme, "Champ obligatoire" desactive (toujours obligatoire)

### Types de champs exclus des EO

| Type exclu | Label | Groupe | Raison |
|------------|-------|--------|--------|
| `document` | Document | Medias | Gestion de fichiers reservee aux objets metier (BO) |
| `file` | Fichier | Medias | Gestion de fichiers reservee aux BO |
| `image` | Image | Medias | Gestion d'images reservee aux BO |
| `user_reference` | Reference utilisateur | References | Les EO ne referencent pas directement des utilisateurs |
| `eo_reference` | Reference entite org. | References | Evite les references circulaires entre EO |
| `object_reference` | Reference objet metier | References | References inter-objets gerees au niveau BO |
| `calculated` | Champ calcule | Avance | Formules de calcul reservees aux BO |
| `aggregation` | Reference (aggregation) | Avance | Aggregation reservee aux BO |
| `section` | Section | Mise en page | Element de mise en page, pas un champ de donnees |
| `initials` | Initiales | Special | Type special reserve aux BO |

### Valeurs des champs personnalises

Les valeurs sont gerees via le drawer de detail (01-entites) et l'import (04-import-eo).

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/organizational-entities/fields?client_id=X` | Liste des definitions |
| POST | `/api/organizational-entities/field-definitions` | Creation champ |
| PATCH | `/api/organizational-entities/fields/:id` | Modification champ |

## Endpoints API (a creer)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| PATCH | `/api/organizational-entities/fields/:id/reactivate` | Reactivation d'un champ archive (B18) |

## Comportements attendus

- Loading state : skeleton table pendant le chargement des definitions
- Gestion d'erreur : toast si creation/modification/archivage echoue
- Etat vide : message "Aucun champ personnalise" avec bouton de creation
- Validation formulaire : nom requis, type requis, `list_id` requis pour select/multiselect
- Confirmation avant archivage d'un champ

## Points d'attention backend

| # | Severite | Point |
|---|----------|-------|
| B4 | Haute | `field_type` accepte n'importe quelle string. Ajouter enum validation cote API. |
| B5 | Moyenne | `comment_on_change` non valide. Enum `none|always|required`. |
| B6 | Haute | `list_id` non valide cote client. Pourrait referencer une liste d'un autre client. |
| B7 | Moyenne | `settings` JSONB non valide. Schema JSON par field_type necessaire. |
| D3 | Haute | Pas de contrainte UNIQUE `(client_id, name)`. Doublons de noms possibles. |
| B18 | Moyenne | Pas d'endpoint de reactivation dedie. |
| B1 | Haute | Pas d'audit trail sur les changements de valeurs. |
| B2 | Haute | Pas de controle d'acces par champ sur POST values (bypass `getEditableFieldSlugs`). |
| B3 | Haute | Pas de validation de la valeur selon le type du champ (accepte n'importe quel JSON). |
| D2 | Haute | Pas de contrainte UNIQUE `(eo_id, field_definition_id)` -- doublons possibles. |
