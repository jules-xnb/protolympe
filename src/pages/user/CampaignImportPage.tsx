import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import {
  reverseMapping,
  type ImportWizardConfig,
  type PreviewRow,
  type FieldMapping,
  type ParsedRow,
  type ImportProgress,
} from '@/components/admin/import/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys } from '@/lib/query-keys';

// ─── Types ────────────────────────────────────────────────────────────────

interface FieldDef {
  id: string;
  name: string;
  slug: string;
  field_type: string;
  is_required: boolean;
  is_system: boolean;
}

interface ResponseRow {
  id: string;
  respondent_eo_id: string;
  business_object_id: string | null;
  status: string;
  organizational_entities: { id: string; name: string; code: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function buildAutoMap(headers: string[], fieldDefs: FieldDef[]): FieldMapping {
  const m: FieldMapping = {};
  for (const h of headers) {
    const n = normalize(h);
    // EO columns
    if (n === 'entite' || n === 'entity' || n === 'nom entite' || n === 'nom de l\'entite' || (n.includes('entit') && n.includes('nom'))) {
      m[h] = '__eo_name';
      continue;
    }
    if (n === 'code' || n === 'code entite' || (n.includes('code') && n.includes('entit'))) {
      m[h] = '__eo_code';
      continue;
    }
    // Match field definitions by name or slug
    const match = fieldDefs.find(f => {
      const fn = normalize(f.name);
      const fs = normalize(f.slug);
      return fn === n || fs === n;
    });
    if (match) m[h] = match.id;
  }
  return m;
}

function convertValue(raw: string, fieldType: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (fieldType === 'number') {
    const n = parseInt(trimmed, 10);
    return isNaN(n) ? trimmed : n;
  }
  if (fieldType === 'decimal' || fieldType === 'currency') {
    const n = parseFloat(trimmed.replace(',', '.'));
    return isNaN(n) ? trimmed : n;
  }
  if (fieldType === 'checkbox' || fieldType === 'boolean') {
    const lower = trimmed.toLowerCase();
    return lower === 'true' || lower === 'oui' || lower === '1';
  }
  return trimmed;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function CampaignImportPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clientId } = useParams<{ clientId: string }>();

  // Load campaign data
  const { data: campaignData, isLoading } = useQuery({
    queryKey: ['campaign-import', campaignId],
    queryFn: async () => {
      return api.get<{
        campaign: { id: string; name: string; survey: Record<string, unknown> };
        fieldDefs: FieldDef[];
        responses: ResponseRow[];
      }>(`/api/surveys/campaigns/${campaignId!}/import-data`);
    },
    enabled: !!campaignId,
  });

  // Import fields for mapping
  const importFields = useMemo(() => {
    if (!campaignData) return [];
    return [
      { id: '__eo_name', label: 'Nom de l\'entité', required: true },
      { id: '__eo_code', label: 'Code de l\'entité', required: false },
      ...campaignData.fieldDefs
        .filter(f => !f.is_system)
        .map(f => ({ id: f.id, label: f.name, required: false })),
    ];
  }, [campaignData]);

  // Lookup maps
  const { eoNameMap, eoCodeMap } = useMemo(() => {
    const nameMap = new Map<string, ResponseRow>();
    const codeMap = new Map<string, ResponseRow>();
    for (const resp of campaignData?.responses || []) {
      const eo = resp.organizational_entities;
      if (eo?.name) nameMap.set(eo.name.toLowerCase(), resp);
      if (eo?.code) codeMap.set(eo.code.toLowerCase(), resp);
    }
    return { eoNameMap: nameMap, eoCodeMap: codeMap };
  }, [campaignData]);

  // buildPreview
  const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
    const r = reverseMapping(mapping);

    return rows.map((row) => {
      const eoName = r['__eo_name'] ? row[r['__eo_name']]?.trim() : '';
      const eoCode = r['__eo_code'] ? row[r['__eo_code']]?.trim() : '';

      const match = (eoName ? eoNameMap.get(eoName.toLowerCase()) : undefined)
        || (eoCode ? eoCodeMap.get(eoCode.toLowerCase()) : undefined);

      if (!match) {
        return {
          data: { eoName, eoCode },
          hasError: true,
          errorMessage: `Entité "${eoName || eoCode}" non trouvée`,
        };
      }

      if (!match.business_object_id) {
        return {
          data: { eoName, eoCode },
          hasError: true,
          errorMessage: 'Aucun objet métier lié',
        };
      }

      // Collect mapped field values
      const fieldValues: Record<string, string> = {};
      let fieldCount = 0;
      for (const [csvCol, fieldId] of Object.entries(mapping)) {
        if (fieldId.startsWith('__')) continue;
        const val = row[csvCol]?.trim() || '';
        if (val) fieldCount++;
        fieldValues[fieldId] = val;
      }

      return {
        data: {
          eoName: eoName || match.organizational_entities?.name || '',
          eoCode: eoCode || match.organizational_entities?.code || '',
          responseId: match.id,
          boId: match.business_object_id,
          fieldCount: String(fieldCount),
          ...fieldValues,
        },
        hasError: false,
      };
    });
  }, [eoNameMap, eoCodeMap]);

  // onImport
  const onImport = useCallback(async (
    rows: ParsedRow[],
    mapping: FieldMapping,
    onProgress: (p: ImportProgress) => void,
  ) => {
    const r = reverseMapping(mapping);
    const fieldDefs = campaignData?.fieldDefs || [];
    let successCount = 0;
    let errorCount = 0;
    const details: Array<{ label: string; status: 'success' | 'error'; error?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const eoName = r['__eo_name'] ? row[r['__eo_name']]?.trim() : '';
      const eoCode = r['__eo_code'] ? row[r['__eo_code']]?.trim() : '';
      const label = eoName || eoCode || `Ligne ${i + 1}`;

      const match = (eoName ? eoNameMap.get(eoName.toLowerCase()) : undefined)
        || (eoCode ? eoCodeMap.get(eoCode.toLowerCase()) : undefined);

      if (!match?.business_object_id) {
        errorCount++;
        details.push({ label, status: 'error', error: 'Entité non trouvée' });
        onProgress({ current: i + 1, total: rows.length });
        continue;
      }

      try {
        const fieldValues: Array<{
          field_definition_id: string;
          value: unknown;
        }> = [];

        for (const [csvCol, fieldId] of Object.entries(mapping)) {
          if (fieldId.startsWith('__')) continue;
          const rawValue = row[csvCol]?.trim();
          if (!rawValue) continue;

          const fieldDef = fieldDefs.find(f => f.id === fieldId);
          const value = fieldDef ? convertValue(rawValue, fieldDef.field_type) : rawValue;

          fieldValues.push({ field_definition_id: fieldId, value });
        }

        if (fieldValues.length > 0) {
          await api.post(`/api/business-objects/${match.business_object_id}/field-values/upsert`, {
            field_values: fieldValues,
          });
        }

        successCount++;
        details.push({ label, status: 'success' });
      } catch (err: unknown) {
        errorCount++;
        details.push({ label, status: 'error', error: err instanceof Error ? err.message : 'Erreur inconnue' });
      }

      onProgress({ current: i + 1, total: rows.length });
    }

    return { successCount, errorCount, details };
  }, [campaignData, eoNameMap, eoCodeMap]);

  // renderPreview
  const renderPreview = useCallback((rows: PreviewRow[]) => {
    const fieldCols = (campaignData?.fieldDefs || []).filter(f => !f.is_system).slice(0, 6);
    return (
      <div className="overflow-auto max-h-[400px] border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entité</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Statut</TableHead>
              {fieldCols.map(f => (
                <TableHead key={f.id} className="whitespace-nowrap">{f.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className={row.hasError ? 'bg-destructive/5' : ''}>
                <TableCell className="font-medium">{row.data.eoName || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{row.data.eoCode || '-'}</TableCell>
                <TableCell>
                  {row.hasError
                    ? <Chip variant="error" className="text-xs">{row.errorMessage}</Chip>
                    : <Chip variant="success" className="text-xs">OK — {row.data.fieldCount} champ(s)</Chip>
                  }
                </TableCell>
                {fieldCols.map(f => (
                  <TableCell key={f.id} className="text-muted-foreground text-sm">
                    {row.data[f.id] || '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }, [campaignData]);

  // Template
  const templateContent = useCallback(() => {
    const fields = (campaignData?.fieldDefs || []).filter(f => !f.is_system);
    const headers = ['Nom entité', 'Code entité', ...fields.map(f => f.name)];
    const rows = (campaignData?.responses || []).map(resp => {
      const eo = resp.organizational_entities;
      return [
        eo?.name || '',
        eo?.code || '',
        ...fields.map(() => ''),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';');
    });
    return [headers.join(';'), ...rows].join('\n');
  }, [campaignData]);

  // Wizard config
  const wizardConfig: ImportWizardConfig = useMemo(() => ({
    title: `Importer — ${campaignData?.campaign.name || 'Campagne'}`,
    backPath: `/dashboard/${clientId}/user/campaigns/${campaignId}?manager=1&import=1`,
    fields: importFields,
    autoMap: (headers) => buildAutoMap(headers, campaignData?.fieldDefs || []),
    templateContent,
    templateFileName: `template_import_${campaignData?.campaign.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'campagne'}.csv`,
    buildPreview,
    onImport,
    renderPreview,
    onImportComplete: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignFieldColumns.byCampaign('', 0) });
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'filtered_campaign_responses' });
    },
    backLabel: 'Retour à la campagne',
  }), [campaignData, importFields, templateContent, buildPreview, onImport, renderPreview, queryClient]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return <ImportWizard config={wizardConfig} />;
}
