import type { Database } from '@/types/database';

type WorkflowType = Database['public']['Enums']['workflow_type'];

export interface WorkflowTypeConfig {
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class for badge
}

export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, WorkflowTypeConfig> = {
  value_collection: {
    label: 'Collecte de valeurs',
    description: 'Workflow de collecte et validation de données via des questionnaires et formulaires.',
    icon: 'ClipboardList',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
};
