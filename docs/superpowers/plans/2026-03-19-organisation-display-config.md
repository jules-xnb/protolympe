# Organisation Display Config — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 corrections to the Organisation module's display configuration: remove admin back link, add General tab, fix system fields in drawer, make pre-filters adaptive, and add search to all selectors.

**Architecture:** Each task is independent — no cross-dependencies. Tasks 1-4 modify existing files. Task 5 creates a new reusable `SearchableSelect` component, then updates the field type selector and pre-filter selectors to use it.

**Tech Stack:** React, Shadcn UI, cmdk (already installed), @dnd-kit, Drizzle ORM

---

## File Map

| Task | Files |
|------|-------|
| 1 — Navigation | Modify: `src/components/admin/modules/ModuleConfigSidebar.tsx` |
| 2 — General tab | Modify: `src/lib/module-display-fields.ts`, `src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx` |
| 3 — Drawer system fields | Modify: `src/lib/module-display-fields.ts`, `src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx` |
| 4 — Pre-filters | Modify: `src/lib/module-display-fields.ts`, `src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx` |
| 5 — SearchableSelect | Create: `src/components/ui/searchable-select.tsx`. Modify: `src/components/admin/business-objects/field-form/FieldTypeSelector.tsx` |

---

### Task 1: Remove "Retour navigation" from module sidebar

**Files:**
- Modify: `src/components/admin/modules/ModuleConfigSidebar.tsx:61-76`

- [ ] **Step 1: Remove the back link block and its separator**

In `ModuleConfigSidebar.tsx`, delete lines 61-76 (the `{/* Back link */}` SidebarMenuItem and the SidebarSeparator below it).

Remove unused imports: `ArrowLeft`, `NavLink` (if no longer used — check `navSections` still uses `NavLink`). Keep `NavLink` since it's used in the navigation links below. Remove `ArrowLeft` only.

Remove the `backPath` variable (line 32).

- [ ] **Step 2: Verify the sidebar renders correctly**

Run: `npm run dev` and navigate to a module config page. Confirm:
- No "Retour navigation" button
- Module name header is the first item
- All section links (Affichage, Rôles, Permissions) still work

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/modules/ModuleConfigSidebar.tsx
git commit -m "fix: remove admin back link from module sidebar"
```

---

### Task 2: Add "Général" tab with FO page name

**Files:**
- Modify: `src/lib/module-display-fields.ts:22` (DisplayTab type)
- Modify: `src/lib/module-display-fields.ts:75-94` (MODULE_DISPLAY_DEFINITIONS — add 'general' to all modules' tabs as first element)
- Modify: `src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx:99,697-721,723-730`

- [ ] **Step 1: Add 'general' to the DisplayTab type**

In `module-display-fields.ts` line 22, add `'general'` to the union:
```typescript
export type DisplayTab = 'general' | 'views' | 'columns' | 'drawer' | 'filters' | 'prefilters' | 'anonymization' | 'gestionnaire' | 'repondant';
```

- [ ] **Step 2: Add 'general' as first tab in all module definitions**

In `MODULE_DISPLAY_DEFINITIONS`, prepend `'general'` to the `tabs` array of each module:
```typescript
organisation: {
    fields: ORGANISATION_FIELDS,
    tabs: ['general', 'views', 'columns', 'drawer', 'filters', 'prefilters'],
    ...
},
user: {
    fields: USER_FIELDS,
    tabs: ['general', 'columns', 'drawer', 'filters', 'anonymization'],
},
profils: {
    fields: PROFILS_FIELDS,
    tabs: ['general', 'columns', 'drawer'],
},
collecte_valeur: {
    fields: [],
    tabs: ['general', 'gestionnaire', 'repondant'],
},
```

- [ ] **Step 3: Add 'Général' to TAB_LABELS**

In `ModuleDisplayConfigEditPage.tsx`, add to TAB_LABELS:
```typescript
const TAB_LABELS: Record<DisplayTab, string> = {
  general: 'Général',
  views: 'Vues',
  ...
};
```

- [ ] **Step 4: Remove the config name input above tabs**

Delete lines 713-721 (the `<div className="flex items-center gap-3 max-w-sm">` block with the name Label + Input).

- [ ] **Step 5: Add the General tab content**

Add before the `{/* Tab: Vues */}` block:
```tsx
{/* Tab: Général */}
{tabs.includes('general') && (
  <TabsContent value="general" className="space-y-6 pt-4">
    <div className="space-y-2 max-w-md">
      <Label className="text-base font-medium">Nom de la page (utilisateur final)</Label>
      <p className="text-sm text-muted-foreground">
        Ce nom sera affiché comme titre de la page pour les utilisateurs finaux.
      </p>
      <Input
        value={configName}
        onChange={(e) => setConfigName(e.target.value)}
        onBlur={saveConfigName}
        placeholder="Nom de la configuration"
      />
    </div>
  </TabsContent>
)}
```

- [ ] **Step 6: Verify**

Run the app. Confirm:
- "Général" is the first tab
- The name input is inside the Général tab
- The name no longer appears above the tabs
- All modules show the Général tab

- [ ] **Step 7: Commit**

```bash
git add src/lib/module-display-fields.ts src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx
git commit -m "feat: add General tab in display config with FO page name"
```

---

### Task 3: Drawer system fields — Nom, Parent, Niveau always active

**Files:**
- Modify: `src/lib/module-display-fields.ts:229` (SYSTEM_FIELD_IDS — add 'level')
- Modify: `src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx:808-836` (system fields table)

- [ ] **Step 1: Add 'level' to system field IDs**

In `module-display-fields.ts`, update the SYSTEM_FIELD_IDS in `buildDefaultConfig`:
```typescript
const SYSTEM_FIELD_IDS = ['name', 'parent', 'level', 'is_active'];
```

Also update in `mergeWithDefaults` (line 270):
```typescript
const SYSTEM_FIELD_IDS = ['name', 'parent', 'level', 'is_active'];
```

- [ ] **Step 2: Update system fields rendering — lock Nom, Parent, Niveau**

In `ModuleDisplayConfigEditPage.tsx`, replace the system fields table body (lines 819-835) with logic that differentiates locked fields from toggleable ones:

```tsx
<TableBody>
  {(localConfig.drawer_system_fields ?? []).map((field) => {
    const isLocked = ['name', 'parent', 'level'].includes(field.field_id);
    return (
      <TableRow key={field.field_id}>
        <TableCell className="font-medium">
          {field.field_name}
          {field.field_id === 'level' && (
            <span className="ml-2 text-xs text-muted-foreground">(lecture seule)</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <div className="flex justify-center">
            {isLocked ? (
              <Switch checked disabled />
            ) : (
              <Switch checked={field.visible} onCheckedChange={() => toggleSystemFieldVisible(field.field_id)} />
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex justify-center">
            {isLocked ? (
              <Switch checked disabled />
            ) : (
              <Switch checked={field.editable} disabled={!field.visible} onCheckedChange={() => toggleSystemFieldEditable(field.field_id)} />
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>
```

- [ ] **Step 3: Ensure correct order in defaults**

In `buildDefaultConfig`, ensure system fields are built in order: name, parent, level, is_active. The current `filter` preserves source order from `ORGANISATION_FIELDS`, but `level` comes after `is_active` in that array. Fix by sorting:

```typescript
const SYSTEM_FIELD_ORDER = ['name', 'parent', 'level', 'is_active'];
const systemFields = SYSTEM_FIELD_ORDER
  .map(id => def.fields.find(f => f.id === id))
  .filter((f): f is ModuleField => f !== undefined);
```

- [ ] **Step 4: Verify**

Run the app. Confirm:
- Drawer system fields show: Nom, Parent, Niveau, Est actif (in that order)
- Nom, Parent, Niveau toggles are disabled (always ON)
- Niveau shows "(lecture seule)"
- Est actif toggles still work
- Niveau no longer appears in unassigned fields

- [ ] **Step 5: Commit**

```bash
git add src/lib/module-display-fields.ts src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx
git commit -m "fix: make Nom, Parent, Niveau always active in drawer system fields"
```

---

### Task 4: Adaptive pre-filters with AND/OR

**Files:**
- Modify: `src/lib/module-display-fields.ts:122-128` (Prefilter interface — extend operators, add prefilter_logic)
- Modify: `src/lib/module-display-fields.ts:165-179` (DisplayConfigData — add prefilter_logic)
- Modify: `src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx:91-97,1145-1231` (operator labels, prefilter UI)

- [ ] **Step 1: Extend the Prefilter type and DisplayConfigData**

In `module-display-fields.ts`, update:

```typescript
export interface Prefilter {
  field_id: string;
  field_name: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'before' | 'after' | 'is_empty' | 'is_not_empty';
  value?: string;
  value2?: string; // for 'between' operator
  is_user_editable: boolean;
}
```

Add `prefilter_logic` to `DisplayConfigData`:
```typescript
export interface DisplayConfigData {
  // ... existing fields ...
  prefilter_logic?: 'and' | 'or';
}
```

In `mergeWithDefaults`, add:
```typescript
prefilter_logic: (raw.prefilter_logic as 'and' | 'or') ?? 'and',
```

- [ ] **Step 2: Define operator sets per field type category**

In `ModuleDisplayConfigEditPage.tsx`, add a helper above the component:

```typescript
type FieldCategory = 'text' | 'number' | 'boolean' | 'select' | 'date' | 'reference' | 'other';

function getFieldCategory(fieldId: string, moduleFields: ModuleField[]): FieldCategory {
  // For organisation module, map known field IDs to categories
  const field = moduleFields.find(f => f.id === fieldId);
  if (!field) return 'text';

  // Map based on known organisation fields
  const numberFields = ['employee_count'];
  const booleanFields = ['is_active'];
  const selectFields = ['country'];
  const dateFields: string[] = [];

  if (numberFields.includes(fieldId)) return 'number';
  if (booleanFields.includes(fieldId)) return 'boolean';
  if (selectFields.includes(fieldId)) return 'select';
  if (dateFields.includes(fieldId)) return 'date';
  return 'text';
}

const OPERATORS_BY_CATEGORY: Record<FieldCategory, string[]> = {
  text: ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'is_empty', 'is_not_empty'],
  boolean: ['equals'],
  select: ['equals', 'not_equals', 'is_empty', 'is_not_empty'],
  date: ['equals', 'not_equals', 'before', 'after', 'between', 'is_empty', 'is_not_empty'],
  reference: ['equals', 'not_equals', 'is_empty', 'is_not_empty'],
  other: ['equals', 'not_equals', 'is_empty', 'is_not_empty'],
};
```

- [ ] **Step 3: Extend OPERATOR_LABELS**

```typescript
const OPERATOR_LABELS: Record<string, string> = {
  equals: 'Égal à',
  not_equals: 'Différent de',
  contains: 'Contient',
  greater_than: 'Supérieur à',
  less_than: 'Inférieur à',
  between: 'Entre',
  before: 'Avant',
  after: 'Après',
  is_empty: 'Est vide',
  is_not_empty: "N'est pas vide",
};
```

- [ ] **Step 4: Update addPrefilter to reset on field change**

Update `updatePrefilter` to reset operator and value when field changes:
```typescript
const updatePrefilter = (index: number, patch: Partial<Prefilter>) => {
  const prefilters = (localConfig.prefilters ?? []).map((pf, i) => {
    if (i !== index) return pf;
    // Reset operator and value when field changes
    if (patch.field_id && patch.field_id !== pf.field_id) {
      return { ...pf, ...patch, operator: 'equals' as const, value: '', value2: undefined };
    }
    return { ...pf, ...patch };
  });
  update({ prefilters });
};
```

- [ ] **Step 5: Add AND/OR toggle and adaptive value inputs**

Replace the prefilters tab content with:

```tsx
{/* Tab: Pré-filtres */}
{tabs.includes('prefilters') && (
  <TabsContent value="prefilters" className="pt-4">
    <div className="flex items-center justify-between mb-4">
      {(localConfig.prefilters ?? []).length >= 2 && (
        <div className="flex items-center gap-2">
          <Label className="text-sm">Opérateur logique :</Label>
          <Select
            value={localConfig.prefilter_logic ?? 'and'}
            onValueChange={(v) => update({ prefilter_logic: v as 'and' | 'or' })}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">AND</SelectItem>
              <SelectItem value="or">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <Button size="sm" variant="outline" onClick={addPrefilter}>
        Ajouter une condition <Plus className="h-4 w-4" />
      </Button>
    </div>
    {(localConfig.prefilters ?? []).length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">Aucun pré-filtre configuré.</p>
    ) : (
      <div className="space-y-2">
        {(localConfig.prefilters ?? []).map((pf, idx) => {
          const category = getFieldCategory(pf.field_id, fields);
          const availableOperators = OPERATORS_BY_CATEGORY[category];
          const hideValue = pf.operator === 'is_empty' || pf.operator === 'is_not_empty';
          const isBetween = pf.operator === 'between';
          const isBoolean = category === 'boolean';
          const isDate = category === 'date';
          const isNumber = category === 'number';

          return (
            <div key={idx}>
              {idx > 0 && (
                <div className="flex justify-center py-1">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-0.5 rounded-full">
                    {(localConfig.prefilter_logic ?? 'and').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Field selector */}
                <Select
                  value={pf.field_id}
                  onValueChange={(v) => {
                    const field = fields.find((f) => f.id === v)!;
                    updatePrefilter(idx, { field_id: v, field_name: field.name });
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator selector — filtered by category */}
                <Select
                  value={pf.operator}
                  onValueChange={(v) => updatePrefilter(idx, { operator: v as Prefilter['operator'] })}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOperators.map((op) => (
                      <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value input — adaptive */}
                {!hideValue && (
                  <div className="flex items-center gap-2 flex-1">
                    {isBoolean ? (
                      <Select
                        value={pf.value ?? ''}
                        onValueChange={(v) => updatePrefilter(idx, { value: v })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Oui</SelectItem>
                          <SelectItem value="false">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : isDate ? (
                      <>
                        <Input
                          type="date"
                          value={pf.value ?? ''}
                          onChange={(e) => updatePrefilter(idx, { value: e.target.value })}
                          className="flex-1"
                        />
                        {isBetween && (
                          <>
                            <span className="text-sm text-muted-foreground">et</span>
                            <Input
                              type="date"
                              value={pf.value2 ?? ''}
                              onChange={(e) => updatePrefilter(idx, { value2: e.target.value })}
                              className="flex-1"
                            />
                          </>
                        )}
                      </>
                    ) : isNumber ? (
                      <>
                        <Input
                          type="number"
                          value={pf.value ?? ''}
                          onChange={(e) => updatePrefilter(idx, { value: e.target.value })}
                          placeholder="Valeur"
                          className="flex-1"
                        />
                        {isBetween && (
                          <>
                            <span className="text-sm text-muted-foreground">et</span>
                            <Input
                              type="number"
                              value={pf.value2 ?? ''}
                              onChange={(e) => updatePrefilter(idx, { value2: e.target.value })}
                              placeholder="Valeur"
                              className="flex-1"
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <Input
                        value={pf.value ?? ''}
                        onChange={(e) => updatePrefilter(idx, { value: e.target.value })}
                        placeholder="Valeur"
                        className="flex-1"
                      />
                    )}
                  </div>
                )}

                {/* Editable toggle */}
                <Switch
                  checked={pf.is_user_editable}
                  onCheckedChange={(checked) => updatePrefilter(idx, { is_user_editable: checked })}
                />

                {/* Remove */}
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removePrefilter(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </TabsContent>
)}
```

- [ ] **Step 6: Verify**

Run the app. Confirm:
- Operators change based on field type
- Boolean fields show Oui/Non dropdown
- Number fields show number inputs
- "Between" shows two inputs
- "Est vide" hides value
- AND/OR badge appears between conditions when 2+
- AND/OR selector appears when 2+ conditions
- Changing field resets operator and value

- [ ] **Step 7: Commit**

```bash
git add src/lib/module-display-fields.ts src/pages/admin/module-config/ModuleDisplayConfigEditPage.tsx
git commit -m "feat: adaptive pre-filters with type-based operators and AND/OR logic"
```

---

### Task 5: SearchableSelect component + field type selector update

**Files:**
- Create: `src/components/ui/searchable-select.tsx`
- Modify: `src/components/admin/business-objects/field-form/FieldTypeSelector.tsx`

- [ ] **Step 1: Create the SearchableSelect component**

Create `src/components/ui/searchable-select.tsx` — a Popover + Command (cmdk) based combobox:

```tsx
import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  secondaryLabel?: string;
}

export interface SearchableSelectGroup {
  label: string;
  options: SearchableSelectOption[];
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options?: SearchableSelectOption[];
  groups?: SearchableSelectGroup[];
  className?: string;
  triggerClassName?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat.',
  options,
  groups,
  className,
  triggerClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Find selected option across flat or grouped options
  const allOptions = React.useMemo(() => {
    if (options) return options;
    if (groups) return groups.flatMap((g) => g.options);
    return [];
  }, [options, groups]);

  const selected = allOptions.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', triggerClassName)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              {selected.icon && <selected.icon className="h-4 w-4 shrink-0" />}
              {selected.label}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('p-0', className)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups
              ? groups.map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={`${option.label} ${option.secondaryLabel ?? ''}`}
                        onSelect={() => {
                          onValueChange(option.value);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {option.icon && <option.icon className="h-4 w-4 shrink-0" />}
                          <span>{option.label}</span>
                          {option.secondaryLabel && (
                            <span className="text-xs text-muted-foreground ml-auto">{option.secondaryLabel}</span>
                          )}
                        </div>
                        <Check className={cn('ml-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              : (options ?? []).map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {option.icon && <option.icon className="h-4 w-4 shrink-0" />}
                      <span>{option.label}</span>
                    </div>
                    <Check className={cn('ml-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Update FieldTypeSelector to use SearchableSelect**

Replace `src/components/admin/business-objects/field-form/FieldTypeSelector.tsx`:

```tsx
import { Label } from '@/components/ui/label';
import { SearchableSelect, type SearchableSelectGroup } from '@/components/ui/searchable-select';
import type { FieldTypeEntry } from '@/lib/field-type-registry';

interface FieldTypeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  groupedFieldTypes: Record<string, FieldTypeEntry[]>;
}

export function FieldTypeSelector({ value, onValueChange, groupedFieldTypes }: FieldTypeSelectorProps) {
  const groups: SearchableSelectGroup[] = Object.entries(groupedFieldTypes).map(([group, types]) => ({
    label: group,
    options: types.map((type) => ({
      value: type.value,
      label: type.label,
      icon: type.icon,
      secondaryLabel: type.group,
    })),
  }));

  return (
    <div className="space-y-2">
      <Label>Type de champ</Label>
      <SearchableSelect
        value={value}
        onValueChange={onValueChange}
        groups={groups}
        placeholder="Sélectionner un type..."
        searchPlaceholder="Rechercher un type..."
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run the app. Confirm:
- Field type selector opens with search bar
- Search filters types by name AND group
- Selected type shows icon + label in trigger
- "Aucun résultat" when no match
- Focus auto on search input

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/searchable-select.tsx src/components/admin/business-objects/field-form/FieldTypeSelector.tsx
git commit -m "feat: create SearchableSelect component, update field type selector"
```
