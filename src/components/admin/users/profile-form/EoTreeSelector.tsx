import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Building2,
  Search,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  GitBranch,
  Filter,
} from 'lucide-react';
import type { OrganizationalEntity } from '@/hooks/useOrganizationalEntities';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

interface EoTreeSelectorProps {
  entities: OrganizationalEntity[];
  filteredEntities: OrganizationalEntity[];
  selectedEoIds: string[];
  eoDescendants: Record<string, boolean>;
  expandedEoIds: string[];
  implicitlySelectedEoIds: Set<string>;
  entitiesWithChildren: Set<string>;
  eoSearch: string;
  onEoSearchChange: (value: string) => void;
  onEoToggle: (id: string) => void;
  onDescendantsToggle: (id: string, e: React.MouseEvent) => void;
  onToggleEoExpand: (id: string, e: React.MouseEvent) => void;
  onSetExpandedEoIds: React.Dispatch<React.SetStateAction<string[]>>;
  // Expanded view props
  eoExpanded: boolean;
  onSetEoExpanded: (expanded: boolean) => void;
  // Filter props
  eoFilters: Record<string, string>;
  onSetEoFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  availableLevels: number[];
  filterableFields: EoFieldDefinition[];
}

function EoTreeItem({
  entity,
  isImplicit,
  isSelected,
  hasDesc,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onToggle,
  onDescendantsToggle,
  onSetExpandedEoIds,
}: {
  entity: OrganizationalEntity;
  isImplicit: boolean;
  isSelected: boolean;
  hasDesc: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  onToggle: (id: string) => void;
  onDescendantsToggle: (id: string, e: React.MouseEvent) => void;
  onSetExpandedEoIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-md",
        isImplicit ? "opacity-50" : "hover:bg-accent",
        isSelected && !isImplicit && "bg-primary/10"
      )}
      style={{ paddingLeft: `${entity.level * 16 + 8}px` }}
    >
      {hasChildren ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => onToggleExpand(entity.id, e)}
          className="h-5 w-5 shrink-0 p-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <Checkbox
        checked={isSelected}
        disabled={isImplicit}
        onCheckedChange={() => !isImplicit && onToggle(entity.id)}
      />
      <span
        className="text-sm truncate flex-1 cursor-pointer"
        onClick={() => hasChildren && onSetExpandedEoIds(prev =>
          prev.includes(entity.id) ? prev.filter(x => x !== entity.id) : [...prev, entity.id]
        )}
      >
        {entity.name}
      </span>
      {isSelected && !isImplicit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => onDescendantsToggle(entity.id, e)}
              className={cn(
                "h-6 w-6 shrink-0",
                hasDesc ? "text-primary" : "text-muted-foreground"
              )}
            >
              <GitBranch className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {hasDesc
              ? 'Descendance incluse — cliquez pour retirer'
              : 'Inclure les sous-entités'
            }
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function EoTreeList({
  filteredEntities,
  selectedEoIds,
  eoDescendants,
  expandedEoIds,
  implicitlySelectedEoIds,
  entitiesWithChildren,
  onEoToggle,
  onDescendantsToggle,
  onToggleEoExpand,
  onSetExpandedEoIds,
}: Pick<
  EoTreeSelectorProps,
  | 'filteredEntities'
  | 'selectedEoIds'
  | 'eoDescendants'
  | 'expandedEoIds'
  | 'implicitlySelectedEoIds'
  | 'entitiesWithChildren'
  | 'onEoToggle'
  | 'onDescendantsToggle'
  | 'onToggleEoExpand'
  | 'onSetExpandedEoIds'
>) {
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-1 pr-2">
        {filteredEntities.map((entity) => {
          const isImplicit = implicitlySelectedEoIds.has(entity.id);
          const isSelected = isImplicit || selectedEoIds.includes(entity.id);
          const hasDesc = eoDescendants[entity.id] ?? false;
          const hasChildren = entitiesWithChildren.has(entity.id);
          const isExpanded = expandedEoIds.includes(entity.id);
          return (
            <EoTreeItem
              key={entity.id}
              entity={entity}
              isImplicit={isImplicit}
              isSelected={isSelected}
              hasDesc={hasDesc}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              onToggleExpand={onToggleEoExpand}
              onToggle={onEoToggle}
              onDescendantsToggle={onDescendantsToggle}
              onSetExpandedEoIds={onSetExpandedEoIds}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}

function EoFilterPopover({
  eoFilters,
  onSetEoFilters,
  availableLevels,
  filterableFields,
}: Pick<EoTreeSelectorProps, 'eoFilters' | 'onSetEoFilters' | 'availableLevels' | 'filterableFields'>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={Object.values(eoFilters).some(v => v) ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtres
          {Object.values(eoFilters).filter(v => v).length > 0 && (
            <Chip variant="default" className="h-5 px-1.5 text-xs">
              {Object.values(eoFilters).filter(v => v).length}
            </Chip>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="end">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Niveau hiérarchique</Label>
          <Select
            value={eoFilters['__level'] ?? ''}
            onValueChange={(v) => onSetEoFilters(prev => ({ ...prev, '__level': v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Tous les niveaux" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              {availableLevels.map(level => (
                <SelectItem key={level} value={String(level)}>
                  Niveau {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Statut</Label>
          <Select
            value={eoFilters['__is_active'] ?? ''}
            onValueChange={(v) => onSetEoFilters(prev => ({ ...prev, '__is_active': v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="true">Actif</SelectItem>
              <SelectItem value="false">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filterableFields.map(field => (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{field.name}</Label>
            <Select
              value={eoFilters[field.id] ?? ''}
              onValueChange={(v) => onSetEoFilters(prev => ({ ...prev, [field.id]: v === 'all' ? '' : v }))}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {field.field_type === 'checkbox' ? (
                  <>
                    <SelectItem value="true">Oui</SelectItem>
                    <SelectItem value="false">Non</SelectItem>
                  </>
                ) : (
                  (field.options || []).map((opt: string | { value?: string; label?: string }) => {
                    const val = typeof opt === 'string' ? opt : opt.value || opt.label;
                    const label = typeof opt === 'string' ? opt : opt.label || opt.value;
                    return (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
        ))}
        {Object.values(eoFilters).some(v => v) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onSetEoFilters({})}
          >
            Réinitialiser les filtres
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function EoTreeSelectorExpanded(props: EoTreeSelectorProps) {
  const {
    filteredEntities,
    selectedEoIds,
    eoDescendants,
    expandedEoIds,
    implicitlySelectedEoIds,
    entitiesWithChildren,
    eoSearch,
    onEoSearchChange,
    onEoToggle,
    onDescendantsToggle,
    onToggleEoExpand,
    onSetExpandedEoIds,
    onSetEoExpanded,
    eoFilters,
    onSetEoFilters,
    availableLevels,
    filterableFields,
  } = props;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Entités Organisationnelles *
        </div>
        <div className="ml-auto flex items-center gap-2">
          <EoFilterPopover
            eoFilters={eoFilters}
            onSetEoFilters={onSetEoFilters}
            availableLevels={availableLevels}
            filterableFields={filterableFields}
          />
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou code..."
              value={eoSearch}
              onChange={(e) => onEoSearchChange(e.target.value)}
              className="pl-8 h-8 w-64"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSetEoExpanded(false)}
                className="h-8 w-8 shrink-0"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Réduire</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <EoTreeList
        filteredEntities={filteredEntities}
        selectedEoIds={selectedEoIds}
        eoDescendants={eoDescendants}
        expandedEoIds={expandedEoIds}
        implicitlySelectedEoIds={implicitlySelectedEoIds}
        entitiesWithChildren={entitiesWithChildren}
        onEoToggle={onEoToggle}
        onDescendantsToggle={onDescendantsToggle}
        onToggleEoExpand={onToggleEoExpand}
        onSetExpandedEoIds={onSetExpandedEoIds}
      />
    </div>
  );
}

export function EoTreeSelectorCompact(props: Omit<EoTreeSelectorProps, 'eoFilters' | 'onSetEoFilters' | 'availableLevels' | 'filterableFields'>) {
  const {
    filteredEntities,
    selectedEoIds,
    eoDescendants,
    expandedEoIds,
    implicitlySelectedEoIds,
    entitiesWithChildren,
    eoSearch,
    onEoSearchChange,
    onEoToggle,
    onDescendantsToggle,
    onToggleEoExpand,
    onSetExpandedEoIds,
    onSetEoExpanded,
  } = props;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">Entités Organisationnelles *</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSetEoExpanded(true)}
              className="h-6 w-6 shrink-0"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Agrandir</TooltipContent>
        </Tooltip>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={eoSearch}
          onChange={(e) => onEoSearchChange(e.target.value)}
          className="pl-8 h-8"
        />
      </div>
      <EoTreeList
        filteredEntities={filteredEntities}
        selectedEoIds={selectedEoIds}
        eoDescendants={eoDescendants}
        expandedEoIds={expandedEoIds}
        implicitlySelectedEoIds={implicitlySelectedEoIds}
        entitiesWithChildren={entitiesWithChildren}
        onEoToggle={onEoToggle}
        onDescendantsToggle={onDescendantsToggle}
        onToggleEoExpand={onToggleEoExpand}
        onSetExpandedEoIds={onSetExpandedEoIds}
      />
    </div>
  );
}
