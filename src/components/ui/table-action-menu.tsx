import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LucideIcon } from 'lucide-react';

export interface TableActionItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

interface TableActionMenuProps {
  items: TableActionItem[];
  align?: 'start' | 'end';
  triggerClassName?: string;
}

export function TableActionMenu({
  items,
  align = 'end',
  triggerClassName,
}: TableActionMenuProps) {
  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName ?? 'h-8 w-8'}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.label}
              onClick={(e) => { e.stopPropagation(); item.onClick(); }}
              disabled={item.disabled}
              className={item.destructive ? 'text-destructive focus:text-destructive' : undefined}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
