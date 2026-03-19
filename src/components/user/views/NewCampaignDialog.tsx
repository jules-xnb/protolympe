import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useCreateCampaign } from '@/hooks/useSurveyCampaigns';
import { toast } from 'sonner';
import type { CampaignTypeConfig } from '@/components/builder/page-builder/types';
import { CampaignTypeStep } from './campaign/CampaignTypeStep';
import { CampaignInfoStep } from './campaign/CampaignInfoStep';
import { CampaignPerimeterStep } from './campaign/CampaignPerimeterStep';
import { CampaignVerificationStep } from './campaign/CampaignVerificationStep';
import { usePerimeterSelection } from './campaign/usePerimeterSelection';
import { useWorkflowRoleVerification } from '@/hooks/useWorkflowRoleVerification';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

const campaignSchema = z.object({
  name: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  previous_campaign_id: z.string().optional(),
}).refine(data => data.end_date >= data.start_date, {
  message: 'La date de fin ne peut pas être avant la date de début',
  path: ['end_date'],
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignTypes: CampaignTypeConfig[];
  viewConfigId?: string;
  clientId?: string;
  onSuccess?: (campaignId: string) => void;
  preSelectedTypeId?: string;
}

type Step = 'select_type' | 'informations' | 'perimeter' | 'verification';

function CampaignStepper({ currentStep }: { currentStep: 'informations' | 'perimeter' | 'verification' }) {
  const { t } = useT();
  const steps = [
    { key: 'informations', label: t('campaigns.step_informations') },
    { key: 'perimeter', label: t('campaigns.step_perimeter') },
    { key: 'verification', label: t('campaigns.step_verification') },
  ] as const;

  const stepOrder = ['informations', 'perimeter', 'verification'] as const;
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isActive = currentStep === step.key;
        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 shrink-0',
                isCompleted
                  ? 'bg-primary border-primary text-primary-foreground'
                  : isActive
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-muted-foreground/30 text-muted-foreground'
              )}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div className={cn(
                  'w-0.5 h-6 my-1',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                )} />
              )}
            </div>
            <span className={cn(
              'text-sm pt-1',
              isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function NewCampaignDialog({
  open,
  onOpenChange,
  campaignTypes,
  viewConfigId,
  clientId,
  onSuccess,
  preSelectedTypeId,
}: NewCampaignDialogProps) {
  const { t } = useT();
  const [step, setStep] = useState<Step>('select_type');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  const activeTypes = campaignTypes.filter(t => t.is_active);
  const selectedType = activeTypes.find(t => t.id === selectedTypeId);

  const createCampaign = useCreateCampaign();
  const perimeter = usePerimeterSelection(clientId);

  // Expand targets with descendants for verification
  const verificationEoIds = useMemo(() => {
    const ids = new Set<string>();
    for (const target of perimeter.targets) {
      ids.add(target.eo_id);
      if (target.include_descendants) {
        for (const descendantId of perimeter.getAllDescendantIds(target.eo_id)) {
          ids.add(descendantId);
        }
      }
    }
    return [...ids];
  }, [perimeter.targets, perimeter.getAllDescendantIds]);

  const verification = useWorkflowRoleVerification(
    selectedType?.workflow_id,
    clientId,
    verificationEoIds,
    step === 'verification',
  );

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      previous_campaign_id: '',
    },
  });

  // Reset when dialog opens - use ref to avoid dependency on activeTypes
  const activeTypesRef = useRef(activeTypes);
  activeTypesRef.current = activeTypes;

  useEffect(() => {
    if (open) {
      const types = activeTypesRef.current;
      const hasPreSelected = preSelectedTypeId && types.some(t => t.id === preSelectedTypeId);
      if (hasPreSelected) {
        setStep('informations');
        setSelectedTypeId(preSelectedTypeId!);
      } else {
        setStep('select_type');
        setSelectedTypeId(types.length === 1 ? types[0].id : null);
      }
      perimeter.resetPerimeter();
      form.reset({
        name: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        previous_campaign_id: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleContinue = () => {
    if (selectedTypeId) {
      setStep('informations');
    }
  };

  const handleNextToPerimeter = async () => {
    const valid = await form.trigger(['name', 'start_date', 'end_date']);
    if (valid) setStep('perimeter');
  };



  const handleSubmit = async (data: CampaignFormData) => {
    if (!selectedType) {
      toast.error(t('campaigns.select_type_error'));
      return;
    }

    if (perimeter.targets.length === 0) {
      toast.error(t('campaigns.select_entity_error'));
      return;
    }

    if (!clientId) {
      toast.error(t('campaigns.client_undefined_error'));
      return;
    }

    try {
      if (!selectedType.workflow_id) {
        toast.error(t('campaigns.no_workflow_error'));
        return;
      }

      const result = await createCampaign.mutateAsync({
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        previous_campaign_id: data.previous_campaign_id || null,
        targets: perimeter.targets,
        workflow_id: selectedType.workflow_id,
        client_id: clientId,
        source_view_config_id: viewConfigId,
      });

      toast.success(t('campaigns.launch_success'));
      onOpenChange(false);
      onSuccess?.(result.id);
    } catch (error) {
      console.error('Campaign creation error:', error);
      const errorMessage = error instanceof Error ? error.message : t('errors.unknown');
      toast.error(`${t('campaigns.launch_error')} ${errorMessage}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'select_type' ? t('dialogs.new_campaign') : t('dialogs.launch_campaign')}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select campaign type */}
        {step === 'select_type' && (
          <>
            <div className="flex-1 overflow-auto py-4">
              <CampaignTypeStep
                campaignTypes={activeTypes}
                selectedTypeId={selectedTypeId}
                onSelect={setSelectedTypeId}
              />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('buttons.cancel')}
              </Button>
              <Button onClick={handleContinue} disabled={!selectedTypeId}>
                {t('buttons.continue')}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Informations */}
        {step === 'informations' && (
          <Form {...form}>
            <div className="flex gap-6 flex-1 overflow-hidden py-4">
              <div className="shrink-0 pt-1">
                <CampaignStepper currentStep="informations" />
              </div>
              <CampaignInfoStep form={form} viewConfigId={viewConfigId} />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('buttons.cancel')}
              </Button>
              <Button type="button" onClick={handleNextToPerimeter}>
                {t('buttons.next')}
              </Button>
            </DialogFooter>
          </Form>
        )}

        {/* Step 3: Perimeter */}
        {step === 'perimeter' && (
          <>
            <div className="flex gap-6 flex-1 overflow-hidden py-4">
              <div className="shrink-0 pt-1">
                <CampaignStepper currentStep="perimeter" />
              </div>
              <CampaignPerimeterStep
                searchQuery={perimeter.searchQuery}
                onSearchQueryChange={perimeter.setSearchQuery}
                filterColumns={perimeter.filterColumns}
                filters={perimeter.filters}
                onFiltersChange={perimeter.setFilters}
                filterLogic={perimeter.filterLogic}
                onFilterLogicChange={perimeter.setFilterLogic}
                eoGroups={perimeter.eoGroups}
                selectedGroupId={perimeter.selectedGroupId}
                onSelectedGroupIdChange={perimeter.setSelectedGroupId}
                filteredEoTree={perimeter.filteredEoTree}
                eoTree={perimeter.eoTree}
                expandedEos={perimeter.expandedEos}
                onToggleExpand={perimeter.toggleExpand}
                targets={perimeter.targets}
                onToggleEo={perimeter.handleToggleEo}
                onResetTargets={() => { perimeter.setTargets([]); perimeter.setSelectedGroupId(null); }}
                isEoSelected={perimeter.isEoSelected}
                getAllDescendantIds={perimeter.getAllDescendantIds}
              />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('buttons.cancel')}
              </Button>
              <Button type="button" onClick={() => setStep('verification')} disabled={perimeter.targets.length === 0}>
                {t('buttons.next')}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Verification */}
        {step === 'verification' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex gap-6 flex-1 overflow-hidden py-4">
                <div className="shrink-0 pt-1">
                  <CampaignStepper currentStep="verification" />
                </div>
                <CampaignVerificationStep
                  results={verification.data || []}
                  isLoading={verification.isLoading}
                />
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('buttons.cancel')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep('perimeter')}>
                  {t('buttons.previous')}
                </Button>
                <Button type="submit" disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? (
                    <>{t('campaigns.launching')} <Loader2 className="h-4 w-4 animate-spin" /></>
                  ) : t('buttons.launch_campaign')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
