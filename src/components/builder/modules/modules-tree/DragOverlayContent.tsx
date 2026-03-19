import { GripVertical } from 'lucide-react';
import { getLucideIconFromKebab } from '@/lib/lucide-icon-lookup';
import { type NavigationConfigWithRelations } from '@/hooks/useNavigationConfigs';

export function DragOverlayContent({ item }: { item: NavigationConfigWithRelations }) {
  const isView = !!item.view_config_id;

  return (
    <div className="flex items-center gap-2 py-2 px-4 rounded-md bg-background border shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      {item.icon && (() => {
        const IconComp = getLucideIconFromKebab(item.icon);
        return IconComp ? <div className={isView ? "text-primary" : "text-muted-foreground"}><IconComp className="h-4 w-4" /></div> : null;
      })()}
      <span className="font-medium">{item.label}</span>
      {isView && (
        <span
          className="inline-flex items-center text-xs font-medium leading-none"
          style={{
            backgroundColor: "transparent",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--primary))",
            borderRadius: 9999,
            padding: "5px 8px",
          }}
        >
          Vue
        </span>
      )}
    </div>
  );
}
