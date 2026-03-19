import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { CampaignTypeDetailView } from './CampaignTypeDetailView';
import { NewCampaignDialog } from './NewCampaignDialog';
import { type CampaignStatus } from '@/hooks/useSurveyCampaigns';
import type { SurveyCreatorBlock, CampaignTypeConfig } from '@/components/builder/page-builder/types';
import type { CampaignWithSurvey } from './survey-creator/types';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

interface SurveyCreatorViewProps {
  block: SurveyCreatorBlock;
  viewConfigId?: string;
  clientId?: string;
}

export function SurveyCreatorView({ block, viewConfigId, clientId }: SurveyCreatorViewProps) {
  const { t } = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTypeId = searchParams.get('typeId');
  const [newCampaignDialogOpen, setNewCampaignDialogOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [typeSort, setTypeSort] = useState<string>('all');

  const setSelectedType = useCallback((type: CampaignTypeConfig | null) => {
    setSearchParams(prev => {
      if (type) {
        prev.set('typeId', type.id);
      } else {
        prev.delete('typeId');
      }
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  // Resolve workflow_ids from config into CampaignTypeConfig-compatible objects
  const workflowIds = block.config.workflow_ids ?? (block.config.workflow_id ? [block.config.workflow_id] : []);

  const { data: activeTypes = [] } = useQuery({
    queryKey: queryKeys.surveys.creatorWorkflows(workflowIds),
    queryFn: async (): Promise<CampaignTypeConfig[]> => {
      if (workflowIds.length === 0) return [];
      const workflows = await api.post<Array<{ id: string; name: string; description: string | null; bo_definition_id: string | null; is_published: boolean }>>('/api/workflows/by-ids', { ids: workflowIds });
      return workflows.map(wf => ({
        id: wf.id,
        name: wf.name,
        description: wf.description ?? undefined,
        is_active: true,
        bo_definition_id: wf.bo_definition_id ?? undefined,
        workflow_id: wf.id,
        respondent_fields: [],
        enable_validation_workflow: true,
        validation_steps: [],
      }));
    },
    enabled: workflowIds.length > 0,
  });

  // Fetch all campaigns linked to this view
  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.surveyCampaigns.viewCampaigns(viewConfigId!),
    queryFn: async () => {
      if (!viewConfigId) return [];
      return api.get<CampaignWithSurvey[]>(`/api/surveys/campaigns?source_view_config_id=${viewConfigId}&with_progress=true`);
    },
    enabled: !!viewConfigId,
  });

  // Group campaigns by type (workflow_id in survey settings matches the type id)
  const campaignsByType = useMemo(() => {
    const grouped = new Map<string, CampaignWithSurvey[]>();
    campaigns.forEach(campaign => {
      const surveySettings = campaign.survey?.settings as Record<string, unknown> | undefined;
      const typeId = surveySettings?.workflow_id as string
        || surveySettings?.campaign_type_id as string
        || 'unknown';
      if (!grouped.has(typeId)) grouped.set(typeId, []);
      grouped.get(typeId)!.push(campaign);
    });
    return grouped;
  }, [campaigns]);

  // Derive selectedType object from URL param
  const selectedType = useMemo(() => {
    if (!selectedTypeId) return null;
    return activeTypes.find(t => t.id === selectedTypeId) || null;
  }, [selectedTypeId, activeTypes]);

  // Filter types by search query (must be before early returns to respect hooks rules)
  const filteredTypes = useMemo(() => {
    if (!typeSearch.trim()) return activeTypes;
    const q = typeSearch.toLowerCase();
    return activeTypes.filter(t => t.name.toLowerCase().includes(q));
  }, [activeTypes, typeSearch]);

  // --- Level 2: Type detail with campaigns ---
  if (selectedType) {
    const typeCampaigns = campaignsByType.get(selectedType.id) || [];
    return (
      <>
        <CampaignTypeDetailView
          type={selectedType}
          campaigns={typeCampaigns}
          onBack={() => setSelectedType(null)}
          onLaunchCampaign={() => setNewCampaignDialogOpen(true)}
          allowFormEdit={block.config.allow_form_edit ?? false}
          allowImport={block.config.allow_import ?? false}
          allowExport={block.config.allow_export ?? false}
        />
        <NewCampaignDialog
          open={newCampaignDialogOpen}
          onOpenChange={setNewCampaignDialogOpen}
          campaignTypes={[selectedType]}
          viewConfigId={viewConfigId}
          clientId={clientId}
          preSelectedTypeId={selectedType.id}
          onSuccess={() => {
            refetch();
            setNewCampaignDialogOpen(false);
          }}
        />
      </>
    );
  }

  // --- Level 1: Campaign types table ---

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Title */}
      <h1 className="text-xl font-semibold">
        {block.title || t('labels.value_collection')}
      </h1>

      {/* Search + Sort bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('placeholders.search')}
            value={typeSearch}
            onChange={(e) => setTypeSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={typeSort} onValueChange={setTypeSort}>
          <SelectTrigger className="w-[160px] h-10">
            <SelectValue placeholder={t('campaigns.sort_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('campaigns.sort_all')}</SelectItem>
            <SelectItem value="active">{t('campaigns.sort_with_campaigns')}</SelectItem>
            <SelectItem value="empty">{t('campaigns.sort_without_campaigns')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{t('campaigns.no_type_configured')}</p>
            <p className="text-sm">{t('campaigns.contact_admin')}</p>
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">{t('campaigns.table_collection_type')}</TableHead>
                    <TableHead>{t('campaigns.table_active_campaigns')}</TableHead>
                    <TableHead>{t('campaigns.table_completed_campaigns')}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes
                    .filter(type => {
                      if (typeSort === 'all') return true;
                      const count = (campaignsByType.get(type.id) || []).length;
                      return typeSort === 'active' ? count > 0 : count === 0;
                    })
                    .map((type) => {
                      const typeCampaigns = campaignsByType.get(type.id) || [];
                      const activeCount = typeCampaigns.filter(c => c.status === 'active' || c.status === 'paused').length;
                      const closedCount = typeCampaigns.filter(c => c.status === 'closed').length;

                      return (
                        <TableRow
                          key={type.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedType(type)}
                        >
                          <TableCell className="whitespace-nowrap">{type.name}</TableCell>
                          <TableCell>{activeCount}</TableCell>
                          <TableCell>{closedCount}</TableCell>
                          <TableCell className="w-10">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
