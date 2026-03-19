import React, { useState, useMemo, useCallback } from 'react';
import { Chip } from '@/components/ui/chip';
import { StatusChip } from '@/components/ui/status-chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Building2,
  List,
  GitBranch,
  LayoutGrid,
  Download,
  ArrowRightLeft,
} from 'lucide-react';
import { EoTreeCanvas } from '@/components/admin/entities/EoTreeCanvas';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { MappedEntity, ReparentChange, EoImportResult } from '@/lib/eo/eo-hierarchy-builder';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EoImportPreviewProps {
  cachedTree: MappedEntity[];
  cachedErrors: string[];
  cachedReparentChanges: ReparentChange[];
  importResults: EoImportResult[];
  customFields: Array<{ id: string; name: string; slug: string; is_active: boolean; is_unique: boolean; field_type: string; options?: Array<string | { value?: string; label?: string }> }>;
  downloadControlReport: () => void;
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EoImportPreview({
  cachedTree,
  cachedErrors,
  cachedReparentChanges,
  importResults,
  customFields,
  downloadControlReport,
  onCancel,
}: EoImportPreviewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'canvas'>('list');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => {
    const allCodes = new Set<string>();
    const collectCodes = (entities: MappedEntity[]) => {
      entities.forEach(e => { if (e.children.length > 0) { allCodes.add(e.code); collectCodes(e.children); } });
    };
    collectCodes(cachedTree);
    return allCodes;
  });
  const [selectedEntity, setSelectedEntity] = useState<MappedEntity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // -- tree helpers --
  const toggleNodeCollapse = useCallback((code: string) => {
    setCollapsedNodes(prev => { const s = new Set(prev); if (s.has(code)) { s.delete(code); } else { s.add(code); } return s; });
  }, []);

  const expandAll = useCallback(() => setCollapsedNodes(new Set()), []);
  const collapseAll = useCallback(() => {
    const allCodes = new Set<string>();
    const collect = (entities: MappedEntity[]) => { entities.forEach(e => { if (e.children.length > 0) { allCodes.add(e.code); collect(e.children); } }); };
    collect(cachedTree);
    setCollapsedNodes(allCodes);
  }, [cachedTree]);

  const handleEntityClick = useCallback((entity: MappedEntity) => { setSelectedEntity(entity); setDrawerOpen(true); }, []);

  const flattenedEntities = useMemo(() => {
    const result: (MappedEntity & { parentName: string | null })[] = [];
    const flatten = (entities: MappedEntity[], parentName: string | null = null) => {
      entities.forEach(entity => { result.push({ ...entity, parentName }); if (entity.children.length > 0) flatten(entity.children, entity.name); });
    };
    flatten(cachedTree);
    return result;
  }, [cachedTree]);

  // Custom fields that have at least one mapped value in the imported data
  const mappedCustomFields = useMemo(() => {
    const usedFieldIds = new Set<string>();
    const collect = (entities: MappedEntity[]) => {
      entities.forEach(e => {
        Object.keys(e.customFieldValues).forEach(id => usedFieldIds.add(id));
        collect(e.children);
      });
    };
    collect(cachedTree);
    return customFields.filter(f => usedFieldIds.has(f.id));
  }, [cachedTree, customFields]);

  const totalNewEntities = useMemo(() => {
    const countValid = (entities: MappedEntity[]): number => entities.reduce((s, e) => {
      if (e.hasError || e.isExistingUpdate) return s + countValid(e.children);
      return s + 1 + countValid(e.children);
    }, 0);
    return countValid(cachedTree);
  }, [cachedTree]);

  // -- renderTreeNode --
  const renderTreeNode = useCallback((entity: MappedEntity, depth: number = 0): React.ReactNode => {
    const hasChildren = entity.children.length > 0;
    const isCollapsed = collapsedNodes.has(entity.code);
    const maxVisualDepth = 8;
    const visualDepth = Math.min(depth, maxVisualDepth);
    const isDeepNested = depth > maxVisualDepth;
    const isSelected = selectedEntity?.code === entity.code;

    return (
      <div key={entity.code} className="flex flex-col">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors ${
            entity.hasError ? 'bg-destructive/10 text-destructive' : isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${visualDepth * 16 + 12}px` }}
          onClick={() => handleEntityClick(entity)}
        >
          {hasChildren ? (
            <Button variant="ghost" size="icon" type="button" onClick={e => { e.stopPropagation(); toggleNodeCollapse(entity.code); }} className="h-5 w-5 p-0.5 hover:bg-muted rounded">
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
            </Button>
          ) : <span className="w-5" />}
          {isDeepNested && <Chip variant="outline" className="text-xs px-1.5 py-0 font-mono">N{depth + 1}</Chip>}
          <Building2 className={`h-4 w-4 ${entity.hasError ? 'text-destructive' : 'text-muted-foreground'}`} />
          <span className="font-medium">{entity.name}</span>
          <Chip variant="outline" className="text-xs">{entity.code}</Chip>
          {entity.isExistingUpdate && (
            <Chip variant="default" className="text-xs border-amber-500/50 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
              <ArrowRightLeft className="h-3 w-3 mr-1" />Déplacement
            </Chip>
          )}
          {hasChildren && <span className="text-xs text-muted-foreground">({entity.children.length})</span>}
          {!entity.is_active && <Chip variant="default" className="text-xs">Inactif</Chip>}
          {entity.hasError && <Chip variant="error" className="text-xs"><XCircle className="h-3 w-3 mr-1" />{entity.errorMessage}</Chip>}
        </div>
        {!isCollapsed && entity.children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  }, [collapsedNodes, selectedEntity, handleEntityClick, toggleNodeCollapse]);

  const hasErrors = cachedErrors.length > 0 || cachedTree.some(function checkErr(e: MappedEntity): boolean { return e.hasError || e.children.some(checkErr); });

  const downloadErrorReport = useCallback(() => {
    const esc = (val: string) => (val.includes(';') || val.includes('"') || val.includes('\n')) ? `"${val.replace(/"/g, '""')}"` : val;
    const headers = ['Code', 'Nom', 'Parent', 'Erreur'];
    const rows: string[][] = [];

    // Collect errors from tree (entities with hasError have full context)
    const treeErrorMessages = new Set<string>();
    const collectErrors = (entities: MappedEntity[]) => {
      entities.forEach(e => {
        if (e.hasError) {
          rows.push([e.code, e.name, e.parent_code || e.parent_name || '', e.errorMessage || 'Erreur inconnue'].map(esc));
          // Track which entities are already covered
          if (e.errorMessage) treeErrorMessages.add(e.name);
        }
        collectErrors(e.children);
      });
    };
    collectErrors(cachedTree);

    // Add global errors not already covered by tree errors
    cachedErrors.forEach(err => {
      // Extract entity name from error format "NomEntité: message" or "Ligne X: message"
      const match = err.match(/^(.+?):\s+(.+)$/);
      if (match) {
        const [, identifier, message] = match;
        // Skip if already in tree errors
        if (treeErrorMessages.has(identifier)) return;
        rows.push([esc(identifier), '', '', esc(message)]);
      } else {
        rows.push(['', '', '', esc(err)]);
      }
    });

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erreurs_import_eo_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [cachedTree, cachedErrors]);

  // Post-import result view
  if (importResults.length > 0) {
    const created = importResults.filter(r => r.status === 'Créé').length;
    const moved = importResults.filter(r => r.status === 'Déplacé').length;
    const errored = importResults.filter(r => r.status === 'Erreur' || r.status === 'Ignoré (erreur pré-import)').length;
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        {errored > 0 ? <AlertTriangle className="h-12 w-12 text-warning" /> : <CheckCircle2 className="h-12 w-12 text-primary" />}
        <h3 className="text-lg font-medium">{errored > 0 ? 'Import terminé avec des anomalies' : 'Import terminé avec succès'}</h3>
        <div className="flex items-center gap-6 text-sm">
          {created > 0 && <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span>{created} créée{created > 1 ? 's' : ''}</span></div>}
          {moved > 0 && <div className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-warning" /><span>{moved} déplacée{moved > 1 ? 's' : ''}</span></div>}
          {errored > 0 && <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /><span>{errored} erreur{errored > 1 ? 's' : ''}</span></div>}
        </div>
        <Button variant="outline" onClick={downloadControlReport}>
          Télécharger le rapport de contrôle <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const totalErrors = cachedErrors.length;

  return (
    <div className="space-y-4">
      {/* StatBlock grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatBlock icon={<Building2 className="h-5 w-5" />} value={flattenedEntities.length} label="Entités" />
        <StatBlock icon={<ArrowRightLeft className="h-5 w-5" />} value={cachedReparentChanges.length} label="Déplacements" />
        <StatBlock icon={<CheckCircle2 className="h-5 w-5 text-success" />} value={totalNewEntities} label="Valides" />
        <StatBlock
          icon={<AlertCircle className="h-5 w-5 text-destructive" />}
          value={totalErrors}
          label="Erreurs"
          valueClassName={totalErrors > 0 ? 'text-destructive' : ''}
        />
      </div>

      {/* Card erreurs */}
      {hasErrors && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-destructive">Erreurs</span>
              <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                Télécharger le rapport <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {cachedErrors.slice(0, 10).map((error, i) => (
                <p key={i} className="text-sm text-destructive">{error}</p>
              ))}
              {cachedErrors.length > 10 && (
                <p className="text-sm text-muted-foreground">... et {cachedErrors.length - 10} autres erreurs</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reparenting changes */}
      {cachedReparentChanges.length > 0 && (
        <Alert variant="warning">
          <ArrowRightLeft className="h-4 w-4" />
          <AlertTitle>Déplacements détectés</AlertTitle>
          <AlertDescription>
            <p className="text-sm mb-2">
              {cachedReparentChanges.length} entité{cachedReparentChanges.length > 1 ? 's' : ''} sera{cachedReparentChanges.length > 1 ? 'ont' : ''} rattachée{cachedReparentChanges.length > 1 ? 's' : ''} à un nouveau parent :
            </p>
            <ScrollArea className="max-h-[300px]">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[80px]">Code</TableHead>
                      <TableHead className="min-w-[180px]">Entité</TableHead>
                      <TableHead className="min-w-[150px]">Ancien parent</TableHead>
                      <TableHead className="min-w-[150px]">Nouveau parent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cachedReparentChanges.map(change => (
                      <TableRow key={change.entityId} className="h-7 text-xs">
                        <TableCell className="font-mono text-xs py-1">{change.code}</TableCell>
                        <TableCell className="py-1 font-medium">{change.name}</TableCell>
                        <TableCell className="py-1 text-muted-foreground line-through">{change.oldParentName || 'Racine'}</TableCell>
                        <TableCell className="py-1 text-amber-700 font-medium">{change.newParentName || 'Racine'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}

      {/* Tree / List / Canvas view */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Arborescence prévisionnelle</h4>
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} className="border-destructive hover:bg-destructive/10">
            Annuler l'import
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>Tout déplier</Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>Tout replier</Button>
          </div>
          <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => { if (v) setViewMode(v as 'list' | 'tree' | 'canvas'); }}
              variant="outline"
              className="gap-0 rounded-lg overflow-hidden h-10"
            >
              <ToggleGroupItem value="list" className="rounded-none" title="Liste">
                <List className="h-[18px] w-[18px]" />
              </ToggleGroupItem>
              <ToggleGroupItem value="tree" className="rounded-none" title="Arbre">
                <GitBranch className="h-[18px] w-[18px]" />
              </ToggleGroupItem>
              <ToggleGroupItem value="canvas" className="rounded-none" title="Canvas">
                <LayoutGrid className="h-[18px] w-[18px]" />
              </ToggleGroupItem>
            </ToggleGroup>
        </div>

        {viewMode === 'canvas' ? (
          <EoTreeCanvas entities={cachedTree} onEntityClick={handleEntityClick} selectedEntityCode={selectedEntity?.code} />
        ) : viewMode === 'tree' ? (
          <ScrollArea className="h-[calc(100vh-500px)] min-h-[300px]">
            <div className="space-y-0.5">{cachedTree.map(e => renderTreeNode(e))}</div>
          </ScrollArea>
        ) : (
          <div className="h-[calc(100vh-500px)] min-h-[300px] overflow-auto border rounded-lg">
              <Table className="w-max min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nom</TableHead>
                    <TableHead className="min-w-[180px]">Parent</TableHead>
                    <TableHead className="min-w-[70px]">Niveau</TableHead>
                    <TableHead className="min-w-[90px]">Statut</TableHead>
                    {mappedCustomFields.map(f => (
                      <TableHead key={f.id} className="min-w-[140px]">{f.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flattenedEntities.map(entity => (
                    <TableRow
                      key={entity.code}
                      className={`cursor-pointer h-7 text-xs ${
                        entity.hasError ? 'bg-destructive/10' : selectedEntity?.code === entity.code ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => handleEntityClick(entity)}
                    >
                      <TableCell className="py-1">
                        <div className="flex items-center gap-1.5">
                          <span>{entity.name}</span>
                          {entity.hasError && <Chip variant="error" className="text-xs px-1 py-0">{entity.errorMessage}</Chip>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-1">{entity.parentName || '\u2014'}</TableCell>
                      <TableCell className="text-xs py-1">{entity.level + 1}</TableCell>
                      <TableCell className="text-xs py-1">{entity.is_active ? 'Actif' : 'Inactif'}</TableCell>
                      {mappedCustomFields.map(f => (
                        <TableCell key={f.id} className="text-xs py-1">{entity.customFieldValues[f.id] || '\u2014'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
        )}
      </div>

      {/* Entity details drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="h-full w-[450px] ml-auto">
          <div className="w-full h-full flex flex-col">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />{selectedEntity?.name}
              </DrawerTitle>
              <DrawerDescription>Code: {selectedEntity?.code}</DrawerDescription>
            </DrawerHeader>
            {selectedEntity && (
              <div className="p-4 space-y-6">
                {Object.keys(selectedEntity.customFieldValues).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Champs personnalisés</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedEntity.customFieldValues).map(([fieldId, value]) => {
                        const fieldDef = customFields.find(f => f.id === fieldId);
                        return (
                          <div key={fieldId}>
                            <span className="text-xs text-muted-foreground">{fieldDef?.name || fieldId}</span>
                            <p className="font-medium">{value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <StatusChip status={selectedEntity.is_active ? 'actif' : 'inactif'} />
                  {selectedEntity.hasError && <Chip variant="error">{selectedEntity.errorMessage}</Chip>}
                </div>
              </div>
            )}
            <div className="mt-auto p-4 border-t">
              <DrawerClose asChild><Button variant="outline" className="w-full">Fermer</Button></DrawerClose>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
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
