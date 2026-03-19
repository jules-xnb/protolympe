import type { ResponseStatus, ValidationStepInfo, DynamicStatusInfo } from '@/types/survey-responses';

// Helper to compute dynamic status from response and survey settings
export function computeDynamicStatus(
  response: { status: ResponseStatus; current_step_id?: string | null },
  validationSteps?: ValidationStepInfo[]
): DynamicStatusInfo {
  const baseStatus = response.status;
  const steps = validationSteps || [];

  // Final states
  if (baseStatus === 'validated') {
    return { baseStatus, isComplete: true, stepName: 'Valid\u00e9', stepNameKey: 'status.validated', totalSteps: steps.length };
  }
  if (baseStatus === 'rejected') {
    return { baseStatus, isComplete: false, stepName: 'Rejet\u00e9', stepNameKey: 'status.rejected' };
  }

  // Initial states (before submission)
  if (baseStatus === 'pending') {
    return { baseStatus, isComplete: false, stepName: 'En attente', stepNameKey: 'status.pending' };
  }
  if (baseStatus === 'in_progress') {
    return { baseStatus, isComplete: false, stepName: 'En cours', stepNameKey: 'status.in_progress' };
  }

  // Submitted - check if there are validation steps
  if (baseStatus === 'submitted' || baseStatus === 'in_validation') {
    if (steps.length === 0) {
      // No validation workflow, directly submitted
      return { baseStatus, isComplete: false, stepName: 'Soumis', stepNameKey: 'status.submitted' };
    }

    // Find current step
    const currentStepId = response.current_step_id;
    if (currentStepId) {
      const currentStep = steps.find(s => s.id === currentStepId);
      if (currentStep) {
        return {
          baseStatus: 'in_validation',
          stepId: currentStep.id,
          stepName: currentStep.name,
          stepOrder: currentStep.order,
          totalSteps: steps.length,
          isComplete: false,
        };
      }
    }

    // Default to first step if no current step set
    const firstStep = steps[0];
    return {
      baseStatus: 'submitted',
      stepId: firstStep?.id,
      stepName: firstStep?.name || 'En attente de validation',
      stepNameKey: firstStep?.name ? undefined : 'status.pending_validation',
      stepOrder: 1,
      totalSteps: steps.length,
      isComplete: false,
    };
  }

  return { baseStatus, isComplete: false };
}
