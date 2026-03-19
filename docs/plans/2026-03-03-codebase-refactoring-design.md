# Refactoring Codebase — Design

**Date** : 2026-03-03
**Objectif** : Améliorer la vélocité de développement en réduisant la complexité structurelle de la codebase.

## Contexte

La codebase fait ~81K LOC avec 293 fichiers. Plusieurs fichiers dépassent 1000 LOC, des patterns sont dupliqués entre 4 pages d'import, et il n'y a aucun code splitting. Ces facteurs ralentissent les modifications.

## Approche retenue : Par impact sur la vélocité

4 chantiers, dans l'ordre :

1. Code splitting (zero risque, gain immédiat)
2. ImportWizard générique (plus gros ROI en maintenabilité)
3. Décomposition des gros composants (refactoring mécanique)
4. Extraction de la logique métier des hooks (fonctions pures testables)

**Skipé** : Split de ViewModeContext (408 LOC, bien structuré, pas assez de gain).

---

## 1. Code Splitting

Remplacer les imports statiques dans `App.tsx` par `React.lazy()` + `Suspense`.

**Groupes :**

| Groupe | Routes |
|--------|--------|
| Auth | `/auth`, `/reset-password` |
| Admin platform | `/dashboard/admin/*` |
| Entities | `entities/*` |
| Users | `users/*` |
| Referentials | `referentials/*` |
| Roles | `roles/*` |
| Business Objects | `business-objects/*` |
| Modules | `modules/*` |
| Workflows | `workflows/*` |
| User Final | `user/*` |

Chaque page → `React.lazy(() => import('./pages/...'))`. Un `<Suspense fallback={<LoadingSpinner />}>` au niveau du `<Routes>`.

---

## 2. ImportWizard générique

### Structure

```
src/components/admin/import/
├── ImportWizard.tsx          # Wizard (stepper + navigation)
├── UploadStep.tsx            # Drop zone + parsing CSV
├── MappingStep.tsx           # UI mapping colonnes → champs
├── PreviewStep.tsx           # Table preview avec badges erreur/ok
└── types.ts                  # Types partagés
```

### API

```tsx
<ImportWizard
  title="Import des rôles"
  fields={[
    { id: 'category_name', label: 'Nom catégorie', required: true },
    { id: 'role_name', label: 'Nom du rôle', required: true },
  ]}
  groupBy="category_name"
  validate={(rows) => validateRoles(rows)}
  onImport={(rows) => importRoles(rows)}
  templateFileName="roles-template.csv"
/>
```

### Mutualisé par le wizard
- Parsing CSV (séparateur, encodage)
- Drag & drop + click upload
- UI mapping colonnes
- Navigation steps
- Table preview avec statut par ligne
- Barre de progression
- Download template CSV

### Spécifique par page
- Définition des champs
- Validation métier (doublons, hiérarchie)
- Logique d'import (appels Supabase)
- Post-import (navigation, toast)

**Résultat** : 4 pages de 800-2000 LOC → ~100-200 LOC chacune. Wizard ~500 LOC. Total ~1100 au lieu de ~4800.

---

## 3. Décomposition des gros composants

State dans le parent, sous-composants par props. Pas de nouveau contexte.

### EoImportDialog.tsx (1392 → ~4 fichiers)
```
eo-import/
├── EoImportDialog.tsx         # Shell + state (~200)
├── EoUploadStep.tsx           # Upload spécifique EO (~200)
├── EoMappingStep.tsx          # Mapping champs custom (~300)
├── EoPreviewStep.tsx          # Preview hiérarchie + anomalies (~350)
└── EoImportProgress.tsx       # Progression + résultats (~200)
```

### EoFieldFormDialog.tsx (1276 → ~3 fichiers)
```
eo-field-form/
├── EoFieldFormDialog.tsx      # Shell + form state (~250)
├── FieldTypeConfig.tsx        # Config par type (~400)
└── FieldValidationRules.tsx   # Règles validation (~300)
```

### EoCardView.tsx (1189 → ~4 fichiers)
```
eo-card/
├── EoCardView.tsx             # Layout + data fetching (~200)
├── EoCardHeader.tsx           # En-tête + actions (~250)
├── EoCardFields.tsx           # Grille champs éditables (~350)
└── EoCardRelations.tsx        # Relations + enfants (~250)
```

### WorkflowGraphEditor.tsx (1074 → ~3 fichiers)
```
workflow/
├── WorkflowGraphEditor.tsx    # Canvas XYFlow + orchestration (~350)
├── WorkflowNodePanel.tsx      # Config panel noeud (~350)
└── WorkflowToolbar.tsx        # Toolbar actions (~200)
```

### BlockConfigPanel.tsx (975 → ~3 fichiers)
```
block-config/
├── BlockConfigPanel.tsx       # Shell + tabs (~200)
├── BlockFieldsConfig.tsx      # Config champs (~350)
└── BlockPermissionsConfig.tsx # Permissions par rôle (~300)
```

---

## 4. Extraction logique métier des hooks

Fonctions pures dans `src/lib/`, hooks comme coordinateurs légers.

### useMyPendingResponses (queryFn 220 LOC)

```
src/lib/survey-responses.ts
├── filterResponsesByEoPaths(responses, eoPaths)
├── filterResponsesByRoles(responses, profileRoleIds, campaignsMap, surveysMap)
├── buildCommentStats(comments)
└── buildResponseWithDetails(response, maps...)
```

Hook passe de ~220 LOC inline à ~80 LOC.

### useCreateCampaign (mutationFn 230 LOC)

```
src/lib/campaign-creation.ts
├── buildSurveySettingsFromWorkflow(workflow, nodes, fields, permissions, sections)
├── buildValidationSteps(validationNodes, permsByNode, fieldsByNode, sectionsByNode)
└── buildRespondentFields(formNode, fieldsByNode)
```

Hook passe de ~230 LOC à ~100 LOC.

### Non touché
- Hooks simples (< 200 LOC)
- ViewModeContext (bien structuré)
- Hooks qui sont déjà de simples wrappers Supabase
