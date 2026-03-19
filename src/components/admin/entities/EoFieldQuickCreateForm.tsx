import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  X,
} from 'lucide-react';
import { useCreateEoFieldDefinition, useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { generateSlug } from '@/lib/csv-parser';
import { FIELD_TYPES } from '@/lib/field-type-registry';

// EO field types — exclude BO-specific / special types
const EO_EXCLUDED = ['decimal', 'datetime', 'time', 'document', 'file', 'image', 'user_reference', 'eo_reference', 'object_reference', 'calculated', 'aggregation', 'section', 'initials', 'boolean'];
const EO_FIELD_TYPES = FIELD_TYPES.filter((t) => !EO_EXCLUDED.includes(t.value));

interface EoFieldQuickCreateFormProps {
  clientId: string;
  onSuccess?: () => void;
  onCancel: () => void;
}

export function EoFieldQuickCreateForm({
  clientId,
  onSuccess,
  onCancel,
}: EoFieldQuickCreateFormProps) {
  const { data: existingFields = [] } = useEoFieldDefinitions(clientId);
  const createField = useCreateEoFieldDefinition();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    field_type: 'text',
    is_required: false,
    options: [] as string[],
  });
  const [optionInput, setOptionInput] = useState('');

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, optionInput.trim()],
      }));
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    const options = formData.options.map(o => ({ value: o, label: o }));
    
    await createField.mutateAsync({
      client_id: clientId,
      name: formData.name,
      slug: generateSlug(formData.name),
      description: formData.description || null,
      field_type: formData.field_type,
      is_required: formData.is_required,
      options,
      display_order: existingFields.length,
    });
    
    onSuccess?.();
  };

  const showOptions = ['select', 'multiselect'].includes(formData.field_type);

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-primary/5 border-primary/20">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau champ personnalisé
        </h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nom du champ</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Numéro SIRET"
            className="h-8"
          />
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select
            value={formData.field_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, field_type: value }))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EO_FIELD_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-3 w-3" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Options for select/multiselect */}
      {showOptions && (
        <div className="space-y-1.5">
          <Label className="text-xs">Options</Label>
          <div className="flex gap-2">
            <Input
              value={optionInput}
              onChange={(e) => setOptionInput(e.target.value)}
              placeholder="Ajouter une option"
              className="h-8"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddOption} className="h-8">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {formData.options.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {formData.options.map((option, index) => (
                <Chip
                  key={index}
                  variant="default"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground text-xs"
                  onClick={() => handleRemoveOption(index)}
                >
                  {option} ×
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_required}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
          />
          <Label className="text-xs">Obligatoire</Label>
        </div>

        <Button 
          size="sm"
          onClick={handleSubmit}
          disabled={!formData.name || createField.isPending}
        >
          {createField.isPending ? 'Création...' : 'Créer le champ'}
        </Button>
      </div>
    </div>
  );
}
