# Spec : MO — Import utilisateurs

Route : `/dashboard/:clientId/users/import`

## Maquettes

### Etape 1 : Upload du fichier

```
+-----------------------------------------------------------------------+
|  [<- Retour]  Import d'utilisateurs                                   |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-- zone drag & drop (border-2 border-dashed p-16 max-w-2xl) ----+  |
|  |                                                                  |  |
|  |  [Upload h-12 w-12]                                              |  |
|  |                                                                  |  |
|  |  Glissez-deposez votre fichier ici                               |  |
|  |  ou cliquez pour parcourir vos fichiers                          |  |
|  |                                                                  |  |
|  |  [Selectionner un fichier]  <- Button variant="outline"          |  |
|  |  (FileInput accept=".csv,.txt,.xlsx,.xls" masque)                |  |
|  +------------------------------------------------------------------+  |
|                                                                       |
|  Formats acceptes : CSV, Excel (.xlsx)                                |
|                                                                       |
|  +-- grid 2 colonnes ---+                                            |
|  |                                          |                         |
|  | +-- Card Template CSV ----+  +-- Card Profils -----+              |
|  | | [FileSpreadsheet]       |  | [UserCog]            |              |
|  | | Template CSV            |  | Profils              |              |
|  | | Modele d'import    [dl] |  | {N} profils     [dl] |              |
|  | +-------------------------+  +-----------------------+              |
|  +--------------------------------------------------------------+     |
+-----------------------------------------------------------------------+
```

### Etape 2 : Mapping des colonnes

```
+-----------------------------------------------------------------------+
|  [<- Retour]  Import d'utilisateurs                                   |
+-----------------------------------------------------------------------+
|                                                                       |
|  Mapping des colonnes  [42 lignes detectees]    [Annuler l'import [x]]|
|  Associez chaque colonne de votre CSV au champ correspondant         |
|                                                                       |
|  +-- DataTable (sans recherche, sans pagination) ------------------+  |
|  | Colonne CSV       | Champ cible                | Apercu          |
|  | ----------------- | -------------------------- | --------------- |
|  | email_address     | [Email *               v]  | jean@ex.com     |
|  |                   |  ^^^^^^^^ bordure orange si non mappe         |
|  | nom               | [Nom complet           v]  | Jean Dupont     |
|  | profil            | [Profils (noms sep...)  v]  | Dir. Region     |
|  | autre_col         | [-- Ignorer --          v]  | valeur          |
|  +-------------------------------------------------------------------+|
|                                                                       |
|  Champs cible disponibles :                                           |
|  - Email * (required)                                                 |
|  - Nom complet                                                        |
|  - Profils (noms separes par ;)                                       |
|  - Champs personnalises du client                                     |
|  - -- Ignorer -- (valeur speciale)                                    |
|                                                                       |
|  (un champ deja mappe est disabled dans les autres selects)           |
|                                                                       |
|                                        [Suivant ->]                   |
|                              (disabled si email non mappe)            |
+-----------------------------------------------------------------------+
```

### Etape 3 : Preview

```
+-----------------------------------------------------------------------+
|  [<- Retour]  Import d'utilisateurs                                   |
+-----------------------------------------------------------------------+
|                                                                       |
|  +-- grid 4 colonnes gap-3 (StatBlock) ----------------------------+ |
|  | +-- stat -----+  +-- stat ------+  +-- stat ----+  +-- stat --+ | |
|  | | [Users]  42 |  | [UserCog] 5  |  | [Check] 38 |  | [Alert] 4| | |
|  | | Utilisateurs|  | Profils dist.|  | Valides    |  | Erreurs  | | |
|  | +-------------+  +--------------+  +-------------+  +----------+ | |
|  +-------------------------------------------------------------------+ |
|                                                                       |
|  (si erreurs:)                                                        |
|  +-- Card border-destructive/50 --+                                   |
|  | Erreurs                        |                                   |
|  | Ligne 5: Email manquant        |                                   |
|  | Ligne 8: Profil "XYZ" non      |                                   |
|  |          trouve                 |                                   |
|  +---------------------------------+                                   |
|                                                                       |
|  +-- DataTable utilisateurs valides --+                               |
|  | Email             | Nom    | Profils                   |          |
|  | jean@ex.com       | Jean D.| [Dir. Region] [Manager]   |          |
|  | marie@ex.com      | Marie  | [Gestionnaire]            |          |
|  +-- recherche, pagination 20/page --+                                |
|  (profil inconnu -> Chip variant="error" rouge)                       |
|                                                                       |
|                              [Importer {N} element(s)]                |
|                     (disabled si valid === 0 ou hasErrors)            |
+-----------------------------------------------------------------------+
```

### Etape 4 : Import en cours

```
+-----------------------------------------------------------------------+
|  [Loader2 spin] Import en cours... 15/42                              |
|  [===================>                    ]  <- Progress bar           |
+-----------------------------------------------------------------------+
```

### Etape 5 : Resultat

```
+-----------------------------------------------------------------------+
|  +-- Alert text-center py-12 -----------------------------------------+ |
|  |                                                                   | |
|  |  (succes total:)                                                  | |
|  |  [CheckCircle2 h-8 w-8 text-success]                             | |
|  |                                                                   | |
|  |  (succes partiel:)                                                | |
|  |  [AlertTriangle h-8 w-8 text-warning]                            | |
|  |                                                                   | |
|  |  (erreur fatale:)                                                 | |
|  |  [AlertTriangle h-8 w-8 text-destructive]                        | |
|  |                                                                   | |
|  |  Import termine                                                   | |
|  |  38 elements importes avec succes !                               | |
|  |  4 erreur(s)  <- text-warning                                     | |
|  |  Vous pouvez maintenant telecharger le rapport d'import,          | |
|  |  importer a nouveau une liste ou revenir a la page liste.         | |
|  |                                                                   | |
|  |  [Telecharger le rapport [Download]]  <- lien CSV si details      | |
|  |                                                                   | |
|  |  [<- Retour]  [Nouvel import [RotateCcw]]                         | |
|  +-------------------------------------------------------------------+ |
|                                                                       |
|  (si erreurs dans details:)                                           |
|  +-- Card border-destructive/50 --+                                   |
|  | Detail des erreurs             |                                   |
|  | ScrollArea max-h-[300px]       |                                   |
|  | **jean@ex.com** - Erreur msg   |                                   |
|  | **marie@ex.com** - Erreur msg  |                                   |
|  +---------------------------------+                                   |
+-----------------------------------------------------------------------+
```

## Regles metier

1. **Flux d'import** :
   - Upload CSV/Excel -> auto-mapping colonnes -> preview avec validation -> import batch -> resultat

2. **Auto-mapping** : detection de mots-cles dans les noms de colonnes pour mapper automatiquement (email, nom, profils).

3. **Validation preview** :
   - Email valide et obligatoire
   - Detection doublons dans le fichier (`seenEmails`)
   - Detection doublons avec les utilisateurs existants en base
   - Resolution des noms de profils vers des IDs existants
   - Profil inconnu = Chip rouge dans la preview

4. **Template CSV** : doit inclure les colonnes standards (email, nom complet, profils) ET les champs personnalises du client.

5. **Import batch** : l'import doit etre envoye en une seule requete batch au serveur (pas de boucle unitaire). Le serveur traite et retourne un rapport detaille.

6. **Gestion d'erreur granulaire** : chaque ligne en erreur doit indiquer l'email concerne et le message d'erreur precis.

7. **Mapping colonnes** : un champ deja mappe est disabled dans les autres selects. Le bouton "Suivant" est disabled tant que le champ Email n'est pas mappe.

## Endpoints API (existants)

| Methode | Endpoint | Description |
|---|---|---|
| POST | `/api/clients/:clientId/users/import` | Import CSV bulk (le serveur attend un CSV en body) |

## Endpoints API (a creer)

| Methode | Endpoint | Description | Raison |
|---|---|---|---|
| GET | `/api/clients/:clientId/users/import/template` | Generer un template CSV incluant les champs personnalises du client | Le template doit refleter la configuration reelle du client |
| POST | `/api/clients/:clientId/users/import/preview` | Valider un CSV et retourner un preview (stats, erreurs, lignes valides) | La validation doit se faire cote serveur (doublons en base, resolution profils) |

## Comportements attendus

### Loading states
- Upload : indicateur pendant le parsing du fichier
- Mapping -> Preview : loading pendant la construction du preview
- Import : progress bar avec compteur `N/total`
- Resultat : icone conditionnelle (succes/partiel/erreur)

### Gestion d'erreurs
- Fichier invalide (format non supporte) : message d'erreur clair
- Aucune ligne valide : bouton "Importer" disabled, message explicatif
- Erreur reseau pendant l'import : toast + possibilite de re-tenter
- Erreurs par ligne : liste detaillee avec email + message d'erreur
- Rapport telecharger : CSV des erreurs pour correction

### Pagination
- Preview : pagination 20 par page dans le tableau des utilisateurs valides

### Validation
- Email : format valide, non vide, unique dans le fichier ET en base
- Profils : noms resolus vers les profils existants du client
- Champs personnalises obligatoires : valides si mappes

## Points d'attention backend

1. **Import batch cote serveur** : le `POST /import` doit traiter le fichier en batch (pas ligne par ligne depuis le front). Retourner un rapport avec succes/erreurs par ligne.
2. **Detection doublons existants** : verifier en base si les emails existent deja avant l'import. Retourner l'info dans le preview.
3. **Resolution profils cote serveur** : la resolution des noms de profils vers des IDs doit se faire cote serveur, pas cote client.
4. **Template CSV dynamique** : le template doit inclure les champs personnalises du client (pas en dur).
5. **Limite de taille** : prevoir une limite sur le nombre de lignes importables (ex: 10 000) avec message d'erreur clair.
