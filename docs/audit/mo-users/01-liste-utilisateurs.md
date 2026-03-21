# Spec : MO — Liste utilisateurs

Route : `/dashboard/:clientId/users`

## Maquettes

### Page principale

```
+-----------------------------------------------------------------------+
|  Utilisateurs                    [Import/Export v] [Gerer les champs]  |
|  Gerez les utilisateurs et       [Inviter un utilisateur +]           |
|  leurs acces a ce client.                                             |
+-----------------------------------------------------------------------+
|  [Rechercher un utilisateur...]                                       |
+-----------------------------------------------------------------------+
|  < 1/3 >                                            12 resultats      |
+-----------------------------------------------------------------------+
|  Utilisateur        | Statut        | Profils          | Membre depuis | Champ1 | ... | Actions |
| ------------------- | ------------- | ---------------- | ------------- | ------ | --- | ------- |
|  Jean Dupont        | [Actif]       | Dir. Region,     | 12 jan 2025   | val    |     |  [...]  |
|  jean@example.com   |               | Manager          |               |        |     |         |
| ------------------- | ------------- | ---------------- | ------------- | ------ | --- | ------- |
|  Marie Martin       | [A configurer]| [Sans profil]    | 03 fev 2025   | -      |     |  [...]  |
|  marie@example.com  |               |                  |               |        |     |         |
+-----------------------------------------------------------------------+
```

### Menu dropdown Import/Export

```
+--------------------+
| Importer     [^]   |
| Exporter     [v]   |
+--------------------+
```

Note : icones a droite du texte (convention CLAUDE.md).

### Menu actions par ligne

```
+------------------------+
| Voir les details  [eye]|
| Retirer du client [x]  |  <- destructif (rouge)
+------------------------+
```

### Drawer details utilisateur

```
+--- Sheet (droite) ------------------------------------+
|  Details de l'utilisateur                             |
|  Gerez les profils et acces de l'utilisateur          |
|                                                       |
|  [Avatar] Jean Dupont                                 |
|                                                       |
|  [=== toggle] Compte actif                            |
|  Les comptes inactifs ne peuvent pas se connecter     |
|                                                       |
|  (si aucun profil:)                                   |
|  +-- warning orange --+                               |
|  | Configuration incomplete                           |
|  | L'utilisateur n'a aucun profil configure.          |
|  +--------------------+                               |
|                                                       |
|  --- separateur ---                                   |
|                                                       |
|  @ jean@example.com                                   |
|  Membre depuis le 12 janvier 2025                     |
|                                                       |
|  --- separateur ---                                   |
|                                                       |
|  (champs personnalises: FloatingLabelField,           |
|   Switch, Select en edition inline)                   |
|                                                       |
|  --- separateur ---                                   |
|                                                       |
|  Profils assignes                       [Assigner +]  |
|                                                       |
|  +-- profil card --+                                  |
|  | Dir. Region Sud                             [x]    |
|  | [Building] EO-A, EO-B (+desc)                     |
|  | [Shield]  Admin, Gestionnaire                     |
|  | [Layers]  Groupe IDF                              |
|  +-----------------+                                  |
|                                                       |
|  Chaque profil definit un contexte d'acces...         |
+-------------------------------------------------------+
```

### Dialog Assigner un profil

```
+--- Dialog -------------------------------------------------+
|  Assigner un profil                                        |
|  Selectionnez un profil a assigner a Jean Dupont.          |
|                                                            |
|  [Rechercher un profil...]         [Creer un profil +]     |
|                                                            |
|  +-- table --+                                             |
|  | Nom              | Entites          | Roles             |
|  | Dir. Region      | [EO-A] [EO-B+2] | [Admin] [Gest.]  |
|  | Manager Nat.     | [EO-C]           | [Viewer]         |
|  +-- clic ligne = assigner --+                             |
+------------------------------------------------------------+
```

### Dialog Inviter un utilisateur

```
+--- Dialog -------------------------------------------+
|  Inviter un utilisateur                              |
|                                                      |
|  [Prenom *     ]  [Nom *         ]                   |
|  [Email *                        ]                   |
|                                                      |
|  --- separateur ---                                  |
|  (champs personnalises dynamiques)                   |
|  [Champ texte    ]                                   |
|  [Select v       ]                                   |
|  [=== toggle     ] Champ boolean                     |
|                                                      |
|                     [Annuler]  [Inviter]              |
|           (ou [En cours...] si isPending)             |
+------------------------------------------------------+
```

### Dialog Retirer du client

```
+--- Dialog -------------------------------------------+
|  Retirer l'utilisateur                               |
|  Etes-vous sur de vouloir retirer "Jean Dupont"      |
|  de ce client ? L'utilisateur perdra l'acces a       |
|  toutes les donnees de ce client.                    |
|                                                      |
|                  [Annuler]  [Confirmer]               |
+------------------------------------------------------+
```

### UserDetailsDrawer complet

```
+--- DetailsDrawer (droite) --------------------------------------------------+
|  Details de l'utilisateur                                                   |
|  Gerez les profils et acces de l'utilisateur                                |
|                                                                             |
|  +-- UserProfileSection ------------------------------------------------+   |
|  |                                                                       |   |
|  |  [Avatar JD] Jean Dupont                                              |   |
|  |              (ou "Sans nom" si full_name absent)                      |   |
|  |                                                                       |   |
|  |  +-- div border rounded-lg bg-gray-50 px-4 py-3 --+                  |   |
|  |  | [=== toggle]  Compte actif                      |                  |   |
|  |  |               Les comptes inactifs ne peuvent   |                  |   |
|  |  |               pas se connecter                  |                  |   |
|  |  | (si hasNoProfiles && !activated_at:              |                  |   |
|  |  |  toggle disabled, texte = "Ajoutez au moins     |                  |   |
|  |  |  un profil avant d'activer")                    |                  |   |
|  |  +------------------------------------------------+                  |   |
|  |                                                                       |   |
|  |  (si hasNoProfiles:)                                                  |   |
|  |  +-- div bg-warning/10 border-warning/20 rounded-lg p-3 --+          |   |
|  |  | Configuration incomplete                                |          |   |
|  |  | L'utilisateur n'a aucun profil configure.                |          |   |
|  |  | Il ne pourra pas acceder a l'application.                |          |   |
|  |  +----------------------------------------------------------+          |   |
|  |                                                                       |   |
|  |  --- Separator ---                                                    |   |
|  |                                                                       |   |
|  |  [Mail] jean@example.com                                              |   |
|  |  [Calendar] Membre depuis le 12 janvier 2025                          |   |
|  +-----------------------------------------------------------------------+   |
|                                                                             |
|  +-- UserCustomFieldsSection (si fieldDefinitions.length > 0) ----------+   |
|  |  --- Separator ---                                                    |   |
|  |                                                                       |   |
|  |  (pour chaque fieldDef:)                                              |   |
|  |                                                                       |   |
|  |  type "initials" -> FloatingLabelField readOnly :                     |   |
|  |  +-- fieldset label ---+                                              |   |
|  |  | [legend] Initiales  |                                              |   |
|  |  | JD                  |  <- calcule, non editable                    |   |
|  |  +---------------------+                                              |   |
|  |                                                                       |   |
|  |  type "checkbox"/"boolean" :                                          |   |
|  |  +-- div border rounded-lg p-4 --+                                   |   |
|  |  | [=== toggle]  Nom du champ    |                                    |   |
|  |  +-------------------------------+                                    |   |
|  |                                                                       |   |
|  |  type "select" :                                                      |   |
|  |  +-- fieldset rounded-[8px] border ---+                               |   |
|  |  | [legend] Champ select *            |                               |   |
|  |  | [Option selectionnee            v] |                               |   |
|  |  +------------------------------------+                               |   |
|  |                                                                       |   |
|  |  type text/number/email/date -> FloatingLabelField :                  |   |
|  |  +-- fieldset label ---+                                              |   |
|  |  | [legend] Champ *    |                                              |   |
|  |  | valeur editable     |  <- clic pour editer, blur pour sauver       |   |
|  |  +---------------------+                                              |   |
|  +-----------------------------------------------------------------------+   |
|                                                                             |
|  --- Separator ---                                                          |
|                                                                             |
|  +-- UserProfileTemplatesSection ----------------------------------------+   |
|  |  [UserCog] Profils assignes              [Assigner +]                 |   |
|  |                                                                       |   |
|  |  (si aucun profil:)                                                   |   |
|  |  +-- div border border-dashed text-center py-6 --+                   |   |
|  |  | [UserCog]  Aucun profil assigne                |                   |   |
|  |  |            Assignez un profil pour definir     |                   |   |
|  |  |            les acces                           |                   |   |
|  |  +------------------------------------------------+                   |   |
|  |                                                                       |   |
|  |  (sinon, pour chaque template:)                                       |   |
|  |  +-- div border rounded-lg bg-card p-3 --+                           |   |
|  |  | Dir. Region Sud                  [x]   |                           |   |
|  |  | (description si presente)              |                           |   |
|  |  |                                        |                           |   |
|  |  | [Building2] [EO-A] [EO-B v] [+2]      |  <- max 2 + overflow      |   |
|  |  | [Shield]   [(.) Admin] [(.) Gest] [+1] |  <- max 2 + overflow      |   |
|  |  | [Layers]   [Groupe IDF] [+1]           |  <- si groups.length > 0  |   |
|  |  +----------------------------------------+                           |   |
|  |                                                                       |   |
|  |  Chaque profil definit un contexte d'acces (entites + roles)          |   |
|  |  que l'utilisateur peut activer.                                      |   |
|  +-----------------------------------------------------------------------+   |
|                                                                             |
|  +-- footer ---+                                                            |
|  | [Archiver [Archive]] <- ghost destructive                                |
|  +-----------------------------------+                                      |
+-----------------------------------------------------------------------------+
```

### AssignProfileDialog

```
+--- Dialog max-w-2xl w-[90vw] ------------------------------------------+
|  Assigner un profil                                                    |
|  Selectionnez un profil a assigner a Jean Dupont.                      |
|                                                                        |
|  [Search] [Rechercher un profil...]          [Creer un profil +]       |
|                                                                        |
|  +-- ScrollArea max-h-[400px] ---------+                               |
|  |  +-- Table border rounded-lg ------+|                               |
|  |  | Nom             | Entites          | Roles                     | |
|  |  | --------------- | ---------------- | ------------------------- | |
|  |  | Dir. Region     | [EO-A] [EO-B v]  | [(.) Admin] [(.) Gest]   | |
|  |  |                 | [+2]             | [+1]                      | |
|  |  | Manager Nat.    | [EO-C]           | [(.) Viewer]             | |
|  |  | --------------- | ---------------- | ------------------------- | |
|  |  | (clic ligne = onAssign(tpl.id))   |                            | |
|  |  +---------------------------------+ |                             |
|  +--------------------------------------+                              |
|                                                                        |
|  (si tous assignes:)                                                   |
|  +-- text-center py-8 --+                                             |
|  | [UserCog]             |                                             |
|  | Tous les profils sont |                                             |
|  | deja assignes         |                                             |
|  | [Creer un nouveau profil]  <- variant="link"                        |
|  +-----------------------+                                             |
+------------------------------------------------------------------------+
```

### UserProfileFormDialog — Creation/edition profil inline depuis le drawer user

```
+--- Dialog max-w-6xl max-h-[90vh] -----------------------------------------------+
|  [User] Nouveau profil  /  Modifier le profil                                    |
|  Creez un profil d'acces pour cet utilisateur.                                   |
|  (ou: Modifiez les parametres de ce profil.)                                     |
|                                                                                  |
|  [Nom du profil *________________________________________]                        |
|                                                                                  |
|  +-- SelectionBadges (div border rounded-md bg-muted) ----+                     |
|  | [Building2 EO-A v x] [Building2 EO-B x]                |                     |
|  | [Users Groupe-1 x]                                      |  <- bordure primary |
|  | [(.) Role-A x] [(.) Role-B x]                           |  <- bordure couleur |
|  | (ou: "Aucune selection" si tout vide)                   |                     |
|  +---------------------------------------------------------+                     |
|                                                                                  |
|  +-- grid 3 colonnes gap-4 --------------------------------------------------+   |
|  |                                                                            |   |
|  | +-- Entites * --------+ +-- Regroupements ---+ +-- Roles * -----------+   |   |
|  | | [Building2]  [ext]  | | [Users]       [ext]| | [Shield]       [ext]|   |   |
|  | | [Search Rechercher..]| |                    | | [Search Rechercher..]|   |   |
|  | |                      | | Grp 1              | |                      |   |   |
|  | | EO Racine    [v]     | |   EO-A, EO-B v     | | Module 1    0/3     |   |   |
|  | |   EO Enfant  [v]     | | Grp 2              | |   Role A (.)        |   |   |
|  | | EO Autre             | |                     | |   Role B (.)        |   |   |
|  | |                      | | (Aucun regroup.     | | Module 2    1/2     |   |   |
|  | | ScrollArea h-[300px] | |  disponible)        | | ScrollArea h-[300px]|   |   |
|  | +----------------------+ +---------------------+ +----------------------+   |   |
|  +----------------------------------------------------------------------------+   |
|                                                                                  |
|  (mode etendu EO: la grille 3 cols disparait, remplacee par                      |
|   EoTreeSelectorExpanded pleine largeur avec filtres et recherche)               |
|                                                                                  |
|  +-- DialogFooter -----------------------------------------------------------+   |
|  | Selectionnez au moins une entite et un role      [Annuler]  [Creer]       |   |
|  | (message masque si canSubmit)             (ou: [Loader2] [Enregistrer])    |   |
|  +----------------------------------------------------------------------------+   |
+----------------------------------------------------------------------------------+
```

### UserEoAssignmentDialog — Assignation EO a un user

```
+--- AssignmentDialog -----------------------------------------------+
|  [Building2]  Assigner une entite organisationnelle                |
|  Selectionnez une entite organisationnelle pour definir            |
|  le perimetre d'acces de l'utilisateur                            |
|                                                                    |
|  Entite organisationnelle *                                        |
|  [Selectionner une EO                                          v]  |
|  +-- SelectContent ---+                                            |
|  | EO Racine          |   <- indentation par level * 12px          |
|  |   EO Enfant 1 ABC  |   <- nom + code (mono)                    |
|  |   EO Enfant 2 DEF  |                                           |
|  +--------------------+                                            |
|                                                                    |
|  L'utilisateur aura acces a cette EO et toutes ses sous-entites   |
|                                                                    |
|  (si toutes assignees:)                                            |
|  [Building2]  Toutes les EO sont deja assignees                    |
|                                                                    |
|                           [Annuler]  [Assigner]                    |
+--------------------------------------------------------------------+
```

### DeleteConfirmDialog — Retrait utilisateur / desassignation profil

```
+--- AlertDialog -----------------------------------------------------+
|  Desassigner le profil                                              |
|  (ou: Retirer l'utilisateur)                                        |
|                                                                     |
|  Etes-vous sur de vouloir retirer le profil "Dir. Region"           |
|  de cet utilisateur ?                                               |
|                                                                     |
|              [Annuler]  [Supprimer]                                  |
|                         ^^^^^^^^^ bg-destructive                     |
|              (ou [Suppression...] si isDeleting)                     |
+----------------------------------------------------------------------+
```

## Regles metier

1. **Statuts utilisateur** :
   - `Actif` : l'utilisateur a au moins un profil et est active
   - `A configurer` : l'utilisateur n'a aucun profil configure
   - `Inactif` : l'utilisateur a ete desactive manuellement

2. **Activation** : un utilisateur ne peut etre active que s'il a au moins un profil assigne. Le toggle est disabled sinon.

3. **Retrait utilisateur** : soft delete uniquement (PATCH avec `deleted_at`). Jamais de suppression physique.

4. **Invitation** : prenom, nom et email sont obligatoires (validation Zod `min(1)` pour les trois). Les champs personnalises dynamiques sont affiches selon leur type (text, select, boolean, number, date, email, multiselect).

5. **Champs personnalises dans le drawer** : edition inline (clic pour editer, blur pour sauver). Le type "initiales" est en lecture seule (calcule automatiquement).

6. **Profils assignes** : affichage max 2 EOs/roles + badge overflow `+N`. Les groupes ne s'affichent que si `groups.length > 0`.

7. **Assignation profil** : un profil deja assigne ne doit pas apparaitre dans la liste de selection. Si tous les profils sont assignes, afficher un etat vide avec lien "Creer un nouveau profil".

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---|---|---|
| GET | `/api/clients/:clientId/users` | Lister les utilisateurs (pagine) |
| POST | `/api/clients/:clientId/users/invite` | Inviter un utilisateur |
| GET | `/api/clients/:clientId/users/export` | Export CSV (serveur) |
| GET | `/api/clients/:clientId/users/:id` | Detail utilisateur |
| PATCH | `/api/clients/:clientId/users/:id` | Modifier utilisateur |
| PATCH | `/api/clients/:clientId/users/:id/deactivate` | Desactiver |
| GET | `/api/clients/:clientId/users/:id/profiles` | Lister profils d'un user |
| POST | `/api/clients/:clientId/users/:id/profiles` | Assigner profil |
| DELETE | `/api/clients/:clientId/users/:id/profiles/:profileId` | Retirer profil |
| GET | `/api/clients/:clientId/users/field-definitions` | Lister definitions champs |
| GET | `/api/clients/:clientId/users/:id/field-values` | Lire valeurs champs |
| POST | `/api/clients/:clientId/users/:id/field-values` | Upsert valeur champ |

## Endpoints API (a creer)

| Methode | Endpoint | Description | Raison |
|---|---|---|---|
| PATCH | `/api/clients/:clientId/users/:id/activate` | Activer un utilisateur | Route manquante |
| PATCH | `/api/clients/:clientId/users/:id/membership/deactivate` | Soft delete membership (retrait du client) | Remplace le DELETE physique interdit |
| GET | `/api/clients/:clientId/users/field-values` | Charger les valeurs de champs en bulk (pagine) | Le tableau a besoin des valeurs pour tous les users affiches |

## Comportements attendus

### Loading states
- Tableau : skeleton rows pendant le chargement de la liste
- Drawer : skeleton pendant le chargement du detail utilisateur et de ses profils
- Toggle activation : loading spinner pendant la mutation
- Bouton "Inviter" : etat `isPending` avec texte "En cours..."
- Bouton "Supprimer" dans les dialogs : etat `isDeleting` avec texte "Suppression..."
- Champs personnalises inline : indicateur de sauvegarde au blur

### Gestion d'erreurs
- Invitation : afficher les erreurs de validation Zod sous chaque champ
- Retrait utilisateur : toast d'erreur si la mutation echoue
- Assignation profil : toast d'erreur si deja assigne (409)
- Activation : toast d'erreur si aucun profil assigne
- Edition champ inline : toast d'erreur + rollback de la valeur

### Pagination
- Tableau principal : pagination serveur obligatoire (le backend la supporte)
- Pagination par defaut : 20 par page
- Afficher le nombre total de resultats

### Permissions
- Seul un Module Owner peut inviter, retirer, activer/desactiver des utilisateurs
- Seul un Module Owner peut assigner/retirer des profils
- Les champs personnalises en lecture seule (type "initiales") ne sont jamais editables

## Points d'attention backend

1. **Export CSV cote serveur** : utiliser l'endpoint existant `GET /export` avec streaming. Ne pas construire le CSV cote client (risque de crash navigateur pour 10 000+ users).
2. **`profile_templates_count`** : le `GET /users` doit retourner un count des profils par user pour afficher la colonne "Profils" et determiner le statut "A configurer".
3. **Bulk field values pagine** : un endpoint bulk est necessaire pour le tableau (impossible de faire N requetes unitaires).
4. **Validation invitation** : prenom et nom doivent etre obligatoires cote serveur (`min(1)`) — deja le cas dans `users.ts`.
5. **Multiselect** : le formulaire d'invitation doit supporter le type `multiselect` pour les champs personnalises.
