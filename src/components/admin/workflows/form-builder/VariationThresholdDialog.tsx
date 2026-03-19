import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface VariationThresholdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName: string;
  threshold: number | undefined;
  direction: '+' | '+-' | '-';
  onSave: (value: number | undefined, direction: '+' | '+-' | '-') => void;
}

export function VariationThresholdDialog({
  open,
  onOpenChange,
  fieldName,
  threshold,
  direction,
  onSave,
}: VariationThresholdDialogProps) {
  const [draft, setDraft] = useState(String(threshold || ''));
  const [dirDraft, setDirDraft] = useState<'+' | '+-' | '-'>(direction);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(String(threshold || ''));
      setDirDraft(direction);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, threshold, direction]);

  const handleSave = () => {
    const val = draft ? parseFloat(draft) : undefined;
    onSave(val && val > 0 ? val : undefined, dirDraft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-base">Seuil de variation</DialogTitle>
          <p className="text-sm text-muted-foreground">{fieldName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Direction</label>
            <div className="flex gap-1">
              {(['+', '+-', '-'] as const).map(dir => (
                <Button
                  key={dir}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'flex-1 h-8 text-xs',
                    dirDraft === dir && 'bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300',
                  )}
                  onClick={() => setDirDraft(dir)}
                >
                  {dir === '+' ? 'Hausse' : dir === '-' ? 'Baisse' : 'Les deux'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Seuil (%)</label>
            <Input
              ref={inputRef}
              type="number"
              min={0}
              max={100}
              step={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                  onOpenChange(false);
                }
              }}
              className="h-9"
              placeholder="ex: 10"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          {threshold && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground mr-auto"
              onClick={() => {
                onSave(undefined, '+-');
                onOpenChange(false);
              }}
            >
              Supprimer
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => {
              handleSave();
              onOpenChange(false);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
