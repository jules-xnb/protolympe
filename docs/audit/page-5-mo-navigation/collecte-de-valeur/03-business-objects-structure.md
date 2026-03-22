# Spec : Business Object -- Structure

## Maquettes

### Structure (champs)

```
+---------------------------------------------------------------------+
|  [<-]  Structure                                                     |
|                              [Archives (N)] [Importer] [Ajouter +]  |
+---------------------------------------------------------------------+
|  [Rechercher un champ...]                                            |
+---------------------------------------------------------------------+
|  Nom            | Type    | Ref     | Lect.| Requis| Unique| AutoGen| Action|
|-----------------|---------|---------|------|-------|-------|--------|-------|
|  [verrou] Identifiant  | Texte   | --    | --   | x     | --    | --     | [x]   |
|    reference_number     |         |       |      |       |       |        |       |
|  [verrou] Nom          | Texte   | --    | --   | x     | --    | --     | [...] |
|    name                 |         |       |      |       |       |        |       |
|  [verrou] Entite org.  | EO ref  | --    | --   | x     | --    | --     | [x]   |
|    eo_id                |         |       |      |       |       |        |       |
|  [verrou] Statut       | Texte   | --    | --   | --    | --    | --     | [x]   |
|    status               |         |       |      |       |       |        |       |
|  [verrou] Cree par     | User    | --    | --   | --    | --    | --     | [x]   |
|    created_by_user_id   |         |       |      |       |       |        |       |
|  [verrou] Date creation| Datetime| --    | --   | --    | --    | --     | [x]   |
|    created_at           |         |       |      |       |       |        |       |
|  [verrou] Date modif.  | Datetime| --    | --   | --    | --    | --     | [x]   |
|    updated_at           |         |       |      |       |       |        |       |
|  Priorite              | Select  | Prio  | --   | x     | --    | --     | [...] |
|    priorite             |         |       |      |       |       |        |       |
|  Date signalement      | Date    | --    | --   | --    | --    | Date   | [...] |
|    date_signalement     |         |       |      |       |       |        |       |
+---------------------------------------------------------------------+

Champs systeme (7) : verrou + menu desactive (sauf "Nom" editable pour changer le label)
Champs custom : menu [...] -> Modifier / Archiver
```

### Champs archives

```
+---------------------------------------------------------------------+
|  Champs archives -- Incident            [<- Retour structure]        |
+---------------------------------------------------------------------+
|  [Rechercher un champ archive...]                                    |
+---------------------------------------------------------------------+
|  Nom              | Type                   | Actions                 |
|-------------------|------------------------|-------------------------|
|  Ancien champ     | [Chip: Texte]          | [Restaurer]             |
|    ancien_champ   |                        |                         |
+---------------------------------------------------------------------+
```

Colonnes : Nom (nom + slug mono), Type (Chip avec label du type), Action restaurer.

### Historique

```
+---------------------------------------------------------------------+
|  [<-]  Historique -- Incident                   [Exporter CSV]       |
+---------------------------------------------------------------------+
|  [Rechercher par instance, nom ou champ...]                          |
+---------------------------------------------------------------------+
|  Date         | Instance | Nom    | Action      | Champ  | Avant | Apres | Par          |
|---------------|----------|--------|-------------|--------|-------|-------|--------------|
|  15 jan 10:30 | INC-001  | Titre1 | Modification| Statut | Ouvert| Ferme | Alice B.     |
|  14 jan 09:00 | INC-002  | Titre2 | Nvelle inst |  --    | --    | --    | Charles D.   |
+---------------------------------------------------------------------+
|  < 1/3 >                                            45 resultats    |
+---------------------------------------------------------------------+
```

### Dialog creation / edition champ

Dialog a section unique scrollable. Les blocs de config s'affichent dynamiquement selon le `field_type` selectionne.

```
+-- Dialog (modal-width, max-h 85vh) --------------------------------+
|  Nouveau champ  (ou "Modifier le champ")                            |
|                                                                      |
|  [col 1]  Nom du champ *            [col 2]  Description            |
|  [Ex: Numero SIRET      ]           [Aide pour les utilisateurs ]    |
|                                                                      |
|  Type de champ                                                       |
|  [Texte                                                         v]   |
|  (selecteur groupe : Texte, Nombres, Dates, Choix, References, etc.)|
|                                                                      |
|  --- Config conditionnelle selon le type ---                         |
|                                                                      |
|  SI type = date/datetime/time :                                      |
|  Format de date                                                      |
|  [dd/MM/yyyy                                                    v]   |
|                                                                      |
|  SI type = text/textarea/email/phone/url :                           |
|  Longueur maximale                                                   |
|  [___________]  (vide = aucune limite)                               |
|                                                                      |
|  SI type = select/multiselect :                                      |
|  Liste                                                               |
|  [Selectionner une liste...                                     v]   |
|  (combobox avec recherche)                                           |
|                                                                      |
|    Valeur(s) par defaut  (si liste selectionnee)                     |
|    [Selectionner...                                             v]   |
|    (select = simple, multiselect = checkboxes)                       |
|                                                                      |
|  SI type = object_reference :                                        |
|  Objet metier reference                                              |
|  [Selectionner un OM...                                         v]   |
|  Champ d'affichage                                                   |
|  [Selectionner...                                               v]   |
|  Champ secondaire                                                    |
|  [Selectionner...                                               v]   |
|                                                                      |
|  SI type = calculated :                                              |
|  Formule de calcul                                                   |
|  (voir maquette FormulaEditor ci-dessous)                            |
|                                                                      |
|  SI type = document :                                                |
|  [x] Fichiers multiples                                              |
|  Taille max (Mo) : [___]                                             |
|  Formats acceptes : [pdf, doc, docx, xls...]                        |
|                                                                      |
|  SI type = aggregation :                                             |
|  Champ source : [Selectionner...   v]                                |
|  Champ cible  : [Selectionner...   v]                                |
|  [x] Editable                                                        |
|                                                                      |
|  SI type = checkbox :                                                |
|  Valeur par defaut : [switch] Coche / Non coche                      |
|                                                                      |
|  ---- Separateur ----                                                |
|                                                                      |
|  [switch] Champ obligatoire                                          |
|  [switch] Valeur unique                                              |
|                                                                      |
|  ---- Separateur ----                                                |
|                                                                      |
|  [zap] Generation automatique                                        |
|  [switch] Generer automatiquement si le champ est vide              |
|    (si active :)                                                     |
|    Mode de generation : [Compteur / UUID / Date du jour / Valeur fixe v]|
|    (config mode-dependante : padding, prefix, date_format, etc.)     |
|                                                                      |
|  ---- Separateur ----                                                |
|                                                                      |
|  [shield] Regles de validation inter-champs                          |
|  +--------------------------------------------------+                |
|  | [Type de regle     v] | [Champ cible        v] | [x]             |
|  +--------------------------------------------------+                |
|  [Ajouter une regle +]                                               |
|                                                                      |
|  [Annuler]                              [Creer / Enregistrer]        |
+----------------------------------------------------------------------+
```

### Import champs CSV (wizard 3 etapes)

```
+-- Dialog (modal-width-lg, max-h 85vh) -----------------------------+
|  Importer des champs                                                |
|                                                                      |
|  Stepper :                                                           |
|  (1) Fichier ----> (2) Mapping ----> (3) Import                     |
|   [actif]           [futur]           [futur]                        |
|                                                                      |
|  --- Etape 1 : Fichier ---                                           |
|  [Telecharger le template CSV]                                       |
|  [Telecharger la documentation PDF]                                  |
|  +-----------------------------------------------+                  |
|  |  Glissez un fichier CSV ici                    |                  |
|  |  ou cliquez pour selectionner                  |                  |
|  +-----------------------------------------------+                  |
|                                                                      |
|  --- Etape 2 : Mapping ---                                           |
|  Colonnes CSV         ->    Champs systeme                           |
|  "Nom du champ"       ->    [Nom                       v]           |
|  "Type"               ->    [Type de champ             v]           |
|  "Description"        ->    [Description               v]           |
|  (champs deja utilises sont marques)                                |
|                                                                      |
|  [<- Retour]                                  [Suivant ->]           |
|                                                                      |
|  --- Etape 3 : Import ---                                            |
|  Erreurs (si presentes) :                                            |
|  - Ligne 3 : ...                                                     |
|                                                                      |
|  Apercu des champs a importer :                                      |
|  | Nom     | Type   | Requis | Description      | Statut           |
|  |---------|--------|--------|------------------|------------------|
|  | Titre   | Texte  | x      | Titre incident   | OK               |
|  | Desc.   | Textarea| x     | Description      | Doublon          |
|                                                                      |
|  [<- Retour]    [=========== 60% ===========]  [Importer N champ(s)]|
+----------------------------------------------------------------------+
```

### FormulaEditor (editeur de formules)

Composant inline (pas un dialog), integre dans le dialog de creation/edition de champ quand `field_type = calculated`.

```
+----------------------------------------------------------------------+
|  Formule de calcul                                                    |
|                                                                       |
|  +----------------------------------------------------------------+  |
|  | si(vide({montant}), 0, {montant} * {taux_tva})                 |  |
|  | (Textarea mono, font-mono, min-h 80px, resize-y)               |  |
|  +----------------------------------------------------------------+  |
|                                                                       |
|  [v] Type de sortie : Nombre                                          |
|  (ou si erreurs :)                                                    |
|  [x] Erreur : Parenthese fermante sans ouverture correspondante      |
|  [x] Erreur : Champ inconnu : {xxx}                                  |
|  [x] Erreur : Fonction inconnue : foo()                              |
|                                                                       |
|  +-- Panel de reference ------------------------------------------+  |
|  | [Rechercher un champ ou une fonction...]                       |  |
|  |                                                                |  |
|  | [Champs (N)] [Fonctions (26)] [Operateurs]                    |  |
|  |                                                                |  |
|  | Onglet Champs :                                                |  |
|  |   [#] Montant            {montant}       (hover -> slug)      |  |
|  |   [T] Description        {description}                        |  |
|  |   [cal] Date creation [Systeme]  {created_at}                 |  |
|  |   (tous les champs du BO sauf le champ courant)               |  |
|  |                                                                |  |
|  | Onglet Fonctions :                                             |  |
|  |   LOGIQUE                                                      |  |
|  |     [si] [et] [ou] [non] [vide]                               |  |
|  |   MATHEMATIQUES                                                |  |
|  |     [somme] [moyenne] [min] [max] [abs] [arrondi]             |  |
|  |   TEXTE                                                        |  |
|  |     [concat] [majuscule] [minuscule] [longueur]               |  |
|  |   DATE                                                         |  |
|  |     [maintenant] [aujourdhui] [diff_jours]                    |  |
|  |   CONVERSION                                                   |  |
|  |     [texte] [nombre] [decimal] [entier] [booleen]             |  |
|  |     [date] [format_date]                                      |  |
|  |                                                                |  |
|  | Onglet Operateurs :                                            |  |
|  |   [+] [-] [*] [/] [==] [!=] [>] [<] [>=] [<=] [(] [)]        |  |
|  +----------------------------------------------------------------+  |
+----------------------------------------------------------------------+
```

Interactions :
- Clic sur un champ : insere `{slug}` a la position du curseur
- Clic sur une fonction : insere la syntaxe complete (ex: `si(condition, valeur_si_vrai, valeur_si_faux)`)
- Clic sur un operateur : insere ` op ` (avec espaces)
- La recherche filtre simultanement les champs (par nom et slug) et les fonctions (par nom et description)

## Regles metier

- **Champs systeme** (7) : Identifiant, Nom, Entite org., Statut, Cree par, Date creation, Date modification. Verrouilles (non supprimables). Seul "Nom" est editable (pour changer le label).
- **Champs custom** : CRUD complet (creer, modifier, archiver, restaurer, importer)
- **Archivage** : soft-delete (`is_active = false`), jamais de suppression physique
- **Label champ "Nom"** : editable via `definition.settings.name_field_label`
- **Champs systeme** : doivent venir de la BDD ou d'une constante partagee serveur (pas en dur dans le front)
- **Export CSV historique** : doit etre un endpoint serveur pour exporter toutes les donnees

## Configurations detaillees des champs BO

### 1. Reference objet metier

S'affiche quand `field_type = object_reference`.

```
+-- Config reference BO -----------------------------------------------+
|                                                                       |
|  Objet metier reference                                               |
|  [Selectionner un objet metier                                   v]   |
|  (liste tous les BO sauf le BO courant)                               |
|  "Ce champ referencera une instance de cet objet metier"              |
|                                                                       |
|  +-- Configuration d'affichage (si BO selectionne) ----------------+ |
|  |                                                                  | |
|  |  Champ d'affichage principal                                     | |
|  |  [Nom (par defaut)                                          v]   | |
|  |  (liste les champs actifs du BO reference)                       | |
|  |  "Le champ affiche comme label dans la liste de selection"       | |
|  |                                                                  | |
|  |  Champ distinctif (optionnel)                                    | |
|  |  [Aucun                                                     v]   | |
|  |  (liste champs actifs + option "Numero de reference")            | |
|  |  "Affiche a cote du champ principal pour distinguer les          | |
|  |   homonymes"                                                     | |
|  +------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

**Parametres :**

| Parametre | Type | Stockage | Description |
|---|---|---|---|
| `reference_object_definition_id` | `string \| null` | `field_definitions.reference_object_definition_id` | ID du BO cible. Le BO courant est exclu de la liste. |
| `ref_display_field_id` | `string \| null` | `settings.ref_display_field_id` | Champ du BO cible affiche comme label principal. Si null, le champ "Nom" est utilise par defaut. |
| `ref_secondary_field_id` | `string \| null` | `settings.ref_secondary_field_id` | Champ secondaire pour desambiguer les homonymes. Valeur speciale `__reference_number` pour afficher le numero de reference systeme. |

**Fonctionnement :**
- Cree une relation 1-N entre le BO courant et le BO reference (le champ stocke l'ID d'une instance du BO cible).
- Le panel "Configuration d'affichage" apparait uniquement quand un BO est selectionne ET que ses champs sont charges.
- Seuls les champs actifs (`is_active = true`) du BO cible sont proposes.

**Exemple :** BO "Incident" possede un champ `fournisseur` de type `object_reference` pointant vers le BO "Fournisseur". Champ d'affichage principal : "Raison sociale". Champ distinctif : "Numero de reference". Dans un formulaire Incident, l'utilisateur voit un select affichant "Acme Corp (FOUR-001)".

---

### 2. Agregation

S'affiche quand `field_type = aggregation`.

```
+-- Configuration de la reference -------------------------------------+
|                                                                       |
|  Champ source (reference)                                             |
|  [Selectionner le champ de reference                             v]   |
|  Options :                                                            |
|    - "Entite organisationnelle (systeme)" (type eo)                   |
|    - "{Nom champ} (ref. EO)" pour chaque champ eo_reference          |
|    - "{Nom champ} (ref. utilisateur)" pour chaque champ user_ref     |
|    - "{Nom champ} (ref. objet)" pour chaque champ object_reference   |
|  "Le champ de reference dont vous souhaitez afficher une valeur"      |
|                                                                       |
|  (si source selectionnee :)                                           |
|                                                                       |
|  Champ a afficher                                                     |
|  [Selectionner le champ                                          v]   |
|  (liste les champs du BO/EO/User reference selon le type source)      |
|  "La valeur de ce champ sera affichee dans l'objet metier"            |
|                                                                       |
|  [switch] Editable                                                    |
+-----------------------------------------------------------------------+
```

**Parametres :**

| Parametre | Type | Stockage | Description |
|---|---|---|---|
| `aggregation_source_field` | `string \| null` | `settings.aggregation_source_field` | ID du champ de reference source (ou `__system_eo_id` pour l'EO systeme). |
| `aggregation_source_type` | `'eo' \| 'user' \| 'object'` | `settings.aggregation_source_type` | Type de la source (calcule automatiquement). |
| `aggregation_target_field_id` | `string \| null` | `settings.aggregation_target_field_id` | ID du champ du BO/EO/User cible dont la valeur est affichee. |
| `aggregation_editable` | `boolean` | `settings.aggregation_editable` | Si `true`, la valeur agrege est modifiable par l'utilisateur. |

**Fonctionnement :**
- Scanne tous les champs du BO courant pour trouver les champs de type `eo_reference`, `user_reference` et `object_reference`. Ajoute l'option systeme `__system_eo_id` pour l'EO liee a chaque instance.
- Selon le `sourceType` :
  - `eo` : propose les champs actifs des EO
  - `user` : propose les champs actifs des utilisateurs
  - `object` : propose les champs actifs du BO reference (exclut les champs de type `aggregation` pour eviter les boucles)
- Quand la source change, le `aggregation_target_field_id` est reinitialise a `null`.
- Les toggles "Champ obligatoire" et "Valeur unique" sont masques pour le type `aggregation`.

**Exemple :** BO "Incident" a un champ `eo_id` de type `eo_reference`. On cree un champ agrege "Responsable EO" : source = "Entite organisationnelle (systeme)", champ a afficher = "Responsable", editable = non. Resultat : le champ affiche automatiquement le nom du responsable de l'EO liee a l'incident.

---

### 3. Formules de calcul

S'affiche quand `field_type = calculated`. Le champ est automatiquement marque en lecture seule (`is_readonly = true`).

**Liste exhaustive des 26 fonctions :**

| Categorie | Fonction | Syntaxe | Description | Type retour |
|---|---|---|---|---|
| **Logique** | `si` | `si(condition, valeur_si_vrai, valeur_si_faux)` | Condition logique | Variable |
| **Logique** | `et` | `et(condition1, condition2)` | Toutes les conditions vraies | Booleen |
| **Logique** | `ou` | `ou(condition1, condition2)` | Au moins une condition vraie | Booleen |
| **Logique** | `non` | `non(condition)` | Inverse la condition | Booleen |
| **Logique** | `vide` | `vide(champ)` | Vrai si le champ est vide | Booleen |
| **Mathematiques** | `somme` | `somme(champ1, champ2, ...)` | Additionne les valeurs | Nombre |
| **Mathematiques** | `moyenne` | `moyenne(champ1, champ2, ...)` | Moyenne des valeurs | Decimal |
| **Mathematiques** | `min` | `min(champ1, champ2)` | Valeur minimale | Nombre |
| **Mathematiques** | `max` | `max(champ1, champ2)` | Valeur maximale | Nombre |
| **Mathematiques** | `abs` | `abs(nombre)` | Valeur absolue | Nombre |
| **Mathematiques** | `arrondi` | `arrondi(nombre, decimales)` | Arrondit un nombre | Nombre |
| **Texte** | `concat` | `concat(texte1, texte2, ...)` | Concatene des textes | Texte |
| **Texte** | `majuscule` | `majuscule(texte)` | Convertit en majuscules | Texte |
| **Texte** | `minuscule` | `minuscule(texte)` | Convertit en minuscules | Texte |
| **Texte** | `longueur` | `longueur(texte)` | Nombre de caracteres | Nombre |
| **Date** | `maintenant` | `maintenant()` | Date et heure actuelles | Date/Heure |
| **Date** | `aujourdhui` | `aujourdhui()` | Date du jour | Date |
| **Date** | `diff_jours` | `diff_jours(date1, date2)` | Difference en jours | Nombre |
| **Conversion** | `texte` | `texte(valeur)` | Convertit en texte | Texte |
| **Conversion** | `nombre` | `nombre(valeur)` | Convertit en nombre | Nombre |
| **Conversion** | `decimal` | `decimal(valeur)` | Convertit en decimal | Decimal |
| **Conversion** | `entier` | `entier(valeur)` | Partie entiere | Nombre |
| **Conversion** | `booleen` | `booleen(valeur)` | Convertit en vrai/faux | Booleen |
| **Conversion** | `date` | `date(valeur)` | Convertit en date | Date |
| **Conversion** | `format_date` | `format_date(date, "dd/MM/yyyy")` | Formate une date en texte | Texte |

**Operateurs disponibles (12) :**

| Operateur | Description |
|---|---|
| `+` | Addition |
| `-` | Soustraction |
| `*` | Multiplication |
| `/` | Division |
| `==` | Egal |
| `!=` | Different |
| `>` | Superieur |
| `<` | Inferieur |
| `>=` | Superieur ou egal |
| `<=` | Inferieur ou egal |
| `(` | Parenthese ouvrante |
| `)` | Parenthese fermante |

**Inference du type de sortie :**

1. **Formule commencant par une fonction** : le type retour est celui de la fonction. Exception : `si()` retourne "Variable".
2. **Operateurs de comparaison au niveau racine** (`==`, `!=`, `>`, `<`, `>=`, `<=`) : retourne Booleen.
3. **Expression arithmetique** (`+`, `-`, `*`, `/` avec des champs) : retourne Nombre.
4. **Reference simple** (`{slug}`) : retourne le type du champ reference.
5. **Litteral numerique** : Nombre ou Decimal (si contient un point).
6. **Litteral texte** (entre guillemets) : Texte.

**Validation temps reel :**
- Equilibre des parentheses
- Guillemets non fermes
- References de champs : chaque `{slug}` verifie contre la map des champs disponibles
- Noms de fonctions : chaque appel `nom(` verifie contre les 26 fonctions connues

---

### 4. Document / Fichier

S'affiche quand `field_type = document`.

```
+-- Configuration du document -----------------------------------------+
|                                                                       |
|  [switch] Fichiers multiples                                          |
|                                                                       |
|  Taille max par fichier (Mo)                                          |
|  [___10___]  (input number, min=1, max=50, placeholder "10")          |
|                                                                       |
|  Formats acceptes                                                     |
|  (grille 3 colonnes de checkboxes)                                    |
|  [x] PDF        [x] Word       [x] Excel                             |
|  [x] PowerPoint [x] Images     [x] CSV                               |
|  [x] Texte      [x] Archives                                         |
|  "Decochez les formats que vous ne souhaitez pas accepter"            |
+-----------------------------------------------------------------------+
```

**Parametres :**

| Parametre | Type | Stockage | Defaut | Description |
|---|---|---|---|---|
| `doc_multiple` | `boolean` | `settings.doc_multiple` | `true` | Autorise l'upload de plusieurs fichiers. |
| `doc_max_size_mb` | `number \| null` | `settings.doc_max_size_mb` | `null` (pas de limite) | Taille max par fichier en Mo. Min 1, max 50. |
| `doc_accepted_formats` | `string` | `settings.doc_accepted_formats` | Tous les formats | Extensions acceptees separees par virgule. |

**Formats supportes (8 groupes) :**

| Groupe | Extensions | Label UI |
|---|---|---|
| PDF | `pdf` | PDF |
| Word | `doc, docx` | Word |
| Excel | `xls, xlsx` | Excel |
| PowerPoint | `ppt, pptx` | PowerPoint |
| Images | `jpg, jpeg, png` | Images |
| CSV | `csv` | CSV |
| Texte | `txt` | Texte |
| Archives | `zip, rar` | Archives |

Par defaut, tous les formats sont coches. Les toggles "Champ obligatoire" restent disponibles mais "Valeur unique" est masque pour le type `document`.

---

### 5. Auto-generation

Disponible pour tous les types sauf : `aggregation`, `calculated`, `checkbox`, `document`.

```
+----------------------------------------------------------------------+
|  [zap] Generation automatique                                         |
|                                                                       |
|  [switch] Generer automatiquement si le champ est vide               |
|                                                                       |
|  (si active :)                                                        |
|  Mode de generation                                                   |
|  [Compteur                                                       v]   |
|  Options : Compteur | UUID | Date du jour | Valeur fixe               |
|  (les options disponibles dependent du type de champ)                 |
|                                                                       |
|  -- Si mode = counter / prefix_counter --                             |
|  "Genere un numero incremental (1, 2, 3...)."                         |
|                                                                       |
|  -- Si mode = date --                                                 |
|  Format de date                                                       |
|  [yyyy-MM-dd                                                     v]   |
|  Options : yyyy-MM-dd | dd/MM/yyyy | MM/dd/yyyy | dd-MM-yyyy          |
|                                                                       |
|  -- Si mode = fixed_value --                                          |
|  Valeur                                                               |
|  [_____________________]                                              |
|                                                                       |
|  -- Si mode = uuid --                                                 |
|  "Un identifiant unique (UUID) sera genere automatiquement."          |
+----------------------------------------------------------------------+
```

**Modes de generation et compatibilite par type de champ :**

| Mode | Stockage `settings.auto_generate.mode` | Types compatibles | Config associee |
|---|---|---|---|
| Compteur | `counter` | `text`, `textarea`, `number`, `decimal` | `config.padding` (defaut: 5) |
| Prefixe + Compteur | `prefix_counter` | `text`, `textarea`, `number`, `decimal` | `config.prefix`, `config.padding` (defaut: 5) |
| UUID | `uuid` | `text`, `textarea` | Aucune |
| Date du jour | `date` | `text`, `textarea`, `date`, `datetime` | `config.date_format` (defaut: `yyyy-MM-dd`) |
| Valeur fixe | `fixed_value` | Tous les types eligibles | `config.fixed_value` |

**Structure de stockage :**

```json
{
  "settings": {
    "auto_generate": {
      "enabled": true,
      "mode": "counter",
      "config": {
        "padding": 5,
        "prefix": "INC-"
      }
    }
  }
}
```

Quand le type de champ change, si le mode actuel n'est plus compatible, il est reinitialise a `fixed_value`.

---

### 6. Validation inter-champs

Disponible pour les types : `text`, `textarea`, `email`, `phone`, `url`, `date`, `datetime`, `number`, `decimal`, `select`, `multiselect`, `checkbox`.

```
+----------------------------------------------------------------------+
|  [shield] Regles de validation inter-champs                           |
|                                                                       |
|  +-- Regle 1 --------------------------------------------------+     |
|  | [Type de regle          v] | [Champ cible              v] | [x] | |
|  +--------------------------------------------------------------+     |
|  +-- Regle 2 --------------------------------------------------+     |
|  | [Doit etre apres        v] | [Date de fin              v] | [x] | |
|  +--------------------------------------------------------------+     |
|                                                                       |
|  [Ajouter une regle +]                                                |
|                                                                       |
|  "Les regles seront verifiees a chaque modification de ce champ."     |
+----------------------------------------------------------------------+
```

**Types de regles disponibles :**

| Type de regle | Stockage | Label UI | Types de champ source | Types de champ cible |
|---|---|---|---|---|
| `date_before` | `cross_field_rules[].type` | "Doit etre avant" | `date`, `datetime` | `date`, `datetime` |
| `date_after` | `cross_field_rules[].type` | "Doit etre apres" | `date`, `datetime` | `date`, `datetime` |
| `number_less_than` | `cross_field_rules[].type` | "Doit etre inferieur a" | `number`, `decimal` | `number`, `decimal` |
| `number_greater_than` | `cross_field_rules[].type` | "Doit etre superieur a" | `number`, `decimal` | `number`, `decimal` |
| `required_if_filled` | `cross_field_rules[].type` | "Obligatoire si rempli" | Tous les types eligibles | Tous les champs actifs |

**Structure de stockage :**

```json
{
  "validation_rules": {
    "cross_field_rules": [
      {
        "type": "date_before",
        "target_field_id": "uuid-du-champ-cible",
        "message": ""
      }
    ]
  }
}
```

**Interface `CrossFieldRule` :**

| Propriete | Type | Description |
|---|---|---|
| `type` | `'date_before' \| 'date_after' \| 'number_less_than' \| 'number_greater_than' \| 'required_if_filled'` | Type de regle |
| `target_field_id` | `string` | ID du champ cible a comparer |
| `message` | `string` (optionnel) | Message d'erreur personnalise |

Le filtrage des champs cibles est automatique selon le type de regle.

---

### 7. Format de date

S'affiche quand `field_type` est `date`, `datetime` ou `time`.

**Formats disponibles par type :**

| Type | Format technique | Label UI |
|---|---|---|
| **date** | `dd/MM/yyyy` (defaut) | jj/mm/aaaa |
| | `MM/dd/yyyy` | mm/jj/aaaa |
| | `yyyy-MM-dd` | aaaa-mm-jj |
| | `dd MMMM yyyy` | jj mois aaaa |
| **datetime** | `dd/MM/yyyy HH:mm` (defaut) | jj/mm/aaaa hh:mm |
| | `MM/dd/yyyy HH:mm` | mm/jj/aaaa hh:mm |
| | `yyyy-MM-dd HH:mm` | aaaa-mm-jj hh:mm |
| | `dd MMMM yyyy HH:mm` | jj mois aaaa hh:mm |
| | `dd/MM/yyyy HH:mm:ss` | jj/mm/aaaa hh:mm:ss |
| **time** | `HH:mm` (defaut) | hh:mm (24h) |
| | `HH:mm:ss` | hh:mm:ss (24h) |
| | `hh:mm a` | hh:mm (12h) |

Stockage : `settings.date_format`. Le format par defaut n'est pas persiste (economie de stockage).

---

### 8. Selecteur de type de champ

Composant `SearchableSelect` avec groupes.

**Types exclus du contexte BO :** `boolean`, `file`, `image`, `section`, `initials`.

**Types disponibles dans le contexte BO (par groupe) :**

| Groupe | Types |
|---|---|
| **Texte** | Texte court (`text`), Texte long (`textarea`), Email (`email`), Telephone (`phone`), URL (`url`) |
| **Nombre** | Nombre entier (`number`), Nombre decimal (`decimal`) |
| **Date/Heure** | Date (`date`), Date et heure (`datetime`), Heure (`time`) |
| **Choix** | Case a cocher (`checkbox`), Liste deroulante (`select`), Liste a choix multiples (`multiselect`) |
| **Medias** | Document (`document`) |
| **References** | Reference utilisateur (`user_reference`), Reference entite org. (`eo_reference`), Reference objet metier (`object_reference`) |
| **Avance** | Champ calcule (`calculated`), Reference/Agregation (`aggregation`) |

---

### 9. Matrice type de champ -> configurations disponibles

| Type de champ | Format date | Longueur max | Liste / valeur defaut | Reference BO | Formule | Document | Agregation | Checkbox defaut | Obligatoire | Unique | Auto-generation | Validation inter-champs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `text` | -- | Oui | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `textarea` | -- | Oui | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `email` | -- | Oui | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `phone` | -- | Oui | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `url` | -- | Oui | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `number` | -- | -- | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `decimal` | -- | -- | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `date` | Oui | -- | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `datetime` | Oui | -- | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `time` | Oui | -- | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `checkbox` | -- | -- | -- | -- | -- | -- | -- | Oui | -- | -- | -- | Oui |
| `select` | -- | -- | Oui | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `multiselect` | -- | -- | Oui | -- | -- | -- | -- | -- | Oui | Oui | Oui | Oui |
| `document` | -- | -- | -- | -- | -- | Oui | -- | -- | Oui | -- | -- | -- |
| `user_reference` | -- | -- | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | -- |
| `eo_reference` | -- | -- | -- | -- | -- | -- | -- | -- | Oui | Oui | Oui | -- |
| `object_reference` | -- | -- | -- | Oui | -- | -- | -- | -- | Oui | Oui | Oui | -- |
| `calculated` | -- | -- | -- | -- | Oui | -- | -- | -- | -- | -- | -- | -- |
| `aggregation` | -- | -- | -- | -- | -- | -- | Oui | -- | -- | -- | -- | -- |

Legende : "Oui" = configuration disponible, "--" = masquee/non applicable.

## Endpoints API (a construire)

| Methode | Route | Description | Notes |
|---|---|---|---|
| `GET` | `/api/field-definitions?definition_id=X&is_active=true` | Liste champs actifs | Filtre serveur |
| `GET` | `/api/field-definitions?definition_id=X&is_active=false` | Champs archives | Filtre serveur |
| `POST` | `/api/field-definitions` | Creer un champ | Validation type + config |
| `PATCH` | `/api/field-definitions/:id` | Modifier / archiver / restaurer | |
| `POST` | `/api/field-definitions/import` | Import batch champs CSV | Transactionnel |
| `POST` | `/api/field-definitions/duplicate` | Dupliquer champs d'un BO vers un autre | Transactionnel |
| `GET` | `/api/business-objects/definitions/:id/audit?page=Y` | Historique pagine | |
| `GET` | `/api/business-objects/definitions/:id/audit/export` | Export CSV complet historique | Endpoint serveur |
| `PATCH` | `/api/business-object-definitions/:id` | MAJ settings (label champ nom) | |

## Comportements attendus

- **Loading** : skeleton/spinner pendant le chargement des champs
- **Erreurs** : toast d'erreur si echec API (creation, modification, archivage, restauration, import)
- **Etat vide** : message explicite si aucun champ custom defini
- **Validation front** : nom du champ obligatoire, config specifique au type validee
- **Permissions** : verifier que l'integrateur a acces au client et au BO

## Points d'attention backend

- Validation des configurations de champs selon le type (ex: `object_reference` requiert `reference_object_definition_id`)
- Formules : parser et valider les formules cote serveur (fonctions connues, champs existants, parentheses equilibrees)
- Auto-generation : implementer les modes counter, prefix_counter, uuid, date, fixed_value cote serveur
- Validation inter-champs : evaluer les regles cote serveur a chaque modification de valeur
- Import champs : operation atomique (transaction)
- Export CSV historique : endpoint serveur dedie
