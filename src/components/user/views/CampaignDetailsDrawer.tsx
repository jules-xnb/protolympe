import { Calendar, Users, CheckCircle, Clock, AlertCircle, Pause, StopCircle, Play, Plus } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api-client';
import { useSurveyCampaign, useCampaignTargets, useUpdateCampaign, useCloseCampaign, type CampaignStatus } from '@/hooks/useSurveyCampaigns';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';

function useStatusConfig() {
  const { t } = useT();
  const statusConfig: Record<CampaignStatus, { label: string; variant: 'default' | 'outline' | 'error' }> = {
    active: { label: t('status.active_campaign'), variant: 'default' },
    paused: { label: t('status.paused'), variant: 'outline' },
    closed: { label: t('status.closed'), variant: 'error' },
  };
  const boStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    draft: { label: t('status.draft'), variant: 'outline' },
    in_progress: { label: t('status.in_progress'), variant: 'default' },
    submitted: { label: t('status.submitted'), variant: 'secondary' },
    validated: { label: t('status.validated'), variant: 'default' },
    rejected: { label: t('status.rejected'), variant: 'destructive' },
  };
  return { statusConfig, boStatusConfig };
}

interface CampaignBO {
  id: string;
  reference_number: string;
  status: string;
  created_at: string;
  eo_name?: string;
  bo_name?: string;
}

function useCampaignBusinessObjects(campaignId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveyCampaigns.businessObjects(campaignId!),
    queryFn: async (): Promise<CampaignBO[]> => {
      if (!campaignId) return [];
      return api.get<CampaignBO[]>(`/api/surveys/campaigns/${campaignId}/business-objects`);
    },
    enabled: !!campaignId,
  });
}

interface CampaignDetailsDrawerProps {
  campaignId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunchNewCampaign?: (surveyId: string) => void;
}

export function CampaignDetailsDrawer({ campaignId, open, onOpenChange, onLaunchNewCampaign }: CampaignDetailsDrawerProps) {
  const { t, td } = useT();
  const { statusConfig, boStatusConfig } = useStatusConfig();
  const { data: campaign, isLoading: campaignLoading } = useSurveyCampaign(campaignId || undefined);
  const { data: targets = [], isLoading: targetsLoading } = useCampaignTargets(campaignId || undefined);
  const { data: businessObjects = [], isLoading: bosLoading } = useCampaignBusinessObjects(campaignId || undefined);

  const updateCampaign = useUpdateCampaign();
  const closeCampaign = useCloseCampaign();

  const isLoading = campaignLoading || targetsLoading || bosLoading;

  // Calculate stats
  const totalTargets = targets.length;
  const boCount = businessObjects.length;
  const submittedCount = businessObjects.filter(bo => ['submitted', 'validated', 'in_validation'].includes(bo.status)).length;
  const validatedCount = businessObjects.filter(bo => bo.status === 'validated').length;
  const inProgressCount = businessObjects.filter(bo => bo.status === 'in_progress').length;

  const completionRate = boCount > 0 ? Math.round((submittedCount / boCount) * 100) : 0;
  const validationRate = submittedCount > 0 ? Math.round((validatedCount / submittedCount) * 100) : 0;

  const handlePause = async () => {
    if (!campaignId) return;
    try {
      await updateCampaign.mutateAsync({ id: campaignId, status: 'paused' });
      toast.success(t('toast.campaign_paused'));
    } catch {
      toast.error(t('errors.pause'));
    }
  };

  const handleResume = async () => {
    if (!campaignId) return;
    try {
      await updateCampaign.mutateAsync({ id: campaignId, status: 'active' });
      toast.success(t('toast.campaign_resumed'));
    } catch {
      toast.error(t('errors.resume'));
    }
  };

  const handleClose = async () => {
    if (!campaignId) return;
    try {
      await closeCampaign.mutateAsync(campaignId);
      toast.success(t('toast.campaign_closed'));
    } catch {
      toast.error(t('errors.close'));
    }
  };

  return (
    <DetailsDrawer
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="p-0 flex flex-col"
      isLoading={isLoading}
      loadingContent={
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </div>
      }
    >
        {!campaign ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">{t('campaigns.not_found')}</p>
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 pb-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-xl">{td('survey_campaigns', campaign.id, 'name', campaign.name)}</SheetTitle>
                    <Chip variant={statusConfig[campaign.status].variant}>
                      {statusConfig[campaign.status].label}
                    </Chip>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {campaign.status === 'active' && (
                  <>
                    <Button variant="outline" size="sm" onClick={handlePause} disabled={updateCampaign.isPending}>
                      {t('buttons.pause')}
                      <Pause className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleClose} disabled={closeCampaign.isPending}>
                      {t('buttons.close')}
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {campaign.status === 'paused' && (
                  <>
                    <Button size="sm" onClick={handleResume} disabled={updateCampaign.isPending}>
                      {t('buttons.resume')}
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleClose} disabled={closeCampaign.isPending}>
                      {t('buttons.close')}
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Launch new campaign button */}
                {onLaunchNewCampaign && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onLaunchNewCampaign(campaign.survey_id);
                    }}
                  >
                    {t('dialogs.new_campaign')}
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-3 grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">{t('campaigns.targeted_entities')}</CardTitle>
                      <Users className="h-3 w-3 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{totalTargets}</div>
                      <p className="text-xs text-muted-foreground">
                        {targets.filter(t => t.include_descendants).length} {t('campaigns.with_descendants')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">{t('campaigns.instances')}</CardTitle>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{boCount}</div>
                      <p className="text-xs text-muted-foreground">
                        {inProgressCount} {t('campaigns.in_progress_count')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">{t('campaigns.completion_rate')}</CardTitle>
                      <CheckCircle className="h-3 w-3 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{completionRate}%</div>
                      <Progress value={completionRate} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium">{t('campaigns.validated_label')}</CardTitle>
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">{validatedCount}</div>
                      <p className="text-xs text-muted-foreground">
                        {validationRate}% {t('campaigns.submissions_percent')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Targets */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('campaigns.targeted_entities')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {targets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('campaigns.no_targeted_entity')}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {targets.map((target) => (
                          <Chip key={target.id} variant="outline" className="text-xs">
                            {target._eo?.name || t('campaigns.unknown_entity')}
                            {target._eo?.code && ` (${target._eo.code})`}
                            {target.include_descendants && ` ${t('campaigns.plus_descendants')}`}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Business Objects Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('campaigns.instances')} ({boCount})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {businessObjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {t('campaigns.no_instance_yet')}
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('campaigns.table_ref')}</TableHead>
                            <TableHead>{t('campaigns.table_name')}</TableHead>
                            <TableHead>{t('campaigns.table_entity')}</TableHead>
                            <TableHead>{t('campaigns.table_status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {businessObjects.map((bo) => {
                            const statusInfo = boStatusConfig[bo.status] || { label: bo.status, variant: 'outline' as const };
                            return (
                              <TableRow key={bo.id}>
                                <TableCell className="font-mono text-xs">
                                  {bo.reference_number || '—'}
                                </TableCell>
                                <TableCell className="text-sm truncate max-w-[160px]">
                                  {bo.bo_name || '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {bo.eo_name || '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={statusInfo.variant} className="text-xs">
                                    {statusInfo.label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </>
        )}
    </DetailsDrawer>
  );
}
