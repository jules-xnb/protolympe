import { Plus, X as XIcon, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldTypeConfigFormData } from './FieldTypeConfig';

interface FieldTypeCommentRulesProps {
  formData: FieldTypeConfigFormData;
  onFormDataChange: (updater: (prev: FieldTypeConfigFormData) => FieldTypeConfigFormData) => void;
  isSystemIsActive: boolean;
}

export function FieldTypeCommentRules({
  formData,
  onFormDataChange,
  isSystemIsActive,
}: FieldTypeCommentRulesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Commentaire au changement</span>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.comment_enabled}
          onCheckedChange={(checked) =>
            onFormDataChange((prev) => ({ ...prev, comment_enabled: checked }))
          }
        />
        <Label>Demander un commentaire lors du changement de valeur</Label>
      </div>
      {formData.comment_enabled && (
        <>
          <div className="flex items-center gap-2 ml-6">
            <Switch
              checked={formData.comment_required}
              onCheckedChange={(checked) =>
                onFormDataChange((prev) => ({ ...prev, comment_required: checked }))
              }
            />
            <Label>Commentaire obligatoire</Label>
          </div>
          <div className="ml-6 space-y-2">
            <Label className="text-xs text-muted-foreground">
              Transitions concernées (vide = toutes)
            </Label>
            {(() => {
              const transitionOptions = isSystemIsActive
                ? [formData.boolean_true_label || 'Actif', formData.boolean_false_label || 'Inactif']
                : formData.options;
              return formData.comment_transitions.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={t.from}
                  onValueChange={(v) => {
                    const updated = [...formData.comment_transitions];
                    updated[idx] = { ...updated[idx], from: v };
                    onFormDataChange((prev) => ({ ...prev, comment_transitions: updated }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="De…" />
                  </SelectTrigger>
                  <SelectContent>
                    {transitionOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">→</span>
                <Select
                  value={t.to}
                  onValueChange={(v) => {
                    const updated = [...formData.comment_transitions];
                    updated[idx] = { ...updated[idx], to: v };
                    onFormDataChange((prev) => ({ ...prev, comment_transitions: updated }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Vers…" />
                  </SelectTrigger>
                  <SelectContent>
                    {transitionOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    onFormDataChange((prev) => ({
                      ...prev,
                      comment_transitions: prev.comment_transitions.filter((_, i) => i !== idx),
                    }));
                  }}
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            ));
            })()}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() =>
                onFormDataChange((prev) => ({
                  ...prev,
                  comment_transitions: [...prev.comment_transitions, { from: '', to: '' }],
                }))
              }
            >
              Ajouter une transition <Plus className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
