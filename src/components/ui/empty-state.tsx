import * as React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Alert
      variant="empty"
      className={cn('flex flex-col items-center justify-center text-center gap-3 py-10', className)}
    >
      <AlertTitle className="flex flex-col items-center gap-3 text-base font-medium">
        {Icon && <Icon className="h-10 w-10 opacity-50" />}
        {title}
      </AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
      {action}
    </Alert>
  );
}
