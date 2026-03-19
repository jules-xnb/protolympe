import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileCheck, Search, ChevronRight } from 'lucide-react';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useMyPendingResponses, type SurveyResponseWithDetails, type ActiveCampaignInfo, type MyPendingResponsesResult } from '@/hooks/useSurveyResponses';
import type { SurveyResponsesBlock } from '@/components/builder/page-builder/types';
import { useViewMode } from '@/contexts/ViewModeContext';
import { formatDate } from '@/lib/format-utils';

interface SurveyResponsesViewProps {
  block: SurveyResponsesBlock;
}

interface CampaignGroup {
  key: string;
  surveyName: string;
  campaignName: string;
  campaignId: string;
  startDate: string | null;
  endDate: string | null;
  responses: SurveyResponseWithDetails[];
}

function groupByCampaign(responses: SurveyResponseWithDetails[]): CampaignGroup[] {
  const map = new Map<string, CampaignGroup>();
  for (const r of responses) {
    const key = r.campaign_id;
    if (!map.has(key)) {
      map.set(key, {
        key,
        surveyName: r._survey?.name || 'Questionnaire',
        campaignName: r._campaign?.name || '-',
        campaignId: r.campaign_id,
        startDate: r._campaign?.start_date || null,
        endDate: r._campaign?.end_date || null,
        responses: [],
      });
    }
    map.get(key)!.responses.push(r);
  }
  return Array.from(map.values());
}

type HistoryTab = 'active' | 'finished';

export function SurveyResponsesView({ block }: SurveyResponsesViewProps) {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignSort, setCampaignSort] = useState('all');
  const [campaignRowsPerPage, setCampaignRowsPerPage] = useState(10);
  const [campaignPage, setCampaignPage] = useState(0);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('active');
  const { activeProfile } = useViewMode();

  const config = block.config;
  const workflowIds = config.workflow_ids ?? (config.workflow_id ? [config.workflow_id] : undefined);

  const { data, isLoading } = useMyPendingResponses(
    workflowIds,
    activeProfile?.eoIds,
    activeProfile?.roleIds,
    config.enable_history ?? false
  );

  const responses = data?.responses ?? [];
  const activeCampaigns = data?.activeCampaigns ?? [];

  // Filter responses based on config visibility
  const visibleResponses = responses.filter(response => {
    const status = response.status;
    if (status === 'pending' || status === 'in_progress') return config.show_pending !== false;
    if (status === 'rejected') return config.show_rejected !== false;
    if (status === 'submitted') return true;
    if (status === 'validated') return config.enable_history ? true : config.show_validated === true;
    if (status === 'in_validation') return true;
    return true;
  });

  // Group by campaign, then add campaigns with no responses
  const responseGroups = groupByCampaign(visibleResponses);
  const responseGroupIds = new Set(responseGroups.map(g => g.campaignId));
  const allCampaignGroups = [
    ...responseGroups,
    ...activeCampaigns
      .filter(c => !responseGroupIds.has(c.id))
      .map(c => ({
        key: c.id,
        surveyName: c.surveyName,
        campaignName: c.name,
        campaignId: c.id,
        startDate: c.startDate,
        endDate: c.endDate,
        responses: [] as SurveyResponseWithDetails[],
      })),
  ];

  // Split into active / finished when history is enabled
  const campaignGroups = useMemo(() => {
    if (!config.enable_history) return allCampaignGroups;
    const now = new Date();
    return allCampaignGroups.filter((g) => {
      const isFinished = g.endDate && new Date(g.endDate) < now;
      return historyTab === 'active' ? !isFinished : isFinished;
    });
  }, [allCampaignGroups, config.enable_history, historyTab]);

  // Filter + paginate campaign list
  const filteredCampaignGroups = useMemo(() => {
    if (!campaignSearch.trim()) return campaignGroups;
    const q = campaignSearch.toLowerCase();
    return campaignGroups.filter(g => g.campaignName.toLowerCase().includes(q) || g.surveyName.toLowerCase().includes(q));
  }, [campaignGroups, campaignSearch]);

  const campaignTotalPages = Math.max(1, Math.ceil(filteredCampaignGroups.length / campaignRowsPerPage));
  const safeCampaignPage = Math.min(campaignPage, campaignTotalPages - 1);
  if (safeCampaignPage !== campaignPage) setCampaignPage(safeCampaignPage);

  const paginatedCampaignGroups = useMemo(() => {
    const start = campaignPage * campaignRowsPerPage;
    return filteredCampaignGroups.slice(start, start + campaignRowsPerPage);
  }, [filteredCampaignGroups, campaignPage, campaignRowsPerPage]);

  const campaignRangeStart = filteredCampaignGroups.length === 0 ? 0 : campaignPage * campaignRowsPerPage + 1;
  const campaignRangeEnd = Math.min((campaignPage + 1) * campaignRowsPerPage, filteredCampaignGroups.length);

  const handleSelectCampaign = (group: CampaignGroup) => {
    navigate(`/dashboard/${clientId}/user/campaigns/${group.campaignId}`, {
      state: {
        enable_import: config.enable_import ?? false,
        enable_export: config.enable_export ?? false,
      },
    });
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <h2 className="text-xl font-semibold flex-shrink-0">
        {block.title || 'Mes types de collecte'}
      </h2>
      {config.enable_history && (
        <div className="flex-shrink-0">
          <div className="flex gap-0 border-b">
            <button
              onClick={() => { setHistoryTab('active'); setCampaignPage(0); }}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                historyTab === 'active'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Campagnes en cours
            </button>
            <button
              onClick={() => { setHistoryTab('finished'); setCampaignPage(0); }}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                historyTab === 'finished'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Campagnes terminées
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full gap-4">
            {/* Search + Sort */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={campaignSearch}
                  onChange={(e) => { setCampaignSearch(e.target.value); setCampaignPage(0); }}
                  className="pl-9 h-10"
                />
              </div>
              <Select value={campaignSort} onValueChange={setCampaignSort}>
                <SelectTrigger className="w-[160px] h-10">
                  <SelectValue placeholder="Trier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom de la campagne</TableHead>
                      <TableHead>Type de collecte</TableHead>
                      <TableHead className="w-[140px]">Date début</TableHead>
                      <TableHead className="w-[140px]">Date de fin</TableHead>
                      <TableHead>Entité à déclarer</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCampaignGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                          <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          {campaignSearch ? 'Aucun résultat' : 'Aucun questionnaire à compléter'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCampaignGroups.map((group) => (
                        <TableRow
                          key={group.key}
                          className="cursor-pointer"
                          onClick={() => handleSelectCampaign(group)}
                        >
                          <TableCell className="font-medium whitespace-nowrap">{group.campaignName}</TableCell>
                          <TableCell className="text-muted-foreground">{group.surveyName}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(group.startDate)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(group.endDate)}</TableCell>
                          <TableCell>
                            {(() => {
                              const userEoIds = activeProfile?.eoIds;
                              const eos = new Map<string, string>();
                              group.responses.forEach(r => {
                                if (r._eo && (!userEoIds || userEoIds.includes(r.respondent_eo_id))) {
                                  eos.set(r._eo.id, r._eo.name);
                                }
                              });
                              const eoList = Array.from(eos.values());
                              const max = 2;
                              if (eoList.length === 0) return <span className="text-xs text-muted-foreground">-</span>;
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {eoList.slice(0, max).map((name, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium truncate max-w-[140px]">
                                      {name}
                                    </span>
                                  ))}
                                  {eoList.length > max && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                                      +{eoList.length - max}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-primary" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex-shrink-0 border-t pt-3">
              <UnifiedPagination
                totalItems={filteredCampaignGroups.length}
                currentPage={campaignPage + 1}
                totalPages={campaignTotalPages}
                onPageChange={(page) => setCampaignPage(page - 1)}
                pageSize={campaignRowsPerPage}
                onPageSizeChange={(size) => { setCampaignRowsPerPage(size); setCampaignPage(0); }}
                pageSizeOptions={[5, 10, 25, 50]}
                rangeStart={campaignRangeStart}
                rangeEnd={campaignRangeEnd}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
