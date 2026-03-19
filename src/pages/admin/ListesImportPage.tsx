import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { api } from '@/lib/api-client';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable } from '@/components/admin/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { XCircle, Database, Hash, CheckCircle2, AlertCircle } from 'lucide-react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import { generateSlug } from '@/lib/csv-parser';
import { generateCode } from '@/lib/format-utils';
import { reverseMapping, type ImportWizardConfig, type PreviewRow, type FieldMapping, type ParsedRow, type ImportProgress } from '@/components/admin/import/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELDS = [
  { id: 'referential_name', label: 'Nom de la liste', required: true },
  { id: 'referential_slug', label: 'Slug de la liste', required: false },
  { id: 'referential_description', label: 'Description de la liste', required: false },
  { id: 'referential_tag', label: 'Tag de la liste', required: false },
  { id: 'value_code', label: 'Code de la valeur', required: false },
  { id: 'value_label', label: 'Libellé de la valeur', required: true },
  { id: 'value_parent_code', label: 'Code parent (hiérarchie)', required: false },
  { id: 'value_color', label: 'Couleur de la valeur', required: false },
  { id: 'value_order', label: "Ordre d'affichage", required: false },
];

// ---------------------------------------------------------------------------
// Static helpers
// ---------------------------------------------------------------------------

function autoMap(headers: string[]): FieldMapping {
  const m: FieldMapping = {};
  for (const h of headers) {
    const n = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if ((n.includes('referential') && n.includes('name')) || n === 'referential_name' || (n.includes('nom') && n.includes('ref'))) m[h] = 'referential_name';
    else if ((n.includes('referential') && n.includes('desc')) || n === 'referential_description') m[h] = 'referential_description';
    else if ((n.includes('referential') && n.includes('tag')) || n === 'referential_tag' || n === 'tag') m[h] = 'referential_tag';
    else if ((n.includes('referential') && n.includes('slug')) || n === 'referential_slug') m[h] = 'referential_slug';
    else if ((n.includes('value') && n.includes('label')) || n === 'value_label' || n.includes('libelle') || n === 'label') m[h] = 'value_label';
    else if (n.includes('parent') || n.includes('parent_code')) m[h] = 'value_parent_code';
    else if ((n.includes('value') && n.includes('code')) || n === 'value_code' || n === 'code') m[h] = 'value_code';
    else if (n.includes('color') || n.includes('couleur')) m[h] = 'value_color';
    else if (n.includes('order') || n.includes('ordre')) m[h] = 'value_order';
  }
  return m;
}

function templateContent(): string {
  const h = 'referential_name;referential_tag;referential_description;value_label;value_parent_code;value_color';
  const rows = [
    'Statuts;Workflow;Liste des statuts possibles;En attente;;#f59e0b',
    'Statuts;Workflow;Liste des statuts possibles;En cours;;#3b82f6',
    'Statuts;Workflow;Liste des statuts possibles;Terminé;;#22c55e',
    'Statuts;Workflow;Liste des statuts possibles;Annulé;;#ef4444',
    'Catégories;Produits;Catégories de produits (hiérarchique);Électronique;;#6366f1',
    'Catégories;Produits;Catégories de produits (hiérarchique);Ordinateurs;ELECTRONIQUE;#818cf8',
    'Catégories;Produits;Catégories de produits (hiérarchique);Portables;ORDINATEURS;#a5b4fc',
    'Catégories;Produits;Catégories de produits (hiérarchique);Fixes;ORDINATEURS;#a5b4fc',
    'Catégories;Produits;Catégories de produits (hiérarchique);Téléphones;ELECTRONIQUE;#818cf8',
    'Catégories;Produits;Catégories de produits (hiérarchique);Mobilier;;#8b5cf6',
    'Catégories;Produits;Catégories de produits (hiérarchique);Bureau;MOBILIER;#a78bfa',
  ];
  return [h, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface MappedValue {
  code: string;
  label: string;
  parent_code: string | null;
  color: string | null;
  display_order: number;
  level: number;
  hasError: boolean;
  errorMessage?: string;
}

interface MappedListe {
  name: string;
  slug: string;
  description: string | null;
  tag: string | null;
  values: MappedValue[];
}

// ---------------------------------------------------------------------------
// Helpers: build liste tree from preview rows
// ---------------------------------------------------------------------------

const MAX_DEPTH = 20;

function buildListeTree(rows: ParsedRow[], mapping: FieldMapping): { listes: MappedListe[]; previewRows: PreviewRow[] } {
  const r = reverseMapping(mapping);
  const listeMap = new Map<string, MappedListe>();
  const previewRows: PreviewRow[] = [];

  rows.forEach((row, i) => {
    const refName = row[r['referential_name']]?.trim() || '';
    const valueLabel = row[r['value_label']]?.trim() || '';

    if (!refName || !valueLabel) {
      previewRows.push({
        data: { refName, valueLabel },
        groupKey: refName || '__errors__',
        hasError: true,
        errorMessage: `Ligne ${i + 2}: Nom de la liste ou libellé manquant`,
      });
      return;
    }

    // Get or create liste
    if (!listeMap.has(refName)) {
      const slugCol = r['referential_slug'];
      const descCol = r['referential_description'];
      const tagCol = r['referential_tag'];
      listeMap.set(refName, {
        name: refName,
        slug: slugCol ? row[slugCol]?.trim() || generateSlug(refName) : generateSlug(refName),
        description: descCol ? row[descCol]?.trim() || null : null,
        tag: tagCol ? row[tagCol]?.trim() || null : null,
        values: [],
      });
    }

    const liste = listeMap.get(refName)!;
    const valueCode = r['value_code'] ? row[r['value_code']]?.trim() : '';
    const rawParentCode = r['value_parent_code'] ? row[r['value_parent_code']]?.trim() : '';
    const parentCode = rawParentCode ? generateCode(rawParentCode) : '';
    const valueColor = r['value_color'] ? row[r['value_color']]?.trim() : '';
    const valueOrder = r['value_order'] ? parseInt(row[r['value_order']]?.trim()) : liste.values.length;

    liste.values.push({
      code: valueCode || generateCode(valueLabel),
      label: valueLabel,
      parent_code: parentCode || null,
      color: valueColor || null,
      display_order: isNaN(valueOrder) ? liste.values.length : valueOrder,
      level: 0,
      hasError: false,
    });
  });

  // Calculate levels and detect cycles for each liste
  for (const liste of listeMap.values()) {
    const codeToValue = new Map<string, MappedValue>();
    liste.values.forEach(v => codeToValue.set(v.code, v));

    const calculateLevel = (value: MappedValue, visited: Set<string>, depth: number): number => {
      if (!value.parent_code) return 0;
      if (depth > MAX_DEPTH || visited.has(value.code)) {
        value.hasError = true;
        value.errorMessage = 'Référence circulaire détectée';
        return 0;
      }
      visited.add(value.code);
      const parent = codeToValue.get(value.parent_code);
      if (!parent) {
        value.hasError = true;
        value.errorMessage = `Parent "${value.parent_code}" non trouvé`;
        return 0;
      }
      return calculateLevel(parent, visited, depth + 1) + 1;
    };

    liste.values.forEach(v => {
      v.level = calculateLevel(v, new Set(), 0);
    });

    // Generate PreviewRow entries for each value
    for (const v of liste.values) {
      previewRows.push({
        data: {
          refName: liste.name,
          refSlug: liste.slug,
          refDescription: liste.description || '',
          refTag: liste.tag || '',
          valueCode: v.code,
          valueLabel: v.label,
          parentCode: v.parent_code || '',
          color: v.color || '',
          displayOrder: String(v.display_order),
          level: String(v.level),
        },
        groupKey: liste.name,
        hasError: v.hasError,
        errorMessage: v.errorMessage,
      });
    }
  }

  return { listes: Array.from(listeMap.values()), previewRows };
}

// ---------------------------------------------------------------------------
// Helpers: group preview rows by liste
// ---------------------------------------------------------------------------

interface ListeGroup {
  rows: PreviewRow[];
  tag: string;
  description: string;
  values: MappedValue[];
}

function groupByListe(rows: PreviewRow[]): Array<[string, ListeGroup]> {
  const groups = new Map<string, ListeGroup>();
  for (const row of rows) {
    const key = row.groupKey || '__ungrouped__';
    if (!groups.has(key)) {
      groups.set(key, {
        rows: [],
        tag: row.data.refTag || '',
        description: row.data.refDescription || '',
        values: [],
      });
    }
    const g = groups.get(key)!;
    g.rows.push(row);
    // Reconstruct MappedValue for tree rendering
    g.values.push({
      code: row.data.valueCode || '',
      label: row.data.valueLabel || '',
      parent_code: row.data.parentCode || null,
      color: row.data.color || null,
      display_order: parseInt(row.data.displayOrder) || 0,
      level: parseInt(row.data.level) || 0,
      hasError: row.hasError,
      errorMessage: row.errorMessage,
    });
  }
  return Array.from(groups.entries()).filter(([k]) => k !== '__errors__');
}

// ---------------------------------------------------------------------------
// DataTable column definitions for preview rows
// ---------------------------------------------------------------------------

interface PreviewValueRow {
  liste: string;
  tag: string;
  label: string;
  code: string;
  parent_code: string | null;
  color: string | null;
  level: number;
  hasError: boolean;
  errorMessage?: string;
}

const PREVIEW_COLUMNS: ColumnDef<PreviewValueRow>[] = [
  {
    accessorKey: 'liste',
    header: 'Liste',
    maxSize: 99999,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0">
        <p className="font-medium truncate">{row.original.liste}</p>
        {row.original.tag && (
          <Chip variant="outline" className="text-xs shrink-0">{row.original.tag}</Chip>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'label',
    header: 'Libellé',
    maxSize: 99999,
    cell: ({ row }) => (
      <div>
        <span
          className="inline-flex items-center gap-1"
          style={{ paddingLeft: row.original.level * 12 }}
        >
          {row.original.label}
        </span>
        {row.original.hasError && row.original.errorMessage && (
          <Chip variant="error" className="ml-2 text-xs">{row.original.errorMessage}</Chip>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'code',
    header: 'Code',
    maxSize: 99999,
    cell: ({ row }) => (
      <Chip variant="default" className="font-mono text-xs">{row.original.code}</Chip>
    ),
  },
  {
    accessorKey: 'parent_code',
    header: 'Parent',
    size: 120,
    minSize: 120,
    maxSize: 120,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.parent_code ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'color',
    header: 'Couleur',
    size: 130,
    minSize: 130,
    maxSize: 130,
    cell: ({ row }) => row.original.color ? (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: row.original.color }} />
        <span className="text-xs font-mono text-muted-foreground">{row.original.color}</span>
      </div>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'level',
    header: 'Niv.',
    size: 60,
    minSize: 60,
    maxSize: 60,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.level}</span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ListesImportPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id || '';
  // -- buildPreview --
  const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
    const { previewRows } = buildListeTree(rows, mapping);
    return previewRows;
  }, []);

  // -- onImport (atomic: tout ou rien par liste) --
  const onImport = useCallback(async (rows: ParsedRow[], mapping: FieldMapping, onProgress: (p: ImportProgress) => void) => {
    const { listes } = buildListeTree(rows, mapping);
    const validListes = listes.filter(r => r.values.some(v => !v.hasError));
    const totalValues = validListes.reduce((sum, r) => sum + r.values.filter(v => !v.hasError).length, 0);
    const total = validListes.length + totalValues;
    onProgress({ current: 0, total });
    let success = 0, errors = 0, cur = 0;
    const details: Array<{ label: string; status: 'success' | 'error'; error?: string }> = [];

    // Preview errors -> details
    for (const liste of listes) {
      for (const v of liste.values.filter(val => val.hasError)) {
        details.push({ label: `${liste.name} > ${v.label}`, status: 'error', error: v.errorMessage || 'Erreur de validation' });
        errors++;
      }
    }

    for (const liste of validListes) {
      let refId: string | null = null;
      let refCreatedByUs = false;
      let refFailed = false;

      try {
        // 1. Create liste (API stays /api/referentials)
        const refData = await api.post<{ id: string }>('/api/referentials', {
          client_id: clientId,
          name: liste.name,
          slug: liste.slug + '_' + Date.now(),
          description: liste.description,
          tag: liste.tag,
        });

        refId = refData.id;
        refCreatedByUs = true;
        onProgress({ current: ++cur, total });

        // 2. Insert values level by level (batch per level)
        const codeToId = new Map<string, string>();
        const validValues = liste.values.filter(v => !v.hasError);
        const maxLevel = Math.max(0, ...validValues.map(v => v.level));

        for (let level = 0; level <= maxLevel; level++) {
          const levelValues = validValues.filter(v => v.level === level);
          if (levelValues.length === 0) continue;

          const insertPayload = levelValues.map(v => ({
            referential_id: refId!,
            code: v.code,
            label: v.label,
            color: v.color,
            display_order: v.display_order,
            level: v.level,
            parent_value_id: v.parent_code ? (codeToId.get(v.parent_code) || null) : null,
          }));

          const inserted = await api.post<Array<{ id: string; code: string }>>(
            `/api/referentials/${refId}/values/batch`,
            insertPayload
          );

          if (inserted) {
            for (const row of inserted) {
              codeToId.set(row.code, row.id);
            }
          }
          cur += levelValues.length;
          onProgress({ current: cur, total });
        }

        // All succeeded for this liste
        const validCount = liste.values.filter(v => !v.hasError).length;
        success += validCount;
        for (const v of liste.values.filter(val => !val.hasError)) {
          details.push({ label: `${liste.name} > ${v.label}`, status: 'success' });
        }
      } catch (e) {
        refFailed = true;
        const msg = e instanceof Error ? e.message : String(e);
        const validCount = liste.values.filter(v => !v.hasError).length;
        errors += validCount;
        details.push({ label: `Liste "${liste.name}"`, status: 'error', error: msg });
        for (const v of liste.values.filter(val => !val.hasError)) {
          details.push({ label: `${liste.name} > ${v.label}`, status: 'error', error: 'Annulé (rollback)' });
        }
        cur += validCount + 1;
        onProgress({ current: cur, total });
      }

      // Rollback: only delete if WE created it during this import
      if (refFailed && refId && refCreatedByUs) {
        await api.delete(`/api/referentials/${refId}`);
      }
    }

    return { successCount: success, errorCount: errors, details };
  }, [clientId]);

  // -- renderPreview --
  const renderPreview = useCallback((rows: PreviewRow[], _previewErrors: string[], onCancel?: () => void) => {
    const errorRows = rows.filter(r => r.hasError);
    const validRows = rows.filter(r => !r.hasError);
    const entries = groupByListe(validRows);
    const totalListes = entries.length;
    const totalValues = validRows.length;
    const totalErrors = errorRows.length;

    const tableRows: PreviewValueRow[] = entries.flatMap(([listeName, group]) =>
      group.values.filter(v => !v.hasError).map(v => ({
        liste: listeName,
        tag: group.tag,
        label: v.label,
        code: v.code,
        parent_code: v.parent_code,
        color: v.color,
        level: v.level,
        hasError: v.hasError,
        errorMessage: v.errorMessage,
      }))
    );

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <StatBlock icon={<Database className="h-5 w-5" />} value={totalListes} label="Listes" />
          <StatBlock icon={<Hash className="h-5 w-5" />} value={totalValues + totalErrors} label="Valeurs" />
          <StatBlock icon={<CheckCircle2 className="h-5 w-5 text-success" />} value={totalValues} label="Valides" />
          <StatBlock icon={<AlertCircle className="h-5 w-5 text-destructive" />} value={totalErrors} label="Erreurs" valueClassName={totalErrors > 0 ? 'text-destructive' : ''} />
        </div>

        {errorRows.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-2"><span className="font-semibold text-destructive">Erreurs</span></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {errorRows.map((row, idx) => (
                  <p key={idx} className="text-sm text-destructive">{row.errorMessage}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <DataTable
          columns={PREVIEW_COLUMNS}
          data={tableRows}
          searchColumns={['liste', 'label', 'code']}
          searchPlaceholder="Rechercher une liste..."
          hideColumnSelector
          paginationBelow
          initialPageSize={20}
          toolbarRight={onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel} className="border-destructive hover:bg-destructive/10">
              Annuler l'import
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        />
      </div>
    );
  }, []);

  if (!selectedClient) {
    return (
      <EmptyState icon={Database} title="Sélectionnez un client pour importer des listes" />
    );
  }

  const config: ImportWizardConfig = {
    title: 'Import des listes',
    backPath: cp(CLIENT_ROUTES.LISTES),
    fields: FIELDS,
    autoMap,
    templateContent,
    templateFileName: 'template_listes.csv',
    canProceed: (mapping) => {
      const m = new Set(Object.values(mapping));
      return m.has('referential_name') && m.has('value_label');
    },
    buildPreview,
    onImport,
    renderPreview,
    hideDefaultStats: true,
    backLabel: 'Revenir à mes listes',
    onImportComplete: (result) => { if (result.errorCount === 0) navigate(cp(CLIENT_ROUTES.LISTES)); },
  };

  return <ImportWizard config={config} />;
}

// ---------------------------------------------------------------------------
// Stat block component
// ---------------------------------------------------------------------------

function StatBlock({ icon, value, label, valueClassName = '', iconClassName = 'text-muted-foreground' }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  valueClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-stretch gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className={`flex items-center justify-center rounded-md border border-gray-100 bg-white px-3 shrink-0 ${iconClassName}`}>
        {icon}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={`text-2xl font-semibold leading-tight ${valueClassName}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
