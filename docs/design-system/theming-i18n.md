# Theming & Traductions — Architecture front

> Chaque client peut personnaliser l'apparence et les textes du FO depuis le MO.
> Ce document décrit comment les composants doivent supporter ces deux systèmes.

---

## 1. Theming (personnalisation visuelle)

### Source de données

**Table BDD** : `client_design_configs`

| Colonne | Type | Défaut | Impact |
|---------|------|--------|--------|
| `primary_color` | text (hex) | `#3B82F6` | Couleur principale (boutons, liens, focus) |
| `secondary_color` | text (hex) | `#6B7280` | Couleur secondaire |
| `accent_color` | text (hex) | null | Couleur d'accent (optionnelle) |
| `border_radius` | integer (px) | `8` | Arrondi de tous les composants |
| `font_family` | text | `Inter` | Police de caractères |
| `logo_url` | text | null | Logo du client |
| `app_name` | text | null | Nom de l'application |

### Implémentation côté front

**Principe** : CSS variables injectées au niveau du `<body>` ou d'un wrapper FO.

```css
/* Variables injectées dynamiquement en FO */
:root {
  --client-primary: #4E3BD7;
  --client-secondary: #E8E9F2;
  --client-accent: #F59E0B;
  --client-radius: 8px;
  --client-font: 'Raleway', sans-serif;
}
```

**Les composants shadcn utilisent déjà des CSS variables** (`--primary`, `--secondary`, `--radius`, etc. dans `index.css`). En FO, on surcharge ces variables avec les valeurs du client :

```css
/* Mode FO — surcharge des variables shadcn */
[data-mode="fo"] {
  --primary: var(--client-primary);
  --secondary: var(--client-secondary);
  --radius: var(--client-radius);
  font-family: var(--client-font);
}
```

### Règles pour les composants

1. **Jamais de couleur en dur** dans les composants — utiliser les classes Tailwind sémantiques (`bg-primary`, `text-primary`, `border-primary`, etc.)
2. **Jamais de `rounded-lg` en dur** — utiliser `rounded-[var(--radius)]` ou les classes Tailwind qui héritent de `--radius`
3. **Jamais de `font-family` en dur** — la font est héritée du body
4. **MO n'est PAS thémé** — seul le FO applique les couleurs client. Le MO garde toujours le thème Delta par défaut

### Scopes

| Vue | Thème appliqué | Variables |
|-----|---------------|-----------|
| **BO** (Admin) | Delta par défaut | Variables shadcn de base |
| **MO** (Intégrateur) | Delta par défaut | Variables shadcn de base |
| **FO** (User Final) | Personnalisé client | Variables client injectées |

### Flux de données

```
MO: Intégrateur modifie les couleurs → PATCH /api/clients/:clientId/design
                                         ↓
                                    Sauvegarde en BDD (client_design_configs)
                                         ↓
FO: User Final se connecte → GET /api/clients/:clientId/design
                                         ↓
                              Injection CSS variables dans le wrapper FO
                                         ↓
                              Tous les composants shadcn sont automatiquement thémés
```

---

## 2. Traductions (i18n)

### Source de données

**Table BDD** : `translations`

| Colonne | Type | Description |
|---------|------|-------------|
| `client_id` | uuid | Client concerné |
| `scope` | text | Catégorie (ex: `buttons`, `labels`, `placeholders`, `messages`) |
| `language` | text | Code langue (ex: `fr`, `en`, `es`) |
| `key` | text | Clé de traduction (ex: `buttons.save`, `labels.name`) |
| `value` | text | Texte traduit |

### Principes

1. **Chaque texte visible en FO doit passer par le système de traduction**
2. **Valeurs par défaut** : le système fournit des textes par défaut (français). Le client peut les surcharger en MO
3. **Fallback** : si pas de traduction client → utiliser le défaut système
4. **Scope** : les traductions sont organisées par catégorie pour faciliter la gestion en MO

### Implémentation côté front

**Hook `useTranslation`** (à créer) :

```tsx
const { t } = useTranslation();

// Usage dans les composants
<Button>{t('buttons.save')} <Save className="h-4 w-4" /></Button>
<Label>{t('labels.client_name')}</Label>
<EmptyState title={t('empty.no_results')} description={t('empty.try_different_search')} />
```

**Fonctionnement** :
1. Au chargement du FO, récupérer toutes les traductions du client + langue active
2. Stocker en mémoire (contexte React)
3. `t(key)` retourne la traduction client si elle existe, sinon le défaut système
4. Changement de langue → re-fetch des traductions

### Scopes de traduction

| Scope | Exemples de clés |
|-------|-----------------|
| `buttons` | `buttons.save`, `buttons.cancel`, `buttons.create`, `buttons.archive` |
| `labels` | `labels.name`, `labels.email`, `labels.status`, `labels.created_at` |
| `placeholders` | `placeholders.search`, `placeholders.select_option` |
| `messages` | `messages.confirm_archive`, `messages.save_success`, `messages.error_generic` |
| `empty` | `empty.no_results`, `empty.no_users`, `empty.no_data` |
| `nav` | `nav.users`, `nav.entities`, `nav.profiles`, `nav.settings` |
| `status` | `status.active`, `status.inactive`, `status.archived` |

### Règles pour les composants

1. **En FO** : tout texte passe par `t()` — jamais de texte en dur
2. **En MO** : les textes peuvent être en dur (l'intégrateur voit l'interface Delta, pas celle du client)
3. **En BO** : textes en dur (interface interne Delta)
4. **Les wrappers** (StatusChip, EmptyState, etc.) doivent accepter des strings déjà traduites — c'est la page appelante qui appelle `t()`, pas le wrapper

### Flux de données

```
MO: Intégrateur modifie les traductions → PUT /api/clients/:clientId/translations
                                            ↓
                                       Sauvegarde en BDD (translations)
                                            ↓
FO: User Final se connecte → GET /api/clients/:clientId/translations?lang=fr
                                            ↓
                               Chargement dans TranslationContext
                                            ↓
                               t('buttons.save') → "Enregistrer" (ou surcharge client)
```

---

## 3. Résumé des impacts sur le design system

### Ce que les composants doivent respecter

| Aspect | Règle | Mauvais exemple | Bon exemple |
|--------|-------|-----------------|-------------|
| Couleur | Classes sémantiques | `bg-[#3B82F6]` | `bg-primary` |
| Radius | Variable CSS | `rounded-lg` | `rounded-[var(--radius)]` ou via shadcn |
| Font | Héritage body | `font-sans` en dur | Pas de font-family, hérité |
| Texte FO | Fonction `t()` | `"Enregistrer"` | `{t('buttons.save')}` |
| Texte MO/BO | Texte direct | `{t('buttons.save')}` | `"Enregistrer"` |

### Composants concernés

**Tous les composants shadcn sont déjà compatibles** car ils utilisent les CSS variables de Tailwind (`bg-primary`, `text-muted-foreground`, etc.). Le theming fonctionne automatiquement en surchargeant les variables CSS.

**Les wrappers custom** (Chip, StatusChip, EmptyState, etc.) utilisent aussi les classes Tailwind sémantiques → compatibles.

**Seule contrainte** : ne jamais coder de couleur hex en dur dans un composant.
