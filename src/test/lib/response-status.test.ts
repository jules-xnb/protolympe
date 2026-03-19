import { describe, it, expect } from 'vitest';
import { computeDynamicStatus } from '@/lib/response-status';
import type { ValidationStepInfo } from '@/types/survey-responses';

const STEPS: ValidationStepInfo[] = [
  { id: 'step-1', name: 'Manager Review', order: 1 },
  { id: 'step-2', name: 'Director Approval', order: 2 },
  { id: 'step-3', name: 'Final Check', order: 3 },
];

describe('computeDynamicStatus', () => {
  // --- Final states ---
  describe('final states', () => {
    it('should return validated status with isComplete true', () => {
      const result = computeDynamicStatus({ status: 'validated' }, STEPS);
      expect(result.baseStatus).toBe('validated');
      expect(result.isComplete).toBe(true);
      expect(result.stepName).toBe('Valid\u00e9');
      expect(result.totalSteps).toBe(3);
    });

    it('should return validated status even without validation steps', () => {
      const result = computeDynamicStatus({ status: 'validated' });
      expect(result.baseStatus).toBe('validated');
      expect(result.isComplete).toBe(true);
      expect(result.totalSteps).toBe(0);
    });

    it('should return rejected status with isComplete false', () => {
      const result = computeDynamicStatus({ status: 'rejected' });
      expect(result.baseStatus).toBe('rejected');
      expect(result.isComplete).toBe(false);
      expect(result.stepName).toBe('Rejet\u00e9');
    });
  });

  // --- Initial states (before submission) ---
  describe('initial states', () => {
    it('should return pending status', () => {
      const result = computeDynamicStatus({ status: 'pending' });
      expect(result.baseStatus).toBe('pending');
      expect(result.isComplete).toBe(false);
      expect(result.stepName).toBe('En attente');
    });

    it('should return in_progress status', () => {
      const result = computeDynamicStatus({ status: 'in_progress' });
      expect(result.baseStatus).toBe('in_progress');
      expect(result.isComplete).toBe(false);
      expect(result.stepName).toBe('En cours');
    });
  });

  // --- Submitted / in_validation without validation steps ---
  describe('submitted without validation steps', () => {
    it('should return "Soumis" when submitted and no steps', () => {
      const result = computeDynamicStatus({ status: 'submitted' });
      expect(result.baseStatus).toBe('submitted');
      expect(result.isComplete).toBe(false);
      expect(result.stepName).toBe('Soumis');
    });

    it('should return "Soumis" when submitted and empty steps array', () => {
      const result = computeDynamicStatus({ status: 'submitted' }, []);
      expect(result.baseStatus).toBe('submitted');
      expect(result.stepName).toBe('Soumis');
    });

    it('should return "Soumis" when in_validation but no steps', () => {
      const result = computeDynamicStatus({ status: 'in_validation' }, []);
      expect(result.baseStatus).toBe('in_validation');
      expect(result.stepName).toBe('Soumis');
    });
  });

  // --- Submitted / in_validation with validation steps ---
  describe('submitted with validation steps', () => {
    it('should resolve to current step when current_step_id matches', () => {
      const result = computeDynamicStatus(
        { status: 'in_validation', current_step_id: 'step-2' },
        STEPS,
      );
      expect(result.baseStatus).toBe('in_validation');
      expect(result.stepId).toBe('step-2');
      expect(result.stepName).toBe('Director Approval');
      expect(result.stepOrder).toBe(2);
      expect(result.totalSteps).toBe(3);
      expect(result.isComplete).toBe(false);
    });

    it('should resolve to first step when current_step_id is null', () => {
      const result = computeDynamicStatus(
        { status: 'submitted', current_step_id: null },
        STEPS,
      );
      expect(result.baseStatus).toBe('submitted');
      expect(result.stepId).toBe('step-1');
      expect(result.stepName).toBe('Manager Review');
      expect(result.stepOrder).toBe(1);
      expect(result.totalSteps).toBe(3);
    });

    it('should resolve to first step when current_step_id is not provided', () => {
      const result = computeDynamicStatus(
        { status: 'submitted' },
        STEPS,
      );
      expect(result.baseStatus).toBe('submitted');
      expect(result.stepId).toBe('step-1');
      expect(result.stepName).toBe('Manager Review');
    });

    it('should fall back to first step if current_step_id does not match any step', () => {
      const result = computeDynamicStatus(
        { status: 'in_validation', current_step_id: 'nonexistent-step' },
        STEPS,
      );
      // currentStep is not found, so falls through to default first step
      expect(result.baseStatus).toBe('submitted');
      expect(result.stepId).toBe('step-1');
      expect(result.stepName).toBe('Manager Review');
      expect(result.stepOrder).toBe(1);
    });

    it('should handle in_validation with first step', () => {
      const result = computeDynamicStatus(
        { status: 'in_validation', current_step_id: 'step-1' },
        STEPS,
      );
      expect(result.baseStatus).toBe('in_validation');
      expect(result.stepId).toBe('step-1');
      expect(result.stepName).toBe('Manager Review');
      expect(result.stepOrder).toBe(1);
    });

    it('should handle in_validation with last step', () => {
      const result = computeDynamicStatus(
        { status: 'in_validation', current_step_id: 'step-3' },
        STEPS,
      );
      expect(result.baseStatus).toBe('in_validation');
      expect(result.stepId).toBe('step-3');
      expect(result.stepName).toBe('Final Check');
      expect(result.stepOrder).toBe(3);
      expect(result.totalSteps).toBe(3);
    });
  });

  // --- Edge case: unknown status ---
  describe('fallback for unknown status', () => {
    it('should return baseStatus with isComplete false for unrecognized status', () => {
      // Cast to any to simulate an unknown status value
      const result = computeDynamicStatus({ status: 'unknown' as any });
      expect(result.baseStatus).toBe('unknown');
      expect(result.isComplete).toBe(false);
    });
  });
});
