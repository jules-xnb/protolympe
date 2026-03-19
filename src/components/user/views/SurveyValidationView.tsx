import { ClipboardCheck, Clock, User, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useResponsesPendingValidation, type SurveyResponseWithDetails } from '@/hooks/useSurveyResponses';
import { useDialogState } from '@/hooks/useDialogState';
import { SurveyValidationDialog } from './SurveyValidationDialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useT } from '@/hooks/useT';

export function SurveyValidationView() {
  const { t, td } = useT();
  const validationDialog = useDialogState<SurveyResponseWithDetails>();

  const { data: responses = [], isLoading } = useResponsesPendingValidation();

  const handleOpenValidation = (response: SurveyResponseWithDetails) => {
    validationDialog.open(response);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          {t('survey.surveys_to_validate')}
          {responses.length > 0 && (
            <Chip variant="default">{responses.length}</Chip>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))
        ) : responses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{t('survey.no_surveys_to_validate')}</p>
          </div>
        ) : (
          responses.map((response) => (
            <div
              key={response.id}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{td('surveys', response._survey?.id, 'name', response._survey?.name) || t('survey.default_name')}</h4>
                    <Chip variant="default">
                      {response.status === 'submitted' ? t('status.pending') : t('status.in_progress')}
                    </Chip>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {response._eo?.name}
                    </span>
                    {response._respondent && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {response._respondent.full_name || response._respondent.email}
                      </span>
                    )}
                  </div>

                  {response.submitted_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('survey.submitted_ago')} {formatDistanceToNow(new Date(response.submitted_at), { 
                        locale: fr, 
                        addSuffix: true 
                      })}
                    </p>
                  )}
                </div>

                <Button 
                  size="sm"
                  onClick={() => handleOpenValidation(response)}
                >
                  {t('buttons.validate')}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <SurveyValidationDialog
        open={validationDialog.isOpen}
        onOpenChange={validationDialog.onOpenChange}
        response={validationDialog.item}
      />
    </Card>
  );
}
