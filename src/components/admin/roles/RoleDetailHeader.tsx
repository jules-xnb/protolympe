import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { type RoleWithCategory } from '@/hooks/useRoles';
import { Pencil, Archive, FolderTree, Copy } from 'lucide-react';

interface RoleDetailHeaderProps {
  role: RoleWithCategory;
  onEdit: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
}

export function RoleDetailHeader({ role, onEdit, onArchive, onDuplicate }: RoleDetailHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: role.color || '#3b82f6' }}
          />
          <h2 className="text-lg font-semibold">{role.name}</h2>
        </div>

        {role.role_categories && (
          <Chip variant="default" className="gap-1">
            <FolderTree className="h-3 w-3" />
            {role.role_categories.name}
          </Chip>
        )}

        {role.description && (
          <p className="text-sm text-muted-foreground">{role.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onDuplicate}>
          Dupliquer
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          Modifier
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onArchive}>
          Archiver
          <Archive className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
