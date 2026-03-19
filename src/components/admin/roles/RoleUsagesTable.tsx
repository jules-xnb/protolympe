import { useState, useMemo, Fragment } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Building2,
  Table as TableIcon,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoleUsageItem } from '@/hooks/useRoleUsages';
import type { EoCardBlock, SurveyCreatorBlock, SurveyResponsesBlock, BlockType } from '@/components/builder/page-builder/types';
import type { UsersBlockConfig } from '@/types/builder-types';
import { EoCardInlineOptions } from './block-options/EoCardInlineOptions';
import { SurveyCreatorInlineOptions } from './block-options/SurveyCreatorInlineOptions';
import { SurveyResponsesInlineOptions } from './block-options/SurveyResponsesInlineOptions';
import { UsersBlockInlineOptions } from './block-options/UsersBlockInlineOptions';
import { useToggleRoleAccess } from '@/hooks/useToggleRoleAccess';

// ---------------------------------------------------------------------------
// Block type configuration
// ---------------------------------------------------------------------------

const BLOCK_TYPE_CONFIG: Record<
  BlockType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  eo_card: { label: 'Organisation', icon: Building2, color: 'bg-blue-100 text-blue-700' },
  data_table: { label: 'Données', icon: TableIcon, color: 'bg-green-100 text-green-700' },
  survey_creator: { label: 'Enquête', icon: ClipboardList, color: 'bg-purple-100 text-purple-700' },
  survey_responses: { label: 'Réponses', icon: ClipboardList, color: 'bg-purple-100 text-purple-700' },
  users: { label: 'Utilisateurs', icon: Building2, color: 'bg-orange-100 text-orange-700' },
  section: { label: 'Section', icon: Building2, color: 'bg-gray-100 text-gray-700' },
  sub_section: { label: 'Sous-section', icon: Building2, color: 'bg-gray-100 text-gray-700' },
  separator: { label: 'Séparateur', icon: Building2, color: 'bg-gray-100 text-gray-700' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RoleUsagesTableProps {
  usages: RoleUsageItem[];
  isLoading: boolean;
  roleId: string;
  roleName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoleUsagesTable({ usages, isLoading, roleId, roleName }: RoleUsagesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleAccessMutation = useToggleRoleAccess();

  // -----------------------------------------------------------------------
  // Filtering
  // -----------------------------------------------------------------------

  const filteredUsages = useMemo(() => {
    let items = usages;

    // Active only
    if (activeOnly) {
      items = items.filter((u) => u.hasAccess);
    }

    // Search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (u) =>
          u.moduleName.toLowerCase().includes(q) ||
          u.viewName.toLowerCase().includes(q),
      );
    }

    return items;
  }, [usages, activeOnly, searchQuery]);

  // -----------------------------------------------------------------------
  // Pre-compute module name grouping
  // We track which item ids should show the module name: the first item in
  // each consecutive group of the same moduleName (after filtering/sorting).
  // -----------------------------------------------------------------------

  const { showModuleNameSet, modulesWithActiveView } = useMemo(() => {
    const nameSet = new Set<string>();
    const activeModules = new Set<string>();
    let lastModule = '';
    for (const item of filteredUsages) {
      if (item.moduleName !== lastModule) {
        nameSet.add(item.id);
        lastModule = item.moduleName;
      }
      if (item.hasAccess) {
        activeModules.add(item.moduleId);
      }
    }
    return { showModuleNameSet: nameSet, modulesWithActiveView: activeModules };
  }, [filteredUsages]);

  // -----------------------------------------------------------------------
  // Expand toggle
  // -----------------------------------------------------------------------

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // -----------------------------------------------------------------------
  // Render block options for expanded row
  // -----------------------------------------------------------------------

  const renderBlockOptions = (usage: RoleUsageItem) => {
    switch (usage.blockType) {
      case 'eo_card':
        return (
          <EoCardInlineOptions
            viewConfigId={usage.viewConfigId}
            blockIndex={usage.blockIndex}
            config={usage.blockConfig as EoCardBlock['config']}
            roleId={roleId}
            roleName={roleName}
            navConfigId={usage.navConfigId}
            viewName={usage.viewName}
            sharedRoleCount={usage.sharedRoleCount}
          />
        );
      case 'survey_creator':
        return (
          <SurveyCreatorInlineOptions
            viewConfigId={usage.viewConfigId}
            blockIndex={usage.blockIndex}
            config={usage.blockConfig as SurveyCreatorBlock['config']}
            roleId={roleId}
            roleName={roleName}
            navConfigId={usage.navConfigId}
            viewName={usage.viewName}
            sharedRoleCount={usage.sharedRoleCount}
          />
        );
      case 'survey_responses':
        return (
          <SurveyResponsesInlineOptions
            viewConfigId={usage.viewConfigId}
            blockIndex={usage.blockIndex}
            config={usage.blockConfig as SurveyResponsesBlock['config']}
            roleId={roleId}
            roleName={roleName}
            navConfigId={usage.navConfigId}
            viewName={usage.viewName}
            sharedRoleCount={usage.sharedRoleCount}
          />
        );
      case 'users':
        return (
          <UsersBlockInlineOptions
            viewConfigId={usage.viewConfigId}
            blockIndex={usage.blockIndex}
            config={usage.blockConfig as UsersBlockConfig}
            roleId={roleId}
            roleName={roleName}
            navConfigId={usage.navConfigId}
            viewName={usage.viewName}
            sharedRoleCount={usage.sharedRoleCount}
          />
        );
      default:
        return (
          <div className="p-4 bg-muted/30 text-sm text-muted-foreground">
            Configuration non disponible pour ce type de bloc.
          </div>
        );
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Active only checkbox */}
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="active-only"
            checked={activeOnly}
            onCheckedChange={(checked) => setActiveOnly(checked === true)}
          />
          <Label htmlFor="active-only" className="text-xs cursor-pointer">
            Actifs seulement
          </Label>
        </div>

        {/* Search input */}
        <div className="relative ml-auto max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Module</TableHead>
              <TableHead className="w-[200px]">Vue</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[60px] text-center">Accès</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            )}

            {!isLoading && filteredUsages.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Aucun usage trouvé
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              filteredUsages.map((usage) => {
                const isExpanded = expandedRows.has(usage.id);
                const showModule = showModuleNameSet.has(usage.id);
                const typeConfig = BLOCK_TYPE_CONFIG[usage.blockType];
                const TypeIcon = typeConfig?.icon;

                const dimRow = !usage.hasAccess;
                const dimModule = dimRow && !modulesWithActiveView.has(usage.moduleId);

                return (
                  <Fragment key={usage.id}>
                    {/* Main row */}
                    <TableRow>
                      {/* Module */}
                      <TableCell className={cn('text-xs font-medium', dimModule && 'opacity-40')}>
                        {showModule ? usage.moduleName : ''}
                      </TableCell>

                      {/* Vue */}
                      <TableCell className={cn('text-xs', dimRow && 'opacity-40')}>
                        {usage.blockTitle || usage.viewName}
                      </TableCell>

                      {/* Type badge */}
                      <TableCell className={cn(dimRow && 'opacity-40')}>
                        {typeConfig && (
                          <Chip
                            variant="default"
                            className={cn(
                              'gap-1 text-xs px-1.5 py-0 font-medium',
                              typeConfig.color,
                            )}
                          >
                            {TypeIcon && <TypeIcon className="h-3 w-3" />}
                            {typeConfig.label}
                          </Chip>
                        )}
                      </TableCell>

                      {/* Access dot — clickable */}
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleAccessMutation.mutate({
                              navConfigId: usage.navConfigId,
                              roleId,
                              grant: !usage.hasAccess,
                            })
                          }
                          className="h-6 w-6"
                          title={usage.hasAccess ? 'Retirer l\'accès' : 'Donner l\'accès'}
                        >
                          <span
                            className={cn(
                              'inline-block h-2.5 w-2.5 rounded-full transition-colors',
                              usage.hasAccess ? 'bg-green-500' : 'bg-gray-300',
                            )}
                          />
                        </Button>
                      </TableCell>

                      {/* Expand chevron */}
                      <TableCell>
                        {usage.hasAccess ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleExpand(usage.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>

                    {/* Expanded content row */}
                    {isExpanded && usage.hasAccess && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="p-0">
                          {renderBlockOptions(usage)}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
