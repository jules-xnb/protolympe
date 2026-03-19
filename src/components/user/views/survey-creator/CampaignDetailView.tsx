import { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, Calendar, ArrowLeft, Pause, Play, XCircle, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Group, X } from 'lucide-react';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResponseDetailsDrawer } from '../ResponseDetailsDrawer';
import { useUpdateCampaign, useCloseCampaign, type CampaignStatus } from '@/hooks/useSurveyCampaigns';
import { useFilteredCampaignResponses, type FilteredResponse } from '@/hooks/useFilteredCampaignResponses';
import { useViewMode } from '@/contexts/ViewModeContext';
import { toast } from 'sonner';
import type { CampaignWithSurvey } from './types';
import { getStatusBadgeInfo } from './helpers';
import { formatFieldValue } from '@/lib/format-utils';
import { evaluateVisibilityConditions } from '@/lib/evaluate-visibility-conditions';
import { useT } from '@/hooks/useT';
import { cn } from '@/lib/utils';

interface CampaignDetailViewProps {
  campaign: CampaignWithSurvey;
  onBack: () => void;
  onStatusChange: () => void;
}

export function CampaignDetailView({
  campaign,
  onBack,
  onStatusChange,
}: CampaignDetailViewProps) {
  const { t, td } = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedResponse, setSelectedResponse] = useState<FilteredResponse | null>(null);
  const [responseDrawerOpen, setResponseDrawerOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('_eo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const ITEMS_PER_PAGE = 20;

  const updateCampaign = useUpdateCampaign();
  const closeCampaign = useCloseCampaign();

  const { activeProfile } = useViewMode();
  const profileEoIds = activeProfile?.eoIds || [];
  const profileRoleIds = activeProfile?.roleIds || [];

  const { responses, visibleFields, endNodeName, endNodeIds, isLoading: responsesLoading } = useFilteredCampaignResponses(
    campaign.id,
    profileEoIds,
    profileRoleIds,
    { showAllResponses: true }
  );

  // Filter responses based on search query
  const filteredResponses = useMemo(() => {
    if (!searchQuery.trim()) return responses;
    const query = searchQuery.toLowerCase().trim();
    return responses.filter(response =>
      response._eo?.name?.toLowerCase().includes(query) ||
      response._eo?.code?.toLowerCase().includes(query)
    );
  }, [responses, searchQuery]);

  // Build workflow step tabs from survey settings + dynamic statuses
  const workflowTabs = useMemo(() => {
    const surveySettings = campaign.survey?.settings as Record<string, unknown> | undefined;
    const validationSteps: Array<{ id: string; name: string; order: number }> = surveySettings?.validation_steps || [];
    const endNodeIdSet = new Set(endNodeIds);

    const tabs: Array<{ key: string; label: string; count: number }> = [];

    const respondentCount = filteredResponses.filter(r => {
      const bs = r._dynamic_status?.baseStatus;
      return bs === 'pending' || bs === 'in_progress' || bs === 'submitted';
    }).length;
    tabs.push({ key: 'respondent', label: t('status.respondent'), count: respondentCount });

    for (const step of validationSteps) {
      if (endNodeIdSet.has(step.id)) continue;
      const count = filteredResponses.filter(r => {
        const ds = r._dynamic_status;
        return ds?.baseStatus === 'in_validation' && ds?.stepId === step.id;
      }).length;
      tabs.push({ key: `step_${step.id}`, label: step.name, count });
    }

    tabs.push(
      { key: 'validated', label: endNodeName || t('status.validated'), count: filteredResponses.filter(r => r._dynamic_status?.baseStatus === 'validated').length },
    );

    return tabs;
  }, [filteredResponses, campaign.survey?.settings, endNodeIds, endNodeName]);

  // Filter by active tab
  const tabFilteredResponses = useMemo(() => {
    if (activeTab === 'all') return filteredResponses;
    if (activeTab === 'respondent') {
      return filteredResponses.filter(r => {
        const bs = r._dynamic_status?.baseStatus;
        return bs === 'pending' || bs === 'in_progress' || bs === 'submitted';
      });
    }
    if (activeTab.startsWith('step_')) {
      const stepId = activeTab.replace('step_', '');
      return filteredResponses.filter(r => r._dynamic_status?.baseStatus === 'in_validation' && r._dynamic_status?.stepId === stepId);
    }
    return filteredResponses.filter(r => r._dynamic_status?.baseStatus === activeTab);
  }, [filteredResponses, activeTab]);

  // Sort
  const sortedResponses = useMemo(() => {
    const sorted = [...tabFilteredResponses];
    const dir = sortDirection === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortColumn === '_eo') {
        valA = a._eo?.name?.toLowerCase() || '';
        valB = b._eo?.name?.toLowerCase() || '';
      } else if (sortColumn === '_code') {
        valA = a._eo?.code?.toLowerCase() || '';
        valB = b._eo?.code?.toLowerCase() || '';
      } else if (sortColumn === '_status') {
        valA = a._dynamic_status?.stepName?.toLowerCase() || a.status;
        valB = b._dynamic_status?.stepName?.toLowerCase() || b.status;
      } else {
        const rawA = a._field_values?.[sortColumn];
        const rawB = b._field_values?.[sortColumn];
        valA = rawA != null ? String(rawA).toLowerCase() : '';
        valB = rawB != null ? String(rawB).toLowerCase() : '';
      }

      return valA.localeCompare(valB, 'fr', { sensitivity: 'base' }) * dir;
    });

    return sorted;
  }, [tabFilteredResponses, sortColumn, sortDirection]);

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    }
    return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  };

  // Grouping
  const getGroupValue = useCallback((response: FilteredResponse): string => {
    if (!groupByColumn) return '';
    if (groupByColumn === '_eo') return response._eo?.name || 'Non renseigné';
    if (groupByColumn === '_code') return response._eo?.code || 'Non renseigné';
    if (groupByColumn === '_status') return response._dynamic_status?.stepName || response.status;
    const raw = response._field_values?.[groupByColumn];
    if (raw == null || raw === '') return 'Non renseigné';
    return String(raw);
  }, [groupByColumn]);

  const groupedData = useMemo(() => {
    if (!groupByColumn) return null;
    const groups = new Map<string, FilteredResponse[]>();
    for (const r of sortedResponses) {
      const key = getGroupValue(r);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
      .map(([key, items]) => ({ key, items }));
  }, [groupByColumn, sortedResponses, getGroupValue]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Flatten for pagination
  const flatRows = useMemo((): Array<{ type: 'header'; key: string; count: number } | { type: 'row'; response: FilteredResponse }> => {
    if (!groupedData) {
      return sortedResponses.map(r => ({ type: 'row' as const, response: r }));
    }
    const rows: Array<{ type: 'header'; key: string; count: number } | { type: 'row'; response: FilteredResponse }> = [];
    for (const group of groupedData) {
      rows.push({ type: 'header', key: group.key, count: group.items.length });
      if (!collapsedGroups.has(group.key)) {
        for (const r of group.items) {
          rows.push({ type: 'row', response: r });
        }
      }
    }
    return rows;
  }, [groupedData, sortedResponses, collapsedGroups]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(flatRows.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return flatRows.slice(start, start + ITEMS_PER_PAGE);
  }, [flatRows, safePage]);

  // Reset to page 1 when search/tab changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab]);

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active': return <Chip variant="success">{t('status.active_campaign')}</Chip>;
      case 'paused': return <Chip variant="default">{t('status.paused')}</Chip>;
      case 'closed': return <Chip variant="outline">{t('status.closed')}</Chip>;
      default: return <Chip variant="default">{t('status.draft')}</Chip>;
    }
  };

  const handlePause = async () => {
    try {
      await updateCampaign.mutateAsync({ id: campaign.id, status: 'paused' });
      toast.success(t('toast.campaign_paused'));
      onStatusChange();
    } catch { toast.error(t('errors.pause')); }
  };

  const handleResume = async () => {
    try {
      await updateCampaign.mutateAsync({ id: campaign.id, status: 'active' });
      toast.success(t('toast.campaign_resumed'));
      onStatusChange();
    } catch { toast.error(t('errors.resume')); }
  };

  const handleClose = async () => {
    try {
      await closeCampaign.mutateAsync(campaign.id);
      toast.success(t('toast.campaign_closed'));
      onStatusChange();
    } catch { toast.error(t('errors.close')); }
  };

  const colSpan = 3 + visibleFields.length + 1; // entity + code + status + fields + last modified

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-280px)]">
      {/* Campaign Info Section */}
      <div className="flex-shrink-0">
        <div className="p-4 rounded-lg border-0 shadow-none" style={{ backgroundColor: '#F4F6F9' }}>
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{td('survey_campaigns', campaign.id, 'name', campaign.name)}</h3>
                {getStatusBadge(campaign.status)}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {campaign.survey?.settings?.campaign_type_name || t('campaigns.default_type_name')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {responses.length} {t('campaigns.responses_count')}
            </span>
            {campaign.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('campaigns.start_prefix')} {new Date(campaign.start_date).toLocaleDateString('fr-FR')}
              </span>
            )}
            {campaign.end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('campaigns.end_prefix')} {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>

          {campaign.status !== 'closed' && (
            <div className="flex flex-wrap gap-2">
              {campaign.status === 'active' && (
                <Button variant="outline" onClick={handlePause}>
                  {t('buttons.pause')} <Pause className="h-4 w-4" />
                </Button>
              )}
              {campaign.status === 'paused' && (
                <Button variant="outline" size="sm" onClick={handleResume}>
                  {t('buttons.resume')} <Play className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={handleClose} className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                {t('buttons.close_campaign')} <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Responses Section */}
      <div className="flex flex-col mt-4" style={{ minHeight: 'calc(100vh - 320px)' }}>
        <div className="flex items-center justify-between py-6">
          <h6 className="text-base font-semibold">{t('campaigns.response_tracking')}</h6>
          <div className="flex items-center gap-3">
            {/* Group by */}
            <div className="flex items-center gap-1">
              <Select
                value={groupByColumn || '__none'}
                onValueChange={(v) => {
                  setGroupByColumn(v === '__none' ? null : v);
                  setCollapsedGroups(new Set());
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <Group className="h-3 w-3 mr-1 shrink-0" />
                  <SelectValue placeholder="Grouper par..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Aucun groupage</SelectItem>
                  <SelectItem value="_eo">Entité</SelectItem>
                  <SelectItem value="_code">Code</SelectItem>
                  <SelectItem value="_status">Statut</SelectItem>
                  {visibleFields.map(f => (
                    <SelectItem key={f.field_id} value={f.field_id}>{f.field_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {groupByColumn && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setGroupByColumn(null); setCollapsedGroups(new Set()); }}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {/* Search */}
            <div className="relative max-w-xs w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('campaigns.search_entity_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md shadow-none"
              />
            </div>
          </div>
        </div>

        {/* Workflow Step Tabs */}
        <div className="flex-shrink-0 overflow-x-auto pb-4">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
            <TabsList className="w-full justify-start gap-6">
              <TabsTrigger value="all">
                {t('campaigns.all_tab')}
                <span className="inline-flex items-center justify-center text-xs font-medium leading-none rounded-full ml-2 bg-muted text-foreground px-2 py-1">
                  {filteredResponses.length}
                </span>
              </TabsTrigger>
              {workflowTabs.map(tab => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.label}
                  <span className="inline-flex items-center justify-center text-xs font-medium leading-none rounded-full ml-2 bg-muted text-foreground px-2 py-1">
                    {tab.count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Card className="flex-1 flex flex-col rounded-lg overflow-hidden">
          <div className="flex-1 overflow-auto">
            {responsesLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : flatRows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">{searchQuery ? t('campaigns.no_result_found') : t('empty.no_responses')}</p>
              </div>
            ) : (
              <div className="overflow-auto h-full">
                <Table className="min-w-max">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="whitespace-nowrap cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('_eo')}>
                        <span className="inline-flex items-center gap-1">{t('labels.entity')} <SortIcon column="_eo" /></span>
                      </TableHead>
                      <TableHead className="whitespace-nowrap cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('_code')}>
                        <span className="inline-flex items-center gap-1">{t('labels.code')} <SortIcon column="_code" /></span>
                      </TableHead>
                      <TableHead className="whitespace-nowrap cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('_status')}>
                        <span className="inline-flex items-center gap-1">{t('labels.status')} <SortIcon column="_status" /></span>
                      </TableHead>
                      {visibleFields.map(field => (
                        <TableHead key={field.field_id} className="whitespace-nowrap cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort(field.field_id)}>
                          <span className="inline-flex items-center gap-1">{field.field_name} <SortIcon column={field.field_id} /></span>
                        </TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap">{t('campaigns.table_last_modified')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((row, idx) => {
                      if (row.type === 'header') {
                        const isCollapsed = collapsedGroups.has(row.key);
                        return (
                          <TableRow
                            key={`group-${row.key}`}
                            className="bg-muted/60 hover:bg-muted cursor-pointer"
                            onClick={() => toggleGroup(row.key)}
                          >
                            <TableCell colSpan={colSpan} className="py-1.5 px-4">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span>{row.key}</span>
                                <span className="text-xs text-muted-foreground font-normal">({row.count})</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      const response = row.response;
                      const statusInfo = getStatusBadgeInfo(response._dynamic_status);
                      return (
                        <TableRow
                          key={response.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedResponse(response);
                            setResponseDrawerOpen(true);
                          }}
                        >
                          <TableCell className="font-medium whitespace-nowrap">
                            {response._eo?.name || t('empty.unknown_entity')}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {response._eo?.code || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Chip variant={statusInfo.variant} className="text-xs">
                              {statusInfo.label}
                            </Chip>
                          </TableCell>
                          {visibleFields.map(field => (
                            <TableCell key={field.field_id} className="text-muted-foreground whitespace-nowrap">
                              {formatFieldValue(response._field_values?.[field.field_id], field.field_type)}
                            </TableCell>
                          ))}
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {response.updated_at
                              ? new Date(response.updated_at).toLocaleDateString('fr-FR')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {flatRows.length > ITEMS_PER_PAGE && (
            <div className="flex-shrink-0 p-3 border-t">
              <UnifiedPagination
                totalItems={flatRows.length}
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={ITEMS_PER_PAGE}
                rangeStart={(safePage - 1) * ITEMS_PER_PAGE + 1}
                rangeEnd={Math.min(safePage * ITEMS_PER_PAGE, flatRows.length)}
              />
            </div>
          )}
        </Card>
      </div>

      <ResponseDetailsDrawer
        open={responseDrawerOpen}
        onOpenChange={setResponseDrawerOpen}
        response={selectedResponse}
      />
    </div>
  );
}
