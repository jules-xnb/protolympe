import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { CampaignTypeConfig } from '@/components/builder/page-builder/types';
import { useT } from '@/hooks/useT';

interface CampaignTypeStepProps {
  campaignTypes: CampaignTypeConfig[];
  selectedTypeId: string | null;
  onSelect: (typeId: string) => void;
}

export function CampaignTypeStep({ campaignTypes, selectedTypeId, onSelect }: CampaignTypeStepProps) {
  const { t } = useT();
  if (campaignTypes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>{t('campaigns.no_type_available')}</p>
        <p className="text-sm">{t('campaigns.contact_admin')}</p>
      </div>
    );
  }

  return (
    <RadioGroup
      value={selectedTypeId || ''}
      onValueChange={onSelect}
      className="space-y-3"
    >
      {campaignTypes.map((type) => (
        <Card
          key={type.id}
          className={`cursor-pointer transition-colors ${
            selectedTypeId === type.id
              ? 'border-primary bg-primary/5'
              : 'hover:border-muted-foreground/30'
          }`}
          onClick={() => onSelect(type.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor={type.id}
                  className="text-sm font-medium cursor-pointer"
                >
                  {type.name}
                </Label>
                {type.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{type.respondent_fields?.length || 0} {t('campaigns.fields_count')}</span>
                  {type.validation_steps && type.validation_steps.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{type.validation_steps.length} {t('campaigns.validation_steps_count')}</span>
                    </>
                  )}
                </div>
              </div>
              {selectedTypeId === type.id && (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </RadioGroup>
  );
}
