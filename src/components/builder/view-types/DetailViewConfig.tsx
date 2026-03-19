import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, X, GripVertical, Eye, EyeOff } from 'lucide-react';
import type { Json } from '@/types/database';

interface FieldLayout {
  field_id: string;
  field_name: string;
  width: 'full' | 'half' | 'third';
  visible: boolean;
}

interface SectionLayout {
  id: string;
  title: string;
  collapsed_by_default: boolean;
  fields: FieldLayout[];
}

interface DetailConfig {
  layout?: 'single' | 'two-column' | 'tabs';
  sections?: SectionLayout[];
  show_header?: boolean;
  show_metadata?: boolean;
  show_actions?: boolean;
  enable_edit_button?: boolean;
  enable_delete_button?: boolean;
}

interface FieldDefinition {
  id: string;
  name: string;
  field_type: string;
  parent_field_id?: string | null;
}

interface DetailViewConfigProps {
  config: Json;
  onChange: (config: Json) => void;
  fields: FieldDefinition[];
}

function getConfig(json: Json): DetailConfig {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as DetailConfig;
  }
  return {};
}

export function DetailViewConfig({ config, onChange, fields }: DetailViewConfigProps) {
  const cfg = getConfig(config);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [newFieldId, setNewFieldId] = useState('');

  const updateConfig = (key: keyof DetailConfig, value: unknown) => {
    onChange({ ...cfg, [key]: value } as Json);
  };

  // Get all fields already in layout
  const usedFieldIds = (cfg.sections || []).flatMap(s => s.fields.map(f => f.field_id));
  const availableFields = fields.filter(f => !usedFieldIds.includes(f.id));

  const addSection = () => {
    const sections = cfg.sections || [];
    const newSection: SectionLayout = {
      id: `section-${Date.now()}`,
      title: `Section ${sections.length + 1}`,
      collapsed_by_default: false,
      fields: [],
    };
    updateConfig('sections', [...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    updateConfig('sections', (cfg.sections || []).filter(s => s.id !== sectionId));
    if (selectedSection === sectionId) setSelectedSection(null);
  };

  const updateSection = (sectionId: string, updates: Partial<SectionLayout>) => {
    const sections = (cfg.sections || []).map(s =>
      s.id === sectionId ? { ...s, ...updates } : s
    );
    updateConfig('sections', sections);
  };

  const addFieldToSection = (sectionId: string) => {
    if (!newFieldId) return;
    const field = regularFields.find(f => f.id === newFieldId);
    if (!field) return;

    const sections = (cfg.sections || []).map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: [
          ...s.fields,
          { field_id: field.id, field_name: field.name, width: 'full' as const, visible: true },
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

  const toggleFieldVisibility = (sectionId: string, fieldId: string) => {
    const sections = (cfg.sections || []).map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        fields: s.fields.map(f =>
          f.field_id === fieldId ? { ...f, visible: !f.visible } : f
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
      {/* Layout Type */}
      <div className="space-y-2">
        <Label>Type de layout</Label>
        <Select
          value={cfg.layout || 'single'}
          onValueChange={(v) => updateConfig('layout', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Colonne unique</SelectItem>
            <SelectItem value="two-column">Deux colonnes</SelectItem>
            <SelectItem value="tabs">Onglets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Display Options */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground uppercase">Options d'affichage</Label>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-header">En-tête avec titre</Label>
          <Switch
            id="show-header"
            checked={cfg.show_header !== false}
            onCheckedChange={(v) => updateConfig('show_header', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-metadata">Métadonnées (créé le, modifié le)</Label>
          <Switch
            id="show-metadata"
            checked={cfg.show_metadata !== false}
            onCheckedChange={(v) => updateConfig('show_metadata', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-actions">Barre d'actions</Label>
          <Switch
            id="show-actions"
            checked={cfg.show_actions !== false}
            onCheckedChange={(v) => updateConfig('show_actions', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Sections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground uppercase">Sections</Label>
          <Button size="sm" variant="outline" onClick={addSection}>
            Ajouter
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <ScrollArea className="h-64 border rounded-md">
          <div className="p-2 space-y-2">
            {(cfg.sections || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Ajoutez des sections pour organiser les champs
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
                            <SelectTrigger className="w-20 h-6 text-xs">
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
                            className="h-6 w-6"
                            onClick={() => toggleFieldVisibility(section.id, field.field_id)}
                          >
                            {field.visible ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-muted-foreground" />
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
