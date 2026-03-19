# Conditional Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow admins to configure conditional field visibility in the workflow form builder, so fields appear/hide based on other fields' values at runtime.

**Architecture:** Conditions are stored in `node_fields.visibility_condition` (existing JSON column). At campaign creation, they're snapshot into `surveys.settings` via `buildSurveySettingsFromWorkflow()`. A shared utility function evaluates conditions against live values at runtime. Conditions are scoped to fields within the same section.

**Tech Stack:** React, TypeScript, Supabase (Postgres JSONB), TanStack Query, shadcn/ui, Lucide icons

---

### Task 1: Create `evaluateVisibilityConditions` utility

**Files:**
- Create: `src/lib/evaluate-visibility-conditions.ts`

**Step 1: Create the utility**

```typescript
import type { FieldVisibilityCondition } from '@/components/builder/page-builder/types';

/**
 * Evaluates an array of visibility conditions against current field values.
 * Returns true if the field should be visible (all conditions met, AND logic).
 * Returns true if conditions array is empty/undefined (always visible).
 */
export function evaluateVisibilityConditions(
  conditions: FieldVisibilityCondition[] | undefined | null,
  values: Record<string, any>,
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(condition => {
    const fieldValue = values[condition.source_field_id];
    return evaluateSingleCondition(condition, fieldValue);
  });
}

function evaluateSingleCondition(
  condition: FieldVisibilityCondition,
  fieldValue: any,
): boolean {
  const { operator, value: conditionValue } = condition;

  switch (operator) {
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'equals':
      return String(fieldValue) === String(conditionValue);
    case 'not_equals':
      return String(fieldValue) !== String(conditionValue);
    case 'contains':
      return typeof fieldValue === 'string' && typeof conditionValue === 'string'
        && fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue);
    case 'less_than':
      return Number(fieldValue) < Number(conditionValue);
    case 'greater_or_equal':
      return Number(fieldValue) >= Number(conditionValue);
    case 'less_or_equal':
      return Number(fieldValue) <= Number(conditionValue);
    default:
      return true;
  }
}
```

**Step 2: Commit**

```
feat: add evaluateVisibilityConditions utility
```

---

### Task 2: Add `visibility_conditions` to campaign-creation sync

**Files:**
- Modify: `src/lib/campaign-creation.ts` (lines 67-76, 94-103, 164-173, 207-216)

**Step 1: Add `visibility_conditions` to `RespondentField` type**

In the `RespondentField` interface (line 67), add:
```typescript
visibility_conditions?: Array<{
  source_field_id: string;
  source_field_name?: string;
  operator: string;
  value?: string | number;
}>;
```

**Step 2: Add `visibility_conditions` to `ValidationStep.fields` type**

In the `ValidationStep` interface, the `fields` array item type (line 94), add:
```typescript
visibility_conditions?: Array<{
  source_field_id: string;
  source_field_name?: string;
  operator: string;
  value?: string | number;
}>;
```

**Step 3: Map `visibility_condition` in `buildRespondentFieldsFromNode`**

In `buildRespondentFieldsFromNode` (line 164), add to the mapped object:
```typescript
visibility_conditions: f.visibility_condition
  ? (f.visibility_condition as any).conditions || []
  : undefined,
```

**Step 4: Map `visibility_condition` in `buildValidationStepsFromNodes`**

In `buildValidationStepsFromNodes` (line 207), add the same mapping to the `fields` array:
```typescript
visibility_conditions: f.visibility_condition
  ? (f.visibility_condition as any).conditions || []
  : undefined,
```

**Step 5: Commit**

```
feat: include visibility_conditions in campaign settings snapshot
```

---

### Task 3: Create `VisibilityConditionDialog` component

**Files:**
- Create: `src/components/admin/workflows/form-builder/VisibilityConditionDialog.tsx`

This is a dialog for editing conditions on a single field. It receives:
- The current field's `visibility_condition` JSON
- The list of other fields in the same section (for the source field dropdown)
- A callback to save the updated conditions

**Step 1: Create the component**

The dialog structure:
- Title: "Conditions de visibilité"
- List of condition rows, each with:
  - Source field: `<Select>` of other fields in the section
  - Operator: `<Select>` adapted to the source field's type (reuse `getOperatorsForFieldType` pattern from `CreateFormConfigDialog.tsx:78-88`)
  - Value: adapted input (hidden for is_empty/is_not_empty, Select for referential fields, checkbox toggle for boolean, Input for text/number)
  - Delete button (X icon)
- "Ajouter une condition" button at bottom
- Footer: Cancel + Save

Key imports to reuse:
- `OPERATOR_LABELS`, `getOperatorsForFieldType`, `needsValueInput` — extract from `CreateFormConfigDialog.tsx` or redefine locally
- `FieldVisibilityCondition` type from `src/components/builder/page-builder/types.ts`

For select/multiselect source fields, fetch referential values via:
```typescript
const { data: refValues } = useQuery({
  queryKey: ['referential_values', referentialId],
  queryFn: async () => {
    const { data } = await supabase
      .from('referential_values')
      .select('id, label, code')
      .eq('referential_id', referentialId)
      .eq('is_active', true)
      .order('display_order');
    return data || [];
  },
  enabled: !!referentialId,
  staleTime: 5 * 60 * 1000,
});
```

Props interface:
```typescript
interface VisibilityConditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName: string;
  conditions: FieldVisibilityCondition[];
  sectionFields: Array<{
    id: string;           // field_definition_id
    name: string;
    field_type: string;
    referential_id?: string | null;
  }>;
  onSave: (conditions: FieldVisibilityCondition[]) => void;
}
```

**Step 2: Commit**

```
feat: add VisibilityConditionDialog component
```

---

### Task 4: Integrate condition editor in FormCanvas

**Files:**
- Modify: `src/components/admin/workflows/form-builder/FormCanvas.tsx`

**Step 1: Add the condition icon button to `FIELD_GRID`**

Update the grid template (line 52) to add a 24px column for the condition button, between the required toggle (col 8) and the delete button (col 9):

```typescript
const FIELD_GRID = 'grid grid-cols-[16px_16px_1fr_72px_52px_32px_24px_24px_24px_24px] items-center gap-x-1.5';
```

**Step 2: Add condition button to `SortableFieldItem`**

Add a new prop `onEditConditions: () => void` and `conditionCount: number`.

Between the required toggle and the delete button, add:
```tsx
<button
  onClick={onEditConditions}
  title="Conditions de visibilité"
  className={cn(
    'w-6 h-6 flex items-center justify-center rounded border transition-colors relative',
    conditionCount > 0
      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
      : 'bg-muted text-muted-foreground/40 border-transparent',
  )}
>
  <GitBranch className="h-3.5 w-3.5" />
  {conditionCount > 0 && (
    <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
      {conditionCount}
    </span>
  )}
</button>
```

Import `GitBranch` from lucide-react.

**Step 3: Add a column header placeholder in `FieldColumnHeaders`**

Add `<span />` for the new column (no section toggle needed for conditions — they're per-field only).

**Step 4: Add handler + state in `FormCanvas`**

Add state for the dialog:
```typescript
const [conditionDialogConfig, setConditionDialogConfig] = useState<{
  config: NodeFieldConfig;
  sectionId: string;
} | null>(null);
```

Handler to save conditions:
```typescript
const handleSaveConditions = (configId: string, conditions: FieldVisibilityCondition[]) => {
  onFieldConfigsChange(
    fieldConfigs.map(c =>
      c.id === configId
        ? {
            ...c,
            visibility_condition: conditions.length > 0
              ? { conditions }
              : null,
          }
        : c,
    ),
  );
  setConditionDialogConfig(null);
};
```

**Step 5: Pass through `SortableSectionCard`**

Add `onEditConditions: (config: NodeFieldConfig) => void` prop to `SortableSectionCard`.
Pass to `SortableFieldItem`:
```tsx
onEditConditions={() => onEditConditions(config)}
conditionCount={((config.visibility_condition as any)?.conditions?.length) || 0}
```

**Step 6: Render the dialog in `FormCanvas`**

At the bottom of FormCanvas's return, add:
```tsx
{conditionDialogConfig && (
  <VisibilityConditionDialog
    open={!!conditionDialogConfig}
    onOpenChange={(open) => { if (!open) setConditionDialogConfig(null); }}
    fieldName={fieldDefinitions.find(f => f.id === conditionDialogConfig.config.field_definition_id)?.name || ''}
    conditions={((conditionDialogConfig.config.visibility_condition as any)?.conditions) || []}
    sectionFields={
      fieldConfigs
        .filter(c => c.settings?.section_id === conditionDialogConfig.sectionId && c.id !== conditionDialogConfig.config.id)
        .map(c => {
          const fd = fieldDefinitions.find(f => f.id === c.field_definition_id);
          return fd ? { id: fd.id, name: fd.name, field_type: fd.field_type, referential_id: fd.referential_id } : null;
        })
        .filter(Boolean) as Array<{ id: string; name: string; field_type: string; referential_id?: string | null }>
    }
    onSave={(conditions) => handleSaveConditions(conditionDialogConfig.config.id, conditions)}
  />
)}
```

**Step 7: Commit**

```
feat: integrate visibility condition editor in form builder
```

---

### Task 5: Integrate conditions in `SurveyResponseFullPage`

**Files:**
- Modify: `src/components/user/views/SurveyResponseFullPage.tsx`

**Step 1: Import the utility**

```typescript
import { evaluateVisibilityConditions } from '@/lib/evaluate-visibility-conditions';
```

**Step 2: Add `visibility_conditions` to the `visibleFields` derived data**

In the `visibleFields` useMemo (around line 201-235), add `visibility_conditions` to the mapped output:
```typescript
visibility_conditions: sf.visibility_conditions,
```

**Step 3: Filter `activeSectionFields` using conditions**

After `activeSectionFields` is computed (line 601-603), add a derived memo:
```typescript
const conditionallyVisibleFields = useMemo(() => {
  return activeSectionFields.filter(field =>
    evaluateVisibilityConditions(field.visibility_conditions, values)
  );
}, [activeSectionFields, values]);
```

Replace `activeSectionFields` with `conditionallyVisibleFields` in the render (line 855):
```tsx
{conditionallyVisibleFields.map(renderFieldRow)}
```

Also update required field validation: when checking if all required fields are filled before submit, skip hidden conditional fields. Find the submit validation logic and add the condition check.

**Step 4: Commit**

```
feat: evaluate conditional field visibility in survey response form
```

---

### Task 6: Integrate conditions in `CampaignDetailPage` grid

**Files:**
- Modify: `src/hooks/useCampaignFieldColumns.ts`
- Modify: `src/pages/user/CampaignDetailPage.tsx`
- Modify: `src/components/user/views/InlineEditableCell.tsx`

**Step 1: Add `visibility_conditions` to `CampaignFieldColumn`**

In `useCampaignFieldColumns.ts`, add to the interface (line 5-14):
```typescript
visibility_conditions?: Array<{
  source_field_id: string;
  operator: string;
  value?: string | number;
}>;
```

**Step 2: Include `visibility_conditions` when building columns**

In the column-building loop (lines 106-120), add:
```typescript
visibility_conditions: sf.visibility_conditions,
```

`sf` is the `StepFieldConfig` which already has `visibility_conditions` on the type.

**Step 3: Add `isHiddenByCondition` prop to `InlineEditableCell`**

In `InlineEditableCell.tsx`, add a new prop:
```typescript
interface InlineEditableCellProps {
  column: CampaignFieldColumn;
  value: any;
  isEditable: boolean;
  isHiddenByCondition?: boolean;  // NEW
  onSave: (newValue: any) => void;
}
```

At the top of the component, if hidden:
```typescript
if (isHiddenByCondition) {
  return <span className="text-sm text-muted-foreground/40">-</span>;
}
```

**Step 4: Evaluate conditions per cell in `CampaignDetailPage`**

Import the utility:
```typescript
import { evaluateVisibilityConditions } from '@/lib/evaluate-visibility-conditions';
```

In the cell rendering loop (line 276-296), compute visibility:
```tsx
{fieldData?.columns.map(col => {
  const isResponseEditable = ['pending', 'in_progress', 'rejected'].includes(response.status) && col.visibility === 'visible';
  const isHiddenByCondition = !evaluateVisibilityConditions(
    col.visibility_conditions,
    fieldValues || {},
  );
  return (
    <TableCell key={col.field_id} ...>
      <InlineEditableCell
        column={col}
        value={fieldValues?.[col.field_id]}
        isEditable={isResponseEditable && !isHiddenByCondition}
        isHiddenByCondition={isHiddenByCondition}
        onSave={...}
      />
    </TableCell>
  );
})}
```

Also update the required field validation for the "Soumettre" button (lines 310-316): skip fields hidden by conditions.

```typescript
const missingCount = requiredCols.filter(c => {
  // Skip fields hidden by conditions
  const hidden = !evaluateVisibilityConditions(c.visibility_conditions, fieldValues || {});
  if (hidden) return false;
  const v = fieldValues?.[c.field_id];
  return v === null || v === undefined || v === '';
}).length;
```

**Step 5: Commit**

```
feat: evaluate conditional field visibility in campaign grid
```
