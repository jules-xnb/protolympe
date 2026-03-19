import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Building2,
} from 'lucide-react';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import type { MappedEntity } from './types';

interface EoPreviewStepProps {
  previewTree: MappedEntity[];
  previewErrors: string[];
  hierarchyAnomalies: string[];
  totalEntitiesToImport: number;
  hasErrors: boolean;
  collapsedNodes: Set<string>;
  selectedEntity: MappedEntity | null;
  customFields: EoFieldDefinition[];
  onToggleNodeCollapse: (code: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectEntity: (entity: MappedEntity | null) => void;
}

export function EoPreviewStep({
  previewTree,
  previewErrors,
  hierarchyAnomalies,
  totalEntitiesToImport,
  hasErrors,
  collapsedNodes,
  selectedEntity,
  customFields,
  onToggleNodeCollapse,
  onExpandAll,
  onCollapseAll,
  onSelectEntity,
}: EoPreviewStepProps) {
  const renderTreeNode = (entity: MappedEntity, depth: number = 0) => {
    const hasChildren = entity.children.length > 0;
    const isCollapsed = collapsedNodes.has(entity.code);

    // Cap visual indentation at 8 levels (160px max), show level badge for deeper nesting
    const maxVisualDepth = 8;
    const visualDepth = Math.min(depth, maxVisualDepth);
    const isDeepNested = depth > maxVisualDepth;

    const isSelected = selectedEntity?.code === entity.code;

    return (
      <div key={entity.code} className="flex flex-col">
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${
            entity.hasError
              ? 'bg-destructive/10 text-destructive'
              : isSelected
                ? 'bg-primary/10 ring-1 ring-primary/30'
                : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${visualDepth * 16 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectEntity(isSelected ? null : entity);
          }}
        >
          {hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onToggleNodeCollapse(entity.code);
              }}
            >
              <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
            </Button>
          ) : (
            <span className="w-4" />
          )}
          {isDeepNested && (
            <Chip variant="outline" className="text-xs px-1.5 py-0 font-mono">
              N{depth + 1}
            </Chip>
          )}
          <Building2 className={`h-4 w-4 ${entity.hasError ? 'text-destructive' : 'text-muted-foreground'}`} />
          <span className="font-medium">{entity.name}</span>
          <Chip variant="outline" className="text-xs">{entity.code}</Chip>
          {entity.isUpdate && (
            <Chip variant="default" className="text-xs bg-amber-100 text-amber-800 border-amber-300">Mise à jour</Chip>
          )}
          {hasChildren && (
            <span className="text-xs text-muted-foreground">({entity.children.length})</span>
          )}
          {!entity.is_active && (
            <Chip variant="default" className="text-xs">Inactif</Chip>
          )}
          {entity.hasError && (
            <Chip variant="error" className="text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              {entity.errorMessage}
            </Chip>
          )}
        </div>
        {!isCollapsed && entity.children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  const renderEntityDetails = (entity: MappedEntity) => {
    const baseFieldLabels: Record<string, string> = {
      code: 'Code',
      name: 'Nom',
      description: 'Description',
      address_line1: 'Adresse ligne 1',
      address_line2: 'Adresse ligne 2',
      postal_code: 'Code postal',
      city: 'Ville',
      country: 'Pays',
      phone: 'Téléphone',
      email: 'Email',
      website: 'Site web',
      manager_name: 'Responsable',
      employee_count: 'Effectif',
      budget: 'Budget',
      cost_center: 'Centre de coût',
    };

    const baseFields = Object.entries(baseFieldLabels)
      .map(([key, label]) => ({
        label,
        value: entity[key as keyof MappedEntity] as string | number | undefined,
      }))
      .filter(f => f.value !== undefined && f.value !== null && f.value !== '');

    const customFieldsList = Object.entries(entity.customFieldValues || {}).map(([fieldId, value]) => {
      const fieldDef = customFields.find(f => f.id === fieldId);
      return {
        label: fieldDef?.name || fieldId,
        value,
        isCustom: true,
      };
    });

    return (
      <div className="border rounded-lg p-4 bg-background space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Détails: {entity.name}
          </h5>
          <Button variant="ghost" size="sm" onClick={() => onSelectEntity(null)}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {baseFields.map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-muted-foreground text-xs">{label}</span>
              <span className="font-medium">{String(value)}</span>
            </div>
          ))}
        </div>

        {customFieldsList.length > 0 && (
          <>
            <div className="border-t pt-3">
              <span className="text-xs text-muted-foreground font-medium">Champs personnalisés</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {customFieldsList.map(({ label, value }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!entity.is_active && (
          <Chip variant="default">Inactif</Chip>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4 py-4">
        {hasErrors && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Erreurs détectées</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {previewErrors.slice(0, 5).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {previewErrors.length > 5 && (
                  <li>... et {previewErrors.length - 5} autres erreurs</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {hierarchyAnomalies.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Anomalies hiérarchiques</AlertTitle>
            <AlertDescription>
              <p className="text-xs mb-1">Entités actives sous un parent inactif (non bloquant) :</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                {hierarchyAnomalies.slice(0, 5).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
                {hierarchyAnomalies.length > 5 && (
                  <li>... et {hierarchyAnomalies.length - 5} autres anomalies</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Alert className={hasErrors ? '' : 'border-primary/50 bg-primary/5'}>
          {hasErrors ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
          <AlertTitle>
            {hasErrors ? 'Aperçu avec erreurs' : 'Aperçu de l\'import'}
          </AlertTitle>
          <AlertDescription>
            {totalEntitiesToImport} entités seront importées
            {hasErrors && ' (les entités en erreur seront ignorées)'}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Arborescence prévisionnelle</h4>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onExpandAll}>
                  Tout déplier
                </Button>
                <Button variant="ghost" size="sm" onClick={onCollapseAll}>
                  Tout replier
                </Button>
              </div>
            </div>
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
              {previewTree.map(entity => renderTreeNode(entity))}
            </div>
          </div>

          <div className="lg:block">
            {selectedEntity ? (
              renderEntityDetails(selectedEntity)
            ) : (
              <div className="border rounded-lg p-4 bg-muted/10 h-full flex items-center justify-center text-muted-foreground text-sm">
                Cliquez sur une entité pour voir ses détails
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
