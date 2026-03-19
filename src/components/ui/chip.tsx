import { cn } from '@/lib/utils';

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'secondary';

const chipVariants: Record<ChipVariant, string> = {
  default:   'bg-muted text-foreground border border-transparent',
  primary:   'bg-primary text-primary-foreground border border-transparent',
  success:   'bg-success text-success-foreground border border-transparent',
  warning:   'bg-warning text-warning-foreground border border-transparent',
  error:     'bg-destructive text-destructive-foreground border border-transparent',
  info:      'bg-info text-info-foreground border border-transparent',
  outline:   'bg-transparent text-foreground border border-input',
  secondary: 'bg-secondary text-secondary-foreground border border-transparent',
};

interface ChipProps {
  variant?: ChipVariant;
  className?: string;
  children: React.ReactNode;
}

export function Chip({ variant = 'default', className, children }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[12px] font-medium leading-none select-none h-[26px] rounded-full px-[10px]',
        chipVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
