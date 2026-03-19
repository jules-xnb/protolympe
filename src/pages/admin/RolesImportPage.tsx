import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { api } from '@/lib/api-client';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/empty-state';
import { ChevronRight, ChevronDown, Shield, FolderTree, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useRoleCategories } from '@/hooks/useRoleCategories';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import { generateSlug } from '@/lib/csv-parser';
import { reverseMapping, type ImportWizardConfig, type PreviewRow, type FieldMapping, type ParsedRow, type ImportProgress } from '@/components/admin/import/types';

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const FIELDS = [
  { id: 'category_name', label: 'Nom de la catégorie', required: true },
  { id: 'category_description', label: 'Description catégorie', required: false },
  { id: 'role_name', label: 'Nom du rôle', required: true },
  { id: 'role_description', label: 'Description du rôle', required: false },
  { id: 'role_color', label: 'Couleur du rôle', required: false },
];

function autoMap(headers: string[]): FieldMapping {
  const m: FieldMapping = {};
  for (const h of headers) {
    const n = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if ((n.includes('categor') && n.includes('nom')) || n === 'category_name' || (n.includes('cat') && n.includes('name'))) m[h] = 'category_name';
    else if ((n.includes('categor') && n.includes('desc')) || n === 'category_description') m[h] = 'category_description';
    else if ((n.includes('role') && n.includes('nom')) || n === 'role_name' || (n.includes('role') && n.includes('name')) || n === 'nom' || n === 'name') m[h] = 'role_name';
    else if ((n.includes('role') && n.includes('desc')) || n === 'role_description' || n === 'description') m[h] = 'role_description';
    else if (n.includes('color') || n.includes('couleur')) m[h] = 'role_color';
  }
  return m;
}

function templateContent(): string {
  const h = 'category_name;category_description;role_name;role_description;role_color';
  const rows = [
    'Validation;Rôles de validation des demandes;Validateur N1;Premier niveau de validation;#22c55e',
    'Validation;Rôles de validation des demandes;Validateur N2;Deuxième niveau de validation;#16a34a',
    'Validation;Rôles de validation des demandes;Validateur Final;Validation finale;#15803d',
    'Gestion;Rôles de gestion opérationnelle;Gestionnaire;Gestion quotidienne;#3b82f6',
    'Gestion;Rôles de gestion opérationnelle;Superviseur;Supervision des équipes;#2563eb',
    'Support;Rôles de support technique;Support N1;Support premier niveau;#f59e0b',
    'Support;Rôles de support technique;Support N2;Support avancé;#d97706',
  ];
  return [h, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Helpers: group preview rows by category
// ---------------------------------------------------------------------------

interface CategoryGroup { rows: PreviewRow[]; existsInDb: boolean; description: string }

function groupByCategory(rows: PreviewRow[]) {
  const groups = new Map<string, CategoryGroup>();
  for (const row of rows) {
    const key = row.groupKey || '__ungrouped__';
    if (!groups.has(key)) groups.set(key, { rows: [], existsInDb: row.data.existsInDb === '1', description: row.data.categoryDesc || '' });
    groups.get(key)!.rows.push(row);
  }
  return Array.from(groups.entries()).filter(([k]) => k !== '__errors__');
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function RolesImportPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: existingCategories = [] } = useRoleCategories();
  const clientId = selectedClient?.id || '';
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (n: string) => setExpanded(p => { const s = new Set(p); if (s.has(n)) { s.delete(n); } else { s.add(n); } return s; });

  // -- buildPreview --
  const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
    const r = reverseMapping(mapping);
    const existingNames = new Set(existingCategories.map((c: { name: string }) => c.name.toLowerCase()));
    const seen = new Map<string, Set<string>>();
    const out: PreviewRow[] = [];

    rows.forEach((row, i) => {
      const catName = row[r['category_name']]?.trim() || '';
      const catDesc = r['category_description'] ? row[r['category_description']]?.trim() || '' : '';
      const roleName = row[r['role_name']]?.trim() || '';
      const roleDesc = r['role_description'] ? row[r['role_description']]?.trim() || '' : '';
      const roleColor = r['role_color'] ? row[r['role_color']]?.trim() || '' : '';
      const data = { categoryName: catName, categoryDesc: catDesc, roleName, roleDesc, roleColor, existsInDb: '' };

      if (!catName || !roleName) { out.push({ data, groupKey: catName || '__errors__', hasError: true, errorMessage: `Ligne ${i + 2}: Nom de catégorie ou nom de rôle manquant` }); return; }
      if (!seen.has(catName)) seen.set(catName, new Set());
      const rolesInCat = seen.get(catName)!;
      if (rolesInCat.has(roleName.toLowerCase())) { out.push({ data, groupKey: catName, hasError: true, errorMessage: `Ligne ${i + 2}: Rôle "${roleName}" déjà défini dans "${catName}"` }); return; }
      rolesInCat.add(roleName.toLowerCase());

      data.existsInDb = existingNames.has(catName.toLowerCase()) ? '1' : '';
      out.push({ data, groupKey: catName, hasError: false });
    });
    return out;
  }, [existingCategories]);

  // -- onImport --
  const onImport = useCallback(async (rows: ParsedRow[], mapping: FieldMapping, onProgress: (p: ImportProgress) => void) => {
    const preview = buildPreview(rows, mapping);
    const valid = preview.filter(r => !r.hasError);
    const cats = new Map<string, PreviewRow[]>();
    for (const r of valid) { const k = r.data.categoryName; if (!cats.has(k)) cats.set(k, []); cats.get(k)!.push(r); }

    const total = cats.size + valid.length;
    onProgress({ current: 0, total });
    let success = 0, errors = 0, cur = 0;

    for (const [catName, catRows] of cats) {
      try {
        let catId: string;
        const existing = existingCategories.find((c: { name: string; id: string }) => c.name.toLowerCase() === catName.toLowerCase());
        if (existing) { catId = existing.id; }
        else {
          const d = await api.post<{ id: string }>('/api/roles/categories', {
            client_id: clientId, name: catName, slug: generateSlug(catName) + '_' + Date.now(), description: catRows[0]?.data.categoryDesc || null, is_required: true,
          });
          catId = d.id;
        }
        onProgress({ current: ++cur, total });

        for (const row of catRows) {
          try {
            await api.post('/api/roles', {
              client_id: clientId, category_id: catId, name: row.data.roleName, slug: generateSlug(row.data.roleName) + '_' + Date.now(), description: row.data.roleDesc || null, color: row.data.roleColor || null,
            });
            success++;
          } catch { errors++; }
          onProgress({ current: ++cur, total });
        }
      } catch { errors += catRows.length + 1; cur += catRows.length + 1; onProgress({ current: cur, total }); }
    }
    return { successCount: success, errorCount: errors };
  }, [clientId, existingCategories, buildPreview]);

  // -- renderPreview --
  const renderPreview = useCallback((rows: PreviewRow[], _previewErrors: string[], onCancel?: () => void) => {
    const errorRows = rows.filter(r => r.hasError);
    const validRows = rows.filter(r => !r.hasError);
    const entries = groupByCategory(validRows);
    const totalCats = entries.length;
    const totalRoles = validRows.length;
    const totalErrors = errorRows.length;

    return (
      <div className="space-y-4">
        {/* StatBlock grid */}
        <div className="grid grid-cols-4 gap-3">
          <StatBlock icon={<FolderTree className="h-5 w-5" />} value={totalCats} label="Catégories" />
          <StatBlock icon={<Shield className="h-5 w-5" />} value={totalRoles} label="Rôles" />
          <StatBlock icon={<CheckCircle2 className="h-5 w-5 text-success" />} value={totalRoles} label="Valides" />
          <StatBlock
            icon={<AlertCircle className="h-5 w-5 text-destructive" />}
            value={totalErrors}
            label="Erreurs"
            valueClassName={totalErrors > 0 ? 'text-destructive' : ''}
          />
        </div>

        {/* Card erreurs */}
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

        {/* Aperçu par catégorie */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="font-semibold">Aperçu de l'import</span>
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel} className="border-destructive hover:bg-destructive/10">
                Annuler l'import
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.map(([catName, group]) => {
                const isOpen = expanded.has(catName);
                const valid = group.rows.filter(r => !r.hasError);
                return (
                  <div key={catName} className="border rounded-lg overflow-hidden">
                    <Collapsible open={isOpen} onOpenChange={() => toggle(catName)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center justify-between w-full p-3 h-auto hover:bg-muted/50 text-left rounded-none">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><FolderTree className="h-4 w-4 text-primary" /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{catName}</span>
                                {group.existsInDb && <Chip variant="outline" className="text-xs">Existe</Chip>}
                              </div>
                              {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Chip variant="default">{valid.length} rôle(s)</Chip>
                            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-2">
                          {valid.map((row, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                              <div className="flex h-6 w-6 items-center justify-center rounded shrink-0" style={{ backgroundColor: `${row.data.roleColor || '#3b82f6'}20` }}>
                                <Shield className="h-3 w-3" style={{ color: row.data.roleColor || '#3b82f6' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{row.data.roleName}</span>
                                {row.data.roleDesc && <p className="text-xs text-muted-foreground truncate">{row.data.roleDesc}</p>}
                              </div>
                              {row.data.roleColor && <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: row.data.roleColor }} />}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [expanded]);

  if (!selectedClient) {
    return (
      <EmptyState icon={Shield} title="Sélectionnez un client pour importer des rôles" />
    );
  }

  const config: ImportWizardConfig = {
    title: 'Import des rôles',
    backPath: cp(CLIENT_ROUTES.ROLES),
    fields: FIELDS,
    autoMap,
    templateContent,
    templateFileName: 'template_roles.csv',
    canProceed: (mapping) => { const m = new Set(Object.values(mapping)); return m.has('category_name') && m.has('role_name'); },
    buildPreview,
    onImport,
    renderPreview,
    hideDefaultStats: true,
    onImportComplete: (result) => { if (result.errorCount === 0) navigate(cp(CLIENT_ROUTES.ROLES)); },
  };

  return <ImportWizard config={config} />;
}

// ---------------------------------------------------------------------------
// StatBlock
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
