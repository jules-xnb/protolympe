import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { ProfilesBlock } from '../types';

interface ProfilesBlockConfigSectionProps {
  block: ProfilesBlock;
  onUpdate: (updates: Partial<ProfilesBlock['config']>) => void;
}

export function ProfilesBlockConfigSection({ block, onUpdate }: ProfilesBlockConfigSectionProps) {
  const config = block.config;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase">Actions</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="profiles-enable-create" className="text-sm font-normal">Créer un profil</Label>
            <Switch
              id="profiles-enable-create"
              checked={config.enable_create ?? true}
              onCheckedChange={(v) => onUpdate({ enable_create: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="profiles-enable-edit" className="text-sm font-normal">Modifier un profil</Label>
            <Switch
              id="profiles-enable-edit"
              checked={config.enable_edit ?? true}
              onCheckedChange={(v) => onUpdate({ enable_edit: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="profiles-enable-duplicate" className="text-sm font-normal">Dupliquer un profil</Label>
            <Switch
              id="profiles-enable-duplicate"
              checked={config.enable_duplicate ?? false}
              onCheckedChange={(v) => onUpdate({ enable_duplicate: v })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase">Archiver</Label>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="profiles-enable-delete" className="text-sm font-normal">Archiver un profil</Label>
            <Switch
              id="profiles-enable-delete"
              checked={config.enable_delete ?? false}
              onCheckedChange={(v) => onUpdate({ enable_delete: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">Permet aux utilisateurs d'archiver leurs profils.</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase">Import / Export</Label>
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="profiles-enable-import" className="text-sm font-normal">Activer l'import</Label>
              <Switch
                id="profiles-enable-import"
                checked={config.enable_import ?? false}
                onCheckedChange={(v) => onUpdate({ enable_import: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Permet aux utilisateurs d'importer des profils.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="profiles-enable-export" className="text-sm font-normal">Activer l'export</Label>
              <Switch
                id="profiles-enable-export"
                checked={config.enable_export ?? false}
                onCheckedChange={(v) => onUpdate({ enable_export: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Permet aux utilisateurs d'exporter les profils.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
