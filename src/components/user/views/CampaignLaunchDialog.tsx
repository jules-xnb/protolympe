import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, Building2, Info, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chip } from '@/components/ui/chip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSurvey } from '@/hooks/useSurveys';
import { 
  useSurveyCampaigns, 
  useCreateCampaign 
} from '@/hooks/useSurveyCampaigns';
import { useAllOrganizationalEntities } from '@/hooks/useAllOrganizationalEntities';
import { toast } from 'sonner';
import { useT } from '@/hooks/useT';

const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  previous_campaign_id: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface EoTarget {
  eo_id: string;
  include_descendants: boolean;
}

interface CampaignLaunchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId?: string;
  viewConfigId?: string;  // Source view config ID to track where campaign was created
}

export function CampaignLaunchDialog({
  open,
  onOpenChange,
  surveyId,
  viewConfigId: _viewConfigId,
}: CampaignLaunchDialogProps) {
  const { t } = useT();
  const [targets, setTargets] = useState<EoTarget[]>([]);
  const [expandedEos, setExpandedEos] = useState<Set<string>>(new Set());

  const { data: survey } = useSurvey(surveyId);
  const { data: allCampaigns = [] } = useSurveyCampaigns(surveyId);
  const previousCampaigns = allCampaigns.filter(c => c.status === 'closed');
  const { data: allEos = [] } = useAllOrganizationalEntities();
  const createCampaign = useCreateCampaign();

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      previous_campaign_id: '',
    },
  });

  useEffect(() => {
    if (open) {
      setTargets([]);
      form.reset({
        name: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        previous_campaign_id: previousCampaigns[0]?.id || '',
      });
    }
  }, [open, previousCampaigns, form]);

  // Build EO tree
  const eoTree = useMemo(() => {
    const rootEos = allEos.filter(eo => !eo.parent_id);
    const childrenMap = new Map<string, typeof allEos>();
    
    allEos.forEach(eo => {
      if (eo.parent_id) {
        const children = childrenMap.get(eo.parent_id) || [];
        children.push(eo);
        childrenMap.set(eo.parent_id, children);
      }
    });

    return { roots: rootEos, childrenMap };
  }, [allEos]);

  // Count descendants for an EO
  const countDescendants = useCallback((eoId: string): number => {
    const children = eoTree.childrenMap.get(eoId) || [];
    let count = children.length;
    children.forEach(child => {
      count += countDescendants(child.id);
    });
    return count;
  }, [eoTree]);

  // Calculate total targeted EOs
  const totalTargetedEos = useMemo(() => {
    let total = 0;
    targets.forEach(target => {
      total += 1; // The EO itself
      if (target.include_descendants) {
        total += countDescendants(target.eo_id);
      }
    });
    return total;
  }, [targets, countDescendants]);

  const handleToggleEo = (eoId: string, checked: boolean) => {
    if (checked) {
      setTargets(prev => [...prev, { eo_id: eoId, include_descendants: false }]);
    } else {
      setTargets(prev => prev.filter(t => t.eo_id !== eoId));
    }
  };

  const handleToggleDescendants = (eoId: string, checked: boolean) => {
    setTargets(prev => prev.map(t => 
      t.eo_id === eoId ? { ...t, include_descendants: checked } : t
    ));
  };

  const isEoSelected = (eoId: string) => {
    return targets.some(t => t.eo_id === eoId);
  };

  const includesDescendants = (eoId: string) => {
    return targets.find(t => t.eo_id === eoId)?.include_descendants ?? false;
  };

  const toggleExpand = (eoId: string) => {
    setExpandedEos(prev => {
      const next = new Set(prev);
      if (next.has(eoId)) {
        next.delete(eoId);
      } else {
        next.add(eoId);
      }
      return next;
    });
  };

  const renderEoItem = (eo: typeof allEos[0], level: number = 0) => {
    const children = eoTree.childrenMap.get(eo.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedEos.has(eo.id);
    const isSelected = isEoSelected(eo.id);
    const descendantCount = countDescendants(eo.id);

    return (
      <div key={eo.id}>
        <div 
          className="flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded px-2"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={() => toggleExpand(eo.id)}
            >
              <ChevronRight 
                className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              />
            </Button>
          ) : (
            <div className="w-5" />
          )}
          
          <Checkbox
            id={`eo-${eo.id}`}
            checked={isSelected}
            onCheckedChange={(checked) => handleToggleEo(eo.id, !!checked)}
          />
          
          <label 
            htmlFor={`eo-${eo.id}`}
            className="flex-1 text-sm cursor-pointer flex items-center gap-2"
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {eo.name}
            {eo.code && (
              <span className="text-xs text-muted-foreground">({eo.code})</span>
            )}
          </label>

          {isSelected && hasChildren && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`descendants-${eo.id}`}
                checked={includesDescendants(eo.id)}
                onCheckedChange={(checked) => handleToggleDescendants(eo.id, !!checked)}
              />
              <label 
                htmlFor={`descendants-${eo.id}`}
                className="text-xs text-muted-foreground cursor-pointer"
              >
                +{descendantCount} {t('campaigns.sub_entities')}
              </label>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map(child => renderEoItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async (data: CampaignFormData) => {
    if (!surveyId) {
      toast.error(t('campaigns.survey_not_selected'));
      return;
    }

    if (targets.length === 0) {
      toast.error(t('campaigns.select_entity_error'));
      return;
    }

    if (!survey?.workflow_id) {
      toast.error(t('campaigns.no_workflow_survey_error'));
      return;
    }

    try {
      await createCampaign.mutateAsync({
        survey_id: surveyId,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        previous_campaign_id: data.previous_campaign_id || null,
        targets,
        workflow_id: survey.workflow_id,
      });
      toast.success(t('campaigns.launch_success'));
      onOpenChange(false);
    } catch {
      toast.error(t('campaigns.launch_campaign_error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('dialogs.launch_campaign')}</DialogTitle>
          {survey && (
            <p className="text-sm text-muted-foreground">
              {t('campaigns.survey_label')} {survey.name}
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 pb-4">
                {/* Previous Campaign */}
                {previousCampaigns.length > 0 && (
                  <>
                    <FormField
                      control={form.control}
                      name="previous_campaign_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('campaigns.previous_campaign_label')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('campaigns.select_campaign_placeholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">{t('campaigns.previous_campaign_none')}</SelectItem>
                              {previousCampaigns.map((campaign) => (
                                <SelectItem key={campaign.id} value={campaign.id}>
                                  {campaign.name}
                                  {campaign.end_date && (
                                    <span className="text-muted-foreground ml-2">
                                      ({t('campaigns.ended_on')} {new Date(campaign.end_date).toLocaleDateString('fr-FR')})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {t('campaigns.previous_campaign_help')}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Separator />
                  </>
                )}

                {/* Campaign Info */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('campaigns.campaign_name_form_label')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('campaigns.campaign_name_placeholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('campaigns.start_date_label')}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('campaigns.end_date_label')}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Target EOs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('campaigns.target_entities_label')}</Label>
                    <Chip variant="default">
                      {totalTargetedEos} {totalTargetedEos !== 1 ? t('campaigns.entities_suffix') : t('campaigns.entity_suffix')} {totalTargetedEos !== 1 ? t('campaigns.targeted_count_suffix_plural') : t('campaigns.targeted_count_suffix')}
                    </Chip>
                  </div>

                  <div className="border rounded-lg max-h-64 overflow-auto">
                    {eoTree.roots.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        {t('campaigns.no_entity_available')}
                      </div>
                    ) : (
                      <div className="p-2">
                        {eoTree.roots.map(eo => renderEoItem(eo))}
                      </div>
                    )}
                  </div>

                  {targets.length === 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {t('campaigns.target_entities_help')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                {t('buttons.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createCampaign.isPending || targets.length === 0}
              >
                {createCampaign.isPending ? (
                  <>{t('campaigns.launching')} <Loader2 className="h-4 w-4 animate-spin" /></>
                ) : t('buttons.launch_campaign')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
