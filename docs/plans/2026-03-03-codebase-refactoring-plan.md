# Codebase Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve development velocity by reducing structural complexity across the codebase — code splitting, shared import wizard, component decomposition, and hook logic extraction.

**Architecture:** 4 independent phases executed in order. Each phase is mergeable independently. No behavior changes — pure refactoring. The app should look and work identically after each phase.

**Tech Stack:** React 18, Vite, React Router 6, TanStack React Query, Supabase, TypeScript

---

## Phase 1: Code Splitting

### Task 1.1: Create LoadingSpinner component

**Files:**
- Create: `src/components/ui/loading-spinner.tsx`

**Step 1: Create the spinner component**

```tsx
import { Loader2 } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/loading-spinner.tsx
git commit -m "feat: add LoadingSpinner component for lazy-loaded routes"
```

---

### Task 1.2: Convert App.tsx to lazy-loaded routes

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace all static page imports with React.lazy**

Replace lines 1-50 of `App.tsx`. Keep static imports for layout components (`DashboardLayout`, `DashboardRedirect`, `AdminRouteGuard`, `ClientRouteGuard`, `LegacyRedirect`, `NotFound`) and providers (`Toaster`, `Sonner`, `TooltipProvider`, `QueryClient`, `AuthProvider`). These are used on every page load and must not be lazy.

Convert every page import to lazy:

```tsx
import { lazy, Suspense } from 'react';

// Lazy-loaded pages — Auth
const Auth = lazy(() => import('./pages/Auth'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Lazy-loaded pages — Admin platform
const AdminClientsPage = lazy(() => import('./pages/admin/AdminClientsPage'));
const AdminIntegratorsPage = lazy(() => import('./pages/admin/AdminIntegratorsPage'));

// Lazy-loaded pages — Entities
const EntitiesPage = lazy(() => import('./pages/admin/EntitiesPage'));
const EoImportPage = lazy(() => import('./pages/admin/EoImportPage'));
const EoFieldsPage = lazy(() => import('./pages/admin/EoFieldsPage'));
const EoHistoryPage = lazy(() => import('./pages/admin/EoHistoryPage'));
const EntityCreatePage = lazy(() => import('./pages/admin/EntityCreatePage'));

// Lazy-loaded pages — Users
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const UsersImportPage = lazy(() => import('./pages/admin/UsersImportPage'));
const UserFieldsPage = lazy(() => import('./pages/admin/UserFieldsPage'));

// Lazy-loaded pages — Referentials
const ReferentialsPage = lazy(() => import('./pages/admin/ReferentialsPage'));
const ReferentialsImportPage = lazy(() => import('./pages/admin/ReferentialsImportPage'));
const ReferentialsArchivedPage = lazy(() => import('./pages/admin/ReferentialsArchivedPage'));

// Lazy-loaded pages — Roles
const RolesPage = lazy(() => import('./pages/admin/RolesPage'));
const RolesImportPage = lazy(() => import('./pages/admin/RolesImportPage'));
const RolesArchivedPage = lazy(() => import('./pages/admin/RolesArchivedPage'));

// Lazy-loaded pages — Business Objects
const BusinessObjectsPage = lazy(() => import('./pages/admin/BusinessObjectsPage'));
const BusinessObjectDetailPage = lazy(() => import('./pages/admin/BusinessObjectDetailPage'));
const BusinessObjectStructurePage = lazy(() => import('./pages/admin/BusinessObjectStructurePage'));
const BusinessObjectsImportPage = lazy(() => import('./pages/admin/BusinessObjectsImportPage'));
const BusinessObjectInstancesImportPage = lazy(() => import('./pages/admin/BusinessObjectInstancesImportPage'));
const BusinessObjectsArchivedPage = lazy(() => import('./pages/admin/BusinessObjectsArchivedPage'));

// Lazy-loaded pages — Modules
const ModulesPage = lazy(() => import('./pages/admin/ModulesPage'));
const ModulePermissionsPage = lazy(() => import('./pages/admin/ModulePermissionsPage'));

// Lazy-loaded pages — Workflows
const WorkflowsPage = lazy(() => import('./pages/admin/WorkflowsPage'));
const WorkflowDetailPage = lazy(() => import('./pages/admin/WorkflowDetailPage'));

// Lazy-loaded pages — User Final
const DynamicViewPage = lazy(() => import('./pages/user/DynamicViewPage'));
const SurveyEditorPage = lazy(() => import('./pages/user/SurveyEditorPage'));
const ProfileManagementPage = lazy(() => import('./pages/user/ProfileManagementPage'));
const SettingsPage = lazy(() => import('./pages/user/SettingsPage'));
const CampaignDetailPage = lazy(() => import('./pages/user/CampaignDetailPage'));
```

**Step 2: Wrap Routes in Suspense**

Wrap the `<Routes>` block with `<Suspense>`:

```tsx
import { LoadingSpinner } from './components/ui/loading-spinner';

// Inside the App component, wrap <Routes>:
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    {/* ... all routes unchanged ... */}
  </Routes>
</Suspense>
```

**Step 3: Verify all pages still have default exports**

Each lazy-loaded page must have `export default`. Scan all page files to confirm. If any uses named exports only, add a default export.

**Step 4: Test manually**

- Start dev server
- Navigate to each route group (auth, admin, entities, users, referentials, roles, business-objects, modules, workflows, user)
- Verify the loading spinner appears briefly then the page renders
- Check browser Network tab: JS chunks should load on navigation, not upfront

**Step 5: Commit**

```bash
git add src/App.tsx src/components/ui/loading-spinner.tsx
git commit -m "feat: add route-based code splitting with React.lazy"
```

---

## Phase 2: ImportWizard Generic Component

### Task 2.1: Create shared types and CSV parser

**Files:**
- Create: `src/components/admin/import/types.ts`
- Create: `src/lib/csv-parser.ts`

**Step 1: Define shared types**

```tsx
// src/components/admin/import/types.ts
export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

export interface ImportFieldDefinition {
  id: string;
  label: string;
  required: boolean;
}

export interface FieldMapping {
  [csvColumn: string]: string; // csvColumn → fieldId
}

export interface ParsedRow {
  [key: string]: string;
}

export interface ParsedCSV {
  headers: string[];
  rows: ParsedRow[];
}

export interface PreviewRow {
  data: Record<string, string>;
  hasError: boolean;
  errorMessage?: string;
  /** Optional group key for nested preview (e.g. category name, referential name) */
  groupKey?: string;
}

export interface ImportProgress {
  current: number;
  total: number;
}

export interface ImportWizardConfig {
  title: string;
  /** Back navigation path */
  backPath: string;
  /** Field definitions for mapping step */
  fields: ImportFieldDefinition[];
  /** Template CSV file name for download */
  templateFileName?: string;
  /** Generate template CSV content based on fields */
  templateContent?: () => string;
  /** Auto-mapping: attempt to match CSV headers to field IDs */
  autoMap?: (headers: string[]) => FieldMapping;
  /** Transform parsed+mapped rows into preview rows */
  buildPreview: (rows: ParsedRow[], mapping: FieldMapping) => PreviewRow[];
  /** Execute the import. Called with mapped rows. Return success count. */
  onImport: (
    rows: ParsedRow[],
    mapping: FieldMapping,
    onProgress: (progress: ImportProgress) => void,
  ) => Promise<{ successCount: number; errorCount: number }>;
  /** Render custom preview content. Receives preview rows. */
  renderPreview: (rows: PreviewRow[]) => React.ReactNode;
  /** Optional: render custom content below the upload step */
  renderUploadExtra?: () => React.ReactNode;
}
```

**Step 2: Extract CSV parser**

Extract the common CSV parsing logic used identically in all 4 import pages into a shared utility:

```tsx
// src/lib/csv-parser.ts
import type { ParsedCSV } from '@/components/admin/import/types';

/**
 * Parse CSV text with auto-detection of separator (`;` or `,`).
 * Handles quoted fields and newlines within quotes.
 */
export function parseCSV(text: string): ParsedCSV {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect separator: use the one that produces more columns in the header
  const semicolonCount = (lines[0].match(/;/g) || []).length;
  const commaCount = (lines[0].match(/,/g) || []).length;
  const separator = semicolonCount > commaCount ? ';' : ',';

  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });

  return { headers, rows };
}

/**
 * Generate a CSV template string from field definitions.
 */
export function generateTemplate(fields: { id: string; label: string }[], separator = ';'): string {
  return fields.map(f => f.label).join(separator) + '\n';
}
```

**Step 3: Commit**

```bash
git add src/components/admin/import/types.ts src/lib/csv-parser.ts
git commit -m "feat: add shared CSV parser and import wizard types"
```

---

### Task 2.2: Create UploadStep component

**Files:**
- Create: `src/components/admin/import/UploadStep.tsx`

**Step 1: Implement UploadStep**

Extract the common upload/drop-zone UI used in all 4 import pages. This handles:
- Drag & drop file area
- Click to browse
- File type validation (.csv, .txt)
- Read file content and parse with `parseCSV()`
- Display file name + row count after upload
- Template download button

Reference: `EoImportPage.tsx` lines 649-668, `RolesImportPage.tsx` lines 657-663 — all use the same pattern with Upload/FileSpreadsheet icons, drag handlers, and file input ref.

```tsx
// Key props:
interface UploadStepProps {
  onFileLoaded: (parsed: ParsedCSV) => void;
  templateContent?: () => string;
  templateFileName?: string;
  renderExtra?: () => React.ReactNode;
}
```

The component should use the common drag-and-drop pattern from the existing pages: `useRef<HTMLInputElement>`, `onDragOver`/`onDragLeave`/`onDrop` handlers, `isDragging` state, FileReader with `readAsText`.

**Step 2: Commit**

```bash
git add src/components/admin/import/UploadStep.tsx
git commit -m "feat: add UploadStep component for import wizard"
```

---

### Task 2.3: Create MappingStep component

**Files:**
- Create: `src/components/admin/import/MappingStep.tsx`

**Step 1: Implement MappingStep**

Extract the common mapping UI. All 4 import pages display a table with:
- Column 1: CSV column name
- Column 2: Select dropdown to pick target field
- Column 3: Preview of first row value

Reference: `RolesImportPage.tsx` lines 666-745, `BusinessObjectsImportPage.tsx` lines 658-730 — identical pattern.

```tsx
interface MappingStepProps {
  csvHeaders: string[];
  csvData: ParsedRow[];
  fields: ImportFieldDefinition[];
  mapping: FieldMapping;
  onMappingChange: (mapping: FieldMapping) => void;
  /** Whether all required fields are mapped */
  canProceed: boolean;
}
```

Include the "N lignes détectées" badge, the mapping table with Select components, and prev/next buttons.

**Step 2: Commit**

```bash
git add src/components/admin/import/MappingStep.tsx
git commit -m "feat: add MappingStep component for import wizard"
```

---

### Task 2.4: Create PreviewStep and ImportWizard shell

**Files:**
- Create: `src/components/admin/import/PreviewStep.tsx`
- Create: `src/components/admin/import/ImportWizard.tsx`

**Step 1: Implement PreviewStep**

The preview step shows:
- Stats cards (total, valid, errors)
- Error alert if any rows have errors
- Custom preview content (provided via `renderPreview` prop — each import page renders its own specific preview: tree, collapsible sections, etc.)
- Import button + progress bar when importing

```tsx
interface PreviewStepProps {
  rows: PreviewRow[];
  isImporting: boolean;
  importProgress: ImportProgress;
  onImport: () => void;
  renderPreview: (rows: PreviewRow[]) => React.ReactNode;
}
```

**Step 2: Implement ImportWizard shell**

The wizard orchestrates the steps:

```tsx
export function ImportWizard({ config }: { config: ImportWizardConfig }) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });

  // Step navigation, auto-mapping on file load, preview building on mapping complete
  // Back button navigates to config.backPath

  return (
    <div>
      <PageHeader title={config.title} backPath={config.backPath} />
      {step === 'upload' && <UploadStep ... />}
      {step === 'mapping' && <MappingStep ... />}
      {(step === 'preview' || step === 'importing') && <PreviewStep ... />}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/admin/import/PreviewStep.tsx src/components/admin/import/ImportWizard.tsx
git commit -m "feat: add PreviewStep and ImportWizard shell"
```

---

### Task 2.5: Migrate RolesImportPage to ImportWizard

**Files:**
- Modify: `src/pages/admin/RolesImportPage.tsx`

**Why Roles first:** It's the simplest import page (980 LOC, 2-level hierarchy, no cycle detection).

**Step 1: Extract roles-specific logic**

Keep in the page file:
- `CSV_COLUMNS` definition → becomes `fields` prop
- `buildCategories()` → becomes the `buildPreview` callback
- `handleImport()` → becomes the `onImport` callback
- Auto-mapping logic → becomes the `autoMap` callback
- Collapsible categories preview JSX → becomes the `renderPreview` callback

**Step 2: Rewrite the page using ImportWizard**

The page should shrink from ~980 LOC to ~150-200 LOC: the ImportWizard config + the domain-specific functions above.

```tsx
export default function RolesImportPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: existingCategories = [] } = useRoleCategories();

  const config: ImportWizardConfig = {
    title: `Import des rôles — ${selectedClient?.name}`,
    backPath: cp('/roles'),
    fields: [ /* CSV_COLUMNS converted */ ],
    autoMap: (headers) => { /* existing auto-mapping logic */ },
    buildPreview: (rows, mapping) => { /* existing buildCategories logic */ },
    onImport: async (rows, mapping, onProgress) => { /* existing handleImport */ },
    renderPreview: (rows) => { /* existing collapsible categories JSX */ },
  };

  return <ImportWizard config={config} />;
}
```

**Step 3: Test manually**

- Navigate to Roles import page
- Upload a CSV → mapping should auto-detect
- Complete the full import flow
- Verify behavior is identical to before

**Step 4: Commit**

```bash
git add src/pages/admin/RolesImportPage.tsx
git commit -m "refactor: migrate RolesImportPage to ImportWizard"
```

---

### Task 2.6: Migrate BusinessObjectsImportPage to ImportWizard

**Files:**
- Modify: `src/pages/admin/BusinessObjectsImportPage.tsx`

Same approach as Task 2.5. Extract domain-specific logic (field type validation, object+field nesting), wire to ImportWizard. Target: ~887 LOC → ~150-200 LOC.

**Commit:**
```bash
git commit -m "refactor: migrate BusinessObjectsImportPage to ImportWizard"
```

---

### Task 2.7: Migrate ReferentialsImportPage to ImportWizard

**Files:**
- Modify: `src/pages/admin/ReferentialsImportPage.tsx`

This one is the most complex due to multi-level hierarchy with cycle detection and level-by-level import. The `buildPreview` must include `calculateLevel()` and hierarchy validation. The `onImport` must import level-by-level. The `renderPreview` uses a recursive `renderValue()` function. Target: ~1101 LOC → ~250-300 LOC.

**Commit:**
```bash
git commit -m "refactor: migrate ReferentialsImportPage to ImportWizard"
```

---

### Task 2.8: Migrate EoImportPage to ImportWizard

**Files:**
- Modify: `src/pages/admin/EoImportPage.tsx`

The largest import page (1998 LOC). Has unique features: EO hierarchy tree preview with EoTreeCanvas, field quick create form, reparent change detection, drawer for details. The `renderPreview` callback will be the largest (~400 LOC) since it includes the tree visualization. Target: ~1998 LOC → ~500-600 LOC (still the most complex but significantly reduced).

**Commit:**
```bash
git commit -m "refactor: migrate EoImportPage to ImportWizard"
```

---

## Phase 3: Component Decomposition

### Task 3.1: Decompose EoImportDialog

**Files:**
- Modify: `src/components/admin/entities/EoImportDialog.tsx` (1392 LOC)
- Create: `src/components/admin/entities/eo-import/EoImportDialog.tsx`
- Create: `src/components/admin/entities/eo-import/EoUploadStep.tsx`
- Create: `src/components/admin/entities/eo-import/EoMappingStep.tsx`
- Create: `src/components/admin/entities/eo-import/EoPreviewStep.tsx`
- Create: `src/components/admin/entities/eo-import/EoImportProgress.tsx`

**Step 1: Create sub-component files**

Split the current monolith into:
- **EoImportDialog.tsx** (~200 LOC): Dialog shell, all state, step routing. Passes state+callbacks as props.
- **EoUploadStep.tsx** (~200 LOC): DropZone + file parsing + auto-mapping (current lines 415-510)
- **EoMappingStep.tsx** (~300 LOC): Column mapping table + field selection (current mapping section)
- **EoPreviewStep.tsx** (~350 LOC): Hierarchy tree preview + anomaly badges (current preview section)
- **EoImportProgress.tsx** (~200 LOC): Progress bar + import results table (current importing section)

**Step 2: Update imports**

Update the import in the parent component that uses `EoImportDialog` to point to the new path. Search for all usages:
```
grep -r "EoImportDialog" src/ --include="*.tsx"
```
Update the import path from `./EoImportDialog` to `./eo-import/EoImportDialog`.

**Step 3: Re-export for backward compatibility**

Create a re-export at the old path if needed:
```tsx
// src/components/admin/entities/EoImportDialog.tsx
export { EoImportDialog } from './eo-import/EoImportDialog';
```

**Step 4: Test manually**

Navigate to Entities page, open the import dialog, run through all steps.

**Step 5: Commit**

```bash
git commit -m "refactor: decompose EoImportDialog into sub-components"
```

---

### Task 3.2: Decompose EoFieldFormDialog

**Files:**
- Modify: `src/components/admin/entities/EoFieldFormDialog.tsx` (1276 LOC)
- Create: `src/components/admin/entities/eo-field-form/EoFieldFormDialog.tsx`
- Create: `src/components/admin/entities/eo-field-form/FieldTypeConfig.tsx`
- Create: `src/components/admin/entities/eo-field-form/FieldValidationRules.tsx`
- Create: `src/components/admin/entities/eo-field-form/ViewSelectionStep.tsx`

Split into:
- **EoFieldFormDialog.tsx** (~250 LOC): Dialog shell, form state, submit logic
- **FieldTypeConfig.tsx** (~400 LOC): Field type selector, options editor, auto-generate settings, comment rules, format settings, boolean labels — all the per-type config UI
- **FieldValidationRules.tsx** (~300 LOC): max_length, cross-field rules, required/unique toggles
- **ViewSelectionStep.tsx** (~200 LOC): Step 2 — view selection grid with checkboxes

Update imports + re-export at old path.

**Commit:**
```bash
git commit -m "refactor: decompose EoFieldFormDialog into sub-components"
```

---

### Task 3.3: Decompose EoCardView

**Files:**
- Modify: `src/components/user/views/EoCardView.tsx` (1189 LOC)
- Create: `src/components/user/views/eo-card/EoCardView.tsx`
- Create: `src/components/user/views/eo-card/EoCardHeader.tsx`
- Create: `src/components/user/views/eo-card/EoCardFields.tsx`
- Create: `src/components/user/views/eo-card/EoCardRelations.tsx`

Split into:
- **EoCardView.tsx** (~200 LOC): Data fetching, state management, layout orchestration
- **EoCardHeader.tsx** (~250 LOC): View mode tabs (list/tree/canvas), search bar with debounce, sort controls, filter triggers
- **EoCardFields.tsx** (~350 LOC): List view table with pagination + custom columns, inline editing
- **EoCardRelations.tsx** (~250 LOC): Tree view, canvas view, entity details drawer

Update imports + re-export.

**Commit:**
```bash
git commit -m "refactor: decompose EoCardView into sub-components"
```

---

### Task 3.4: Decompose WorkflowGraphEditor

**Files:**
- Check exact path first (likely `src/components/builder/workflow/WorkflowGraphEditor.tsx` or similar)
- Create sub-components in a `workflow-editor/` subdirectory

Split into:
- **WorkflowGraphEditor.tsx** (~350 LOC): XYFlow canvas setup, node/edge state, orchestration
- **WorkflowNodePanel.tsx** (~350 LOC): Node configuration panel (fields, roles, sections)
- **WorkflowToolbar.tsx** (~200 LOC): Add node, delete node, save, layout buttons

Update imports + re-export.

**Commit:**
```bash
git commit -m "refactor: decompose WorkflowGraphEditor into sub-components"
```

---

### Task 3.5: Decompose BlockConfigPanel

**Files:**
- Modify: `src/components/builder/page-builder/BlockConfigPanel.tsx` (975 LOC)
- Create: `src/components/builder/page-builder/block-config/BlockConfigPanel.tsx`
- Create: `src/components/builder/page-builder/block-config/DataTableConfigSection.tsx`
- Create: `src/components/builder/page-builder/block-config/EoCardConfigSection.tsx`

Split into:
- **BlockConfigPanel.tsx** (~200 LOC): Shell with title input, active toggle, delete button, routes to config section by block type
- **DataTableConfigSection.tsx** (~350 LOC): BO selection, columns manager, search/filter toggles, pre-filters, page size, create button config (current `renderDataTableConfig()` lines 321-510)
- **EoCardConfigSection.tsx** (~300 LOC): View modes, list columns, field visibility, pre-filters, user filters, creation toggle, access config, import/export, history, reparenting (current `renderEoCardConfig()` lines 518-829)

Update imports + re-export.

**Commit:**
```bash
git commit -m "refactor: decompose BlockConfigPanel into sub-components"
```

---

## Phase 4: Hook Logic Extraction

### Task 4.1: Extract survey response pure functions

**Files:**
- Create: `src/lib/survey-responses.ts`
- Modify: `src/hooks/useSurveyResponses.ts`

**Step 1: Create pure functions file**

Extract from `useMyPendingResponses` queryFn (lines 234-447):

```tsx
// src/lib/survey-responses.ts

/**
 * Filter responses to keep only those whose EO path matches user's EO paths.
 * Pure function — no Supabase dependency.
 */
export function filterResponsesByEoPath(
  responses: any[],
  userEoPaths: string[],
): any[] {
  return responses.filter(r => {
    const eoPath = (r.organizational_entities as any)?.path;
    if (!eoPath) return false;
    return userEoPaths.some(userPath => eoPath === userPath || eoPath.startsWith(userPath + '.'));
  });
}

/**
 * Filter responses based on user's role permissions per status.
 * Pure function — applies role-based visibility rules.
 */
export function filterResponsesByRoles(
  responses: any[],
  profileRoleIds: string[],
  campaignsMap: Map<string, any>,
  surveysMap: Map<string, any>,
): any[] {
  // Extract lines 354-404 from useSurveyResponses.ts
  // 5 status branches: pending/in_progress/rejected, submitted, in_validation, validated
}

/**
 * Aggregate comment counts per response.
 * Pure function.
 */
export function computeResponseCommentStats(
  comments: Array<{ response_id: string; is_resolved: boolean }>,
): Map<string, { total: number; unresolved: number }> {
  // Extract lines 413-429 from useSurveyResponses.ts
}

/**
 * Build a SurveyResponseWithDetails from raw response + lookup maps.
 * Pure function.
 */
export function buildResponseWithDetails(
  response: any,
  campaignsMap: Map<string, any>,
  surveysMap: Map<string, any>,
  eosMap: Map<string, { id: string; name: string; code: string | null }>,
  commentsMap: Map<string, { total: number; unresolved: number }>,
): any {
  // Extract lines 431-446 from useSurveyResponses.ts
}
```

**Step 2: Update useMyPendingResponses**

Replace inline logic with calls to extracted functions. The hook keeps:
- `supabase.auth.getUser()` call
- All Supabase queries (EO assignments, campaign targets, responses, comments)
- Map construction
- Orchestration of the above in order

Calls `filterResponsesByEoPath()`, `filterResponsesByRoles()`, `computeResponseCommentStats()`, and `buildResponseWithDetails()` instead of inline code.

**Step 3: Verify**

Navigate to user final mode, open a view with pending responses. Verify responses display correctly with proper role filtering.

**Step 4: Commit**

```bash
git add src/lib/survey-responses.ts src/hooks/useSurveyResponses.ts
git commit -m "refactor: extract survey response pure functions from useMyPendingResponses"
```

---

### Task 4.2: Extract campaign creation pure functions

**Files:**
- Create: `src/lib/campaign-creation.ts`
- Modify: `src/hooks/useSurveyCampaigns.ts`

**Step 1: Create pure functions file**

Extract from `useCreateCampaign` mutationFn (lines 218-445):

```tsx
// src/lib/campaign-creation.ts

/**
 * Group node fields, role permissions, and sections by node ID.
 * Pure function.
 */
export function extractWorkflowStructure(
  allNodeFields: any[],
  allRolePerms: any[],
  allNodeSections: any[],
): {
  fieldsByNode: Map<string, any[]>;
  permsByNode: Map<string, any[]>;
  sectionsByNode: Map<string, any[]>;
} {
  // Extract lines 273-292 from useSurveyCampaigns.ts
}

/**
 * Build respondent form fields from the "start" workflow node.
 * Pure function.
 */
export function buildRespondentFieldsFromNode(
  formNode: any,
  fieldsByNode: Map<string, any[]>,
): any[] {
  // Extract lines 296-307 from useSurveyCampaigns.ts
}

/**
 * Build validation steps from "validation" workflow nodes.
 * Pure function.
 */
export function buildValidationStepsFromNodes(
  validationNodes: any[],
  permsByNode: Map<string, any[]>,
  fieldsByNode: Map<string, any[]>,
  sectionsByNode: Map<string, any[]>,
): any[] {
  // Extract lines 317-355 from useSurveyCampaigns.ts
}

/**
 * Build complete survey settings from workflow data.
 * Pure function — composes the above helpers.
 */
export function buildSurveySettingsFromWorkflow(
  workflowId: string,
  boDefinitionId: string | null,
  workflowNodes: any[],
  allNodeFields: any[],
  allRolePerms: any[],
  allNodeSections: any[],
): Record<string, any> {
  // Compose: extractWorkflowStructure + buildRespondentFieldsFromNode + buildValidationStepsFromNodes
  // Returns the surveySettings object (lines 367-375)
}
```

**Step 2: Update useCreateCampaign**

Replace lines 272-375 of the mutationFn with a single call to `buildSurveySettingsFromWorkflow()`. The hook keeps:
- Auth check
- Supabase queries (workflow, nodes, fields, permissions, sections)
- Supabase inserts (survey, campaign, targets)
- Edge function invocation (launch-campaign)
- Query invalidation

**Step 3: Verify**

Create a new campaign from a workflow. Verify the survey is created with correct settings (validation steps, respondent fields, sections).

**Step 4: Commit**

```bash
git add src/lib/campaign-creation.ts src/hooks/useSurveyCampaigns.ts
git commit -m "refactor: extract campaign creation pure functions from useCreateCampaign"
```

---

## Verification Checklist

After all 4 phases, verify:

- [ ] App loads and displays the loading spinner during route transitions
- [ ] Network tab shows separate JS chunks loading on navigation
- [ ] All 4 import pages (EO, Roles, Referentials, BO) work end-to-end
- [ ] EO import dialog works from the Entities page
- [ ] EO field creation/editing dialog works
- [ ] EO card view displays correctly in list/tree/canvas modes
- [ ] Workflow editor loads and saves correctly
- [ ] Block config panel works for data_table and eo_card block types
- [ ] Campaign creation from workflow works
- [ ] User final mode shows pending responses with correct role filtering
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
