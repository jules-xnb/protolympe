import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ReferentialValue } from '@/hooks/useReferentials';
import { PRESET_COLORS, type ValueFormData } from './types';

interface ValueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingValue: ReferentialValue | null;
  formData: ValueFormData;
  onFormDataChange: (data: ValueFormData) => void;
  onLabelChange: (label: string) => void;
  availableParents: ReferentialValue[];
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function ValueFormDialog({
  open,
  onOpenChange,
  editingValue,
  formData,
  onFormDataChange,
  onLabelChange,
  availableParents,
  onSave,
  onCancel,
  isPending,
}: ValueFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle>
            {editingValue ? 'Modifier la valeur' : 'Nouvelle valeur'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Parent selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Valeur parente</Label>
            <Select
              value={formData.parent_value_id || '__none__'}
              onValueChange={(val) => onFormDataChange({
                ...formData,
                parent_value_id: val === '__none__' ? null : val
              })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Aucune (racine)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucune (racine)</SelectItem>
                {availableParents.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {'─'.repeat(v.level)} {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editingValue ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="label" className="text-xs">Libellé *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => onLabelChange(e.target.value)}
                  placeholder="Ex: En cours"
                  className="h-9"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs text-muted-foreground">
                  Code technique
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => onFormDataChange({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                  placeholder="EN_COURS"
                  className="h-9 font-mono text-sm bg-muted/50"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="label" className="text-xs">Valeurs (une par ligne) *</Label>
              <Textarea
                id="label"
                value={formData.label}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder={"En cours\nTerminé\nAnnulé"}
                className="min-h-[120px] resize-y"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Les codes techniques seront générés automatiquement.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Couleur</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((color) => (
                <Button
                  key={color}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 p-0",
                    formData.color === color ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onFormDataChange({ ...formData, color })}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={(!editingValue ? !formData.label.trim() : (!formData.code || !formData.label)) || isPending}
          >
            {isPending ? 'Enregistrement...' : editingValue ? 'Mettre à jour' : (() => {
              const count = formData.label.split('\n').filter(l => l.trim()).length;
              return count > 1 ? `Ajouter ${count} valeurs` : 'Ajouter';
            })()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
