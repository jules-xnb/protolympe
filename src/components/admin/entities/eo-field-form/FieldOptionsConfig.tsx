import {
  Plus,
  X as XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import type { FieldTypeConfigFormData } from './FieldTypeConfig';

interface FieldOptionsConfigProps {
  formData: FieldTypeConfigFormData;
  onFormDataChange: (updater: (prev: FieldTypeConfigFormData) => FieldTypeConfigFormData) => void;
  optionInput: string;
  onOptionInputChange: (value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
}

export function FieldOptionsConfig({
  formData,
  onFormDataChange,
  optionInput,
  onOptionInputChange,
  onAddOption,
  onRemoveOption,
}: FieldOptionsConfigProps) {
  return (
    <div className="space-y-2">
      <Label>Options</Label>
      <div className="flex gap-2">
        <Input
          value={optionInput}
          onChange={(e) => onOptionInputChange(e.target.value)}
          placeholder="Ajouter une option"
          onKeyDown={(e) =>
            e.key === 'Enter' &&
            (e.preventDefault(), onAddOption())
          }
        />
        <Button
          type="button"
          variant="outline"
          onClick={onAddOption}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {formData.options.length > 0 && (
        <div className="space-y-1 mt-2 border rounded-md p-2">
          <p className="text-xs text-muted-foreground mb-1">
            Cliquez sur le cercle pour définir la valeur par défaut
          </p>
          {formData.options.map((option, index) => (
            <div
              key={index}
              className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 group"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer p-0 ${
                  formData.default_value === option
                    ? 'border-primary bg-primary hover:bg-primary'
                    : 'border-muted-foreground/40 hover:border-primary hover:bg-transparent'
                }`}
                onClick={() =>
                  onFormDataChange((prev) => ({
                    ...prev,
                    default_value: prev.default_value === option ? null : option,
                  }))
                }
                title={formData.default_value === option ? 'Retirer la valeur par défaut' : 'Définir comme valeur par défaut'}
              >
                {formData.default_value === option && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                )}
              </Button>
              <span className="text-sm flex-1">{option}</span>
              {formData.default_value === option && (
                <Chip variant="outline" className="text-xs h-5">
                  Défaut
                </Chip>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveOption(index)}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
