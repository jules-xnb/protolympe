import { type DynamicStatusInfo } from '@/hooks/useSurveyResponses';

// Helper to get badge variant based on dynamic status
export function getStatusBadgeInfo(dynamicStatus?: DynamicStatusInfo): { label: string; variant: 'default' | 'error' | 'outline' } {
  if (!dynamicStatus) {
    return { label: 'Inconnu', variant: 'default' };
  }

  const { baseStatus, stepName, stepOrder, totalSteps } = dynamicStatus;

  // Completed states
  if (baseStatus === 'validated') {
    return { label: stepName || 'Validé', variant: 'default' };
  }
  if (baseStatus === 'rejected') {
    return { label: stepName || 'Rejeté', variant: 'error' };
  }

  // Initial states
  if (baseStatus === 'pending') {
    return { label: stepName || 'En attente', variant: 'default' };
  }
  if (baseStatus === 'in_progress') {
    return { label: stepName || 'En cours', variant: 'outline' };
  }

  // In validation workflow - show step name with progress
  if (baseStatus === 'in_validation' || baseStatus === 'submitted') {
    const label = totalSteps && totalSteps > 0 && stepOrder
      ? `${stepName} (${stepOrder}/${totalSteps})`
      : stepName || 'En validation';
    return { label, variant: 'outline' };
  }

  return { label: stepName || 'Inconnu', variant: 'default' };
}

