import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/empty-state';
import { ChevronRight, ChevronDown, FileText, Layers, CheckCircle2 } from 'lucide-react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useBusinessObjectDefinitions } from '@/hooks/useBusinessObjectDefinitions';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import { generateSlug } from '@/lib/csv-parser';
import { reverseMapping, type ImportWizardConfig, type PreviewRow, type FieldMapping, type ParsedRow, type ImportProgress } from '@/components/admin/import/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

import { getFieldTypeLabel } from '@/lib/field-type-registry';

const VALID_FIELD_TYPES = [
  'text', 'textarea', 'number', 'decimal', 'date', 'datetime', 'time',
  'checkbox', 'select', 'multiselect', 'email', 'phone', 'url',
  'calculated', 'user_reference', 'eo_reference', 'object_reference',
] as const;

type FieldType = (typeof VALID_FIELD_TYPES)[number];

const FIELDS = [
  { id: 'object_name', label: "Nom de l'objet", required: true },
  { id: 'object_description', label: 'Description objet', required: false },
  { id: 'object_icon', label: 'Icône objet', required: false },
  { id: 'object_color', label: 'Couleur objet', required: false },
  { id: 'field_name', label: 'Nom du champ', required: true },
  { id: 'field_type', label: 'Type de champ', required: true },
  { id: 'field_description', label: 'Description champ', required: false },
  { id: 'field_required', label: 'Champ obligatoire', required: false },
  { id: 'field_placeholder', label: 'Placeholder', required: false },
];

// ---------------------------------------------------------------------------
// Static helpers
// ---------------------------------------------------------------------------

function autoMap(headers: string[]): FieldMapping {
  const m: FieldMapping = {};
  for (const h of headers) {
    const n = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if ((n.includes('objet') && n.includes('nom')) || n === 'object_name' || (n === 'nom' && !n.includes('champ'))) m[h] = 'object_name';
    else if ((n.includes('objet') && n.includes('desc')) || n === 'object_description') m[h] = 'object_description';
    else if (n.includes('icon') || n === 'object_icon') m[h] = 'object_icon';
    else if ((n.includes('objet') && n.includes('couleur')) || n === 'object_color' || (n === 'couleur' && !n.includes('champ'))) m[h] = 'object_color';
    else if ((n.includes('champ') && n.includes('nom')) || n === 'field_name') m[h] = 'field_name';
    else if ((n.includes('champ') && n.includes('type')) || n === 'field_type' || n === 'type') m[h] = 'field_type';
    else if ((n.includes('champ') && n.includes('desc')) || n === 'field_description') m[h] = 'field_description';
    else if (n.includes('obligatoire') || n.includes('required') || n === 'field_required') m[h] = 'field_required';
    else if (n.includes('placeholder') || n === 'field_placeholder') m[h] = 'field_placeholder';
  }
  return m;
}

function templateContent(): string {
  const h = 'object_name;object_description;object_icon;object_color;field_name;field_type;field_description;field_required;field_placeholder';
  const rows = [
    "Incident;Gestion des incidents;AlertTriangle;#ef4444;Titre;text;Titre de l'incident;oui;Ex: Problème de connexion",
    'Incident;Gestion des incidents;AlertTriangle;#ef4444;Description;textarea;Description détaillée;oui;Décrivez le problème...',
    'Incident;Gestion des incidents;AlertTriangle;#ef4444;Priorité;select;Niveau de priorité;oui;',
    'Incident;Gestion des incidents;AlertTriangle;#ef4444;Date signalement;datetime;Date de signalement;non;',
    "Demande;Demandes diverses;FileText;#3b82f6;Objet;text;Objet de la demande;oui;",
    'Demande;Demandes diverses;FileText;#3b82f6;Détails;textarea;Détails de la demande;oui;',
    'Demande;Demandes diverses;FileText;#3b82f6;Pièce jointe;file;Document justificatif;non;',
  ];
  return [h, ...rows].join('\n');
}

function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ['oui', 'yes', 'true', '1', 'vrai'].includes(normalized);
}

// ---------------------------------------------------------------------------
// Helpers: group preview rows by object
// ---------------------------------------------------------------------------

interface ObjectGroup { rows: PreviewRow[]; existsInDb: boolean; color: string; icon: string; description: string }

function groupByObject(rows: PreviewRow[]) {
  const groups = new Map<string, ObjectGroup>();
  for (const row of rows) {
    const key = row.groupKey || '__ungrouped__';
    if (!groups.has(key)) {
      groups.set(key, {
        rows: [],
        existsInDb: row.data.existsInDb === '1',
        color: row.data.objectColor || '',
        icon: row.data.objectIcon || '',
        description: row.data.objectDesc || '',
      });
    }
    groups.get(key)!.rows.push(row);
  }
  return Array.from(groups.entries()).filter(([k]) => k !== '__errors__');
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function BusinessObjectsImportPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: existingObjects = [] } = useBusinessObjectDefinitions();
  const clientId = selectedClient?.id || '';
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (n: string) => setExpanded(p => { const s = new Set(p); if (s.has(n)) { s.delete(n); } else { s.add(n); } return s; });

  // -- buildPreview --
  const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
    const r = reverseMapping(mapping);
    const existingNames = new Set(existingObjects.map(o => o.name.toLowerCase()));
    const seen = new Map<string, Set<string>>();
    const out: PreviewRow[] = [];

    rows.forEach((row, i) => {
      const objectName = row[r['object_name']]?.trim() || '';
      const objectDesc = r['object_description'] ? row[r['object_description']]?.trim() || '' : '';
      const objectIcon = r['object_icon'] ? row[r['object_icon']]?.trim() || '' : '';
      const objectColor = r['object_color'] ? row[r['object_color']]?.trim() || '' : '';
      const fieldName = row[r['field_name']]?.trim() || '';
      const fieldTypeRaw = row[r['field_type']]?.trim() || '';
      const fieldDesc = r['field_description'] ? row[r['field_description']]?.trim() || '' : '';
      const fieldRequired = r['field_required'] ? (parseBoolean(row[r['field_required']]) ? '1' : '') : '';
      const fieldPlaceholder = r['field_placeholder'] ? row[r['field_placeholder']]?.trim() || '' : '';

      const data = {
        objectName, objectDesc, objectIcon, objectColor,
        fieldName, fieldType: fieldTypeRaw, fieldDesc, fieldRequired, fieldPlaceholder,
        existsInDb: '',
      };

      if (!objectName || !fieldName || !fieldTypeRaw) {
        out.push({ data, groupKey: objectName || '__errors__', hasError: true, errorMessage: `Ligne ${i + 2}: Données obligatoires manquantes` });
        return;
      }

      // Validate field type
      const normalized = fieldTypeRaw.toLowerCase().trim();
      if (!VALID_FIELD_TYPES.includes(normalized as FieldType)) {
        out.push({ data, groupKey: objectName, hasError: true, errorMessage: `Ligne ${i + 2}: Type de champ invalide "${fieldTypeRaw}"` });
        return;
      }
      data.fieldType = normalized;

      // Duplicate field check within object
      if (!seen.has(objectName)) seen.set(objectName, new Set());
      const fieldsInObj = seen.get(objectName)!;
      if (fieldsInObj.has(fieldName.toLowerCase())) {
        out.push({ data, groupKey: objectName, hasError: true, errorMessage: `Ligne ${i + 2}: Champ "${fieldName}" déjà défini dans l'objet "${objectName}"` });
        return;
      }
      fieldsInObj.add(fieldName.toLowerCase());

      data.existsInDb = existingNames.has(objectName.toLowerCase()) ? '1' : '';
      out.push({ data, groupKey: objectName, hasError: false });
    });

    return out;
  }, [existingObjects]);

  // -- onImport --
  const onImport = useCallback(async (rows: ParsedRow[], mapping: FieldMapping, onProgress: (p: ImportProgress) => void) => {
    const preview = buildPreview(rows, mapping);
    const valid = preview.filter(r => !r.hasError);

    // Group valid rows by object
    const objects = new Map<string, PreviewRow[]>();
    for (const r of valid) {
      const k = r.data.objectName;
      if (!objects.has(k)) objects.set(k, []);
      objects.get(k)!.push(r);
    }

    const total = objects.size + valid.length;
    onProgress({ current: 0, total });
    let success = 0, errors = 0, cur = 0;

    for (const [objName, objRows] of objects) {
      try {
        let objectId: string;
        const existing = existingObjects.find(o => o.name.toLowerCase() === objName.toLowerCase());

        if (existing) {
          objectId = existing.id;
        } else {
          const first = objRows[0].data;
          const d = await api.post<{ id: string }>('/api/business-objects/definitions', {
            client_id: clientId,
            name: objName,
            slug: generateSlug(objName) + '_' + Date.now(),
            description: first.objectDesc || null,
            icon: first.objectIcon || null,
            color: first.objectColor || null,
          });
          objectId = d.id;
        }
        onProgress({ current: ++cur, total });

        // Create fields
        for (let idx = 0; idx < objRows.length; idx++) {
          const row = objRows[idx];
          try {
            await api.post(`/api/business-objects/${objectId}/fields`, {
              name: row.data.fieldName,
              slug: generateSlug(row.data.fieldName) + '_' + Date.now(),
              field_type: row.data.fieldType,
              description: row.data.fieldDesc || null,
              is_required: row.data.fieldRequired === '1',
              placeholder: row.data.fieldPlaceholder || null,
              display_order: idx + 1,
            });
            success++;
          } catch {
            errors++;
          }
          onProgress({ current: ++cur, total });
        }
      } catch {
        errors += objRows.length + 1;
        cur += objRows.length + 1;
        onProgress({ current: cur, total });
      }
    }

    return { successCount: success, errorCount: errors };
  }, [clientId, existingObjects, buildPreview]);

  // -- renderPreview --
  const renderPreview = useCallback((rows: PreviewRow[]) => {
    const entries = groupByObject(rows);
    const totalObjects = entries.length;
    const totalFields = entries.reduce((s, [, g]) => s + g.rows.filter(r => !r.hasError).length, 0);
    const existingCount = entries.filter(([, g]) => g.existsInDb).length;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={<FileText className="h-5 w-5 text-primary" />} value={totalObjects} label="Objet(s)" />
          <StatCard icon={<Layers className="h-5 w-5 text-primary" />} value={totalFields} label="Champ(s)" />
          {existingCount > 0 && <StatCard icon={<FileText className="h-5 w-5 text-warning" />} value={existingCount} label="Existant(s)" bg="bg-amber-500/10" />}
        </div>

        <Card>
          <CardHeader className="pb-2"><span className="font-semibold">Aperçu de l'import</span></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.map(([objName, group]) => {
                const isOpen = expanded.has(objName);
                const valid = group.rows.filter(r => !r.hasError);
                return (
                  <div key={objName} className="border rounded-lg overflow-hidden">
                    <Collapsible open={isOpen} onOpenChange={() => toggle(objName)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors text-left h-auto">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg"
                              style={{ backgroundColor: group.color ? `${group.color}20` : undefined }}
                            >
                              <FileText className="h-4 w-4" style={{ color: group.color || undefined }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{objName}</span>
                                {group.existsInDb && <Chip variant="outline" className="text-xs">Existe</Chip>}
                              </div>
                              {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Chip variant="default">{valid.length} champ(s)</Chip>
                            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Champ</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Obligatoire</TableHead>
                                <TableHead>Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {valid.map((row, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{row.data.fieldName}</TableCell>
                                  <TableCell>
                                    <Chip variant="default">{getFieldTypeLabel(row.data.fieldType)}</Chip>
                                  </TableCell>
                                  <TableCell>
                                    {row.data.fieldRequired === '1' ? (
                                      <CheckCircle2 className="h-4 w-4 text-success" />
                                    ) : (
                                      <span className="text-muted-foreground">&mdash;</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {row.data.fieldDesc || '\u2014'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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
      <EmptyState icon={FileText} title="Sélectionnez un client pour importer des objets métiers" />
    );
  }

  const config: ImportWizardConfig = {
    title: "Import d'objets métiers",
    backPath: cp(CLIENT_ROUTES.BUSINESS_OBJECTS),
    fields: FIELDS,
    autoMap,
    templateContent,
    templateFileName: 'template_objets_metiers.csv',
    canProceed: (mapping) => {
      const m = new Set(Object.values(mapping));
      return m.has('object_name') && m.has('field_name') && m.has('field_type');
    },
    buildPreview,
    onImport,
    renderPreview,
    onImportComplete: (result) => { if (result.errorCount === 0) navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS)); },
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
