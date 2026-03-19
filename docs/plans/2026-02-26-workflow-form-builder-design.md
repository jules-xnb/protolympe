# Design — Workflow Form Builder

Date : 2026-02-26

## Contexte

Sur la page workflow, la configuration des formulaires par étape est actuellement enfouie dans un 3e onglet du panneau de config d'un nœud (à droite). L'intégrateur a besoin d'un vrai builder de formulaire avec drag & drop, sections, et navigation entre étapes.

## Décision d'architecture

**Approche retenue : 2 onglets au niveau du canvas.**

Le `WorkflowDetailPage` expose 2 onglets principaux :
- **Workflow** — le graphe ReactFlow (inchangé)
- **Formulaires** — le nouveau builder de formulaires

Le header (nom, type, statut sauvegarde) reste commun aux 2 onglets.

## Layout du Form Builder (3 colonnes)

```
┌──────────┬────────────┬─────────────────────────────────┐
│ ÉTAPES   │ CHAMPS     │ FORMULAIRE                      │
│ ~150px   │ ~220px     │ flex-1                          │
│          │            │                                 │
│ Répondant│ Recherche  │ Header: "Répondant" + [Copier]  │
│ ────────→│ ─────────  │ ───────────────────────────────  │
│ Étape 1  │            │                                 │
│ Étape 2  │ ▸ Texte    │ ┌─ Section "Général" ─────────┐ │
│ Validé   │   Nom      │ │ 🔒 Code entité    [requis]  │ │
│          │   Desc.    │ │ 🔒 Réf. number    [requis]  │ │
│          │            │ │    Priorité     ⋮  ✕        │ │
│          │ ▸ Dates    │ └──────────────────────────────┘ │
│          │   Date déb │                                 │
│          │            │ ┌─ Section "Détails" ──────────┐ │
│          │ ▸ Réf.     │ │    Description   ⋮  ✕       │ │
│          │   Entité   │ └──────────────────────────────┘ │
│          │            │                                 │
│          │ [+Section] │ ┌─ + Déposer ici ─────────────┐ │
│          │            │ └──────────────────────────────┘ │
└──────────┴────────────┴─────────────────────────────────┘
```

### Colonne 1 — Sidebar étapes (~150px)

- Liste des nœuds du workflow : Répondant, Étapes de validation, Validé
- L'étape active est surlignée
- Clic pour switcher
- Badge indiquant le rôle : "Répondant" / "Validation" / "Validé"
- Compteur du nombre de champs configurés par étape

### Colonne 2 — Champs disponibles (~220px)

- Liste des champs du BO (`field_definitions`)
- Groupés par type (Texte, Dates, Références…) dans des accordéons
- Barre de recherche en haut pour filtrer
- Les champs déjà dans le formulaire de l'étape courante sont **masqués**
- Chaque champ est draggable vers la colonne 3
- Bouton **[+ Section]** en bas pour créer une section vide dans le formulaire

### Colonne 3 — Formulaire (flex-1)

- Header : nom de l'étape + bouton **[Copier depuis… ▾]**
- Sections avec nom éditable inline (clic → input)
- Sections réordonnables par drag & drop (poignée sur le header)
- Dans chaque section : champs ordonnés par drag & drop
  - Poignée ⋮ pour réordonner
  - Bouton ✕ pour retirer (le champ réapparaît dans la colonne 2)
  - Champs verrouillés : icône cadenas, pas de ✕
- Zone de drop en bas pour ajouter un champ (crée implicitement dans la dernière section)
- Section "Général" auto-créée par défaut (toujours au moins 1 section)

## Comportement par type de nœud

| | Répondant | Validation | Validé |
|---|---|---|---|
| Champs obligatoires du BO | **Verrouillés** (cadenas, non retirables) | Libres | Libres |
| Mode par défaut des champs | Éditable | Lecture seule | Lecture seule |
| Toggle éditable par champ | Non (toujours éditable) | Oui | Oui |
| Copier depuis autre étape | Non disponible | Oui (choix de l'étape source) | Oui (choix de l'étape source) |

### Indicateurs visuels (nœuds validation/validé)

- Champ en lecture seule : fond gris, badge `[readonly]`
- Champ éditable : fond blanc, badge `[éditable ✏️]`
- Toggle via clic sur le badge

## Gestion des sections

- **Création** : bouton [+ Section] dans la colonne 2, crée une section vide en bas du formulaire avec le nom "Nouvelle section"
- **Nom** : éditable inline (clic sur le titre)
- **Réordonnement** : drag & drop sur le header de la section
- **Suppression** : bouton sur le header de section. Les champs retournent dans la liste disponible. Les champs verrouillés se rattachent à la section suivante (ou précédente).
- **Minimum** : toujours au moins 1 section. Si on supprime la dernière, une section "Général" est recréée.

## Copie depuis une autre étape

- Bouton **[Copier depuis… ▾]** dans le header du formulaire
- **Dropdown** listant toutes les autres étapes (pas l'étape courante)
- Non disponible sur le répondant (1ère étape)
- Copie **tout** : sections (noms + ordre), champs dans chaque section (ordre + config)
- **Écrase** la configuration actuelle
- Dialog de confirmation si le formulaire n'est pas vide : "Remplacer la configuration actuelle par celle de [Étape X] ?"

## Persistance

### Nouvelle table `node_sections`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | PK |
| node_id | UUID | FK → workflow_nodes |
| name | string | Nom de la section |
| display_order | int | Ordre d'affichage |

### Table existante `node_fields`

Utilise le champ JSON `settings.section_id` existant pour le lien vers la section.

- `is_visible` = true → le champ est dans le formulaire
- `is_editable` = true → le champ est éditable (répondant: toujours true, valideur: configurable)
- `is_required_override` → pour forcer le requis au niveau de l'étape
- `display_order` → ordre dans la section

### Sauvegarde

- Auto-save debounced (1000ms), cohérent avec le reste du workflow editor
- Sauvegarde de l'étape courante avant de switcher d'étape

## Ce qui change dans l'existant

- `WorkflowDetailPage` : ajout de tabs (Workflow / Formulaires)
- L'onglet "Fields" du panneau de config nœud (droite) est **supprimé** — remplacé par l'onglet Formulaires
- Le panneau de config nœud ne garde que 2 onglets : Détails et Rôles

## Ce qui ne change pas

- L'onglet Workflow (graphe ReactFlow) reste identique
- Le panneau de config nœud (détails, rôles) reste dans l'onglet Workflow
- Les hooks `useWorkflowEditorBridge`, `useNodeFields` restent la source de vérité
- La table `node_fields` n'est pas modifiée structurellement
