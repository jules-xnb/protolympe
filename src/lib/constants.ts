// Common magic numbers
export const DEFAULT_PAGE_SIZE = 50;
export const STALE_TIME_MS = 30_000;
export const STALE_TIME_LONG_MS = 5 * 60 * 1_000;

// Shared color palette for roles and referential values
export const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export const DEFAULT_COLOR = '#3b82f6';

export const NODE_TYPES = { START: 'start', VALIDATION: 'validation', END: 'end' } as const;
export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export const RESPONSE_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  IN_VALIDATION: 'in_validation',
  VALIDATED: 'validated',
  REJECTED: 'rejected',
} as const;

export const USER_ROLES = { RESPONDENT: 'respondent', VALIDATOR: 'validator', READONLY: 'readonly' } as const;

export const FIELD_VISIBILITY = { VISIBLE: 'visible', READONLY: 'readonly', HIDDEN: 'hidden' } as const;
