import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FloatingInput } from '@/components/ui/floating-input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, GripVertical, Lock, Unlock } from 'lucide-react';
import type { Json } from '@/types/database';

interface FieldFormConfig {
  field_id: string;
  field_name: string;
  width: 'full' | 'half' | 'third';
  required_override?: boolean;
  readonly_override?: boolean;
  hidden?: boolean;
  default_value?: string;
}

interface FormSectionConfig {
  id: string;
  title: string;
  description?: string;
  fields: FieldFormConfig[];
}

interface FormConfig {
  sections?: FormSectionConfig[];
  submit_button_label?: string;
  cancel_button_label?: string;
  show_required_indicator?: boolean;
  validate_on_blur?: boolean;
  redirect_after_submit?: string;
  success_message?: string;
}

interface FieldDefinition {
  id: string;
  name: string;
  field_type: string;
  is_required?: boolean;
  is_readonly?: boolean;
}

interface FormViewConfigProps {
  config: Json;
  onChange: (config: Json) => void;
  fields: FieldDefinition[];
}

function getConfig(json: Json): FormConfig {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as FormConfig;
  }
  return {};
}

export function FormViewConfig({ config, onChange, fields }: FormViewConfigProps) {
  const cfg = getConfig(config);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [newFieldId, setNewFieldId] = useState('');

  const updateConfig = (key: keyof FormConfig, value: unknown) => {
    onChange({ ...cfg, [key]: value } as Json);
  };

  // Get all fields already in form
  const usedFieldIds = (cfg.sections || []).flatMap(s => s.fields.map(f => f.field_id));
  const availableFields = fields.filter(f => !usedFieldIds.includes(f.id));

  const addSection = () => {
    const sections = cfg.sections || [];
    const newSection: FormSectionConfig = {
      id: `section-${Date.now()}`,
      title: `Section ${sections.length + 1}`,
      fields: [],
    };
    updateConfig('sections', [...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    updateConfig('sections', (cfg.sections || []).filter(s => s.id !== sectionId));
    if (selectedSection === sectionId) setSelectedSection(null);
  };

  const updateSection = (sectionId: string, updates: Partial<FormSectionConfig>) => {
    const sections = (cfg.sections || []).map(s =>
      s.id === sectionId ? { ...s, ...updates } : s
    );
    updateConfig('sections', sections);
  };

  const addFieldToSection = (sectionId: string) => {
    if (!newFieldId) return;
    const field = editableFields.find(f => f.id === newFieldId);
    if (!field) return;

    const sections = (cfg.sections || []).map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: [
          ...s.fields,
          {
            field_id: field.id,
            field_name: field.name,
            width: 'full' as const,
            required_override: field.is_required,
            readonly_override: field.is_readonly,
          },
        ],
      };
    });
    updateConfig('sections', sections);
    setNewFieldId('');
  };

  const removeFieldFromSection = (sectionId: string, fieldId: string) => {
    const sections = (cfg.sections || []).map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, fields: s.fields.filter(f => f.field_id !== fieldId) };
    });
    updateConfig('sections', sections);
  };

  const toggleFieldRequired = (sectionId: string, fieldId: string) => {
    const sections = (cfg.sections || []).map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: s.fields.map(f =>
          f.field_id === fieldId ? { ...f, required_override: !f.required_override } : f
        ),
      };
    });
    updateConfig('sections', sections);
  };

  const toggleFieldReadonly = (sectionId: string, fieldId: string) => {
    const sections = (cfg.sections || []).map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: s.fields.map(f =>
          f.field_id === fieldId ? { ...f, readonly_override: !f.readonly_override } : f
        ),
      };
    });
    updateConfig('sections', sections);
  };

  const updateFieldWidth = (sectionId: string, fieldId: string, width: 'full' | 'half' | 'third') => {
    const sections = (cfg.sections || []).map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: s.fields.map(f =>
          f.field_id === fieldId ? { ...f, width } : f
        ),
      };
    });
    updateConfig('sections', sections);
  };

  return (
    <div className="space-y-4">
      {/* Form Options */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground uppercase">Options du formulaire</Label>

        <div>
          <FloatingInput
            label="Texte du bouton de soumission"
            value={cfg.submit_button_label || ''}
            onChange={(e) => updateConfig('submit_button_label', e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="required-indicator">Afficher indicateur obligatoire (*)</Label>
          <Switch
            id="required-indicator"
            checked={cfg.show_required_indicator !== false}
            onCheckedChange={(v) => updateConfig('show_required_indicator', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="validate-blur">Valider au changement de champ</Label>
          <Switch
            id="validate-blur"
            checked={cfg.validate_on_blur || false}
            onCheckedChange={(v) => updateConfig('validate_on_blur', v)}
          />
        </div>

        <div>
          <FloatingInput
            label="Message de succès"
            value={cfg.success_message || ''}
            onChange={(e) => updateConfig('success_message', e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Form Sections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase">Sections du formulaire</Label>
          <Button size="sm" variant="outline" onClick={addSection}>
            Ajouter
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <ScrollArea className="h-64 border rounded-md">
          <div className="p-2 space-y-2">
            {(cfg.sections || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Ajoutez des sections pour organiser le formulaire
              </p>
            ) : (
              (cfg.sections || []).map((section) => (
                <div
                  key={section.id}
                  className="border rounded-md overflow-hidden"
                >
                  {/* Section Header */}
                  <div
                    className="flex items-center gap-2 p-2 bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedSection(
                      selectedSection === section.id ? null : section.id
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent text-sm font-medium border-none focus:outline-none h-auto p-0 shadow-none"
                    />
                    <Chip variant="default" className="text-xs">
                      {section.fields.length} champ(s)
                    </Chip>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSection(section.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Section Content */}
                  {selectedSection === section.id && (
                    <div className="p-2 space-y-2 border-t">
                      {/* Section description */}
                      <Input
                        value={section.description || ''}
                        onChange={(e) => updateSection(section.id, { description: e.target.value })}
                        placeholder="Description de la section (optionnel)"
                        className="h-8 text-xs"
                      />

                      {/* Add field */}
                      <div className="flex gap-2">
                        <Select value={newFieldId} onValueChange={setNewFieldId}>
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue placeholder="Ajouter un champ" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => addFieldToSection(section.id)}
                          disabled={!newFieldId}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Fields list */}
                      {section.fields.map((field) => (
                        <div
                          key={field.field_id}
                          className="flex items-center gap-2 p-2 rounded bg-background"
                        >
                          <span className="flex-1 text-xs truncate">{field.field_name}</span>
                          <Select
                            value={field.width}
                            onValueChange={(v) => updateFieldWidth(section.id, field.field_id, v as 'full' | 'half' | 'third')}
                          >
                            <SelectTrigger className="w-16 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">100%</SelectItem>
                              <SelectItem value="half">50%</SelectItem>
                              <SelectItem value="third">33%</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-6 w-6 ${field.required_override ? 'text-red-500' : ''}`}
                            onClick={() => toggleFieldRequired(section.id, field.field_id)}
                            title={field.required_override ? 'Obligatoire' : 'Optionnel'}
                          >
                            <span className="text-xs font-bold">*</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleFieldReadonly(section.id, field.field_id)}
                            title={field.readonly_override ? 'Lecture seule' : 'Modifiable'}
                          >
                            {field.readonly_override ? (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Unlock className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeFieldFromSection(section.id, field.field_id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
