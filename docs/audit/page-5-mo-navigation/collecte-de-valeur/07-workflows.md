# Spec : Workflows

## Maquettes

### Liste workflows

```
+---------------------------------------------------------------------+
|  Workflows                                                           |
|  Gerez les workflows de validation pour vos campagnes...            |
|                                           [Nouveau workflow +]      |
+---------------------------------------------------------------------+
|  [Rechercher un workflow...]                                         |
+---------------------------------------------------------------------+
|  Nom               | Type             | Statut     | Noeuds | Act. |
|--------------------|------------------|------------|--------|------|
|  [wf] Validation   | Collecte valeur  | [Valide]   | 5      | [...] |
|  [wf] Approbation  | Collecte valeur  | [Non valid]| 3      | [...] |
+---------------------------------------------------------------------+

Menu [...] :
  - Ouvrir
  - Modifier
  - Dupliquer
  - Archiver (pas supprimer)

Etat vide :
+---------------------------------------------------------------------+
|  [inbox] Aucun workflow cree                                        |
|  Commencez par creer un workflow pour gerer vos processus...        |
|  [Creer un workflow +]                                              |
+---------------------------------------------------------------------+
```

### Detail workflow

```
+---------------------------------------------------------------------+
|  [<-]  Validation  [Collecte valeur]        [saving...] / [Saved]   |
+---------------------------------------------------------------------+
|  [Workflow]  [Formulaires]                                           |
+---------------------------------------------------------------------+

Onglet "Workflow" :
+---------------------------------------------------------------------+
|                                                                      |
|  Canvas ReactFlow plein ecran                                        |
|                                                                      |
|  [Debut] --[transition]--> [Etape 1] --[transition]--> [Fin]       |
|                                |                                     |
|                          [Etape 2]                                   |
|                                                                      |
|  Panel lateral : edition noeuds, transitions, roles                 |
|                                                                      |
+---------------------------------------------------------------------+

Onglet "Formulaires" :
+---------------------------------------------------------------------+
|  Sidebar etapes       |  Canvas formulaire                           |
|  [Debut]              |  Section 1                                   |
|  [Etape 1] (active)   |  +-- Champ 1 (DnD)                         |
|  [Etape 2]            |  +-- Champ 2 (DnD)                         |
|  [Fin]                |  Section 2                                   |
|                       |  +-- Champ 3 (DnD)                         |
|                       |                                              |
|                       |  Panel "Champs disponibles" (droite)        |
+---------------------------------------------------------------------+
```

### Dialog creation workflow

```
+-- Dialog (FormDialog) ------------------------------------+
|  Nouveau workflow  (ou "Modifier le workflow")            |
|                                                            |
|  Nom *                                                     |
|  [Validation collecte           ]                          |
|                                                            |
|  Description                                               |
|  +------------------------------------------------------+ |
|  | Workflow de validation pour la collecte de donnees... | |
|  +------------------------------------------------------+ |
|                                                            |
|  Objet metier                                              |
|  [Aucun                                               v]   |
|    Aucun                                                   |
|    Incident                                                |
|    Demande                                                 |
|  (seuls les BO actifs sont affiches)                       |
|                                                            |
|  Type de workflow *   (masque si forceWorkflowType)         |
|  [Collecte de valeur                                  v]   |
|    Collecte de valeur                                      |
|    Gestion des risques                                     |
|    ...                                                     |
|  Description du type selectionne en texte xs.              |
|                                                            |
|  [Annuler]                      [Creer / Mettre a jour]   |
+------------------------------------------------------------+
```

### Workflow Form Builder (builder formulaire d'etape)

Layout en 3 colonnes plein ecran :

```
+---------------------------------------------------------------------+
| [col 1]             | [col 2]                    | [col 3]           |
| Sidebar etapes      | Champs disponibles         | Canvas formulaire |
| (StepsSidebar)      | (AvailableFieldsPanel)     | (FormCanvas)      |
|                     |                            |                   |
| [Debut]             | CHAMPS DISPONIBLES         | [Copier depuis v] |
|   (respondent)      | [Rechercher...]            |                   |
| [Etape 1] (active)  |                            | +-- Section 1 --+ |
|   (validation)      | SYSTEME                    | | [Nom section]  | |
| [Etape 2]           | [x][grip] Identifiant      | | [edit] [suppr] | |
|   (validation)      | [x][grip] Entite org       | | [sw editable]  | |
| [Fin]               |                            | | [sw requis]    | |
|   (validated)       | TEXTE                      | |                | |
|                     | [ ][grip] Description       | | [grip] Champ A | |
| (noms editables     | [ ][grip] Email             | |  [vis][edit]   | |
|  pour Debut/Fin)    |                            | |  [regle vis.]  | |
|                     | NOMBRES                    | |  [seuil var.]  | |
|                     | [ ][grip] Montant           | | [grip] Champ B | |
|                     |                            | |  [vis][edit]   | |
|                     | CHOIX                      | +----------------+ |
|                     | [ ][grip] Priorite          |                   |
|                     |                            | +-- Section 2 --+ |
|                     | [Nouveau champ +]          | | ...             | |
|                     | [Nouvelle section +]       | +----------------+ |
+---------------------------------------------------------------------+
```

**Panel "Champs disponibles" :**
- Champs groupes par categorie (Systeme, Texte, Nombres, Dates, Choix, References, Autres)
- Checkbox multi-selection + drag & drop vers le canvas
- Bouton "Nouveau champ" ouvre le dialog de creation de champ
- Bouton "Nouvelle section" ajoute une section au canvas

**Canvas formulaire :**
- Sections sortables (DnD) contenant des champs sortables
- Chaque champ affiche : grip, nom, type, switches visible/editable/requis
- Bouton "Copier depuis..." permet de copier la config d'une autre etape (avec confirmation si config existante)
- Pour le noeud "respondent", les champs requis du BO sont auto-ajoutes

Drag overlay : affiche le nom du champ + badge "+N" si multi-selection.

## Regles metier

- **Archivage** : jamais de suppression physique. Archiver les workflows (`is_active = false`).
- **Duplication** : operation complexe couvrant noeuds, transitions, formulaires, permissions. Doit etre un endpoint serveur dedie (transaction atomique).
- **Auto-save** : sauvegarde automatique des noeuds, transitions, positions. Feedback visuel "saving..." / "Saved".
- **`forceWorkflowType`** : dans le contexte module Collecte de Valeur, le type est force a `value_collection`.
- **Chips statut** : "Valide" (variant success) / "Non valide" (variant default).
- **ReactFlow** : le canvas graphe doit etre preserve en memoire quand on switch entre onglets (pas de demontage/remontage).
- **Composant partage** : la liste workflows doit etre un composant reutilisable (utilise dans la page globale ET dans l'onglet module config).

## Configurations detaillees des formulaires

### Configuration par champ dans le formulaire

Chaque champ ajoute a une etape du workflow est affiche comme une ligne DnD avec les options suivantes :

```
+-- Grille du SortableFieldItem (10 colonnes) -------------------------+
| [grip] [lock] | Nom du champ | [Type] | [editable] | [*] | [vis] | [%] | [X] |
+---------------------------------------------------------------------------------+
```

**Options par champ :**

| Option | Controle | Comportement | Conditions |
|--------|----------|-------------|------------|
| **Drag & Drop** | GripVertical | Reordonne le champ dans sa section ou entre sections | Toujours disponible |
| **Verrouille** | Icone Lock (jaune) | Champ obligatoire du BO, ne peut pas etre supprime | Affiche si le champ est dans `requiredFieldIds` |
| **Editable / Lecture** | Bouton toggle bleu/gris | Bascule entre mode editable et lecture seule | Masque pour le noeud `respondent` (toujours editable). Masque pour les champs systeme (sauf `name`). |
| **Requis** | Bouton asterisque rouge/gris | Rend le champ obligatoire dans cette etape (`is_required_override`) | Desactive si le champ est deja `is_required` dans la definition du BO. Desactive si le champ est en mode lecture. |
| **Conditions de visibilite** | Bouton GitBranch vert/gris | Ouvre le dialog de conditions. Badge compteur si des conditions existent. | Toujours disponible. |
| **Seuil de variation** | Bouton Percent violet/gris | Ouvre le dialog de seuil. Badge avec valeur si configure. | Uniquement pour `number` et `decimal`. |
| **Supprimer** | Bouton X | Retire le champ du formulaire de cette etape | Masque si le champ est verrouille |

**Style conditionnel de la ligne :**
- Fond blanc (`bg-background`) si le champ est editable
- Fond gris (`bg-muted/30`) si le champ est en lecture seule

**Donnees sous-jacentes (`NodeFieldConfig`) :**

| Propriete | Type | Description |
|-----------|------|-------------|
| `id` | string | ID unique de la configuration |
| `field_definition_id` | string | Reference vers la definition du champ |
| `is_editable` | boolean | Champ editable dans cette etape |
| `is_required_override` | boolean | Requis dans cette etape (en plus de la config BO) |
| `visibility_condition` | object \| null | Conditions de visibilite (voir section ci-dessous) |
| `settings.section_id` | string | ID de la section contenant le champ |
| `settings.variation_threshold` | number \| undefined | Seuil de variation en % |
| `settings.variation_direction` | `'+' \| '+-' \| '-'` | Direction du seuil |
| `display_order` | number | Ordre d'affichage dans la section |

---

### Conditions de visibilite

```
+-- Dialog (modal-width) -------------------------------------------+
|  Conditions de visibilite -- {nom du champ}                        |
|                                                                    |
|  (si aucune condition :)                                           |
|  Aucune condition -- le champ est toujours visible.                |
|                                                                    |
|  (si conditions :)                                                 |
|  +--------------------------------------------------------------+  |
|  | [Champ source     v] | [Operateur       v] | [Valeur     ]  |  |
|  |                      |                      |             [X]|  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|                      [ET]  (bouton toggle cliquable)               |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | [Champ source     v] | [N'est pas vide  v] |             [X]|  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|  [Ajouter une condition +]                (bouton outline full-w)  |
|                                                                    |
|  (si > 1 condition :)                                              |
|  Toutes les conditions doivent etre remplies (ET).                 |
|  Passer en OU                  (lien cliquable)                    |
|                                                                    |
|  [Annuler]                              [Enregistrer]              |
+--------------------------------------------------------------------+
```

**Champ source** : selectionne parmi les champs de la **meme section** du formulaire, en excluant le champ courant.

**Operateurs disponibles par type de champ source :**

| Type de champ source | Operateurs disponibles |
|---------------------|----------------------|
| `number`, `decimal`, `currency`, `calculated` | Egal a, Different de, Superieur a, Inferieur a, >=, <=, Est vide, N'est pas vide |
| `checkbox` | Egal a, Different de |
| Tous les autres (`text`, `textarea`, `select`, `multiselect`, `date`, `boolean`, `email`, `phone`, `url`, `time`, ...) | Egal a, Different de, Contient, Est vide, N'est pas vide |

**Tableau des operateurs :**

| Valeur technique | Label affiche |
|-----------------|---------------|
| `equals` | Egal a |
| `not_equals` | Different de |
| `greater_than` | Superieur a |
| `less_than` | Inferieur a |
| `greater_or_equal` | >= |
| `less_or_equal` | <= |
| `contains` | Contient |
| `is_empty` | Est vide |
| `is_not_empty` | N'est pas vide |

**Saisie de la valeur (adaptatif selon le type source) :**

| Type source | Controle de saisie |
|-------------|-------------------|
| `checkbox` | Select avec 2 options : "Oui" (`true`) / "Non" (`false`) |
| Champ avec `referential_id` (select/multiselect lie a une liste) | Dropdown des valeurs actives de la liste (charge via `GET /api/lists/:id/values?is_active=true`) |
| `number`, `decimal`, `currency`, `calculated` | Input de type `number` |
| Tous les autres | Input de type `text` |
| Operateur `is_empty` ou `is_not_empty` | Aucun champ valeur affiche |

**Logique de chainage ET/OU :**
- Par defaut : `AND` (toutes les conditions doivent etre remplies)
- Le toggle ET/OU est un **bouton** affiche **entre chaque condition** (visible uniquement si > 1 condition)
- La logique est **globale** : toutes les conditions partagent le meme operateur logique (pas de mix ET/OU)
- Un lien "Passer en OU/ET" est egalement affiche en texte sous les conditions

**Comportement au runtime :**
- Les conditions sont evaluees lors de l'affichage du formulaire
- Un champ dont les conditions ne sont pas remplies est **masque** (non rendu dans le DOM)
- Le changement de champ source **reinitialise** l'operateur (au premier compatible) et la valeur

**Donnees stockees (`visibility_condition` sur `NodeFieldConfig`) :**

| Propriete | Type | Description |
|-----------|------|-------------|
| `conditions` | `FieldVisibilityCondition[]` | Liste des conditions |
| `logic` | `'AND' \| 'OR'` | Operateur logique entre conditions |

Chaque `FieldVisibilityCondition` :

| Propriete | Type | Description |
|-----------|------|-------------|
| `source_field_id` | string | ID de la definition du champ source |
| `source_field_name` | string | Nom du champ source (denormalise pour affichage) |
| `operator` | enum | Un des 9 operateurs ci-dessus |
| `value` | string | Valeur de comparaison (vide si operateur is_empty/is_not_empty) |

---

### Seuil de variation

Disponibilite : uniquement pour les champs de type `number` ou `decimal`.

```
+-- Dialog (max-w 360px) ----------------------------------+
|  Seuil de variation                                       |
|  {nom du champ}           (texte muted-foreground)        |
|                                                           |
|  Direction                                                |
|  +----------+ +-----------+ +----------+                  |
|  | Hausse   | | Les deux  | | Baisse   |                  |
|  +----------+ +-----------+ +----------+                  |
|  (3 boutons toggle exclusifs, selectionne = bg violet)   |
|                                                           |
|  Seuil (%)                                                |
|  [__________]                                             |
|  (input number, min=0, max=100, step=1)                   |
|  (placeholder "ex: 10")                                   |
|  (Enter = enregistrer et fermer)                          |
|                                                           |
|  [Supprimer]           [Annuler]  [Enregistrer]           |
|  (si seuil existant,              (size sm)               |
|   ghost, texte muted,                                     |
|   aligne a gauche)                                        |
+-----------------------------------------------------------+
```

**Direction (propriete `variation_direction`) :**

| Valeur | Label | Signification |
|--------|-------|---------------|
| `+` | Hausse | Alerte uniquement si la valeur **augmente** au-dela du seuil |
| `+-` | Les deux | Alerte si la valeur **augmente OU diminue** au-dela du seuil (defaut) |
| `-` | Baisse | Alerte uniquement si la valeur **diminue** au-dela du seuil |

**Seuil (propriete `variation_threshold`) :**
- Valeur en **pourcentage** (nombre entier ou decimal, entre 0 et 100)
- Exemple : seuil de 10 = alerte si la variation depasse 10%

**Quand et comment ca se declenche :**
- Comparaison **N-1 vs N** : lors d'une campagne de collecte, la valeur saisie (N) est comparee a la valeur de la campagne precedente (N-1)
- Formule : `|valeur_N - valeur_N-1| / valeur_N-1 * 100 > seuil`
- Selon la direction, seules les variations dans le sens configure declenchent l'alerte

**Impact visuel pour l'utilisateur :**
- Si le seuil est depasse, un avertissement visuel est affiche sur le champ lors de la saisie
- Le valideur voit egalement l'alerte lors de l'etape de validation

**Donnees stockees (dans `settings` du `NodeFieldConfig`) :**

| Propriete | Type | Description |
|-----------|------|-------------|
| `settings.variation_threshold` | number \| undefined | Seuil en pourcentage. `undefined` = pas de seuil |
| `settings.variation_direction` | `'+' \| '+-' \| '-'` | Direction de la variation. Defaut : `'+-'` |

Bouton "Supprimer" : visible uniquement si un seuil existait deja. Reinitialise le seuil.

## Endpoints API (a construire)

| Methode | Route | Description | Notes |
|---|---|---|---|
| `GET` | `/api/workflows?client_id=X` | Liste workflows | Filtre par client |
| `POST` | `/api/workflows` | Creer un workflow | |
| `PATCH` | `/api/workflows/:id` | Modifier un workflow | Auto-save (noeuds, transitions, positions, formulaires) |
| `PATCH` | `/api/workflows/:id` | Archiver (`is_active = false`) | Pas de DELETE physique |
| `POST` | `/api/workflows/:id/duplicate` | Dupliquer un workflow | Transaction atomique : noeuds, transitions, formulaires, permissions |
| `GET` | `/api/workflows/:id` | Detail workflow avec noeuds | Inclut noeuds, transitions, positions |
| `GET` | `/api/workflows/validation-nodes?client_id=X` | Noeuds de validation | Pour les permissions dynamiques |

## Comportements attendus

- **Loading** : skeleton/spinner pendant le chargement de la liste et du detail
- **Erreurs** : toast d'erreur si echec API (creation, modification, archivage, duplication)
- **Etat vide** : message explicite avec CTA "Creer un workflow"
- **Auto-save** : feedback visuel "saving..." / "Saved" dans le header
- **Erreur auto-save** : feedback d'erreur visible, pas de fail silencieux
- **DnD** : drag & drop pour les champs et sections dans le form builder
- **Validation** : nom obligatoire cote front ET serveur
- **Permissions** : verifier que l'integrateur a acces au client

## Points d'attention backend

- **Duplication** : logique complexe necessitant une transaction (copie noeuds, transitions, formulaires, permissions, positions)
- **Auto-save** : endpoint capable de recevoir des updates partiels (noeuds, transitions, positions, edge points, roles) de maniere atomique
- **Permissions par noeud** : supporter la table `workflow_node_role_permissions` pour les assignments de roles aux transitions
- **Positions ReactFlow** : persister les positions X/Y des noeuds et les points de controle des edges (structure specifique a ReactFlow)
- **Conditions de visibilite** : stocker et valider les conditions dans `NodeFieldConfig`
- **Seuils de variation** : stocker dans `settings` du `NodeFieldConfig`, evaluer au runtime lors de la saisie
- **Tables DB a creer** : `workflows`, `workflow_nodes`, `workflow_transitions`, `workflow_node_positions`, `workflow_node_fields`, `workflow_node_role_permissions`
