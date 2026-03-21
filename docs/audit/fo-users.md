# Spec : Module Users FO (vue User Final)

## Maquettes

### Page principale (via ModulePage ou DynamicPageView)

```
+---------------------------------------------------------------------+
|  Utilisateurs                    [Import/Export v] [Inviter +]       |
+---------------------------------------------------------------------+
|  [Q Rechercher...]                                   [Filtres v]    |
+---------------------------------------------------------------------+
|  < 1/3 >                                        30 resultats        |
+---------------------------------------------------------------------+
|  Prenom   | Nom       | Email              | Profils    | Statut |  |
|-----------|-----------|--------------------|-----------+|--------|--|
|  Alice    | Martin    | alice@acme.com     | Admin      | Actif  |..|
|  Bob      | Dupont    | bob@acme.com       | Lecteur    | Actif  |..|
|  Claire   | Bernard   | cl***@acme.com     | Editeur    | Inactif|..|
|  (clic sur ligne = ouvre drawer detail)                              |
+---------------------------------------------------------------------+
```

Colonnes fixes : Prenom, Nom, Email, Profils, Statut, Actions (menu `...`).

### Menu actions par ligne (si enable_edit ou enable_archive)

```
+-------------------+
| [Crayon] Modifier |
| [Archive] Archiver|  <- texte destructif
+-------------------+
```

### Drawer detail utilisateur

```
+--- Sheet (droite) ---------------------------------+
|                                                     |
|  Details de l'utilisateur                           |
|  Gerez les profils et acces de l'utilisateur       |
|                                                     |
|  --- Informations du profil ---                     |
|  [AB] Alice Bertrand                                |
|  alice@acme.com                                     |
|  Statut : [Actif] / [Desactiver]                    |
|  Alerte si aucun profil assigne                     |
|                                                     |
|  --- Champs personnalises ---                       |
|  Departement    [Direction RH    ]                  |
|  Fonction       [Responsable     ]                  |
|  (edition inline, auto-save)                        |
|                                                     |
|  --- Profils (templates) ---                        |
|  Admin RH                                [Retirer]  |
|  Lecteur Finance                         [Retirer]  |
|                              [Assigner un profil +] |
|                                                     |
|  ---- Footer ----                                   |
|  [Archiver]                                         |
+-----------------------------------------------------+
```

### Dialog invitation

```
+--- Dialog -----------------------------------------+
|  Inviter un utilisateur                             |
|                                                     |
|  [Prenom          ]  [Nom              ]            |
|  [Email *                              ]            |
|                                                     |
|  --- Champs personnalises (si configures) ---       |
|  [Departement     ]                                 |
|  [Fonction        ]                                 |
|                                                     |
|           [Annuler]  [Inviter]                      |
+-----------------------------------------------------+
```

### Dialog archivage

```
+--- Dialog -----------------------------------------+
|  Archiver l'utilisateur                             |
|  Etes-vous sur de vouloir archiver Alice Martin ?   |
|  Son acces sera retire.                             |
|                                                     |
|           [Annuler]  [Confirmer]                    |
+-----------------------------------------------------+
```

### Page Parametres (SettingsPage)

```
+-----------------------------------------------------+
|  Parametres                                          |
|  __________________________________________________ |
|                                                      |
|  Informations personnelles                           |
|                                                      |
|  [Nom       ] (lecture seule)  [Prenom    ] (r/o)   |
|  [Email                     ] (lecture seule)        |
|  [Date creation             ] (lecture seule)        |
+-----------------------------------------------------+
```

### UserDetailsDrawer FO (sections visibles par un client_user)

```
+--- DetailsDrawer (droite, pleine hauteur) ----------------+
|                                                             |
|  Details de l'utilisateur                                   |
|  Gerez les profils et acces de l'utilisateur               |
|                                                             |
|  === UserProfileSection ================================== |
|                                                             |
|  [AB]  Alice Bertrand                                       |
|        alice@acme.com                                       |
|                                                             |
|  Statut :                                                   |
|    [Actif]   <- StatusChip                                  |
|    [Activer / Desactiver]  <- Button toggle                 |
|                                                             |
|  Alerte si aucun profil assigne (hasNoProfiles=true)        |
|                                                             |
|  === UserCustomFieldsSection ============================= |
|                                                             |
|  Departement     [Direction RH      ]  <- InlineFieldEditor |
|  Fonction        [Responsable       ]  <- auto-save on blur |
|  Matricule       [EMP-42            ]                       |
|  (affiche uniquement les fieldDefinitions du client)        |
|                                                             |
|  --------------------------------------------------------- |
|                                                             |
|  === UserProfileTemplatesSection ========================= |
|                                                             |
|  Profils assignes :                                         |
|  +---------------------------------------------------+     |
|  |  Admin RH                              [Retirer]  |     |
|  +---------------------------------------------------+     |
|  +---------------------------------------------------+     |
|  |  Lecteur Finance                       [Retirer]  |     |
|  +---------------------------------------------------+     |
|                                                             |
|  [Assigner un profil +]  <- ouvre AssignProfileDialog        |
|                                                             |
|  ---- Footer (si onArchive present) ----                    |
|  [Archiver  Archive]  <- Button ghost destructive           |
|                                                             |
+-------------------------------------------------------------+
```

Sous-dialogs associes :

```
+--- AssignProfileDialog ----------------------------------+
|  Assigner un profil a Alice Bertrand                      |
|                                                           |
|  Profils disponibles :                                    |
|  +-----------------------------------------------------+ |
|  |  Editeur                          [Assigner]        | |
|  |  Gestionnaire                     [Assigner]        | |
|  +-----------------------------------------------------+ |
|                                                           |
|  Aucun profil disponible ?                                |
|  [Creer un profil +]  <- ouvre ProfileTemplateFormDialog   |
|                                                           |
|           [Fermer]                                        |
+-----------------------------------------------------------+

+--- DeleteConfirmDialog (desassignation) ------------------+
|  Desassigner le profil                                     |
|  Etes-vous sur de vouloir retirer le profil "Admin RH"     |
|  de cet utilisateur ?                                      |
|                                                            |
|           [Annuler]  [Confirmer]                           |
+------------------------------------------------------------+
```

### Export CSV

```
Declenchement :
  [Import/Export v] -> DropdownMenu
  +-------------------+
  | [Upload] Importer |  <- navigate vers USERS_IMPORT
  | [Download] Exporter|  <- appelle handleExport()
  +-------------------+

  OU (si un seul actif) :
  [Exporter Download]  <- Button standalone, appelle handleExport()

Fichier genere : "utilisateurs.csv"
Separateur : point-virgule (;)
Encodage : UTF-8 (pas de BOM)

Colonnes :
+-----------+-----------+--------------------+----------+--------+
| Prenom    | Nom       | Email              | Profil   | Statut |
|-----------|-----------|--------------------+----------|--------|
| Alice     | Martin    | alice@acme.com     | Admin    | Actif  |
| Bob       | Dupont    | bob@acme.com       | Lecteur  | Actif  |
| ***       | ***       | cl***@acme.com     | ***      | Inactif|
+-----------+-----------+--------------------+----------+--------+

Notes :
- Si anonymisation active : les champs anonymises sont remplaces par "***"
- Les guillemets dans les valeurs sont echappes par doublement ("")
```

---

## Regles metier

### UsersBlockConfig (configurable par l'integrateur)

| Option | Type | Effet |
|---|---|---|
| `enable_filters` | boolean | Affiche les filtres (statut, profil) |
| `enable_create` | boolean | Bouton "Inviter" |
| `enable_edit` | boolean | Action "Modifier" dans le menu ligne |
| `enable_edit_profile` | boolean | Modification du profil dans le drawer |
| `enable_activate_deactivate` | boolean | Toggle actif/inactif dans le drawer |
| `enable_archive` | boolean | Action "Archiver" dans le menu ligne + drawer |
| `enable_import` | boolean | Bouton import CSV |
| `enable_export` | boolean | Bouton export CSV |
| `enable_history` | boolean | Acces a l'historique |
| `anonymization` | `UserFieldAnonymization[]` | Masque les champs (prenom, nom, email, profil) avec `***` |

### Resolution des permissions (ModulePage)

Le `ModulePage` resout les permissions a partir du slug module `user` :
- Mappe les permissions du module (`create_user`, `edit_user`, `archive_user`, etc.) aux flags du `UsersBlockConfig`
- Resout les display configs par role pour l'anonymisation et les filtres

### Filtrage par perimetre EO (back-end)

Route `GET /clients/:clientId/users` pour persona `client_user` :
1. Recupere le perimetre EO du profil actif via `getUserPermissions()`
2. Cherche les utilisateurs dont un profil leur donne acces a au moins une EO du perimetre du demandeur
3. Ajoute systematiquement l'utilisateur demandeur a la liste
4. Pagine le resultat

### Flux "Consulter la liste des utilisateurs"

```
1. client_user se connecte -> profil actif resolu
2. Navigation FO -> module Users (via NavConfig ou route directe)
3. ModulePage charge : module, display config, permissions
4. Construit UsersBlockConfig avec les permissions resolues
5. UsersBlockView s'affiche
6. GET /api/clients/:clientId/users
7. Backend filtre par perimetre EO du profil actif
8. Tableau affiche avec pagination server-side
```

### Flux "Inviter un utilisateur"

```
1. Clic "Inviter +" (si enable_create=true)
2. InviteUserDialog s'ouvre
3. Saisie email + prenom + nom + champs custom
4. POST /api/clients/:clientId/users/invite
5. Si userId existe -> cree membership; sinon cree account + membership
6. POST field-values si champs custom remplis
7. Toast "Utilisateur ajoute" -> fermeture dialog
8. Invalidation du cache client-users -> refresh liste
```

### Flux "Archiver un utilisateur"

```
1. Menu "..." sur la ligne -> "Archiver" (si enable_archive=true)
2. OU drawer footer -> "Archiver"
3. DeleteConfirmDialog s'ouvre (confirmation obligatoire)
4. Confirmation -> archivage (soft delete)
5. DELETE /api/clients/:clientId/users/:id (soft delete)
6. Invalidation cache -> refresh liste
```

---

## Endpoints API (existants)

| Methode | Route serveur | Usage FO | Securite |
|---|---|---|---|
| `GET` | `/api/clients/:clientId/users` | Liste paginee + filtre perimetre EO | authMiddleware + requireClientAccess + filtre perimetre |
| `POST` | `/api/clients/:clientId/users/invite` | Invitation nouvel utilisateur | authMiddleware + requireClientAccess |
| `GET` | `/api/clients/:clientId/users/:id` | Detail utilisateur | authMiddleware + requireClientAccess |
| `PATCH` | `/api/clients/:clientId/users/:id` | Modification prenom/nom | authMiddleware + requireClientAccess + field-access check |
| `PATCH` | `/api/clients/:clientId/users/:id/deactivate` | Desactivation | authMiddleware + requireClientAccess |
| `GET` | `/api/clients/:clientId/users/:id/profiles` | Profils d'un utilisateur | authMiddleware + requireClientAccess |
| `POST` | `/api/clients/:clientId/users/:id/profiles` | Assigner un profil | authMiddleware + requireClientAccess |
| `DELETE` | `/api/clients/:clientId/users/:id/profiles/:profileId` | Retirer un profil (soft delete) | authMiddleware + requireClientAccess |
| `GET` | `/api/clients/:clientId/users/field-definitions` | Definitions de champs custom | authMiddleware + requireClientAccess |
| `GET` | `/api/clients/:clientId/users/:id/field-values` | Valeurs champs custom | authMiddleware + requireClientAccess |
| `POST` | `/api/clients/:clientId/users/:id/field-values` | Upsert valeur champ | authMiddleware + requireClientAccess |
| `GET` | `/api/clients/:clientId/users/export` | Export CSV | authMiddleware + requireClientAccess |
| `POST` | `/api/clients/:clientId/users/import` | Import CSV | authMiddleware + requireClientAccess |

## Endpoints API (a creer)

| Methode | Route | Usage | Detail |
|---|---|---|---|
| `PATCH` | `/api/clients/:clientId/users/:id/activate` | Activation utilisateur + envoi email invitation | Toggle statut actif avec verification perimetre |
| - | - | - | Toutes les routes du pattern `/api/clients/:clientId/users/...` existent deja. Verifier que chaque endpoint non encore utilise fonctionne correctement. |

---

## Comportements attendus

### Loading states
- **Tableau principal** : skeleton de lignes (5 lignes) pendant le chargement initial
- **Drawer detail** : skeleton des sections pendant le chargement des donnees utilisateur
- **Invitation** : bouton "Inviter" en etat loading (spinner + disabled) pendant l'envoi
- **Archivage** : bouton "Confirmer" en etat loading pendant l'archivage
- **Champs custom** : indicateur de sauvegarde inline ("Enregistre" flash 1.5s)

### Gestion d'erreurs
- **Echec chargement liste** : message d'erreur avec bouton "Reessayer"
- **Echec invitation** : toast d'erreur avec detail (email deja existant, champs invalides, etc.)
- **Echec archivage** : toast d'erreur
- **Echec sauvegarde champ** : toast d'erreur, restauration de la valeur precedente
- **Erreur reseau** : retry automatique (3 tentatives via TanStack Query)

### Validation
- **Invitation** : email obligatoire et valide (format), prenom/nom optionnels, schema Zod
- **Edition champs custom** : validation par type (text max length, number min/max, etc.)
- **Archivage** : confirmation obligatoire via dialog

### Pagination
- Pagination **server-side** obligatoire (pas de chargement complet en memoire)
- Tailles de page : 10, 25, 50
- Affichage "X-Y sur Z resultats"
- Navigation premiere/precedente/suivante/derniere page

### Permissions
- **Drawer** : les sections edition profil et toggle statut doivent etre masquees si `enable_edit_profile=false` et `enable_activate_deactivate=false`
- **Export CSV** : doit respecter les filtres actifs (exporter uniquement les resultats filtres)
- **Export CSV** : doit respecter l'anonymisation configuree
- **Verification permission module** : un `client_user` sans role dans le module Users ne doit pas pouvoir appeler les routes

---

## Points d'attention backend

| # | Sujet | Priorite | Detail |
|---|---|---|---|
| 1 | Verification permission module | HAUTE | Ajouter `requireModuleAccess('user')` sur les routes — un `client_user` sans role dans le module Users ne devrait pas pouvoir appeler les routes |
| 2 | Export CSV server-side respecte perimetre | HAUTE | L'endpoint `GET /export` doit appliquer le filtre perimetre EO pour les `client_user` |
| 3 | Audit log | OK | `logAdminAction()` sur invite, update, deactivate — deja en place |
| 4 | Soft delete | OK | `set({ deletedAt: new Date() })` sur les profiles — deja en place |
| 5 | Validation Zod | OK | Schemas Zod sur invite, update, field-values — deja en place |
