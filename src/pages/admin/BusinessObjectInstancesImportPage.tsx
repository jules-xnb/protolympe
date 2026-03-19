import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { useBusinessObjectDefinition } from '@/hooks/useBusinessObjectDefinitions';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { useAuth } from '@/hooks/useAuth';
import { parseBoolean } from '@/lib/csv-parser';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import type {
  ImportWizardConfig,
  PreviewRow,
  FieldMapping,
  ParsedRow,
  ImportProgress,
} from '@/components/admin/import/types';
import { reverseMapping } from '@/components/admin/import/types';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface MappedInstance {
  eo_code: string;
  eo_id?: string;
  field_values: Record<string, unknown>;
  hasError: boolean;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function BusinessObjectInstancesImportPage() {
  const { id: definitionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { user } = useAuth();
  const { data: definition, isLoading: loadingDefinition } = useBusinessObjectDefinition(definitionId);
  const { data: fields = [] } = useFieldDefinitions(definitionId);
  const { data: entities = [] } = useOrganizationalEntities(selectedClient?.id);

  // Cached domain data
  const [cachedInstances, setCachedInstances] = useState<MappedInstance[]>([]);
  const [cachedErrors, setCachedErrors] = useState<string[]>([]);

  // Entity lookup by code
  const entityByCode = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    entities.forEach(e => {
      if (e.code) map.set(e.code.toLowerCase(), { id: e.id, name: e.name });
    });
    return map;
  }, [entities]);

  // -- fields --
  const allFields = useMemo(() => {
    const baseOptions = [
      { id: 'eo_code', label: 'Code Entité Org.', required: true },
    ];

    const fieldOptions = fields.map(f => ({
      id: `field_${f.slug}`,
      label: f.name,
      required: f.is_required,
    }));

    return [...baseOptions, ...fieldOptions];
  }, [fields]);

  // -- autoMap --
  const autoMap = useCallback((headers: string[]): FieldMapping => {
    const m: FieldMapping = {};
    headers.forEach(header => {
      const normalized = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (normalized === 'title' || normalized === 'titre') {
        m[header] = 'title';
      } else if (normalized.includes('eo') || normalized.includes('entite') || normalized.includes('entity')) {
        m[header] = 'eo_code';
      } else {
        const matchingField = fields.find(f =>
          f.slug.toLowerCase() === normalized ||
          f.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalized
        );
        if (matchingField) {
          m[header] = `field_${matchingField.slug}`;
        }
      }
    });
    return m;
  }, [fields]);

  // -- buildPreview --
  const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
    const errors: string[] = [];
    const instances: MappedInstance[] = [];
    const r = reverseMapping(mapping);

    rows.forEach((row, index) => {
      const eoCodeCol = r['eo_code'];
      const eoCode = row[eoCodeCol]?.trim();

      if (!eoCode) {
        errors.push(`Ligne ${index + 2}: Code entité manquant`);
        return;
      }

      // Resolve EO
      const entity = entityByCode.get(eoCode.toLowerCase());
      if (!entity) {
        errors.push(`Ligne ${index + 2}: Entité "${eoCode}" non trouvée`);
        return;
      }

      // Build field values
      const field_values: Record<string, unknown> = {};
      fields.forEach(field => {
        const col = r[`field_${field.slug}`];
        if (col && row[col]) {
          let value: unknown = row[col].trim();

          switch (field.field_type) {
            case 'number':
              value = parseInt(value, 10);
              if (isNaN(value)) value = null;
              break;
            case 'decimal':
              value = parseFloat(value.replace(',', '.'));
              if (isNaN(value)) value = null;
              break;
            case 'checkbox':
              value = parseBoolean(value);
              break;
            case 'multiselect':
              value = value.split('|').map((v: string) => v.trim()).filter(Boolean);
              break;
          }

          if (value !== null && value !== '') {
            field_values[field.id] = value;
          }
        }
      });

      instances.push({
        eo_code: eoCode,
        eo_id: entity.id,
        field_values,
        hasError: false,
      });
    });

    setCachedInstances(instances);
    setCachedErrors(errors);

    return instances.map(inst => ({
      data: {
        eo_code: inst.eo_code,
        fieldCount: `${Object.keys(inst.field_values).length} / ${fields.length}`,
      },
      hasError: inst.hasError,
      errorMessage: inst.errorMessage,
    }));
  }, [entityByCode, fields]);

  // -- onImport --
  const onImport = useCallback(async (
    _rows: ParsedRow[],
    _mapping: FieldMapping,
    onProgress: (p: ImportProgress) => void,
  ) => {
    if (!definition || !user) {
      return { successCount: 0, errorCount: 1 };
    }

    onProgress({ current: 0, total: cachedInstances.length });

    let successCount = 0;
    let errorCount = 0;

    for (const instance of cachedInstances) {
      try {
        const objData = await api.post<{ id: string }>(`/api/business-objects/instances`, {
          definition_id: definition.id,
          eo_id: instance.eo_id!,
          created_by_user_id: user.id,
          reference_number: '',
        });

        // Insert field values
        const fieldValueInserts = Object.entries(instance.field_values).map(([fieldId, value]) => ({
          business_object_id: objData.id,
          field_definition_id: fieldId,
          value: typeof value === 'object' ? value : { value },
        }));

        if (fieldValueInserts.length > 0) {
          try {
            await api.post(`/api/business-objects/instances/${objData.id}/field-values`, fieldValueInserts);
          } catch (valuesError) {
            console.error('Error inserting field values:', valuesError);
          }
        }

        successCount++;
      } catch (err: unknown) {
        console.error('Error creating instance:', err);
        errorCount++;
      }

      onProgress({ current: successCount + errorCount, total: cachedInstances.length });
    }

    return { successCount, errorCount };
  }, [cachedInstances, definition, user]);

  // -- renderPreview --
  const renderPreview = useCallback((_rows: PreviewRow[], _previewErrors: string[]) => {
    return (
      <div className="space-y-4">
        {/* Errors */}
        {cachedErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreurs détectées</AlertTitle>
            <AlertDescription>
              <ScrollArea className="h-32 mt-2">
                <ul className="list-disc pl-4 space-y-1">
                  {cachedErrors.map((error, i) => (
                    <li key={i} className="text-sm">{error}</li>
                  ))}
                </ul>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Champs remplis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cachedInstances.map((instance, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {instance.hasError ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{instance.eo_code}</TableCell>
                  <TableCell>
                    <Chip variant="default">
                      {Object.keys(instance.field_values).length} / {fields.length}
                    </Chip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  }, [cachedInstances, cachedErrors, fields.length]);

  // -- renderUploadExtra (object info banner) --
  const renderUploadExtra = useCallback(() => {
    if (!definition) return null;

    const IconComponent = definition.icon
      ? (LucideIcons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[definition.icon] || FileText
      : FileText;

    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 w-full max-w-2xl mt-6">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: definition.color ? `${definition.color}20` : undefined }}
        >
          <IconComponent
            className="h-5 w-5"
            style={{ color: definition.color || undefined }}
          />
        </div>
        <div>
          <p className="font-medium">{definition.name}</p>
          <p className="text-sm text-muted-foreground">{fields.length} champs configurés</p>
        </div>
      </div>
    );
  }, [definition, fields.length]);

  // -- templateContent --
  const templateContent = useCallback((): string => {
    const baseColumns = ['title', 'eo_code'];
    const fieldColumns = fields.map(f => f.slug);
    const allColumns = [...baseColumns, ...fieldColumns];

    const headerLabels = [
      'Titre',
      'Code Entité Org.',
      ...fields.map(f => f.name),
    ];

    const sampleValues = [
      'Exemple de titre',
      'EO-001',
      ...fields.map(f => {
        switch (f.field_type) {
          case 'text': return 'Texte exemple';
          case 'textarea': return 'Description longue...';
          case 'number': return '42';
          case 'decimal': return '99.99';
          case 'date': return '2026-01-22';
          case 'datetime': return '2026-01-22T10:30:00';
          case 'time': return '10:30';
          case 'checkbox': return 'oui';
          case 'email': return 'exemple@email.com';
          case 'phone': return '+33612345678';
          case 'url': return 'https://exemple.com';
          case 'select': return 'Valeur 1';
          case 'multiselect': return 'Valeur 1|Valeur 2';
          default: return '';
        }
      }),
    ];

    return [
      allColumns.join(';'),
      headerLabels.join(';'),
      sampleValues.join(';'),
    ].join('\n');
  }, [fields]);

  // -- Loading / Not found guards --
  if (loadingDefinition) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!definition) {
    return (
      <EmptyState
        icon={FileText}
        title="Objet métier non trouvé"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS))}>
            Retour <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />
    );
  }

  const config: ImportWizardConfig = {
    title: `Import d'instances - ${definition.name}`,
    backPath: cp(CLIENT_ROUTES.BUSINESS_OBJECT_DETAIL(definitionId!)),
    fields: allFields,
    autoMap,
    templateContent,
    templateFileName: `template_instances_${definition.slug || 'objet'}.csv`,
    canProceed: (mapping) => new Set(Object.values(mapping)).has('eo_code'),
    buildPreview,
    onImport,
    renderPreview,
    renderUploadExtra,
    onImportComplete: (result) => {
      if (result.errorCount === 0) navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS));
    },
  };

  return <ImportWizard config={config} />;
}
