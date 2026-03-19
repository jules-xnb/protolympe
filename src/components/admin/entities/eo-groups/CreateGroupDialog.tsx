import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (v: string) => void;
  desc: string;
  onDescChange: (v: string) => void;
  onCreate: () => void;
  isPending: boolean;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  desc,
  onDescChange,
  onCreate,
  isPending,
}: CreateGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau regroupement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ex: Région Sud"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Textarea
              value={desc}
              onChange={(e) => onDescChange(e.target.value)}
              placeholder="Description du regroupement..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onCreate}
            disabled={!name.trim() || isPending}
          >
            {isPending ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
