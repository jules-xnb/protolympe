import { type NavigationConfigWithRelations } from '@/hooks/useNavigationConfigs';

export type DropPosition = 'before' | 'inside' | 'after' | null;

export interface TreeRowProps {
  item: NavigationConfigWithRelations;
  depth: number;
  expanded: Set<string>;
  isLast: boolean;
  onToggle: (id: string) => void;
  onEdit: (item: NavigationConfigWithRelations) => void;
  onDelete: (item: NavigationConfigWithRelations) => void;
  onDuplicate: (item: NavigationConfigWithRelations) => void;
  onToggleActive: (item: NavigationConfigWithRelations) => void;
  onViewClick?: (item: NavigationConfigWithRelations) => void;
  onAddGroup?: (parentId: string) => void;
  onAddView?: (parentId: string) => void;
  allItems: NavigationConfigWithRelations[];
  activeId: string | null;
  dropTarget: { id: string; position: DropPosition } | null;
}
