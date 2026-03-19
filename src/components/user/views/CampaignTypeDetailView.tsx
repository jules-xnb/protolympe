import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Search, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { formatDate } from '@/lib/format-utils';
import type { CampaignTypeConfig } from '@/components/builder/page-builder/types';
import type { CampaignStatus } from '@/hooks/useSurveyCampaigns';
import { useT } from '@/hooks/useT';

interface CampaignWithSurvey {
  id: string;
  name: string;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  survey_id: string;
  survey: {
    id: string;
    name: string;
    settings: {
      campaign_type_id?: string;
      campaign_type_name?: string;
    } | null;
  };
  _responses_count?: number;
  _progress?: {
    validated: number;
    inProgress: number;
    total: number;
  };
}

interface CampaignTypeDetailViewProps {
  type: CampaignTypeConfig;
  campaigns: CampaignWithSurvey[];
  onBack: () => void;
  onSelectCampaign?: (campaign: CampaignWithSurvey) => void;
  onLaunchCampaign: () => void;
  allowFormEdit?: boolean;
  allowImport?: boolean;
  allowExport?: boolean;
}

function ProgressBar({ progress }: { progress?: CampaignWithSurvey['_progress'] }) {
  if (!progress || progress.total === 0) {
    return (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-2 rounded-full bg-muted" />
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">0%</span>
      </div>
    );
  }

  const { validated, inProgress, total } = progress;
  const validatedPct = Math.round((validated / total) * 100);
  const inProgressPct = Math.round((inProgress / total) * 100);
  const overallPct = validatedPct + inProgressPct;

  return (
    <div
      className="flex items-center gap-3 w-full"
      title={`${validatedPct}% / ${inProgressPct}%`}
    >
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
        {validatedPct > 0 && (
          <div
            className="h-full bg-primary"
            style={{ width: `${validatedPct}%` }}
          />
        )}
        {inProgressPct > 0 && (
          <div
            className="h-full bg-orange-400"
            style={{ width: `${inProgressPct}%` }}
          />
        )}
      </div>
      <span className="text-xs tabular-nums w-8 text-right shrink-0" style={{ color: '#4C5069' }}>{overallPct}%</span>
    </div>
  );
}

export function CampaignTypeDetailView({
  type,
  campaigns,
  onBack,
  onSelectCampaign,
  onLaunchCampaign,
  allowFormEdit,
  allowImport,
  allowExport,
}: CampaignTypeDetailViewProps) {
  const { t, td } = useT();
  const navigate = useNavigate();
  const cp = useClientPath();
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);

  const activeCampaigns = useMemo(
    () => campaigns.filter(c => c.status === 'active' || c.status === 'paused'),
    [campaigns],
  );
  const closedCampaigns = useMemo(
    () => campaigns.filter(c => c.status === 'closed'),
    [campaigns],
  );

  const currentList = activeTab === 'active' ? activeCampaigns : closedCampaigns;

  const filteredList = useMemo(() => {
    if (!search.trim()) return currentList;
    const q = search.toLowerCase();
    return currentList.filter(c => c.name.toLowerCase().includes(q));
  }, [currentList, search]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filteredList.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages - 1);
  if (safePage !== currentPage) setCurrentPage(safePage);

  const paginatedList = useMemo(() => {
    const start = currentPage * rowsPerPage;
    return filteredList.slice(start, start + rowsPerPage);
  }, [filteredList, currentPage, rowsPerPage]);

  const rangeStart = filteredList.length === 0 ? 0 : currentPage * rowsPerPage + 1;
  const rangeEnd = Math.min((currentPage + 1) * rowsPerPage, filteredList.length);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-[20px] font-semibold">{type.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {allowFormEdit && type.workflow_id && (
            <Button variant="outline" onClick={() => navigate(cp(CLIENT_ROUTES.USER_WORKFLOW_FORMS(type.workflow_id!)))} className="shrink-0">
              {t('campaigns.configure_forms')}
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={onLaunchCampaign} className="shrink-0">
            {t('dialogs.launch_campaign')}
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs – underline style */}
      <div className="px-6">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'active' | 'closed'); setCurrentPage(0); }}>
          <TabsList className="w-full justify-start gap-6">
            <TabsTrigger value="active">
              {t('campaigns.active_campaigns_tab')}
              <span className="inline-flex items-center justify-center text-[12px] font-medium leading-none rounded-full ml-2" style={{ backgroundColor: '#E5E7EF', color: '#232332', padding: '4px 8px' }}>
                {activeCampaigns.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="closed">
              {t('campaigns.closed_campaigns_tab')}
              <span className="inline-flex items-center justify-center text-[12px] font-medium leading-none rounded-full ml-2" style={{ backgroundColor: '#E5E7EF', color: '#232332', padding: '4px 8px' }}>
                {closedCampaigns.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search + Sort */}
      <div className="px-6 py-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('campaigns.search_name_email')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 px-6">
        {filteredList.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-medium mb-4">
              {activeTab === 'active' ? t('campaigns.no_active_campaigns') : t('campaigns.no_closed_campaigns')}
            </p>
            {activeTab === 'active' && (
              <Button onClick={onLaunchCampaign}>
                {t('dialogs.launch_campaign')}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('campaigns.table_campaign_name')}</TableHead>
                    <TableHead>{t('campaigns.table_start_date')}</TableHead>
                    <TableHead>{t('campaigns.table_end_date')}</TableHead>
                    <TableHead>{t('campaigns.table_progress')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedList.map((campaign) => (
                    <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(cp(CLIENT_ROUTES.USER_CAMPAIGN(campaign.id)) + `?manager=1${allowImport ? '&import=1' : ''}${allowExport ? '&export=1' : ''}`)}>
                      <TableCell className="font-medium">{td('survey_campaigns', campaign.id, 'name', campaign.name)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(campaign.start_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(campaign.end_date)}</TableCell>
                      <TableCell>
                        <ProgressBar progress={campaign._progress} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredList.length > 0 && (
        <div className="px-6 py-3 border-t flex items-center justify-end gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{t('campaigns.rows_per_page')}</span>
            <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(0); }}>
              <SelectTrigger className="h-7 w-[60px] text-xs border-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="tabular-nums">
            {rangeStart}-{rangeEnd} {t('campaigns.pagination_of')} {filteredList.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { CampaignWithSurvey };
