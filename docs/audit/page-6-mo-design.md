# Spec : MO — Design & Traductions

## Maquettes

### Page MO — Design (`/design`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Affichage & Design                  [Reinitialiser ↺]  [Sauvegarder 💾]   │
├──────────────────────────────────────────────────────────────────────────────┤
│  ⚠ Modifications non sauvegardees                                          │
│  La previsualisation reflete vos changements en temps reel.                 │
│  Cliquez sur "Sauvegarder" pour les appliquer.                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─── Configuration (col gauche) ───┐  ┌─── Preview (col droite) ────────┐ │
│  │                                   │  │                                 │ │
│  │  ┌─ Identite visuelle ─────────┐ │  │  ┌─ Mini navbar ─────────────┐  │ │
│  │  │  [Logo image] [Nom texte]   │ │  │  │  [Logo]  Olympe   Apercu  │  │ │
│  │  │                              │ │  │  └──────────────────────────┘  │ │
│  │  │  Mode image :                │ │  │                                 │ │
│  │  │  ┌──────────────────────┐   │ │  │  Previsualisation               │ │
│  │  │  │  Glissez votre logo  │   │ │  │  Apercu en temps reel           │ │
│  │  │  │  ici ou [parcourir]  │   │ │  │                                 │ │
│  │  │  │  SVG, PNG, JPEG 2MB  │   │ │  │  -- Boutons --                  │ │
│  │  │  └──────────────────────┘   │ │  │  [Primaire] [Outline]           │ │
│  │  │                              │ │  │  [Secondaire] [Desactive]      │ │
│  │  │  Mode texte :                │ │  │                                 │ │
│  │  │  [Nom de l'outil........]   │ │  │  -- Typographie --              │ │
│  │  └──────────────────────────────┘ │  │  Titre H1 — Olympe Platform    │ │
│  │                                   │  │  Paragraphe standard...         │ │
│  │  ┌─ Couleurs ──────────────────┐ │  │  Lien d'exemple                 │ │
│  │  │  Couleur primaire           │ │  │                                 │ │
│  │  │  [■] [#4E3BD7] [Texte blanc]│ │  │  -- Formulaire --               │ │
│  │  │                              │ │  │  Champ texte                    │ │
│  │  │  Couleur secondaire         │ │  │  [Saisir une valeur...]         │ │
│  │  │  [■] [#E8E9F2] [Texte noir] │ │  │                                 │ │
│  │  └──────────────────────────────┘ │  │  -- Card --                     │ │
│  │                                   │  │  ┌──────────────────────┐      │ │
│  │  ┌─ Arrondi des composants ────┐ │  │  │  Titre de la card    │      │ │
│  │  │  [Sharp][Slight][Medium]    │ │  │  │  Description...      │      │ │
│  │  │  [Rounded][Pill]            │ │  │  │  [Action]            │      │ │
│  │  │                              │ │  │  └──────────────────────┘      │ │
│  │  │  Valeur personnalisee       │ │  │                                 │ │
│  │  │  ─────●──────── 0.5rem     │ │  │  -- Badges & Alertes --         │ │
│  │  └──────────────────────────────┘ │  │  [Primaire] [Secondaire]       │ │
│  │                                   │  │                                 │ │
│  │  ┌─ Typographie ──────────────┐  │  │  -- Tableau --                  │ │
│  │  │  Police (font family)       │ │  │  ┌─────┬────────┬──────┐      │ │
│  │  │  [Raleway (defaut)     ▾]  │ │  │  │ Nom │ Statut │ Role │      │ │
│  │  └──────────────────────────────┘ │  │  ├─────┼────────┼──────┤      │ │
│  │                                   │  │  │ ... │ ...    │ ...  │      │ │
│  └───────────────────────────────────┘  │  └─────┴────────┴──────┘      │ │
│                                          └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Page MO — Traductions (`/translations`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Traductions                              [Importer CSV ↑] [Exporter CSV ↓] │
│  Gerez les traductions et surcharges de textes pour ce client.              │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Textes de l'interface]  [Contenu metier]                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ FR ──────────┐ ┌─ EN ──────────┐ ┌─ ES ──────────┐ ┌─ DE ────────────┐│
│  │ 12/156 traduits│ │  3/156 trad.  │ │  0/156 trad.  │ │  0/156 trad.   ││
│  │ ████░░░░ 8%   │ │ █░░░░░░░ 2%   │ │ ░░░░░░░░ 0%   │ │ ░░░░░░░░ 0%    ││
│  └────────────────┘ └───────────────┘ └───────────────┘ └────────────────┘ │
│                                                                              │
│  [🔍 Rechercher par cle ou valeur...]   [Tous ▾]                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  Cle              │ Defaut systeme │ FR (surcharge)    │ EN               │
│ ────────────────────────────────────────────────────────────────────────── │
│  ▼ Boutons & actions                                   (28)  12 traduits  │
│ ────────────────────────────────────────────────────────────────────────── │
│    buttons.save   │ Enregistrer    │ Enregistrer       │ Save             │
│    buttons.cancel │ Annuler        │ (Annuler)         │ Cancel           │
│    buttons.create │ Creer          │ (Creer)           │ ← clic=editer   │
│ ────────────────────────────────────────────────────────────────────────── │
│  ▶ Statuts                         (collapsed)         (14)   3 traduits  │
│ ────────────────────────────────────────────────────────────────────────── │
│  ▼ Placeholders                                         (6)   0 traduits  │
│    placeholders.search │ Rechercher... │ (Rechercher...) │ ← clic=editer │
│ ────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  --- Onglet "Contenu metier" ---                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Contenu metier                                    │   │
│  │  La traduction du contenu metier sera disponible prochainement.     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Color picker

```
┌─── Section "Couleur primaire" ──────────────────────────────────┐
│                                                                  │
│  <Label text-sm font-medium>                                    │
│  Couleur primaire                                                │
│                                                                  │
│  ┌── flex items-center gap-3 ─────────────────────────────────┐ │
│  │                                                             │ │
│  │  ┌─────────┐  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │         │  │ #4E3BD7      │  │ Texte blanc          │  │ │
│  │  │ [color] │  │ ← Input      │  │ ← Chip               │  │ │
│  │  │ h-10    │  │   w-32       │  │   bg={primaryColor}   │  │ │
│  │  │ w-10    │  │   font-mono  │  │   color={textOnPrim.} │  │ │
│  │  │ border  │  │   text-sm    │  │   text-xs shrink-0    │  │ │
│  │  │ cursor- │  │   maxLen=7   │  │                       │  │ │
│  │  │ pointer │  │              │  │                       │  │ │
│  │  └─────────┘  └──────────────┘  └──────────────────────┘  │ │
│  │                                                             │ │
│  │  ← l'input[type=color] ouvre le color picker natif du      │ │
│  │    navigateur (pas de popover custom)                       │ │
│  │  ← Si hex invalide : border-destructive sur Input          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ← Si format invalide :                                         │
│  <p text-xs text-destructive>Format invalide. Utilisez #RRGGBB</p>│
│                                                                  │
│  (Meme structure pour "Couleur secondaire" avec secondaryColor) │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Le Chip affiche dynamiquement "Texte blanc" ou "Texte noir" selon le calcul WCAG de `getTextOnColor()`. Le background du Chip est la couleur choisie, le texte est la couleur de contraste.

### Preview live complete (sidebar + header + contenu)

```
┌─── div[data-space="user-final"] style={cssVars} ─────────────────────────┐
│  className="rounded-lg border bg-background overflow-auto"                │
│                                                                            │
│  ┌─── Mini navbar (border-b bg-sidebar) ──────────────────────────────┐  │
│  │                                                                     │  │
│  │  SI logoUrl present :                                               │  │
│  │  [img logo max-h-8]                           Apercu navbar         │  │
│  │                                               ← text-xs muted      │  │
│  │  SINON :                                                            │  │
│  │  [Mountain icon]  {appName || 'Olympe'}       Apercu navbar         │  │
│  │  ← bg-primary      ← text-sm font-bold                             │  │
│  │    h-7 w-7 rounded-md                                               │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── Contenu preview (p-6 space-y-6) ────────────────────────────────┐  │
│  │                                                                     │  │
│  │  Previsualisation                                                   │  │
│  │  Apercu en temps reel du theme client                               │  │
│  │                                                                     │  │
│  │  ─── Boutons ───────────────────────────────────────────────────── │  │
│  │  [Bouton primaire] [Bouton outline] [Bouton secondaire] [Desactive]│  │
│  │  ← tous avec rounded-[var(--radius)]                              │  │
│  │                                                                     │  │
│  │  ─── Typographie ──────────────────────────────────────────────── │  │
│  │  Titre H1 — Olympe Platform            ← text-2xl font-bold      │  │
│  │  Paragraphe standard. Lorem ipsum...   ← text-base               │  │
│  │  Lien d'exemple                        ← text-primary underline   │  │
│  │                                                                     │  │
│  │  ─── Formulaire ───────────────────────────────────────────────── │  │
│  │  Champ texte                           ← label text-sm            │  │
│  │  [Saisir une valeur...]                ← input h-10 placeholder   │  │
│  │                                                                     │  │
│  │  ─── Card ──────────────────────────────────────────────────────  │  │
│  │  ┌── rounded-[var(--radius)] border bg-card max-w-sm ──────────┐ │  │
│  │  │ Titre de la card                                             │ │  │
│  │  │ Contenu de la card avec description...                       │ │  │
│  │  │ [Action]  ← bouton bg-primary                                │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                                                                     │  │
│  │  ─── Badges & Alertes ─────────────────────────────────────────  │  │
│  │  [Primaire]  [Secondaire]  [Outline]                              │  │
│  │  ┌── Alerte (border bg-card rounded-[var(--radius)]) ──────────┐ │  │
│  │  │ ℹ Alerte d'information                                      │ │  │
│  │  │   Ceci est un message d'alerte utilisant les couleurs...     │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                                                                     │  │
│  │  ─── Tableau ───────────────────────────────────────────────────  │  │
│  │  ┌── rounded-[var(--radius)] border overflow-hidden ───────────┐ │  │
│  │  │ Nom             │ Statut      │ Role           │            │ │  │
│  │  ├─────────────────┼─────────────┼────────────────┤            │ │  │
│  │  │ Alice Martin    │ [Actif]     │ Administrateur │            │ │  │
│  │  │ Bob Durand      │ [Inactif]   │ Utilisateur    │            │ │  │
│  │  │ Claire Petit    │ [Actif]     │ Moderateur     │            │ │  │
│  │  └─────────────────┴─────────────┴────────────────┘            │ │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  CSS variables injectees via style prop :                                  │
│    --primary, --primary-foreground, --secondary, --secondary-foreground,  │
│    --radius, fontFamily                                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

La preview doit utiliser les composants du design system (`<Button>`, `<Input>`, etc.) pour un apercu fidele du rendu reel.

---

## Regles metier

### Design
- Identite visuelle : logo (SVG, PNG, JPEG, max 2MB) ou nom textuel
- Couleurs : primaire et secondaire, chacune avec calcul automatique de la couleur de texte contrastee (WCAG)
- Arrondi des composants : presets (Sharp, Slight, Medium, Rounded, Pill) ou valeur personnalisee en rem
- Typographie : police Google Fonts configurable (defaut : Raleway)
- Preview live en temps reel des changements
- Bandeau "Modifications non sauvegardees" tant que le formulaire a des changements non persistes
- Reinitialisation aux valeurs par defaut possible
- Les couleurs `text_on_primary` et `text_on_secondary` doivent etre calculees dynamiquement via `getTextOnColor()` pour garantir le contraste WCAG

### Traductions
- Deux onglets : "Textes de l'interface" (fonctionnel) et "Contenu metier" (placeholder pour le futur)
- Cartes de progression par langue avec pourcentage et nombre de cles traduites
- Tableau editable par categorie (groupes collapsibles)
- Recherche par cle ou valeur
- Filtre par statut de traduction (Tous, Traduits, Non traduits)
- Edition inline au clic sur une cellule
- Import/export CSV avec BOM UTF-8
- Les surcharges ecrasent les valeurs par defaut du systeme
- Les langues actives par client doivent etre configurables (pas hardcodees)

---

## Endpoints API (existants)

### Design

| Methode | Route | Description | A corriger |
|---------|-------|-------------|------------|
| GET | `/api/clients/:clientId/design` | Recupere la config design du client | — |
| PUT | `/api/clients/:clientId/design` | Upsert config design (un seul appel) | Ajouter validation hex `z.string().regex(/^#[0-9A-Fa-f]{6}$/)` pour `primary_color`, `secondary_color`, `accent_color` |

### Traductions

| Methode | Route | Description | A corriger |
|---------|-------|-------------|------------|
| GET | `/api/clients/:clientId/translations` | Recupere toutes les traductions du client | Retourner tous les champs (`id`, `scope`, `key`, `language`, `value`, `created_at`, `updated_at`), pas seulement `key`+`value` |
| PUT | `/api/clients/:clientId/translations` | Upsert batch de traductions | Remplacer le DELETE+INSERT par un vrai upsert (ON CONFLICT) pour eviter la perte de donnees ; utiliser soft delete au lieu de suppression physique |

## Endpoints API (a creer)

### Design

| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/clients/:clientId/design/logo` | Upload du logo client (multipart/form-data, storage fichier) |
| DELETE | `/api/clients/:clientId/design/logo` | Suppression du logo client |

### Traductions

| Methode | Route | Description |
|---------|-------|-------------|
| PUT | `/api/clients/:clientId/translations/:key` | Upsert d'une traduction unitaire (edition inline) |

---

## Comportements attendus

### Loading states
- Skeleton sur la page Design pendant le chargement de la config
- Skeleton sur les cartes de progression des traductions
- Spinner sur les boutons "Sauvegarder", "Reinitialiser", "Importer", "Exporter" pendant les mutations
- Spinner dans le formulaire Design pendant l'upload du logo

### Gestion d'erreurs
- Toast d'erreur si la sauvegarde du design echoue
- Toast d'erreur si l'upload du logo echoue (format invalide, taille excessive, erreur serveur)
- Toast d'erreur si l'import CSV echoue (format invalide, depassement de la limite serveur de 500 lignes)
- Message d'erreur inline pour les couleurs hex invalides (border-destructive + message)
- Etat d'erreur explicite si le chargement initial des traductions echoue

### Validation
- **Couleurs** : format hex `#RRGGBB` valide front (regex) + back (schema Zod `z.string().regex(/^#[0-9A-Fa-f]{6}$/)`)
- **Logo** : formats acceptes SVG, PNG, JPEG ; taille max 2MB
- **Border radius** : valeur numerique positive en rem
- **Traductions** : sanitization des valeurs cote serveur (echapper HTML, limiter longueur) pour eviter les injections
- **Import CSV** : validation du format, des colonnes attendues, et limite a 500 lignes cote serveur

### Pagination
- Pas de pagination pour la page Design (formulaire unique)
- Traductions : pas de pagination (toutes les cles chargees, groupees par categorie)

### Permissions
- Acces : `admin_delta`, `integrator_delta`, `integrator_external`
- Verification front (guard de route) + API (middleware)

---

## Points d'attention backend

### Design

| # | Sujet | Action |
|---|-------|--------|
| M1 | `text_on_primary` / `text_on_secondary` absents en BDD | Soit ajouter les colonnes en BDD, soit calculer dynamiquement dans `buildCssVars` via `getTextOnColor()` (recommande) |
| M2 | `border_radius` integer en BDD vs decimal rem en front | Unifier : stocker en rem (numeric/real au lieu d'integer) ou convertir systematiquement |
| M3 | Defaults incoherents front/back/BDD (3 sources de verite) | Definir UNE source de verite (serveur), le front n'a que des fallbacks temporaires |
| S1 | Pas de validation hex cote serveur | Ajouter `z.string().regex(/^#[0-9A-Fa-f]{6}$/)` au schema Zod pour toutes les couleurs |
| m1 | `accent_color` en BDD/schema Zod mais jamais utilise | Supprimer la colonne ou l'exposer dans le formulaire |

### Traductions

| # | Sujet | Action |
|---|-------|--------|
| C1 | PUT supprime toutes les traductions existantes (DELETE+INSERT) | Remplacer par un vrai upsert (ON CONFLICT) |
| M4 | GET ne retourne pas `scope`/`language`/`id` | Ajouter les champs manquants dans le SELECT |
| M5 | `default_language`/`active_languages` inexistants en BDD | Ajouter ces colonnes a la table `clients` et les exposer dans l'API |
| M6 | Suppression physique des traductions (violation regle projet) | Ajouter `deleted_at` a la table `translations`, utiliser soft delete |
| S2 | Import CSV sans sanitization | Sanitizer les valeurs cote serveur (echapper HTML, limiter longueur) |
