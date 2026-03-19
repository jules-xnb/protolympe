import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Settings, Trash2 } from 'lucide-react';
import type { ViewConfigWidget } from '@/hooks/useViewConfigs';
import { WIDGET_DEFINITIONS } from './widget-palette-utils';
import type { Json } from '@/types/database';

interface BusinessObjectDefinition {
  id: string;
  name: string;
}

interface PropertiesPanelProps {
  widget: ViewConfigWidget | null;
  boDefinitions: BusinessObjectDefinition[];
  onUpdate: (updates: Partial<ViewConfigWidget>) => void;
  onDelete: () => void;
}

// Helper to safely get config as object
function getConfigAsObject(config: Json | undefined): Record<string, unknown> {
  if (!config) return {};
  if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

export function PropertiesPanel({
  widget,
  boDefinitions,
  onUpdate,
  onDelete,
}: PropertiesPanelProps) {
  const [localTitle, setLocalTitle] = useState(widget?.title || '');
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(
    getConfigAsObject(widget?.config)
  );

  useEffect(() => {
    setLocalTitle(widget?.title || '');
    setLocalConfig(getConfigAsObject(widget?.config));
  }, [widget?.id, widget?.title, widget?.config]);

  if (!widget) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Propriétés</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sélectionnez un widget</p>
            <p className="text-xs">pour modifier ses propriétés</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const widgetDef = WIDGET_DEFINITIONS.find(w => w.type === widget.widget_type);

  const handleTitleBlur = () => {
    if (localTitle !== widget.title) {
      onUpdate({ title: localTitle || null });
    }
  };

  const handleConfigChange = (key: string, value: unknown) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onUpdate({ config: newConfig as Json });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Propriétés</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-4 space-y-6">
          {/* Widget Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Type de widget</Label>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              {widgetDef && (
                <>
                  <widgetDef.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{widgetDef.label}</span>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="widget-title">Titre</Label>
            <Input
              id="widget-title"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Titre du widget"
            />
          </div>

          {/* Size */}
          <div className="space-y-4">
            <Label className="text-xs text-muted-foreground">Dimensions</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="widget-width" className="text-xs">Largeur</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="widget-width"
                    min={1}
                    max={4}
                    step={1}
                    value={[widget.width]}
                    onValueChange={([v]) => onUpdate({ width: v })}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-6 text-center">{widget.width}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="widget-height" className="text-xs">Hauteur</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="widget-height"
                    min={1}
                    max={4}
                    step={1}
                    value={[widget.height]}
                    onValueChange={([v]) => onUpdate({ height: v })}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-6 text-center">{widget.height}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Widget-specific config */}
          <div className="space-y-4">
            <Label className="text-xs text-muted-foreground">Configuration</Label>

            {/* Data source for stats, chart, table, recent_items */}
            {['stats_card', 'chart', 'table', 'recent_items'].includes(widget.widget_type) && (
              <div className="space-y-2">
                <Label htmlFor="widget-bo">Source de données</Label>
                <Select
                  value={(localConfig.bo_definition_id as string) || ''}
                  onValueChange={(v) => handleConfigChange('bo_definition_id', v)}
                >
                  <SelectTrigger id="widget-bo">
                    <SelectValue placeholder="Sélectionner un objet métier" />
                  </SelectTrigger>
                  <SelectContent>
                    {boDefinitions.map((bo) => (
                      <SelectItem key={bo.id} value={bo.id}>
                        {bo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Chart type */}
            {widget.widget_type === 'chart' && (
              <div className="space-y-2">
                <Label htmlFor="widget-chart-type">Type de graphique</Label>
                <Select
                  value={(localConfig.chart_type as string) || 'bar'}
                  onValueChange={(v) => handleConfigChange('chart_type', v)}
                >
                  <SelectTrigger id="widget-chart-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Barres</SelectItem>
                    <SelectItem value="line">Ligne</SelectItem>
                    <SelectItem value="pie">Camembert</SelectItem>
                    <SelectItem value="area">Aire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stats metric */}
            {widget.widget_type === 'stats_card' && (
              <div className="space-y-2">
                <Label htmlFor="widget-metric">Métrique</Label>
                <Select
                  value={(localConfig.metric as string) || 'count'}
                  onValueChange={(v) => handleConfigChange('metric', v)}
                >
                  <SelectTrigger id="widget-metric">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Nombre total</SelectItem>
                    <SelectItem value="count_today">Créés aujourd'hui</SelectItem>
                    <SelectItem value="count_week">Cette semaine</SelectItem>
                    <SelectItem value="count_month">Ce mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Table limit */}
            {['table', 'recent_items'].includes(widget.widget_type) && (
              <div className="space-y-2">
                <Label htmlFor="widget-limit">Nombre de lignes</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id="widget-limit"
                    min={3}
                    max={20}
                    step={1}
                    value={[(localConfig.limit as number) || 5]}
                    onValueChange={([v]) => handleConfigChange('limit', v)}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-6 text-center">
                    {(localConfig.limit as number) || 5}
                  </span>
                </div>
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="widget-active">Actif</Label>
              <Switch
                id="widget-active"
                checked={widget.is_active}
                onCheckedChange={(v) => onUpdate({ is_active: v })}
              />
            </div>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
