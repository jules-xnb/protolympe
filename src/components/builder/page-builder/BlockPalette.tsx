import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Table, Building2, ClipboardList, FileCheck, Users, LayoutPanelTop, LayoutList, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { STRUCTURE_BLOCK_DEFINITIONS, BUSINESS_BLOCK_DEFINITIONS, type BlockType } from './types';

const ICONS: Record<string, React.ElementType> = {
  Table,
  Building2,
  ClipboardList,
  FileCheck,
  Users,
  LayoutPanelTop,
  LayoutList,
  Minus,
};

interface DraggableBlockProps {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  collapsed?: boolean;
  category: 'structure' | 'business';
}

function DraggableBlock({ type, label, description, icon, collapsed, category }: DraggableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: _isDragging } = useDraggable({
    id: `palette-${type}`,
    data: {
      type: 'palette-block',
      blockType: type,
      category,
    },
  });

  const Icon = ICONS[icon] || Table;

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const content = (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 rounded-md cursor-grab active:cursor-grabbing transition-colors hover:bg-accent',
        collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      {!collapsed && <span className="text-xs font-medium truncate">{label}</span>}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

interface BlockPaletteProps {
  collapsed?: boolean;
}

export function BlockPalette({ collapsed }: BlockPaletteProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2 px-1">
      {/* Structure blocks */}
      {!collapsed && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">Structure</p>
      )}
      {collapsed && (
        <div className="w-full border-b border-border mb-1 pb-1" />
      )}
      {STRUCTURE_BLOCK_DEFINITIONS.map((block) => (
        <DraggableBlock
          key={block.type}
          type={block.type}
          label={block.label}
          description={block.description}
          icon={block.icon}
          collapsed={collapsed}
          category="structure"
        />
      ))}

      {/* Separator */}
      <div className="my-2 mx-2 border-t border-border" />

      {/* Business blocks */}
      {!collapsed && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">Blocs métiers</p>
      )}
      {BUSINESS_BLOCK_DEFINITIONS.map((block) => (
        <DraggableBlock
          key={block.type}
          type={block.type}
          label={block.label}
          description={block.description}
          icon={block.icon}
          collapsed={collapsed}
          category="business"
        />
      ))}
    </div>
  );
}