import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';

interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive' | 'text';
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: PageHeaderAction;
  secondaryAction?: PageHeaderAction;
  backAction?: { onClick: () => void };
  children?: ReactNode;
}

export function PageHeader({ title, description, action, secondaryAction, backAction, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {backAction && (
          <Button variant="ghost" size="icon" onClick={backAction.onClick} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant={secondaryAction.variant || 'outline'}>
            {secondaryAction.label}
            {secondaryAction.icon}
          </Button>
        )}
        {action && (
          <Button onClick={action.onClick} variant={action.variant || 'default'}>
            {action.label}
            {action.icon || <Plus className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
