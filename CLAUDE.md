# Guidelines Delta RM

## PRD - Règles de rédaction

- **Pas de modèle de données** : Les PRD doivent rester purement métier/fonctionnel. Ne jamais inclure de schémas techniques, tables, colonnes ou relations de base de données.

## Nomenclature des tickets

Format : `{E}-{F}-{T}` (séparés par des tirets)

- **EPIC** : `{E}-0-0` — ex. `1-0-0` = Epic 1
- **FEATURE** : `{E}-{F}-0` — ex. `2-1-0` = Epic 2 / Feature 1
- **TASK** : `{E}-{F}-{T}` — ex. `2-1-3` = Epic 2 / Feature 1 / Task 3

## Structure des tickets

Un doc par ticket. L'arborescence des dossiers porte la hiérarchie EPIC > FEATURE > TASK.

**EPIC**
- Titre
- Description

**FEATURE**
- Titre
- Description

**TASK**
- Titre
- Référence Figma
- Description
- Détails fonctionnels
- Critères de done
- Dépendances

## Raccourcis de contexte vue

Préfixes utilisés dans les instructions pour indiquer la vue concernée :

- **`bo-`** → vue **Admin** (Back Office)
- **`mo-`** → vue **Intégrateur** (Module Owner)
- **`fo-`** → vue **User Final** (Front Office)

Exemple : "mo-navbar" = la navbar dans la vue intégrateur.

## Conventions UI

- **Icônes dans les boutons** : toujours placer les icônes à **droite** du texte (ex : `<Button>Enregistrer <Save className="h-4 w-4" /></Button>`).

### Design System — Règle absolue

**0 composant custom. Tout vient de `src/components/ui/`.**

#### Hiérarchie d'utilisation obligatoire

Avant d'écrire du JSX, vérifier dans cet ordre :

1. **Un wrapper existe ?** → l'utiliser (jamais recomposer du shadcn si un wrapper fait déjà le job)
2. **Un composant shadcn existe ?** → l'utiliser tel quel
3. **Rien n'existe ?** → créer un nouveau wrapper dans `src/components/ui/` puis l'utiliser

#### Wrappers disponibles (à utiliser EN PRIORITÉ sur le shadcn brut)

| Besoin | Wrapper | Ne PAS faire |
|--------|---------|-------------|
| Select avec recherche | `SearchableSelect` | Popover + Command à la main |
| Dialog avec formulaire | `FormDialog` | Dialog + Form à la main |
| Panneau latéral détails | `DetailsDrawer` | Sheet + header/footer à la main |
| Chip de statut métier | `StatusChip` | Chip + mapping couleur à la main |
| État vide / aucun résultat | `EmptyState` | Alert customisé à la main |
| Pagination de tableau | `UnifiedPagination` | Boutons prev/next à la main |
| Menu actions ligne tableau | `TableActionMenu` | DropdownMenu à la main |
| Input avec label flottant | `FloatingInput` | Input + label animé à la main |
| Upload de fichier | `FileInput` | input[type=file] à la main |
| Toast / notification | `toast()` (Sonner) | Alert ou custom notification |

#### Suivi obligatoire

À chaque utilisation d'un composant ou wrapper dans une page, **mettre à jour** la colonne "Utilisé dans" dans :
- `docs/design-system/composants-shadcn.md` (composants shadcn)
- `docs/design-system/wrappers.md` (wrappers custom)

#### Theming FO (personnalisation client)

Le FO est thémé par client via CSS variables. Règles :
- **Jamais de couleur hex en dur** — utiliser `bg-primary`, `text-primary`, `border-primary`, etc.
- **Jamais de `rounded-*` en dur** — le radius est piloté par `--radius`
- **Jamais de font-family en dur** — héritée du body
- **MO et BO ne sont PAS thémés** — thème Delta par défaut uniquement

#### Traductions FO (i18n)

- **En FO** : tout texte visible passe par `t('scope.key')` — jamais de texte en dur
- **En MO / BO** : texte en dur (interface Delta interne)
- **Les wrappers reçoivent des strings déjà traduites** — c'est la page qui appelle `t()`, pas le composant
- Doc complète : `docs/design-system/theming-i18n.md`

#### Création d'un nouveau composant = ALERTE OBLIGATOIRE

Si aucun composant ou wrapper existant ne couvre le besoin, **STOPPER et ALERTER l'utilisateur** avant de créer quoi que ce soit. Le message doit contenir :
1. Ce que tu as besoin de faire
2. Les composants/wrappers existants que tu as envisagés et pourquoi ils ne conviennent pas
3. Ta proposition de nouveau composant (nom, props, ce qu'il compose)

**Ne jamais créer un composant sans validation explicite de l'utilisateur.**

Après validation, créer le composant dans `src/components/ui/`, l'ajouter à la page design system wrappers (`/design-system/wrappers`), et mettre à jour `docs/design-system/wrappers.md`.

#### Interdictions

- **Jamais** de composant custom en dehors de `src/components/ui/`
- **Jamais** deux wrappers qui font la même chose
- **Jamais** de recomposition manuelle si un wrapper existe
- **Jamais** d'import direct de librairies tierces (Radix, cmdk, etc.) dans les pages — passer par les composants UI
- **Jamais** de nouveau composant sans alerte et validation utilisateur

## Processus de développement

### Règle n°1 : PRD avant tout code

**Aucune ligne de code ne doit être écrite sans PRD validé.** Le processus est :

1. **Rédiger le PRD** de la feature/task (métier uniquement, pas de technique)
2. **Faire valider** le PRD par l'utilisateur
3. **Planifier** l'implémentation technique
4. **Implémenter** feature par feature, page par page
5. **Vérifier** avant de considérer comme terminé

### Approche incrémentale stricte

- Une page à la fois, une feature à la fois
- Chaque feature doit être **complète et testée** avant de passer à la suivante
- Jamais de migration ou refactoring en batch

### Niveau d'exigence

Ce projet est destiné à des **entreprises du CAC 40**. Le niveau d'exigence est maximal :

- **Sécurité** : OWASP top 10, validation systématique des entrées, RLS/autorisation rigoureuse
- **Qualité** : Pas de raccourcis, pas de TODO en production, pas de code mort
- **Robustesse** : Gestion d'erreurs explicite, pas de fail silencieux
- **Performance** : Requêtes optimisées, pas de N+1, pagination systématique

### Apprentissage continu

Chaque erreur rencontrée doit être documentée dans ce fichier (section "Erreurs connues") pour ne jamais la répéter. Le CLAUDE.md est enrichi au fil du projet.

## Erreurs connues

_(À remplir au fur et à mesure du projet)_


