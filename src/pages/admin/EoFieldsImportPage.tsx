import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { api } from '@/lib/api-client';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Layers,
  BookOpen,
} from 'lucide-react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { useReferentials } from '@/hooks/useReferentials';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import { generateUniqueFieldSlug, parseBoolean } from '@/lib/csv-parser';
import {
  reverseMapping,
  type ImportWizardConfig,
  type PreviewRow,
  type FieldMapping,
  type ParsedRow,
  type ImportProgress,
} from '@/components/admin/import/types';
import { getFieldTypeLabel, getFieldTypeIcon } from '@/lib/field-type-registry';

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

const VALID_FIELD_TYPES = [
  'text', 'textarea', 'number', 'date', 'select', 'multiselect',
  'checkbox', 'boolean', 'email', 'phone', 'url',
];

const FIELDS = [
  { id: 'name', label: 'Nom du champ', required: true },
  { id: 'field_type', label: 'Type de champ', required: true },
  { id: 'description', label: 'Description', required: false },
  { id: 'is_required', label: 'Obligatoire', required: false },
  { id: 'is_unique', label: 'Unique', required: false },
  { id: 'referential', label: 'Référentiel', required: false },
  { id: 'default_value', label: 'Valeur par défaut', required: false },
];

function autoMap(headers: string[]): FieldMapping {
  const m: FieldMapping = {};
  for (const h of headers) {
    const n = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (n === 'nom' || n === 'name' || n === 'nom du champ') m[h] = 'name';
    else if (n === 'type' || n === 'field_type' || n === 'type de champ') m[h] = 'field_type';
    else if (n === 'description') m[h] = 'description';
    else if (n === 'obligatoire' || n === 'required' || n === 'is_required') m[h] = 'is_required';
    else if (n === 'unique' || n === 'is_unique') m[h] = 'is_unique';
    else if (n === 'referentiel' || n === 'referential' || n === 'referencial') m[h] = 'referential';
    else if (n === 'defaut' || n === 'default' || n === 'default_value' || n === 'valeur par defaut') m[h] = 'default_value';
  }
  return m;
}

function templateContent(): string {
  const h = 'name;field_type;description;is_required;is_unique;referential;default_value';
  const rows = [
    'Nom complet;text;Nom du collaborateur;oui;non;;',
    'Email;email;Adresse email;oui;oui;;',
    'Service;select;Service de rattachement;oui;non;Services;',
  ];
  return [h, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// Helpers: group preview rows by field_type
// ---------------------------------------------------------------------------

interface TypeGroup { rows: PreviewRow[] }

function groupByType(rows: PreviewRow[]) {
  const groups = new Map<string, TypeGroup>();
  for (const row of rows) {
    const key = row.groupKey || '__ungrouped__';
    if (!groups.has(key)) groups.set(key, { rows: [] });
    groups.get(key)!.rows.push(row);
  }
  return Array.from(groups.entries()).filter(([k]) => k !== '__errors__');
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function EoFieldsImportPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id || '';
  const { data: existingFields = [] } = useEoFieldDefinitions(clientId || undefined);
  const { data: referentials = [] } = useReferentials();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (n: string) => setExpanded(p => { const s = new Set(p); if (s.has(n)) { s.delete(n); } else { s.add(n); } return s; });

  // Build a map of referential name (lowercase) → id for quick lookup
  const referentialsByName = new Map(
    referentials.map((r: { id: string; name: string }) => [r.name.toLowerCase(), r.id])
  );

  // -- buildPreview --
  const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
    const r = reverseMapping(mapping);
    const existingNames = new Set(existingFields.map(f => f.name.toLowerCase()));
    const seenNames = new Set<string>();
    const out: PreviewRow[] = [];

    rows.forEach((row, i) => {
      const name = (r['name'] ? row[r['name']]?.trim() : '') || '';
      const fieldType = (r['field_type'] ? row[r['field_type']]?.trim().toLowerCase() : '') || '';
      const description = r['description'] ? row[r['description']]?.trim() || '' : '';
      const isRequired = r['is_required'] ? row[r['is_required']]?.trim() || '' : '';
      const isUnique = r['is_unique'] ? row[r['is_unique']]?.trim() || '' : '';
      const referential = r['referential'] ? row[r['referential']]?.trim() || '' : '';
      const defaultValue = r['default_value'] ? row[r['default_value']]?.trim() || '' : '';

      const data: Record<string, string> = {
        name, fieldType, description, isRequired, isUnique, referential, defaultValue,
      };

      // Validation: name required
      if (!name) {
        out.push({ data, groupKey: '__errors__', hasError: true, errorMessage: `Ligne ${i + 2} : nom manquant` });
        return;
      }

      // Validation: type required + valid
      if (!fieldType) {
        out.push({ data, groupKey: '__errors__', hasError: true, errorMessage: `Ligne ${i + 2} : type manquant pour "${name}"` });
        return;
      }
      if (!VALID_FIELD_TYPES.includes(fieldType)) {
        out.push({ data, groupKey: '__errors__', hasError: true, errorMessage: `Ligne ${i + 2} : type "${fieldType}" invalide pour "${name}"` });
        return;
      }

      // Validation: duplicate name in CSV
      if (seenNames.has(name.toLowerCase())) {
        out.push({ data, groupKey: '__errors__', hasError: true, errorMessage: `Ligne ${i + 2} : doublon "${name}" dans le CSV` });
        return;
      }
      seenNames.add(name.toLowerCase());

      // Validation: duplicate name vs existing fields
      if (existingNames.has(name.toLowerCase())) {
        out.push({ data, groupKey: '__errors__', hasError: true, errorMessage: `Ligne ${i + 2} : le champ "${name}" existe déjà` });
        return;
      }

      // Validation: referential required for select/multiselect
      if (fieldType === 'select' || fieldType === 'multiselect') {
        if (!referential) {
          out.push({ data, groupKey: '__errors__', hasError: true, errorMessage: `Ligne ${i + 2} : référentiel requis pour le type "${fieldType}" ("${name}")` });
          return;
        }
        if (!referentialsByName.has(referential.toLowerCase())) {
          out.push({ data, groupKey: '__errors__', hasError: true, errorMessage: `Ligne ${i + 2} : référentiel "${referential}" introuvable pour "${name}"` });
          return;
        }
      }

      out.push({ data, groupKey: fieldType, hasError: false });
    });
    return out;
  }, [existingFields, referentialsByName]);

  // -- onImport --
  const onImport = useCallback(async (rows: ParsedRow[], mapping: FieldMapping, onProgress: (p: ImportProgress) => void) => {
    const preview = buildPreview(rows, mapping);
    const valid = preview.filter(r => !r.hasError);
    const total = valid.length;
    onProgress({ current: 0, total });
    let success = 0, errors = 0;

    // Get max display_order from existing fields
    const maxOrder = existingFields.reduce((max, f) => Math.max(max, f.display_order ?? 0), 0);

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      try {
        const isSelect = row.data.fieldType === 'select' || row.data.fieldType === 'multiselect';
        const refId = isSelect && row.data.referential
          ? referentialsByName.get(row.data.referential.toLowerCase()) || null
          : null;

        const settings = refId ? { referential_id: refId } : {};

        await api.post('/api/organizational-entities/field-definitions', {
          client_id: clientId,
          name: row.data.name,
          slug: generateUniqueFieldSlug(row.data.name),
          description: row.data.description || null,
          field_type: row.data.fieldType,
          is_required: row.data.isRequired ? parseBoolean(row.data.isRequired) : false,
          is_unique: row.data.isUnique ? parseBoolean(row.data.isUnique) : false,
          display_order: maxOrder + i + 1,
          default_value: row.data.defaultValue || null,
          options: null,
          settings,
        });
        success++;
      } catch {
        errors++;
      }
      onProgress({ current: i + 1, total });
    }
    return { successCount: success, errorCount: errors };
  }, [clientId, existingFields, buildPreview, referentialsByName]);

  // -- renderPreview --
  const renderPreview = useCallback((rows: PreviewRow[]) => {
    const errorRows = rows.filter(r => r.hasError);
    const validRows = rows.filter(r => !r.hasError);
    const entries = groupByType(validRows);
    const totalValid = validRows.length;
    const totalTypes = entries.length;
    const totalErrors = errorRows.length;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={<CheckCircle2 className="h-5 w-5 text-primary" />} value={totalValid} label="Champ(s) valide(s)" />
          <StatCard icon={<Layers className="h-5 w-5 text-primary" />} value={totalTypes} label="Type(s) de champ" />
          {totalErrors > 0 && <StatCard icon={<AlertCircle className="h-5 w-5 text-destructive" />} value={totalErrors} label="Erreur(s)" bg="bg-destructive/10" />}
        </div>

        {/* Errors */}
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

        {/* Grouped by type */}
        <Card>
          <CardHeader className="pb-2"><span className="font-semibold">Aperçu de l'import</span></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.map(([typeName, group]) => {
                const isOpen = expanded.has(typeName);
                const Icon = getFieldTypeIcon(typeName);
                const valid = group.rows.filter(r => !r.hasError);
                return (
                  <div key={typeName} className="border rounded-lg overflow-hidden">
                    <Collapsible open={isOpen} onOpenChange={() => toggle(typeName)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center justify-between w-full p-3 h-auto hover:bg-muted/50 text-left rounded-none">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{getFieldTypeLabel(typeName)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Chip variant="default">{valid.length} champ(s)</Chip>
                            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-2">
                          {valid.map((row, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{row.data.name}</span>
                                {row.data.description && <p className="text-xs text-muted-foreground truncate">{row.data.description}</p>}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {row.data.isRequired && parseBoolean(row.data.isRequired) && (
                                  <Chip variant="default" className="text-xs">Obligatoire</Chip>
                                )}
                                {row.data.isUnique && parseBoolean(row.data.isUnique) && (
                                  <Chip variant="outline" className="text-xs">Unique</Chip>
                                )}
                                {row.data.referential && (
                                  <Chip variant="default" className="text-xs gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {row.data.referential}
                                  </Chip>
                                )}
                              </div>
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
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Type className="h-12 w-12 mb-4 opacity-50" />
        <p>Sélectionnez un client pour importer des champs</p>
      </div>
    );
  }

  const config: ImportWizardConfig = {
    title: 'Import des champs EO',
    backPath: cp(CLIENT_ROUTES.ENTITIES_FIELDS),
    fields: FIELDS,
    autoMap,
    templateContent,
    templateFileName: 'template_champs_eo.csv',
    canProceed: (mapping) => { const m = new Set(Object.values(mapping)); return m.has('name') && m.has('field_type'); },
    buildPreview,
    onImport,
    renderPreview,
    onImportComplete: (result) => { if (result.errorCount === 0) navigate(cp(CLIENT_ROUTES.ENTITIES_FIELDS)); },
  };

  return <ImportWizard config={config} />;
}

// ---------------------------------------------------------------------------
// Tiny helper component for stat cards
// ---------------------------------------------------------------------------

function StatCard({ icon, value, label, bg = 'bg-primary/10' }: { icon: React.ReactNode; value: number; label: string; bg?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
