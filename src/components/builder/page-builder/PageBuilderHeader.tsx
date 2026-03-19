import { X, Loader2, Users, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { Chip } from '@/components/ui/chip';

interface InheritedRole {
  id: string;
  name: string;
  color?: string | null;
  category_id?: string | null;
}

interface PageBuilderHeaderProps {
  viewName: string;
  onClose: () => void;
  inheritedRoles: InheritedRole[];
  saveStatus: 'idle' | 'saving' | 'saved';
  isPublished: boolean;
  onPublish: () => void;
}

export function PageBuilderHeader({
  viewName,
  onClose,
  inheritedRoles,
  saveStatus,
  isPublished,
  onPublish,
}: PageBuilderHeaderProps) {
  return (
    <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <div className="w-px h-6 bg-border" />
        <div>
          <h1 className="font-semibold">{viewName}</h1>
          <p className="text-xs text-muted-foreground">Page Builder</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Auto-save indicator */}
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Sauvegarde...
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1.5 text-xs text-success">
            <Check className="h-3.5 w-3.5" />
            Enregistré
          </div>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="text" size="sm">
              Voir les rôles
              <Users className="h-4 w-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Rôles hérités
              </p>
              <PopoverClose asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </PopoverClose>
            </div>
            {inheritedRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Aucun rôle configuré
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {inheritedRoles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: role.color ?? '#94a3b8' }}
                    />
                    <span className="text-sm">{role.name}</span>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Publish status */}
        {isPublished ? (
          <Chip variant="success">Publié</Chip>
        ) : (
          <Button size="sm" onClick={onPublish}>
            Publier
            <Globe className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
