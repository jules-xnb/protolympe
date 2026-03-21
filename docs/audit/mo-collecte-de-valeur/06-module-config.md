# Spec : Module Config

## Maquettes

### Layout general

La page de config d'un module utilise un layout a onglets dont le contenu varie selon les capabilities du module (definies dans le catalogue) :

| Onglet | Condition | Description |
|---|---|---|
| **Affichage** | Toujours | Display configs |
| **Objets metiers** | `catalog.hasBo` | CRUD BO dans le contexte module |
| **Workflows** | `catalog.hasWorkflows` | CRUD workflows dans le contexte module |
| **Roles** | `catalog.hasRoles` | CRUD roles module |
| **Permissions** | `catalog.hasRoles` | Matrice permissions |

```
+---------------------------------------------------------------------+
|  [<-]  Collecte de valeur                                            |
|---------------------------------------------------------------------+
|  [Affichage] [Objets metiers] [Workflows] [Roles] [Permissions]     |
|                                                    CTA onglet actif->|
|                                                                      |
|  (contenu de l'onglet actif)                                        |
|                                                                      |
+---------------------------------------------------------------------+
```

---

## Onglet : Affichage (Display configs)

### Maquette

```
+---------------------------------------------------------------------+
|  [Affichage]                              [Ajouter une vue +]       |
+---------------------------------------------------------------------+
|  [Rechercher une configuration...]                                   |
+---------------------------------------------------------------------+
|  Nom              | Roles                         | Actions          |
|-------------------|-------------------------------|------------------|
|  Vue par defaut   | [o Gestionnaire] [o Lecteur]  | [edit] [suppr]   |
|  Vue restreinte   | [o Responsable]               | [edit] [suppr]   |
+---------------------------------------------------------------------+

Clic sur une ligne -> page edition display config
```

### Dialog creation/edition

```
+-- Dialog ------------------------------------------+
|  Nouvelle configuration                             |
|                                                     |
|  Nom : [Vue par defaut           ]                 |
|                                                     |
|  Roles associes :                                   |
|  [x] Gestionnaire (o couleur)                      |
|  [ ] Responsable  (o couleur)                      |
|  [x] Lecteur      (o couleur)                      |
|                                                     |
|  [Annuler]                  [Creer]                |
+-----------------------------------------------------+
```

### Endpoints API (existants)

| Methode | Route | Description | Statut |
|---|---|---|---|
| `GET` | `/api/modules/:moduleId/display-configs` | Liste display configs | **Fonctionnel** |
| `POST` | `/api/modules/:moduleId/display-configs` | Creer display config | **Fonctionnel** |
| `PATCH` | `/api/modules/:moduleId/display-configs/:id` | Modifier display config | **Fonctionnel** |
| `DELETE` | `/api/modules/:moduleId/display-configs/:id` | Supprimer display config | **Fonctionnel** |
| `GET` | `/api/modules/:moduleId/roles` | Liste roles | **Fonctionnel** |

### Points d'attention backend

- **Suppression physique** : le `DELETE` actuel fait une suppression physique. Doit etre remplace par un archivage (`is_active = false`).
- **Tri des roles** : les roles dans le dialog de creation doivent etre tries alphabetiquement.

---

## Onglet : Objets metiers (BO)

### Maquette

```
+---------------------------------------------------------------------+
|  [Objets metiers]                     [Archives] [Nouvel OM +]      |
+---------------------------------------------------------------------+
|  [Rechercher par nom ou description...]                              |
+---------------------------------------------------------------------+
|  Nom             | Description  | Champs | Instances | Actions       |
|------------------|--------------|--------|-----------|---------------|
|  Incident        | Gestion...   |  5     |  42       | [...]         |
|    incident      |              |        |           |               |
+---------------------------------------------------------------------+

Menu [...] : Dupliquer, Archiver (destructive)
Clic ligne -> detail BO
```

### Regles metier

- Ce tableau est identique a la page Business Objects Liste (voir `01-business-objects-liste.md`).
- Le bouton Archives doit rester dans le contexte module (pas rediriger vers la page globale).
- A construire comme un composant reutilisable partage entre la page globale et l'onglet module.

### Endpoints API (a construire)

Voir `01-business-objects-liste.md` -- memes endpoints.

---

## Onglet : Workflows

### Maquette

```
+---------------------------------------------------------------------+
|  [Workflows]                             [Nouveau workflow +]       |
+---------------------------------------------------------------------+
|  [Rechercher un workflow...]                                         |
+---------------------------------------------------------------------+
|  Nom               | Type             | Statut     | Noeuds | Act.  |
|--------------------|------------------|------------|--------|-------|
|  [wf] Validation   | Collecte valeur  | [Valide]   | 5      | [...] |
|  [wf] Approbation  | Collecte valeur  | [Non valid]| 3      | [...] |
+---------------------------------------------------------------------+

Menu [...] : Ouvrir, Modifier, Dupliquer, Archiver (pas supprimer)
Clic ligne -> detail workflow

Etat vide :
+---------------------------------------------------------------------+
|  [Inbox] Aucun workflow cree                                        |
|  Commencez par creer un workflow pour gerer vos processus...        |
|  [Creer un workflow +]                                              |
+---------------------------------------------------------------------+

Type de workflow force a "value_collection" (selecteur masque dans le dialog).
```

### Regles metier

- Ce tableau est identique a la page Workflows Liste (voir `07-workflows.md`).
- Le type de workflow est force a `value_collection` dans le contexte module Collecte de Valeur.
- A construire comme un composant reutilisable partage.
- **Jamais de suppression physique** : archiver les workflows (`is_active = false`).

### Endpoints API (a construire)

Voir `07-workflows.md` -- memes endpoints.

---

## Onglet : Roles

### Maquette

```
+---------------------------------------------------------------------+
|  [Roles]                                [Ajouter un role +]        |
+---------------------------------------------------------------------+
|  [Rechercher un role...]                                             |
+---------------------------------------------------------------------+
|  Nom                    | Description       | Actions               |
|-------------------------|-------------------|-----------------------|
|  (o) Gestionnaire       | Gere les donnees  | [edit] [suppr]        |
|  (o) Responsable        | Valide les donnees| [edit] [suppr]        |
|  (o) Lecteur            | Consultation seule| [edit] [suppr]        |
+---------------------------------------------------------------------+
```

### Dialog creation/edition role

```
+-- Dialog ------------------------------------------+
|  Nouveau role  (ou "Modifier le role")             |
|                                                     |
|  Nom : [Gestionnaire         ]                     |
|                                                     |
|  Couleur :                                          |
|  (o)(o)(o)(o)(o)(o)(o)(o)(o)(o)(o)(o)(o)(o)        |
|  14 couleurs predefinies, selection par outline     |
|                                                     |
|  Description : [Gere les donnees   ]               |
|                                                     |
|  [Annuler]                  [Creer / Enregistrer]  |
+-----------------------------------------------------+
```

### Endpoints API (existants)

| Methode | Route | Description | Statut |
|---|---|---|---|
| `GET` | `/api/modules/:moduleId/roles` | Liste roles | **Fonctionnel** |
| `POST` | `/api/modules/:moduleId/roles` | Creer role | **Fonctionnel** |
| `PATCH` | `/api/modules/:moduleId/roles/:id` | Modifier role | **Fonctionnel** |
| `DELETE` | `/api/modules/:moduleId/roles/:id` | Supprimer role | **Fonctionnel** |

### Points d'attention backend

- **Suppression physique** : le `DELETE` actuel fait une suppression physique. Un role supprime peut casser des profils clients. Doit etre remplace par un archivage (`is_active = false`).
- **Slug** : doit etre genere et valide cote serveur (unicite garantie). Actuellement genere cote front avec risque de collision.
- **Validation nom unique** : empecher la creation de deux roles avec le meme nom pour un meme module.

---

## Onglet : Permissions

### Maquette

```
+---------------------------------------------------------------------+
|  [Permissions]                                                       |
+---------------------------------------------------------------------+

Pour le module collecte_valeur, 3 groupes separes par des Separator :

--- ACTIONS (label uppercase) ---
|  Permission        | Gestionnaire | Responsable | Lecteur           |
|--------------------|--------------|-------------|-------------------|
|  Creer campagne    | [x]          | [ ]         | [ ]               |
|  Editer campagne   | [x]          | [x]         | [ ]               |
|  Suppr. campagne   | [x]          | [ ]         | [ ]               |
|  Exporter          | [x]          | [x]         | [x]               |
|  Importer          | [x]          | [ ]         | [ ]               |
|  Editer formulaire | [x]          | [ ]         | [ ]               |

--- WORKFLOW (label uppercase) ---
|  Permission        | Gestionnaire | Responsable | Lecteur           |
|--------------------|--------------|-------------|-------------------|
|  Repondre          | [x]          | [ ]         | [ ]               |
|  Lire repondant    | [x]          | [x]         | [x]               |
|  Lire valide       | [x]          | [x]         | [x]               |

--- ETAPES DE VALIDATION (label uppercase, dynamiques) ---
(Genere depuis les noeuds de validation des workflows)
|  Permission                  | Gestionnaire | Responsable | Lecteur |
|------------------------------|--------------|-------------|---------|
|  Validation N1 -- lecture    | [x]          | [x]         | [x]    |
|  Validation N1 -- validation | [ ]          | [x]         | [ ]    |
|  Validation N2 -- lecture    | [x]          | [x]         | [ ]    |
|  Validation N2 -- validation | [ ]          | [ ]         | [ ]    |
+---------------------------------------------------------------------+

Pour les autres modules : matrice unique sans groupes.
Chaque header de role affiche un dot couleur + nom du role.
Si aucun role : colonne unique "Aucun role cree" avec des tirets.
Si aucune permission : texte "Ce module n'a pas de permissions configurables."
```

### Composant PermissionsMatrix (generique)

```
+---------------------------------------------------------------------+
|  Permission        | (o) Role1       | (o) Role2       | (o) Role3 |
|--------------------|-----------------|-----------------|-----------|
|  perm_label_1      |      [x]        |      [ ]        |    [x]    |
|  perm_label_2      |      [ ]        |      [x]        |    [ ]    |
|--------------------|-----------------|-----------------|-----------|
|  ...               |                 |                 |           |
+---------------------------------------------------------------------+
```

### Endpoints API (existants)

| Methode | Route | Description | Statut |
|---|---|---|---|
| `GET` | `/api/modules/:moduleId/permissions` | Liste permissions | **Fonctionnel** |
| `PUT` | `/api/modules/:moduleId/permissions` | MAJ permissions | **Fonctionnel** |

### Endpoints API (a construire)

| Methode | Route | Description | Notes |
|---|---|---|---|
| `GET` | `/api/workflows/validation-nodes?client_id=X` | Noeuds de validation | Necessaire pour les permissions dynamiques par etape |

### Points d'attention backend

- **Route validation-nodes** : necessaire pour generer les permissions dynamiques par noeud de validation. Actuellement inexistante.
- **Sauvegarde optimiste** : gerer les erreurs de sauvegarde et rollback de l'etat local si l'API echoue.
- **Synchronisation slugs** : les slugs de permissions sont definis dans le catalogue front ET dans la BDD. Risque de desynchronisation.

---

## Page : Display Config Edit

### Maquette

Page permettant de configurer finement l'affichage d'un module pour un role donne. Auto-save avec debounce 400ms.

```
+---------------------------------------------------------------------+
|  [<-]  Vue par defaut                                                |
|  (nom editable inline)                                              |
+---------------------------------------------------------------------+
|  [General] [Vues] [Colonnes] [Drawer] [Filtres] [Pre-filtres]      |
|  [Anonymisation] [Vue gestionnaire] [Vue repondant]                 |
|  (onglets dynamiques selon module)                                   |
+---------------------------------------------------------------------+

--- Onglet Colonnes ---
+---------------------------------------------------------------------+
|  [DnD]  | Nom du champ        | Type       | Visible               |
|---------|---------------------|------------|------------------------|
|  [grip] | Identifiant         | [T] Texte  | [switch on]            |
|  [grip] | Entite              | [ref] Ref  | [switch on]            |
|  [grip] | Statut              | [T] Texte  | [switch off]           |
|  [grip] | Priorite            | [sel] Sel  | [switch on]            |
+---------------------------------------------------------------------+

--- Onglet Drawer ---
+---------------------------------------------------------------------+
|  Champs systeme :                                                    |
|  [grip] Identifiant   [type]   [visible switch]  [editable switch]   |
|  [grip] Entite         [type]   [visible switch]  [editable switch]   |
|                                                                      |
|  Sections custom (DnD) :                                             |
|  +-- Section 1 ------------------------------------------+           |
|  | [Nom section]              [^] [v] [edit] [suppr]     |           |
|  | +-- zone droppable (border dashed) ----------------+  |           |
|  | | [grip] Champ A  [type]  [visible] [editable]     |  |           |
|  | | [grip] Champ B  [type]  [visible] [editable]     |  |           |
|  | +--------------------------------------------------+  |           |
|  +--------------------------------------------------------+           |
|                                                                      |
|  Non affectes (droppable) :                                          |
|  | [x] [grip] Champ X  [type]  [visible] [editable]     |           |
|  | [x] [grip] Champ Y  [type]  [visible] [editable]     |           |
|  [Deplacer vers...  v]   [+ Nouvelle section]                        |
|  [Apercu drawer]                                                     |
+---------------------------------------------------------------------+

--- Onglet Filtres ---
+---------------------------------------------------------------------+
|  [DnD]  | Nom du champ        | Type       | Actif                  |
|---------|---------------------|------------|------------------------|
|  [grip] | Entite              | [ref] Ref  | [switch on]            |
|  [grip] | Statut              | [T] Texte  | [switch on]            |
|                                                                      |
|  Champs non filtres :                                                |
|  [x] Identifiant   [x] Priorite   [x] Date                         |
|  (checkboxes pour activer un filtre)                                 |
+---------------------------------------------------------------------+

--- Onglet Pre-filtres ---
+---------------------------------------------------------------------+
|  Filtre 1 :                                                          |
|  [Champ       v] [Operateur       v] [Valeur       ] [x suppr]      |
|                                                                      |
|  Filtre 2 :                                                          |
|  [Champ       v] [Operateur       v] [Valeur       ] [x suppr]      |
|                                                                      |
|  [+ Ajouter un pre-filtre]                                           |
|                                                                      |
|  Operateurs adaptatifs selon le type de champ :                      |
|  - Texte : Egal, Diff, Contient, Vide, Non vide                     |
|  - Nombre : Egal, Diff, Sup, Inf, Entre, Vide, Non vide             |
|  - Date : Egal, Diff, Avant, Apres, Entre, Vide, Non vide           |
|  - Select : Egal, Diff, Vide, Non vide                              |
+---------------------------------------------------------------------+

--- Onglet Anonymisation ---
+---------------------------------------------------------------------+
|  Champs utilisateur a anonymiser :                                   |
|  [x] Prenom                                                         |
|  [x] Nom                                                            |
|  [ ] Email                                                           |
|  [ ] Profil                                                          |
+---------------------------------------------------------------------+
```

### Block options (inline options par type de bloc)

Ces composants s'affichent en bas de chaque bloc dans la page de configuration des roles. Si la vue est partagee avec d'autres roles, un bandeau d'alerte propose de "Personnaliser pour ce role" (fork).

#### UsersBlockInlineOptions

```
+-- Panel bg-muted/30 --------------------------------------------------+
|  [alert] Partagee avec 2 roles -- options en lecture seule             |
|          [Personnaliser pour ce role ->]                               |
|                                                                        |
|  [col 1] Actions              [col 2] Import/Export  [col 3] Fonctions|
|  [sw] Creation utilisateurs   [sw] Import CSV        [sw] Filtres     |
|  [sw] Edition utilisateurs    [sw] Export CSV        [sw] Historique  |
|  [sw] Modification profils                                             |
|  [sw] Activation/Desactivation                                         |
|  [sw] Archivage                                                        |
+------------------------------------------------------------------------+
```

#### SurveyCreatorInlineOptions

```
+-- Panel bg-muted/30 --------------------------------------------------+
|  [col 1] Workflows                    [col 2] Options                  |
|  [x] Validation collecte [Valide]     [sw] Modifications formulaire    |
|  [ ] Approbation risques [Non valide] [sw] Import des reponses         |
|                                        [sw] Export des reponses         |
+------------------------------------------------------------------------+
```

#### EoCardInlineOptions

```
+-- Panel bg-muted/30 --------------------------------------------------+
|  [col 1] Modes de vue    [col 2] Fonctionnalites   [col 3] Perso+Avance|
|  [x] Liste               [sw] Creation             PERSONNALISATION    |
|  [x] Arbre               [sw] Import               [sw] Config colonnes|
|  [ ] Canvas              [sw] Export               [sw] Gestion champs |
|                           [sw] Historique           ---- Separateur ----
|  Vue par defaut :         [sw] Recherche            CONFIG AVANCEE      |
|  [Liste          v]       [sw] Filtres              [Colonnes] [N]      |
|                           [sw] Reparentage          [Visibilite] [5/12] |
|                                                     [Filtres]    [3]    |
|                                                     [Pre-filtres][0]    |
+------------------------------------------------------------------------+
```

Chaque bouton de config avancee ouvre un dialog dedie.

#### SurveyResponsesInlineOptions

```
+-- Panel bg-muted/30 --------------------------------------------------+
|  [col 1] Workflows                    [col 2] Options                  |
|  [x] Validation collecte [Valide]     [sw] Import                      |
|  [ ] Approbation risques [Non valide] [sw] Export                      |
|                                        [sw] Historique (campagnes)      |
+------------------------------------------------------------------------+
```

### Endpoints API (existants)

| Methode | Route | Description | Statut |
|---|---|---|---|
| `GET` | `/api/modules/:moduleId/display-configs/:id` | Detail display config | **Fonctionnel** |
| `PATCH` | `/api/modules/:moduleId/display-configs/:id` | MAJ display config | **Fonctionnel** |

### Regles metier

- Les definitions de champs disponibles doivent etre pilotees par la BDD (champs dynamiques BO), pas en dur dans le front.
- Auto-save avec debounce 400ms + feedback visuel (icone "saving..." / "Saved").
- Feedback d'erreur visible si la sauvegarde echoue.
- Operateurs de pre-filtres adaptatifs selon le type de champ.
- Fork de vue : quand une vue est partagee entre roles et qu'on personnalise, creer une copie pour le role concerne.

### Comportements attendus

- **Loading** : skeleton pendant le chargement de la config
- **Erreurs** : toast d'erreur si la sauvegarde auto echoue
- **DnD** : drag & drop pour reordonner colonnes, champs drawer, sections, filtres
- **Permissions** : verifier que l'integrateur a acces au module
