import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import type { Json } from '@/types/database';

interface DashboardConfig {
  columns?: number;
  gap?: number;
  show_header?: boolean;
  auto_refresh?: boolean;
  refresh_interval?: number;
}

interface DashboardViewConfigProps {
  config: Json;
  onChange: (config: Json) => void;
}

function getConfig(json: Json): DashboardConfig {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as DashboardConfig;
  }
  return {};
}

export function DashboardViewConfig({ config, onChange }: DashboardViewConfigProps) {
  const cfg = getConfig(config);

  const updateConfig = (key: keyof DashboardConfig, value: unknown) => {
    onChange({ ...cfg, [key]: value } as Json);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre de colonnes</Label>
        <div className="flex items-center gap-3">
          <Slider
            min={2}
            max={6}
            step={1}
            value={[cfg.columns || 4]}
            onValueChange={([v]) => updateConfig('columns', v)}
            className="flex-1"
          />
          <span className="text-sm font-mono w-6 text-center">{cfg.columns || 4}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Espacement (px)</Label>
        <div className="flex items-center gap-3">
          <Slider
            min={8}
            max={32}
            step={4}
            value={[cfg.gap || 16]}
            onValueChange={([v]) => updateConfig('gap', v)}
            className="flex-1"
          />
          <span className="text-sm font-mono w-8 text-center">{cfg.gap || 16}</span>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label htmlFor="show-header">Afficher l'en-tête</Label>
        <Switch
          id="show-header"
          checked={cfg.show_header !== false}
          onCheckedChange={(v) => updateConfig('show_header', v)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="auto-refresh">Rafraîchissement auto</Label>
        <Switch
          id="auto-refresh"
          checked={cfg.auto_refresh || false}
          onCheckedChange={(v) => updateConfig('auto_refresh', v)}
        />
      </div>

      {cfg.auto_refresh && (
        <div className="space-y-2">
          <Label>Intervalle (secondes)</Label>
          <Input
            type="number"
            min={10}
            max={300}
            value={cfg.refresh_interval || 60}
            onChange={(e) => updateConfig('refresh_interval', parseInt(e.target.value) || 60)}
          />
        </div>
      )}
    </div>
  );
}
