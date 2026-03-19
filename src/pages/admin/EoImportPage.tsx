import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { api } from '@/lib/api-client';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2 } from 'lucide-react';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { useEoFieldDefinitions, useEoSystemNameField, useEoSystemIsActiveField } from '@/hooks/useEoFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { toast } from 'sonner';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import { type ImportWizardConfig, type PreviewRow, type FieldMapping, type ParsedRow, type ImportProgress } from '@/components/admin/import/types';
import {
  buildHierarchy,
  treeToPreviewRows,
  flattenEntityTree,
  slugFromCode,
  type MappedEntity,
  type ReparentChange,
  type EoImportResult,
} from '@/lib/eo/eo-hierarchy-builder';
import { EoImportPreview } from '@/pages/admin/EoImportPreview';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORE_FIELDS = [
  { id: 'name', label: 'Nom', required: true },
  { id: 'parent_name', label: 'Nom parent', required: false, isParentField: true },
  { id: 'is_active', label: 'Statut (actif/inactif)', required: false },
] as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function EoImportPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: existingEntities = [] } = useOrganizationalEntities(selectedClient?.id);
  const { data: customFields = [] } = useEoFieldDefinitions(selectedClient?.id || '');
  const { data: systemNameField } = useEoSystemNameField(selectedClient?.id);
  const { data: systemIsActiveField } = useEoSystemIsActiveField(selectedClient?.id);
  const clientId = selectedClient?.id || '';
  const clientName = selectedClient?.name || '';

  // We keep a ref to the latest tree+reparent data so renderPreview can access it
  const [cachedTree, setCachedTree] = useState<MappedEntity[]>([]);
  const [cachedReparentChanges, setCachedReparentChanges] = useState<ReparentChange[]>([]);
  const [cachedErrors, setCachedErrors] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<EoImportResult[]>([]);

  // Labels actif/inactif from system field settings
  const activeLabels = useMemo(() => {
    const boolLabels = (systemIsActiveField?.settings as Record<string, unknown> | null)?.boolean_labels as { true_label?: string; false_label?: string } | undefined;
    return {
      trueLabel: boolLabels?.true_label || 'Actif',
      falseLabel: boolLabels?.false_label || 'Inactif',
    };
  }, [systemIsActiveField]);

  // Combined fields: core (with customized labels) + dynamic custom EO fields
  const nameLabel = systemNameField?.name || 'Nom';
  const activeLabel = systemIsActiveField?.name || 'Statut (actif/inactif)';
  const allFields = useMemo(() => {
    const core = [
      { id: 'name', label: nameLabel, required: true },
      { id: 'parent_name', label: `${nameLabel} parent`, required: false },
      { id: 'is_active', label: activeLabel, required: false },
    ];
    const custom = customFields
      .filter(f => f.is_active)
      .map(f => ({ id: `custom_${f.id}`, label: f.name, required: f.is_required }));
    return [...core, ...custom];
  }, [customFields, nameLabel, activeLabel]);

  // -- autoMap --
  const autoMap = useCallback((headers: string[]): FieldMapping => {
    const m: FieldMapping = {};
    const usedTargets = new Set<string>();

    const assign = (header: string, targetId: string) => {
      if (usedTargets.has(targetId)) return;
      m[header] = targetId;
      usedTargets.add(targetId);
    };

    headers.forEach(header => {
      const n = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (n.includes('parent')) {
        assign(header, 'parent_name');
      } else if (n.includes('nom') || n.includes('name')) {
        assign(header, 'name');
      } else if (n.includes('statut') || n.includes('status') || n.includes('actif') || n.includes('active')) {
        assign(header, 'is_active');
      } else {
        const match = customFields.find(f => {
          if (!f.is_active) return false;
          const fn = f.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const fs = f.slug.toLowerCase();
          return n.includes(fn) || n.includes(fs) || fn.includes(n) || fs.includes(n);
        });
        if (match) assign(header, `custom_${match.id}`);
      }
    });

    return m;
  }, [customFields]);

  // -- buildPreview --
  const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
    const { tree, errors, reparentChanges } = buildHierarchy(rows, mapping, existingEntities, customFields, activeLabels);
    setCachedTree(tree);
    setCachedReparentChanges(reparentChanges);
    setCachedErrors(errors);

    // Collapse all nodes by default
    const allCodes = new Set<string>();
    const collectCodes = (entities: MappedEntity[]) => {
      entities.forEach(e => { if (e.children.length > 0) { allCodes.add(e.code); collectCodes(e.children); } });
    };
    collectCodes(tree);

    return treeToPreviewRows(tree);
  }, [existingEntities, customFields, activeLabels]);

  // -- onImport --
  const onImport = useCallback(async (
    _rows: ParsedRow[],
    _mapping: FieldMapping,
    onProgress: (p: ImportProgress) => void,
  ) => {
    const allEntities = flattenEntityTree(cachedTree);

    const newEntities = allEntities.filter(e => !e.isExistingUpdate);
    newEntities.sort((a, b) => a.level - b.level);

    const totalOps = newEntities.length + cachedReparentChanges.length;
    onProgress({ current: 0, total: totalOps });

    const codeToId = new Map<string, string>();
    const nameToId = new Map<string, string>();
    existingEntities.forEach(e => { if (e.code) codeToId.set(e.code, e.id); nameToId.set(e.name.toLowerCase(), e.id); });

    let successCount = 0;
    let reparentCount = 0;
    let errorCount = 0;
    const results: EoImportResult[] = [];

    allEntities.forEach(e => {
      if (e.hasError) results.push({ code: e.code, name: e.name, parentCode: e.parent_code, level: e.level + 1, status: 'Ignoré (erreur pré-import)', anomaly: e.errorMessage || 'Erreur inconnue' });
    });

    let cur = 0;
    for (const entity of newEntities) {
      if (entity.hasError) { errorCount++; onProgress({ current: ++cur, total: totalOps }); continue; }
      try {
        let parentId: string | null = null;
        if (entity.parent_code) parentId = codeToId.get(entity.parent_code) || null;
        else if (entity.parent_name) parentId = nameToId.get(entity.parent_name.toLowerCase()) || null;

        const data = await api.post<{ id: string }>('/api/organizational-entities', {
          client_id: clientId, code: entity.code, name: entity.name, slug: slugFromCode(entity.code), parent_id: parentId, is_active: entity.is_active, level: entity.level,
        });

        codeToId.set(entity.code, data.id);
        nameToId.set(entity.name.toLowerCase(), data.id);

        if (Object.keys(entity.customFieldValues).length > 0) {
          const fv = Object.entries(entity.customFieldValues).map(([fieldDefId, value]) => ({ eo_id: data.id, field_definition_id: fieldDefId, value: JSON.stringify(value) }));
          await api.post(`/api/organizational-entities/${data.id}/field-values`, fv);
        }

        successCount++;
        results.push({ code: entity.code, name: entity.name, parentCode: entity.parent_code, level: entity.level + 1, status: 'Créé', anomaly: '' });
      } catch (err: unknown) {
        console.error('Error creating entity:', err);
        errorCount++;
        results.push({ code: entity.code, name: entity.name, parentCode: entity.parent_code, level: entity.level + 1, status: 'Erreur', anomaly: err instanceof Error ? err.message : String(err) });
      }
      onProgress({ current: ++cur, total: totalOps });
    }

    for (const change of cachedReparentChanges) {
      try {
        let newParentId = change.newParentId;
        if (!newParentId && change.newParentCode) newParentId = codeToId.get(change.newParentCode) || null;
        await api.patch(`/api/organizational-entities/${change.entityId}`, { parent_id: newParentId });
        reparentCount++;
        results.push({ code: change.code, name: change.name, parentCode: change.newParentCode, level: 0, status: 'Déplacé', anomaly: `Ancien parent: ${change.oldParentName || 'Racine'}` });
      } catch (err: unknown) {
        console.error('Error reparenting entity:', err);
        errorCount++;
        results.push({ code: change.code, name: change.name, parentCode: change.newParentCode, level: 0, status: 'Erreur', anomaly: err instanceof Error ? err.message : String(err) });
      }
      onProgress({ current: ++cur, total: totalOps });
    }

    setImportResults(results);

    const messages: string[] = [];
    if (successCount > 0) messages.push(`${successCount} créée${successCount > 1 ? 's' : ''}`);
    if (reparentCount > 0) messages.push(`${reparentCount} déplacée${reparentCount > 1 ? 's' : ''}`);

    if (errorCount === 0) toast.success(`Import terminé : ${messages.join(', ')}`);
    else toast.warning(`Import terminé : ${messages.join(', ')}, ${errorCount} erreur${errorCount > 1 ? 's' : ''}`);

    return { successCount: successCount + reparentCount, errorCount };
  }, [cachedTree, cachedReparentChanges, existingEntities, clientId]);

  const downloadControlReport = useCallback(() => {
    const esc = (val: string) => (val.includes(';') || val.includes('"') || val.includes('\n')) ? `"${val.replace(/"/g, '""')}"` : val;
    const headers = ['Code', 'Nom', 'Parent', 'Niveau', 'Statut', 'Anomalie'];
    const rows = importResults.map(r => [r.code, r.name, r.parentCode || '', String(r.level), r.status, r.anomaly].map(esc).join(';'));
    const csv = [headers.join(';'), ...rows].join('\n');
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `controle_import_eo_${clientName.replace(/\s+/g, '_').toLowerCase()}_${date}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success('Rapport de contrôle téléchargé');
  }, [importResults, clientName]);

  // -- renderPreview --
  const renderPreview = useCallback((_rows: PreviewRow[], _previewErrors: string[], onCancel?: () => void) => {
    return (
      <EoImportPreview
        cachedTree={cachedTree}
        cachedErrors={cachedErrors}
        cachedReparentChanges={cachedReparentChanges}
        importResults={importResults}
        customFields={customFields}
        downloadControlReport={downloadControlReport}
        onCancel={onCancel}
      />
    );
  }, [cachedTree, cachedErrors, cachedReparentChanges, importResults, customFields, downloadControlReport]);

  // -- templateContent --
  const templateContent = useCallback((): string => {
    const coreHeaders = CORE_FIELDS.map(f => f.label);
    const customHeaders = customFields.filter(f => f.is_active).map(f => f.name);
    const headers = [...coreHeaders, ...customHeaders];
    const example = ['', 'Siège Social', '', '', ...customHeaders.map(() => '')];
    return [headers.join(';'), example.join(';')].join('\n');
  }, [customFields]);

  // -- no client fallback --
  if (!selectedClient) {
    return (
      <EmptyState icon={Building2} title="Sélectionnez un client pour importer des entités" />
    );
  }

  const config: ImportWizardConfig = {
    title: 'Import des entités',
    backPath: cp(CLIENT_ROUTES.ENTITIES),
    fields: allFields,
    autoMap,
    templateContent,
    templateFileName: `template_entites_${clientName.replace(/\s+/g, '_').toLowerCase()}.csv`,
    canProceed: (mapping) => new Set(Object.values(mapping)).has('name'),
    buildPreview,
    onImport,
    renderPreview,
    hideDefaultStats: true,
    onImportComplete: (result) => { if (result.errorCount === 0) navigate(cp(CLIENT_ROUTES.ENTITIES)); },
  };

  return <ImportWizard config={config} />;
}
