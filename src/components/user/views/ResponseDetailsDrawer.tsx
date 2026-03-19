import { useMemo } from 'react';
import { User, Building2, Calendar, FileText } from 'lucide-react';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { SurveyResponseWithDetails, DynamicStatusInfo } from '@/hooks/useSurveyResponses';
import { formatFieldValue } from '@/lib/format-utils';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

interface ResponseDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  response: SurveyResponseWithDetails | null;
}

interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  field_type: string;
  display_order: number;
}

interface FieldValue {
  field_definition_id: string;
  value: unknown;
}

function getStatusBadgeInfo(dynamicStatus: DynamicStatusInfo | undefined, t: (key: string) => string): { label: string; variant: 'default' | 'error' | 'outline' } {
  if (!dynamicStatus) {
    return { label: t('survey.unknown_status'), variant: 'default' };
  }

  const { baseStatus, stepName, stepOrder, totalSteps } = dynamicStatus;

  if (baseStatus === 'validated') {
    return { label: stepName || t('status.validated'), variant: 'default' };
  }
  if (baseStatus === 'rejected') {
    return { label: stepName || t('status.rejected'), variant: 'error' };
  }
  if (baseStatus === 'pending') {
    return { label: stepName || t('status.pending'), variant: 'default' };
  }
  if (baseStatus === 'in_progress') {
    return { label: stepName || t('status.in_progress'), variant: 'outline' };
  }
  if (baseStatus === 'in_validation' || baseStatus === 'submitted') {
    const label = totalSteps && totalSteps > 0 && stepOrder
      ? `${stepName} (${stepOrder}/${totalSteps})`
      : stepName || t('status.in_validation');
    return { label, variant: 'outline' };
  }

  return { label: stepName || t('survey.unknown_status'), variant: 'default' };
}

export function ResponseDetailsDrawer({
  open,
  onOpenChange,
  response,
}: ResponseDetailsDrawerProps) {
  const { t, td } = useT();

  // Fetch field definitions
  const { data: fieldDefinitions = [], isLoading: fieldsLoading } = useQuery({
    queryKey: queryKeys.surveyResponses.fieldDefinitions(response?._survey?.bo_definition_id!),
    queryFn: async () => {
      if (!response?._survey?.bo_definition_id) return [];
      return api.get<FieldDefinition[]>(`/api/business-objects/definitions/${response._survey.bo_definition_id}/fields?is_active=true&order=display_order`);
    },
    enabled: open && !!response?._survey?.bo_definition_id,
  });

  // Fetch field values
  const { data: fieldValues = [], isLoading: valuesLoading } = useQuery({
    queryKey: queryKeys.surveyResponses.fieldValues(response?.business_object_id!),
    queryFn: async () => {
      if (!response?.business_object_id) return [];
      return api.get<FieldValue[]>(`/api/business-objects/${response.business_object_id}/field-values`);
    },
    enabled: open && !!response?.business_object_id,
  });

  // Create a map for quick value lookup
  const valuesMap = useMemo(() => {
    const map = new Map<string, unknown>();
    fieldValues.forEach(fv => {
      map.set(fv.field_definition_id, fv.value);
    });
    return map;
  }, [fieldValues]);

  const isLoading = fieldsLoading || valuesLoading;
  const statusInfo = getStatusBadgeInfo(response?._dynamic_status, t);

  return (
    <DetailsDrawer
      open={open}
      onOpenChange={onOpenChange}
      customHeader={
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('survey.response_details')}
          </SheetTitle>
        </SheetHeader>
      }
    >
        {response && (
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Response metadata */}
            <div className="flex-shrink-0 space-y-3 pb-4 border-b">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{response._eo?.name || t('empty.unknown_entity')}</span>
                {response._eo?.code && (
                  <span className="text-sm text-muted-foreground">({response._eo.code})</span>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Chip variant={statusInfo.variant}>{statusInfo.label}</Chip>
                {response.submitted_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('survey.submitted_on')} {new Date(response.submitted_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              {response._respondent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  {response._respondent.full_name || response._respondent.email}
                </div>
              )}
            </div>

            {/* Field values */}
            <ScrollArea className="flex-1 mt-4">
              <div className="space-y-4 pr-4">
                <h4 className="text-sm font-medium text-muted-foreground">{t('survey.survey_fields')}</h4>
                
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                ) : fieldDefinitions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {t('survey.no_fields_defined')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {fieldDefinitions.map((field) => {
                      const value = valuesMap.get(field.id);
                      const displayValue = formatFieldValue(value, field.field_type);
                      
                      return (
                        <div key={field.id} className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {td('field_definitions', field.id, 'name', field.name)}
                          </label>
                          <p className="text-sm">
                            {displayValue}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
    </DetailsDrawer>
  );
}
