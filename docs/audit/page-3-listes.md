# Spec : MO — Listes

## Maquettes

### Page principale — Liste des listes

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Listes                                                                 │
│ Gérez les listes de valeurs utilisées dans vos objets métiers          │
│                                                                        │
│ [Archives 📦]  [Import / Export ↕]  [+ Nouvelle liste]                 │
│                                                                        │
│ 🔍 Rechercher par nom ou tag...            [Filtrer par tag 🏷]        │
│                                                                        │
│ ┌──────────────────┬────────────┬──────────────────────────────────┐   │
│ │ Nom              │ Tag        │ Description                      │   │
│ ├──────────────────┼────────────┼──────────────────────────────────┤   │
│ │ Civilités         │ 🏷 RH      │ M., Mme, Mx                      │   │
│ │ civ_civlites     │            │                                  │   │
│ ├──────────────────┼────────────┼──────────────────────────────────┤   │
│ │ Départements     │ 🏷 Orga    │ Liste des départements FR        │   │
│ │ dep_departements │            │                                  │   │
│ └──────────────────┴────────────┴──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Drawer — Gestion des valeurs d'une liste

```
┌─ SheetContent ──────────────────────────────────┐
│ 📝 Civilités           [Tag: RH ✎]  [🗑] [✕]    │
│                                                  │
│ [+ Ajouter une valeur]                           │
│                                                  │
│ ┌ 🔴 Monsieur  (M)  ────────── [+] [✏] [🗑] ┐  │
│ ├ 🔵 Madame    (MME) ────────── [+] [✏] [🗑] │  │
│ └ 🟢 Mx        (MX)  ────────── [+] [✏] [🗑] ┘  │
│                                                  │
│ 3 valeurs                                        │
│ [Voir les valeurs archivées (1)]                 │
└──────────────────────────────────────────────────┘
```

### Dialog — Création/édition de valeur

```
┌─ Dialog ────────────────────────────────┐
│ Nouvelle valeur                          │
│                                          │
│ Valeur parente : [Aucune (racine) ▾]     │
│ Valeurs (une par ligne) * :              │
│ ┌──────────────────────────────────┐     │
│ │ En cours                         │     │
│ │ Terminé                          │     │
│ │ Annulé                           │     │
│ └──────────────────────────────────┘     │
│ Couleur : ● ● ● ● ● ● ● ● ● ●         │
│                                          │
│               [Annuler] [Ajouter 3 val.] │
└──────────────────────────────────────────┘
```

### ListeFormDialog — Creation / edition d'une liste

Mode creation :

```
┌─── Dialog ─────────────────────────────────────┐
│                                                 │
│  Nouvelle liste                                 │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Nom *                                   │    │
│  │ [                                    ]  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Tag                                     │    │
│  │ [                                    ]  │    │
│  └─────────────────────────────────────────┘    │
│  Utilisez un tag pour regrouper vos listes      │
│  par categorie                                  │
│                                                 │
│  Description                                    │
│  ┌─────────────────────────────────────────┐    │
│  │ Description optionnelle...              │    │
│  │                                         │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│                        [Annuler]  [Creer]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

Mode edition :

```
┌─── Dialog ─────────────────────────────────────┐
│                                                 │
│  Modifier la liste                              │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Nom *                                   │    │
│  │ [Civilites                           ]  │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Tag                                     │    │
│  │ [RH                                  ]  │    │
│  └─────────────────────────────────────────┘    │
│  Utilisez un tag pour regrouper vos listes      │
│  par categorie                                  │
│                                                 │
│  Description                                    │
│  ┌─────────────────────────────────────────┐    │
│  │ M., Mme, Mx                            │    │
│  │                                         │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│                  [Annuler]  [Mettre a jour]     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### ListeValuesDrawer — Arborescence de valeurs

```
┌─── SheetContent (droite) ──────────────────────────────────────────┐
│                                                                     │
│  Civilites          [Tag: RH ✎]          [Archiver 📦]  [✕]       │
│                                                                     │
│  [Ajouter une valeur +]                                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🔴 Monsieur                                 [+] [✏] [📦]  │   │
│  │    MON                                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ▼ 🔵 Statuts                                [+] [✏] [📦]  │   │
│  │      STA                                                    │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ 🟢 En cours                              [+] [✏] [📦] ││   │
│  │  │    EN_COURS                                          │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ 🟡 Termine                               [+] [✏] [📦] ││   │
│  │  │    TERMINE                                           │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🟣 Madame                                   [+] [✏] [📦]  │   │
│  │    MAD                                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  5 valeurs                                                         │
│  [Voir les valeurs archivees (2) 📦]                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Mode "valeurs archivees" :

```
┌─── SheetContent (droite) ──────────────────────────────────────────┐
│                                                                     │
│  Civilites          [Tag: RH ✎]                          [✕]      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ (opacity 60%) Mx                                   [↩ Restaurer] │
│  │                MX                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ (opacity 60%) Autre                                [↩ Restaurer] │
│  │                AUT                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  2 valeurs archivees                                               │
│  [Retour aux valeurs actives ←]                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Note : le bouton "Archiver" dans le header est masque si `is_system = true` ou si on est en mode "valeurs archivees".

### ValueFormDialog — Creation / edition de valeur

Mode creation (multi-ligne) :

```
┌─── Dialog ─────────────────────────────────────┐
│                                                 │
│  Nouvelle valeur                                │
│                                                 │
│  Valeur parente                                 │
│  [Aucune (racine)                         ▾]   │
│                                                 │
│  Valeurs (une par ligne) *                      │
│  ┌─────────────────────────────────────────┐    │
│  │ En cours                                │    │
│  │ Termine                                 │    │
│  │ Annule                                  │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│  Les codes techniques seront generes            │
│  automatiquement.                               │
│                                                 │
│  Couleur                                        │
│  ● ● ● ● ● ● ● ● ● ●                         │
│                                                 │
│                [Annuler]  [Ajouter 3 valeurs]   │
│                                                 │
└─────────────────────────────────────────────────┘
```

Mode edition (champ unique + code technique) :

```
┌─── Dialog ─────────────────────────────────────┐
│                                                 │
│  Modifier la valeur                             │
│                                                 │
│  Valeur parente                                 │
│  [Statuts                                 ▾]   │
│                                                 │
│  Libelle *                                      │
│  [En cours                                  ]   │
│                                                 │
│  Code technique                                 │
│  [EN_COURS                    ] (font-mono)     │
│                                                 │
│  Couleur                                        │
│  ● ● ● ● ● ● ● ● ● ●                         │
│        ↑ selectionne (border + scale)           │
│                                                 │
│                [Annuler]  [Mettre a jour]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Regles metier

- **Acces** : `admin_delta`, `integrator_delta`, `integrator_external`
- Les listes sont scopees par client
- Chaque liste a un nom (requis), un slug auto-genere (unique par client), un tag (optionnel) et une description (optionnelle)
- Les listes systeme (`is_system = true`) ne peuvent pas etre archivees
- L'archivage remplace la suppression (jamais de suppression physique)
- Les valeurs de liste sont hierarchiques (parent/enfant via `parent_id`)
- Chaque valeur a un label, un code technique auto-genere (unique par liste via index `(list_id, code)`), une couleur optionnelle et un `display_order`
- La creation de valeurs supporte le mode multi-ligne (batch) avec deduplication par code
- L'export CSV inclut toutes les listes avec leurs valeurs
- L'import CSV passe par un wizard avec mapping des colonnes, preview arborescente, et import atomique par liste (archivage en cas de rollback, pas de suppression physique)

---

## Endpoints API (existants)

| Methode | Route | Description | A corriger |
|---------|-------|-------------|------------|
| GET | `/api/clients/:clientId/lists?page=1&per_page=50` | Liste paginee des listes actives du client | Ajouter filtre par `tag` en query param, ajouter recherche serveur (`search` query param) |
| POST | `/api/clients/:clientId/lists` | Creation d'une liste | Accepter `slug` et `tag` dans le schema Zod |
| PATCH | `/api/clients/:clientId/lists/:id` | Modification d'une liste | Accepter `slug` et `tag` dans le schema Zod |
| PATCH | `/api/clients/:clientId/lists/:id/archive` | Archivage d'une liste | — |
| GET | `/api/clients/:clientId/lists/:id` | Detail d'une liste avec valeurs imbriquees | — |
| GET | `/api/clients/:clientId/lists/:id/values` | Valeurs paginees d'une liste | — |
| POST | `/api/clients/:clientId/lists/:id/values` | Creation d'une valeur | Accepter `code` dans le schema Zod |
| PATCH | `/api/clients/:clientId/lists/:id/values/:valueId` | Modification d'une valeur | Accepter `code` dans le schema Zod |
| PATCH | `/api/clients/:clientId/lists/:id/values/:valueId/deactivate` | Archivage d'une valeur | — |
| PATCH | `/api/clients/:clientId/lists/:id/values/:valueId` | Restauration d'une valeur (`is_active: true`) | — |

## Endpoints API (a creer)

| Methode | Route | Description |
|---------|-------|-------------|
| PATCH | `/api/clients/:clientId/lists/:id/restore` | Restauration d'une liste archivee (`is_archived = false`) |
| POST | `/api/clients/:clientId/lists/:id/values/batch` | Import batch de valeurs (insert multiple) |
| GET | `/api/clients/:clientId/lists/export?list_ids=...` | Export CSV des listes et valeurs (ou faire cote front) |
| GET | `/api/clients/:clientId/lists/values?list_ids=...` | Endpoint batch pour resoudre les valeurs de plusieurs listes (eviter le N+1) |

---

## Comportements attendus

### Loading states
- Skeleton sur la table principale pendant le chargement initial
- Spinner dans le drawer pendant le chargement des valeurs
- Boutons de soumission desactives + spinner pendant les mutations (creation, modification, archivage, restauration)

### Gestion d'erreurs
- Toast d'erreur si un appel API echoue (creation, modification, archivage, restauration, import, export)
- Message d'erreur inline sous les champs de formulaire en cas de validation echouee
- Etat d'erreur explicite dans le drawer si le chargement des valeurs echoue (pas de fail silencieux)

### Validation
- Nom de liste requis (validation front + Zod back)
- Valeurs de liste : label requis, code technique auto-genere, deduplication par code avant soumission
- Format couleur valide (hex)
- Import CSV : validation du format, des colonnes attendues, et preview avant import

### Pagination
- Table principale : pagination server-side via `page` / `per_page` (50 par defaut)
- Valeurs dans le drawer : charger toutes les valeurs (pas de pagination, volume faible par liste)

### Permissions
- Seuls `admin_delta`, `integrator_delta`, `integrator_external` accedent a cette page
- Verifier les permissions cote front (guard de route) ET cote API (middleware)

---

## Points d'attention backend

| # | Table | Modification |
|---|-------|-------------|
| D1 | `lists` | Ajouter colonne `slug` (text, not null, unique par client) |
| D2 | `lists` | Ajouter colonne `tag` (text, nullable) |
| D3 | `lists` | Ajouter colonne `is_system` (boolean, default false) — ou supprimer du front si non necessaire |
| D4 | `list_values` | Ajouter colonne `code` (text, not null) |
| D5 | `list_values` | Ajouter index unique `(list_id, code)` pour eviter les doublons |

### Decisions a prendre

- **`slug` et `tag`** : Ajouter en BDD. Le slug permet un identifiant stable pour les integrations, le tag permet le filtrage par categorie. Recommandation : ajouter les deux.
- **`code` sur les valeurs** : Ajouter en BDD. Le code technique est utilise massivement (import/export, deduplication, affichage). Recommandation : ajouter obligatoirement.
- **`is_system`** : Ajouter en BDD pour proteger certaines listes systeme, ou supprimer du front si aucune liste n'est creee automatiquement par le systeme.
- **Export** : Cote API ou cote front ? L'export cote front evite un endpoint supplementaire mais ne supporte pas bien les gros volumes.
- **Rollback import** : Archiver (coherent avec la regle "jamais de suppression physique").
- **N+1 sur resolution de valeurs** : Creer un endpoint batch pour eviter les requetes paralleles.
