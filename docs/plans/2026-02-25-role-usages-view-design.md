# Design — Vue centralisée des usages d'un rôle

**Date** : 2026-02-25
**Contexte** : L'intégrateur a besoin de voir rapidement où un rôle est utilisé dans la plateforme et de configurer les options des blocs directement depuis cette vue.

---

## Problème

Actuellement, pour comprendre le périmètre d'un rôle, l'intégrateur doit naviguer dans chaque module, chaque vue, chaque workflow séparément. Il n'existe aucune vue centralisée montrant tous les endroits où un rôle intervient.

## Solution

Refonte de la page `/dashboard/roles` en layout **master-detail** avec :
- Un panneau gauche compact listant les rôles par catégorie
- Un panneau droit affichant le détail du rôle sélectionné et un tableau de tous ses usages avec édition inline des options de bloc

---

## Layout général

```
┌─────────────────────────────────────────────────────────────┐
│  Header page : "Rôles"                                      │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│  PANNEAU      │  PANNEAU DÉTAIL                             │
│  GAUCHE       │                                             │
│  (~250px)     │  ┌─ Header rôle ─────────────────────────┐  │
│               │  │ 🟣 Nom du rôle          [⚙] [🗑]     │  │
│  🔍 Recherche │  │ Catégorie · Description                │  │
│               │  └───────────────────────────────────────┘  │
│  ▼ Catégorie1 │                                             │
│    Rôle A     │  ┌─ Filtres ─────────────────────────────┐  │
│    Rôle B  ←  │  │ [Tous] [Org] [Données] [WF] [Enquête]│  │
│  ▼ Catégorie2 │  │ ☐ Actifs seulement    🔍 Rechercher   │  │
│    Rôle C     │  └───────────────────────────────────────┘  │
│    Rôle D     │                                             │
│  ▶ Catégorie3 │  ┌─ Tableau des usages ──────────────────┐  │
│               │  │ Module  │ Vue      │ Type  │ Accès │ ▶│  │
│               │  │ ─────── │ ──────── │ ───── │ ───── │  │  │
│               │  │ RH      │ Organi…  │ Org   │  🟢   │ ▶│  │
│               │  │         │ Fiches…  │ Data  │  🟢   │ ▶│  │
│               │  │ Ventes  │ Pipeline │ WF    │  🟢   │ ▶│  │
│               │  │ Qualité │ Enquête… │ Enq   │  ⚫   │  │  │
│               │  └─────────────────────────────────────┘  │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

---

## Panneau gauche — Liste des rôles

### Contenu
- Champ de recherche en haut (filtre les rôles et catégories)
- Liste des catégories, dépliables (accordéon)
- Sous chaque catégorie : les rôles (pastille couleur + nom)
- Le rôle sélectionné est surligné visuellement
- Bouton "+ Rôle" en bas du panneau

### Comportement
- Par défaut, toutes les catégories sont dépliées
- La recherche filtre en temps réel (catégories qui n'ont aucun rôle correspondant sont masquées)
- Un clic sur un rôle le sélectionne et charge son détail dans le panneau droit

### Ce qui est retiré par rapport à la page actuelle
- Pas de colonnes description, slug, actions dans le panneau gauche
- Ces informations sont déplacées dans le panneau droit (header du détail)

---

## Panneau droit — Détail du rôle

### Header du rôle
- **Nom** avec pastille couleur
- **Catégorie** (texte)
- **Description** (texte, si présente)
- **Actions** : bouton Éditer (ouvre `RoleFormDialog` existant), bouton Archiver

### Tableau des usages

#### Colonnes

| Colonne | Largeur | Contenu |
|---|---|---|
| Module | ~150px | Nom du module parent. Groupé visuellement : le nom n'apparaît qu'une fois, les lignes suivantes du même module sont indentées |
| Vue / Élément | ~200px | Nom de la vue, du nœud workflow, ou de l'enquête |
| Type | ~80px | Badge coloré : `Organisation`, `Données`, `Workflow`, `Enquête` |
| Accès | ~50px | Pastille : 🟢 (accès) ou ⚫ (pas d'accès) — lecture seule |
| Expand | ~40px | Chevron ▶ pour déplier (uniquement si le rôle a accès) |

#### Sources de données par type

| Type | Source | Description |
|---|---|---|
| Organisation | `navigation_configs` + blocs `eo_card` dans `view_configs` | Blocs d'entités organisationnelles |
| Données | `navigation_configs` + blocs `data_table` dans `view_configs` | Tableaux de données métier |
| Workflow | `navigation_configs` + blocs workflow dans `view_configs` | Nœuds de workflow |
| Enquête | `navigation_configs` + blocs `survey_*` dans `view_configs` | Enquêtes (création et réponses) |

#### Indicateur d'accès
- Basé sur `nav_permissions` et `view_permissions` existants
- 🟢 = le rôle a accès (via permission directe ou héritage)
- ⚫ = pas d'accès
- **Lecture seule** dans cette vue — pour modifier l'accès, l'intégrateur va dans la configuration des modules

#### Lignes sans accès
- Affichées en opacité réduite
- Non-expandables (pas de chevron)
- Masquables via le filtre "Actifs seulement"

---

## Ligne expandée — Options du bloc

Quand on clique sur le chevron d'une ligne avec accès, la ligne s'expand pour afficher **toutes les options de configuration du bloc**. Ces options sont **globales** (elles s'appliquent à tous les rôles qui ont accès à cette vue). Les modifications sont en **auto-save immédiat**.

### Bloc Organisation (`eo_card`)

```
┌─────────────────────────────────────────────────────────┐
│ 🟢 RH  ›  Organigramme                  [Organisation] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Modes de vue                                           │
│  ☑ Liste   ☑ Arbre   ☐ Canvas       Défaut: [Liste ▼]  │
│                                                         │
│  Fonctionnalités                                        │
│  ☑ Création    ☑ Import    ☑ Export                     │
│  ☑ Historique  ☑ Recherche ☐ Filtres                    │
│                                                         │
│  Personnalisation utilisateur                           │
│  ☑ Config colonnes    ☐ Gestion champs                  │
│                                                         │
│  Colonnes de la liste          [Configurer...]          │
│  Visibilité des champs         [Configurer...]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Sections et options :**

| Section | Options | Type de contrôle |
|---|---|---|
| Modes de vue | `available_views` (list/tree/canvas), `default_view` | Checkboxes + dropdown |
| Fonctionnalités | `enable_create`, `enable_import`, `enable_export`, `enable_history`, `enable_search`, `enable_filters` | Toggles/Checkboxes |
| Personnalisation utilisateur | `allow_user_column_config`, `allow_user_field_management` | Toggles |
| Colonnes de la liste | `list_columns` | Bouton ouvrant `EoListColumnsConfigDialog` |
| Visibilité des champs | `field_visibility` | Bouton ouvrant `EoFieldsVisibilityDialog` |

### Bloc Données (`data_table`)

Options spécifiques au type data_table (à définir au fur et à mesure que les blocs sont finalisés). Même structure de sections avec les options pertinentes.

### Bloc Workflow

Options liées aux nœuds de workflow : permissions de vue, édition, exécution de transitions.

### Bloc Enquête (`survey_creator` / `survey_responses`)

Options liées aux enquêtes : rôles répondants, rôles valideurs, ordre de validation.

---

## Filtres du tableau

Au-dessus du tableau, barre de filtres :

| Filtre | Type | Comportement |
|---|---|---|
| Type | Toggle buttons (Tous / Org / Données / WF / Enquête) | Filtre les lignes par type de bloc |
| Actifs seulement | Checkbox | Masque les lignes où le rôle n'a pas accès |
| Recherche | Champ texte | Filtre par nom de module ou de vue |

---

## Comportement auto-save

- Chaque modification d'option (toggle, checkbox, dropdown) déclenche une sauvegarde immédiate
- Feedback visuel : indicateur de chargement discret sur l'option modifiée
- En cas d'erreur : toast d'erreur + rollback visuel de l'option
- Les options complexes (colonnes, visibilité champs) utilisent les dialogs existants qui ont déjà leur propre logique de sauvegarde

---

## Hors périmètre

- **Modification des accès** (nav_permissions / view_permissions) depuis cette vue — l'intégrateur utilise la configuration des modules existante
- **Création de nouveaux blocs** — se fait dans le page builder
- **Permissions CRUD par rôle** — les options sont globales par vue, pas par rôle

