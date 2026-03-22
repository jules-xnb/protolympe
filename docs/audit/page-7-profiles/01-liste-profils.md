# Spec : MO — Liste des profils

Route : `/dashboard/:clientId/profiles`

## Maquettes

### Page liste profils

```
+-----------------------------------------------------------------------------+
|  Profils                                         [Archives] [Nouveau +]     |
|  Creez des profils partages (roles + EOs + groupes) assignables a           |
|  plusieurs utilisateurs.                                                     |
+-----------------------------------------------------------------------------+
|  [Rechercher un profil...]                                                   |
+-----------------------------------------------------------------------------+
|  Nom       | Roles          | Entites      | Regroup. | Utilisat. | Actions |
| --------------------------------------------------------------------------- |
|  Admin RH  | Cat1: [R1][R2] | [EO1][EO2 v] | [G1]     | [3]       |  [...]  |
|            | Cat2: [R3]     | [+2]          |          |           |         |
| --------------------------------------------------------------------------- |
|  Lecteur   | Lecture: [R4]  | [EO3]         | -        | [0]       |  [...]  |
+-----------------------------------------------------------------------------+

Clic sur ligne -> ouvre drawer details
```

### Menu contextuel (TableActionMenu)

```
+------------------+
| Modifier         |
| Dupliquer        |
| Archiver         |  <- popup de confirmation
+------------------+
```

Note : pas de bouton "Supprimer". La suppression physique est interdite. Seul l'archivage est propose.

### Dialog formulaire (creation / edition / duplication)

```
+--- Dialog max-w-6xl w-[90vw] max-h-[90vh] ------------------------------------------+
|  [UserCog] Nouveau profil  /  Modifier le profil  /  Dupliquer le profil             |
|  Creez un profil partage assignable a plusieurs utilisateurs.                         |
|  (edition: Modifiez les parametres de ce profil. Les modifications                    |
|   s'appliqueront a tous les utilisateurs assignes.)                                   |
|                                                                                       |
|  (masque si eoExpanded || groupsExpanded || rolesExpanded:)                            |
|  [Nom du profil *_______________________________________]  <- FloatingInput            |
|  (duplication: pre-rempli avec "{nom} (copie)")                                       |
|                                                                                       |
|  (masque si eoExpanded || groupsExpanded || rolesExpanded:)                            |
|  +-- SelectionBadges (div border rounded-md bg-muted min-h-[40px]) ---------------+  |
|  | [Building2 EO-A v x] [Building2 EO-B x]                                        |  |
|  | [Users Groupe-1 x]                        <- bordure primary, text primary      |  |
|  | [(.) Role-A x] [(.) Role-B x]            <- bordure = couleur du role           |  |
|  | (ou: "Aucune selection" si tout vide)                                           |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  (mode normal: grille 3 colonnes)                                                     |
|  +-- grid 3 colonnes gap-4 -------------------------------------------------------+  |
|  |                                                                                  |  |
|  | +-- Entites * --------+  +-- Regroupements ---+  +-- Roles * ---------------+   |  |
|  | | [Building2]    [ext] |  | [Users]       [ext] |  | [Shield]           [ext] |   |  |
|  | | [Search ........]   |  |                     |  | [Search ............]   |   |  |
|  | |                     |  | Grp 1               |  |                         |   |  |
|  | | EO Racine    [v]    |  |   EO-A               |  | Module CV       0/3    |   |  |
|  | |   EO Enfant  [v]    |  |   EO-B v             |  |   Administrateur (.)   |   |  |
|  | | EO Autre            |  | Grp 2               |  |   Lecteur (.)          |   |  |
|  | |                     |  |                     |  | Module Profils  1/2    |   |  |
|  | |                     |  |                     |  |                         |   |  |
|  | | (Checkbox + nom)    |  | (Checkbox + nom     |  | (Collapsible par       |   |  |
|  | | (si selectionne:    |  |  + expand EO)        |  |  module, checkbox       |   |  |
|  | |  bouton descendants)|  |                     |  |  + pastille couleur)    |   |  |
|  | |                     |  | (aucun: italic      |  |                         |   |  |
|  | | ScrollArea h-[300px]|  |  "Aucun regroup.     |  | ScrollArea h-[300px]   |   |  |
|  | |                     |  |   disponible")       |  |                         |   |  |
|  | +---------------------+  +---------------------+  +-------------------------+   |  |
|  +----------------------------------------------------------------------------------+  |
|                                                                                       |
|  (mode etendu Entites: EoTreeSelectorExpanded pleine largeur)                         |
|  +-- EoTreeSelectorExpanded -------------------------------------------------------+  |
|  | [Building2] Entites Organisationnelles *   [Filtres {N}] [Search...] [Reduire]  |  |
|  |                                                                                  |  |
|  | Filtres dans Popover:                                                            |  |
|  | - Niveau hierarchique [Tous les niveaux v]                                       |  |
|  | - Statut [Tous v]  (Actif / Inactif)                                             |  |
|  | - Champs custom filtrables (select, multiselect, checkbox)                       |  |
|  | [Reinitialiser les filtres]  <- si filtres actifs                                |  |
|  |                                                                                  |  |
|  | (arbre EO avec ScrollArea h-[300px])                                             |  |
|  +---------------------------------------------------------------------------------+  |
|                                                                                       |
|  (mode etendu Regroupements: GroupSelector expanded pleine largeur)                   |
|  (mode etendu Roles: RoleSelector expanded pleine largeur)                            |
|                                                                                       |
|  +-- DialogFooter ----------------------------------------------------------------+  |
|  | Selectionnez au moins une entite et un role        [Annuler]  [Creer]           |  |
|  | (message masque si canSubmit)               (edition: [Enregistrer])             |  |
|  |                                        (loading: [Loader2 spin] + label)        |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

### Drawer details

```
+--- DetailsDrawer (droite) -------------------------------------------------------+
|                                                                                   |
|  +-- SheetHeader --------+                                                        |
|  | Admin RH                           [Modifier [Pencil]] [Dupliquer [Copy]] [X] |
|  | Description optionnelle du profil  |                                          |
|  +-------------------------------------+                                          |
|                                                                                   |
|  +-- ScrollArea flex-1 mt-4 -------------------------------------------------+   |
|  |                                                                             |   |
|  |  --- section Entites Organisationnelles ---                                 |   |
|  |  [Building2] Entites Organisationnelles (4)                                 |   |
|  |  [EO-A] [EO-B [GitBranch]] [EO-C] [EO-D [GitBranch]]                       |   |
|  |  (ou: italic "Aucune EO" si vide)                                           |   |
|  |                                                                             |   |
|  |  --- Separator ---                                                          |   |
|  |                                                                             |   |
|  |  --- section Roles ---                                                      |   |
|  |  [Shield] Roles (3)                                                         |   |
|  |  (roles groupes par module via module_slug:)                                |   |
|  |  Module CV :                                                                |   |
|  |    [(.) Administrateur]  [(.) Lecteur]   <- Chip avec pastille couleur      |   |
|  |  Module Profils :                                                           |   |
|  |    [(.) Editeur]                          <- backgroundColor: color + 15    |   |
|  |  (ou: italic "Aucun role" si vide)                                          |   |
|  |                                                                             |   |
|  |  --- Separator ---                                                          |   |
|  |                                                                             |   |
|  |  --- section Regroupements ---                                              |   |
|  |  [Layers] Regroupements (1)                                                 |   |
|  |  [Groupe EMEA]                                                              |   |
|  |  (ou: italic "Aucun regroupement" si vide)                                  |   |
|  |                                                                             |   |
|  |  --- Separator ---                                                          |   |
|  |                                                                             |   |
|  |  --- section Utilisateurs assignes ---                                      |   |
|  |  [Users] Utilisateurs assignes (3)                                          |   |
|  |  +-- div border rounded-lg p-2 text-sm --+                                 |   |
|  |  | Alice Bertrand            (font-medium)|                                 |   |
|  |  | alice@example.com (text-xs muted)      |                                 |   |
|  |  +-----------------------------------------+                                |   |
|  |  +-- div border rounded-lg p-2 text-sm --+                                 |   |
|  |  | Charles Dupont                         |                                 |   |
|  |  | charles@example.com                    |                                 |   |
|  |  +-----------------------------------------+                                |   |
|  |  (ou: italic "Aucun utilisateur assigne a ce profil" si vide)               |   |
|  |                                                                             |   |
|  +-----------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

Note : utiliser l'icone `Layers` (pas `Users`) pour la section "Regroupements" afin d'eviter la confusion avec la section "Utilisateurs assignes".

### Dialog confirmation archivage

```
+--- AlertDialog ---------------------------------------------------+
|  Archiver le profil                                                |
|                                                                    |
|  (si utilisateurs assignes:)                                       |
|  Ce profil est assigne a {N} utilisateurs. L'archivage retirera   |
|  automatiquement ce profil de tous les utilisateurs concernes.     |
|                                                                    |
|  (sinon:)                                                          |
|  Etes-vous sur de vouloir archiver ce profil ?                     |
|                                                                    |
|                    [Annuler]  [Archiver]                            |
|                               ^^^^^^^^^ bg-destructive             |
|                    (ou [Archivage...] si isPending)                 |
+--------------------------------------------------------------------+
```

## Regles metier

1. **Profils partages** : un profil est un ensemble (roles + EOs + groupes) assignable a plusieurs utilisateurs. Les modifications s'appliquent a tous les utilisateurs assignes.

2. **Anti-doublon** : le serveur verifie qu'un profil avec la meme combinaison (EOs + roles + groups) n'existe pas deja. Retourne 409 si doublon.

3. **Profil non vide** : au moins une entite et un role sont obligatoires. Le bouton "Creer/Enregistrer" est disabled sinon, avec message "Selectionnez au moins une entite et un role".

4. **Duplication** : ouvre le formulaire pre-rempli avec le nom "{nom} (copie)". La duplication cree un nouveau profil (pas une reference).

5. **Archivage** (pas de suppression) : seul l'archivage est propose. La suppression physique est interdite. L'archivage utilise `PATCH /:id/archive`.

6. **Compteur utilisateurs** : le tableau affiche le nombre d'utilisateurs assignes a chaque profil (`_userCount`). Ce champ doit etre retourne par l'API.

7. **Roles groupes par module** : dans le tableau et le drawer, les roles sont affiches groupes par module. Le `module_slug` doit etre retourne par l'API pour permettre ce groupement.

8. **EOs avec descendants** : l'icone `GitBranch` indique qu'une EO inclut ses descendants.

9. **Recherche** : barre de recherche filtrant par nom de profil.

10. **Creation atomique** : utiliser `POST /create-full` (pas `POST /` + appels separes). Le front envoie tout en une requete.

11. **Modification atomique** : utiliser `PATCH /:id/update-full` (a creer). Le front envoie les changements en une requete, pas des appels separes par sous-ressource.

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---|---|---|
| GET | `/api/clients/:clientId/profiles` | Lister les profils (pagine, filtre `is_archived = false`) |
| GET | `/api/clients/:clientId/profiles/:id` | Detail d'un profil |
| POST | `/api/clients/:clientId/profiles/create-full` | Creation atomique (name + EOs + roles + groups) |
| PATCH | `/api/clients/:clientId/profiles/:id` | Modifier (name, description uniquement) |
| PATCH | `/api/clients/:clientId/profiles/:id/archive` | Archiver |
| POST | `/api/clients/:clientId/profiles/:id/eos` | Ajouter des EOs |
| DELETE | `/api/clients/:clientId/profiles/:id/eos` | Retirer des EOs |
| POST | `/api/clients/:clientId/profiles/:id/module-roles` | Ajouter des roles |
| DELETE | `/api/clients/:clientId/profiles/:id/module-roles` | Retirer des roles |
| POST | `/api/clients/:clientId/profiles/:id/eo-groups` | Ajouter des groupes |
| DELETE | `/api/clients/:clientId/profiles/:id/eo-groups` | Retirer des groupes |

## Endpoints API (a creer)

| Methode | Endpoint | Description | Raison |
|---|---|---|---|
| PATCH | `/api/clients/:clientId/profiles/:id/update-full` | Modification atomique (name + EOs + roles + groups en une transaction) | Le front doit envoyer tout en une requete, pas des appels separes |
| GET | `/api/clients/:clientId/profiles/:id/users` | Lister les utilisateurs assignes a un profil | Necessaire pour le drawer (section "Utilisateurs assignes") |

## Comportements attendus

### Loading states
- Tableau : skeleton rows pendant le chargement de la liste
- Drawer : skeleton pendant le chargement du detail et des utilisateurs assignes
- Formulaire : bouton "Creer/Enregistrer" en etat `isPending` avec spinner
- Archivage : bouton en etat `isPending` avec texte "Archivage..."

### Gestion d'erreurs
- Creation : erreurs de validation Zod sous chaque champ
- Anti-doublon : toast d'erreur "Un profil avec cette configuration existe deja" (409)
- Archivage : toast d'erreur si la mutation echoue
- Detail introuvable : redirect vers la liste avec toast

### Pagination
- Tableau principal : pagination serveur (le backend la supporte via `parsePaginationParams`)
- Pagination par defaut : 20 par page
- Utilisateurs assignes dans le drawer : pas de pagination pour la V1 (peu d'utilisateurs par profil en general)

### Permissions
- Seul un Module Owner peut creer, modifier, dupliquer, archiver des profils

## Points d'attention backend

1. **`_userCount` dans GET /profiles** : ajouter un `LEFT JOIN` + `COUNT` sur `client_profile_users` pour retourner le nombre d'utilisateurs par profil.
2. **`module_slug` dans GET /:id** : joindre `client_modules` pour retourner `module_slug` avec chaque role. Necessaire pour grouper les roles par module.
3. **Modification atomique** : creer `PATCH /:id/update-full` qui accepte la mise a jour de name + EOs + roles + groups en une seule transaction, avec verification anti-doublon.
4. **Utilisateurs assignes** : creer `GET /:id/users` pour retourner les utilisateurs assignes au profil (nom, email).
5. **Pas de route DELETE** : aucune route DELETE sur les profils. Seul `PATCH /:id/archive` est autorise.
6. **Champ `is_archived`** : la BDD utilise `is_archived: boolean`. Le front doit aligner sa semantique sur ce champ (pas `is_active`).
