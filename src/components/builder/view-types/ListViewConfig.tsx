import { useState } from 'react';
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
import { Plus, X, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import type { Json } from '@/types/database';

interface ColumnConfig {
  field_id: string;
  field_name: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
}

interface FilterConfig {
  field_id: string;
  field_name: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  default_value?: string;
}

interface ListConfig {
  columns?: ColumnConfig[];
  filters?: FilterConfig[];
  default_sort_field?: string;
  default_sort_direction?: 'asc' | 'desc';
  page_size?: number;
  show_search?: boolean;
  show_filters?: boolean;
  show_pagination?: boolean;
  row_click_action?: 'detail' | 'edit' | 'none';
}

interface FieldDefinition {
  id: string;
  name: string;
  field_type: string;
}

interface ListViewConfigProps {
  config: Json;
  onChange: (config: Json) => void;
  fields: FieldDefinition[];
}

function getConfig(json: Json): ListConfig {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as ListConfig;
  }
  return {};
}

export function ListViewConfig({ config, onChange, fields }: ListViewConfigProps) {
  const cfg = getConfig(config);
  const [newColumnField, setNewColumnField] = useState('');

  const updateConfig = (key: keyof ListConfig, value: unknown) => {
    onChange({ ...cfg, [key]: value } as Json);
  };

  const addColumn = () => {
    if (!newColumnField) return;
    const field = fields.find(f => f.id === newColumnField);
    if (!field) return;

    const columns = cfg.columns || [];
    if (columns.some(c => c.field_id === newColumnField)) return;

    updateConfig('columns', [
      ...columns,
      { field_id: field.id, field_name: field.name, sortable: true, filterable: false },
    ]);
    setNewColumnField('');
  };

  const removeColumn = (fieldId: string) => {
    updateConfig('columns', (cfg.columns || []).filter(c => c.field_id !== fieldId));
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const columns = [...(cfg.columns || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    [columns[index], columns[newIndex]] = [columns[newIndex], columns[index]];
    updateConfig('columns', columns);
  };

  const toggleColumnOption = (fieldId: string, option: 'sortable' | 'filterable') => {
    const columns = (cfg.columns || []).map(c =>
      c.field_id === fieldId ? { ...c, [option]: !c[option] } : c
    );
    updateConfig('columns', columns);
  };

  const availableFields = fields.filter(
    f => !(cfg.columns || []).some(c => c.field_id === f.id)
  );

  return (
    <div className="space-y-4">
      {/* Columns Configuration */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">Colonnes affichées</Label>
        
        <div className="flex gap-2">
          <Select value={newColumnField} onValueChange={setNewColumnField}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Ajouter une colonne" />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map(field => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" onClick={addColumn} disabled={!newColumnField}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-48 border rounded-md">
          <div className="p-2 space-y-1">
            {(cfg.columns || []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucune colonne configurée
              </p>
            ) : (
              (cfg.columns || []).map((col, index) => (
                <div
                  key={col.field_id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="flex-1 text-sm truncate">{col.field_name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Chip
                      variant={col.sortable ? 'default' : 'outline'}
                      className="text-xs cursor-pointer"
                      onClick={() => toggleColumnOption(col.field_id, 'sortable')}
                    >
                      Tri
                    </Chip>
                    <Chip
                      variant={col.filterable ? 'default' : 'outline'}
                      className="text-xs cursor-pointer"
                      onClick={() => toggleColumnOption(col.field_id, 'filterable')}
                    >
                      Filtre
                    </Chip>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveColumn(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveColumn(index, 'down')}
                      disabled={index === (cfg.columns?.length || 0) - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeColumn(col.field_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Display Options */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground uppercase">Options d'affichage</Label>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-search">Barre de recherche</Label>
          <Switch
            id="show-search"
            checked={cfg.show_search !== false}
            onCheckedChange={(v) => updateConfig('show_search', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-filters">Filtres avancés</Label>
          <Switch
            id="show-filters"
            checked={cfg.show_filters !== false}
            onCheckedChange={(v) => updateConfig('show_filters', v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-pagination">Pagination</Label>
          <Switch
            id="show-pagination"
            checked={cfg.show_pagination !== false}
            onCheckedChange={(v) => updateConfig('show_pagination', v)}
          />
        </div>
      </div>

      <Separator />

      {/* Behavior Options */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground uppercase">Comportement</Label>

        <div className="space-y-2">
          <Label htmlFor="page-size">Éléments par page</Label>
          <Select
            value={String(cfg.page_size || 10)}
            onValueChange={(v) => updateConfig('page_size', parseInt(v))}
          >
            <SelectTrigger id="page-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="row-action">Action au clic sur une ligne</Label>
          <Select
            value={cfg.row_click_action || 'detail'}
            onValueChange={(v) => updateConfig('row_click_action', v)}
          >
            <SelectTrigger id="row-action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="detail">Ouvrir le détail</SelectItem>
              <SelectItem value="edit">Ouvrir en édition</SelectItem>
              <SelectItem value="none">Aucune action</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
