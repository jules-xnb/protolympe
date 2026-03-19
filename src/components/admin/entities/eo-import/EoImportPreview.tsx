import { useState, useMemo, useCallback } from 'react';
import { EoPreviewStep } from './EoPreviewStep';
import {
  buildEntityTree,
  flattenEntityTree,
  countAllEntities,
  collectAllParentCodes,
} from '@/lib/eo/eo-import-logic';
import { detectHierarchyAnomalies, type ImportEntity } from '@/lib/eo/eo-hierarchy-validation';
import type { OrganizationalEntityWithClient } from '@/hooks/useOrganizationalEntities';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import type { ParsedRow, MappedEntity } from './types';

interface EoImportPreviewProps {
  csvData: ParsedRow[];
  mapping: Record<string, string>;
  existingEntities: OrganizationalEntityWithClient[];
  customFields: EoFieldDefinition[];
}

export interface EoImportPreviewHandle {
  previewTree: MappedEntity[];
  previewErrors: string[];
  totalEntitiesToImport: number;
  hasErrors: boolean;
}

export function EoImportPreview({
  csvData,
  mapping,
  existingEntities,
  customFields,
}: EoImportPreviewProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [selectedEntity, setSelectedEntity] = useState<MappedEntity | null>(null);

  const { tree: previewTree, errors: previewErrors } = useMemo(
    () => buildEntityTree(csvData, mapping, existingEntities, customFields),
    [csvData, mapping, existingEntities, customFields],
  );

  const hierarchyAnomalies = useMemo(() => {
    const allEntitiesFlat: ImportEntity[] = flattenEntityTree(previewTree);
    return detectHierarchyAnomalies(
      allEntitiesFlat,
      existingEntities.map(e => ({ code: e.code || '', name: e.name, is_active: e.is_active })),
    );
  }, [previewTree, existingEntities]);

  const totalEntitiesToImport = useMemo(
    () => countAllEntities(previewTree),
    [previewTree],
  );

  const hasErrors = previewErrors.length > 0;

  const toggleNodeCollapse = useCallback((code: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsedNodes(new Set()), []);

  const collapseAll = useCallback(() => {
    setCollapsedNodes(collectAllParentCodes(previewTree));
  }, [previewTree]);

  return (
    <EoPreviewStep
      previewTree={previewTree}
      previewErrors={previewErrors}
      hierarchyAnomalies={hierarchyAnomalies}
      totalEntitiesToImport={totalEntitiesToImport}
      hasErrors={hasErrors}
      collapsedNodes={collapsedNodes}
      selectedEntity={selectedEntity}
      customFields={customFields}
      onToggleNodeCollapse={toggleNodeCollapse}
      onExpandAll={expandAll}
      onCollapseAll={collapseAll}
      onSelectEntity={setSelectedEntity}
    />
  );
}
