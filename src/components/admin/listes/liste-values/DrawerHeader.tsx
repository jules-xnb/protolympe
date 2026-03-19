import { useState } from 'react';
import {
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Tag, Archive } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { toast } from 'sonner';
import type { Liste } from '@/hooks/useListes';

interface DrawerHeaderProps {
  liste: Liste | null;
  onUpdateListe: (data: { id: string; name?: string; description?: string | null; tag?: string | null }) => Promise<void>;
  isPending: boolean;
  showArchive?: boolean;
  onArchive?: () => void;
}

export function DrawerHeader({ liste, onUpdateListe, isPending, showArchive, onArchive }: DrawerHeaderProps) {
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [editTag, setEditTag] = useState('');

  return (
    <SheetHeader className="flex-row items-start justify-between space-y-0">
      {/* Left: title + tag */}
      <div className="flex flex-col gap-1 flex-1 min-w-0 pr-2">
        <SheetTitle className="truncate">{liste?.name}</SheetTitle>

        <div className="mt-1">
          {isEditingTag ? (
            <form
              className="flex items-center gap-1"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!liste) return;
                try {
                  await onUpdateListe({ id: liste.id, tag: editTag.trim() || null });
                  setIsEditingTag(false);
                  toast.success('Tag mis à jour');
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : String(err);
                  toast.error(message || 'Erreur');
                }
              }}
            >
              <Input
                value={editTag}
                onChange={(e) => setEditTag(e.target.value)}
                className="h-7 text-xs"
                placeholder="Ajouter un tag..."
                autoFocus
              />
              <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setIsEditingTag(false)}>
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Chip
              variant="outline"
              className="cursor-pointer gap-1.5 text-xs font-normal"
              onClick={() => {
                setEditTag(liste?.tag || '');
                setIsEditingTag(true);
              }}
              title="Cliquer pour modifier le tag"
            >
              <Tag className="h-3 w-3" />
              {liste?.tag || <span className="italic text-muted-foreground">Ajouter un tag</span>}
            </Chip>
          )}
        </div>
      </div>

      {/* Right: archive + close */}
      <div className="flex items-center gap-1 shrink-0">
        {showArchive && onArchive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
          >
            Archiver
            <Archive className="h-4 w-4" />
          </Button>
        )}
        <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-1">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </div>
    </SheetHeader>
  );
}
