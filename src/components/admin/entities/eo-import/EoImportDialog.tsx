import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useCreateOrganizationalEntity, OrganizationalEntityWithClient } from '@/hooks/useOrganizationalEntities';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { toast } from 'sonner';
import { EoUploadStep } from './EoUploadStep';
import { EoImportValidation } from './EoImportValidation';
import { EoImportPreview } from './EoImportPreview';
import { EoImportProgress } from './EoImportProgress';
import {
  parseCSV,
  autoSuggestMapping,
  applyMappingChange,
  buildAllFields,
  buildEntityTree,
  flattenEntityTree,
  generateSlug,
} from '@/lib/eo/eo-import-logic';
import type { Step, ParsedRow } from './types';
import { queryKeys } from '@/lib/query-keys';

interface EoImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  existingEntities: OrganizationalEntityWithClient[];
}

export function EoImportDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  existingEntities,
}: EoImportDialogProps) {
  const queryClient = useQueryClient();
  const createEntity = useCreateOrganizationalEntity();
  const { data: customFields = [] } = useEoFieldDefinitions(clientId);

  const allFields = useMemo(() => buildAllFields(customFields), [customFields]);

  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [showFieldForm, setShowFieldForm] = useState(false);

  const resetState = () => {
    setStep('upload');
    setCsvData([]);
    setCsvHeaders([]);
    setMapping({});
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const processFile = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvData(rows);
      setMapping(autoSuggestMapping(headers, rows, existingEntities));
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const handleMappingChange = useCallback((csvColumn: string, dbField: string) => {
    setMapping(prev => applyMappingChange(prev, csvColumn, dbField));
  }, []);

  const usedDbFields = useMemo(() => {
    return new Set(Object.values(mapping));
  }, [mapping]);

  const canProceedToPreview = useMemo(() => {
    return usedDbFields.has('code') && usedDbFields.has('name');
  }, [usedDbFields]);

  // Build tree for import orchestration and footer state
  const { tree: previewTree, errors: previewErrors } = useMemo(() => {
    if (step !== 'preview' && step !== 'importing') return { tree: [], errors: [] };
    return buildEntityTree(csvData, mapping, existingEntities, customFields);
  }, [step, csvData, mapping, existingEntities, customFields]);

  const hasErrors = previewErrors.length > 0;

  const handleImport = async () => {
    setIsImporting(true);
    setStep('importing');

    const allEntities = flattenEntityTree(previewTree);

    // Sort by level to ensure parents are created first
    allEntities.sort((a, b) => a.level - b.level);

    setImportProgress({ current: 0, total: allEntities.length });

    // Map code to created ID and name to ID
    const normImport = (s: string) => s.trim().toLowerCase().normalize('NFC');
    const codeToId = new Map<string, string>();
    const nameToId = new Map<string, string>();

    // Also map existing entities
    existingEntities.forEach(e => {
      if (e.code) codeToId.set(e.code, e.id);
      nameToId.set(normImport(e.name), e.id);
    });

    let successCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    for (const entity of allEntities) {
      if (entity.hasError) {
        errorCount++;
        setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
        continue;
      }

      try {
        // Resolve parent ID with fallback: try code then name
        let parentId: string | null = null;
        const parentRef = entity.parent_code || entity.parent_name;
        if (parentRef) {
          parentId = codeToId.get(parentRef)
            || nameToId.get(normImport(parentRef))
            || null;
        }

        let resultId: string;

        if (entity.isUpdate && entity.existingEntityId) {
          // UPDATE existing entity
          await api.patch(`/api/organizational-entities/${entity.existingEntityId}`, {
            name: entity.name,
            parent_id: parentId,
            description: entity.description || null,
            is_active: entity.is_active,
          });
          resultId = entity.existingEntityId;
          updateCount++;
        } else {
          // CREATE new entity
          const result = await createEntity.mutateAsync({
            client_id: clientId,
            name: entity.name,
            slug: generateSlug(entity.name),
            code: entity.code,
            parent_id: parentId,
            description: entity.description || null,
            is_active: entity.is_active,
            level: entity.level,
          });
          resultId = result.id;
        }

        codeToId.set(entity.code, resultId);
        nameToId.set(normImport(entity.name), resultId);

        // Upsert custom field values
        if (Object.keys(entity.customFieldValues).length > 0) {
          const fieldValueInserts = Object.entries(entity.customFieldValues).map(([fieldDefId, value]) => ({
            eo_id: resultId,
            field_definition_id: fieldDefId,
            value: value,
          }));

          try {
            await api.post(`/api/organizational-entities/${resultId}/field-values`, fieldValueInserts);
          } catch (fieldError) {
            console.error(`Error inserting custom fields for ${entity.code}:`, fieldError);
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Error importing ${entity.code}:`, error);
        errorCount++;
      }

      setImportProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: queryKeys.organizationalEntities.root() });
    queryClient.invalidateQueries({ queryKey: queryKeys.eoAuditLog.byEntity('') });
    setIsImporting(false);

    if (errorCount === 0) {
      const parts: string[] = [];
      if (successCount - updateCount > 0) parts.push(`${successCount - updateCount} créées`);
      if (updateCount > 0) parts.push(`${updateCount} mises à jour`);
      toast.success(`${parts.join(', ')} avec succès`);
      handleClose();
    } else {
      toast.warning(`Import terminé: ${successCount} réussies (dont ${updateCount} mises à jour), ${errorCount} erreurs`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import des entités organisationnelles
          </DialogTitle>
          <DialogDescription>
            Importez des entités pour {clientName} depuis un fichier CSV
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2 border-b">
          {['upload', 'mapping', 'preview', 'importing'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : ['upload', 'mapping', 'preview', 'importing'].indexOf(step) > i
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                <span>{i + 1}</span>
                <span className="hidden sm:inline">
                  {s === 'upload' && 'Fichier'}
                  {s === 'mapping' && 'Mapping'}
                  {s === 'preview' && 'Aperçu'}
                  {s === 'importing' && 'Import'}
                </span>
              </div>
              {i < 3 && <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <EoUploadStep onFileSelect={processFile} />
          )}

          {/* Step 2: Mapping + Validation */}
          {step === 'mapping' && (
            <EoImportValidation
              clientId={clientId}
              csvHeaders={csvHeaders}
              csvData={csvData}
              mapping={mapping}
              allFields={allFields}
              usedDbFields={usedDbFields}
              showFieldForm={showFieldForm}
              onShowFieldFormChange={setShowFieldForm}
              onMappingChange={handleMappingChange}
            />
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <EoImportPreview
              csvData={csvData}
              mapping={mapping}
              existingEntities={existingEntities}
              customFields={customFields}
            />
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <EoImportProgress importProgress={importProgress} />
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Retour
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!canProceedToPreview}
              >
                Prévisualiser
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Retour au mapping
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                variant={hasErrors ? 'destructive' : 'default'}
              >
                {hasErrors ? 'Importer malgré les erreurs' : 'Confirmer l\'import'}
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
