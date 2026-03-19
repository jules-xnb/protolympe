import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FloatingInput } from '@/components/ui/floating-input';
import { queryKeys } from '@/lib/query-keys';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT } from '@/hooks/useT';

interface CampaignFormData {
  name: string;
  start_date: string;
  end_date: string;
  previous_campaign_id?: string;
}

interface CampaignInfoStepProps {
  form: UseFormReturn<CampaignFormData>;
  viewConfigId?: string;
}

export function CampaignInfoStep({ form, viewConfigId }: CampaignInfoStepProps) {
  const { t, td } = useT();
  const { data: previousCampaigns = [] } = useQuery({
    queryKey: queryKeys.surveyCampaigns.previousForSelect(viewConfigId!),
    queryFn: async () => {
      if (!viewConfigId) return [];
      return api.get<Array<{ id: string; name: string; end_date: string | null }>>(`/api/surveys/campaigns?source_view_config_id=${viewConfigId}&status=closed&order=created_at:desc&fields=id,name,end_date`);
    },
    enabled: !!viewConfigId,
  });

  return (
    <div className="flex-1 space-y-4">
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormControl><FloatingInput label={t('campaigns.campaign_name_label')} {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="start_date" render={({ field }) => (
          <FormItem>
            <FormControl><FloatingInput label={t('campaigns.start_date_label')} type="date" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="end_date" render={({ field }) => (
          <FormItem>
            <FormControl><FloatingInput label={t('campaigns.end_date_label')} type="date" min={form.watch('start_date') || undefined} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      {previousCampaigns.length > 0 && (
        <FormField control={form.control} name="previous_campaign_id" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('campaigns.reference_campaign_label')}</FormLabel>
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('campaigns.reference_campaign_none')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {previousCampaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {td('survey_campaigns', c.id, 'name', c.name)}{c.end_date ? ` (${t('campaigns.reference_campaign_end')} ${c.end_date})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      )}
    </div>
  );
}
