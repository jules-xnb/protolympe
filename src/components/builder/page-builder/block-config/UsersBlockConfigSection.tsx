import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { UsersBlock } from '../types';
import { UsersAnonymizationDialog } from '../UsersAnonymizationDialog';

interface UsersBlockConfigSectionProps {
  block: UsersBlock;
  clientId?: string | null;
  onUpdate: (updates: Partial<UsersBlock['config']>) => void;
}

export function UsersBlockConfigSection({ block, onUpdate }: UsersBlockConfigSectionProps) {
  const config = block.config;
  const [anonymizationOpen, setAnonymizationOpen] = useState(false);

  const anonymization = config.anonymization || [];

  return (
    <div className="space-y-4">

      {/* Filtres */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase">Filtres</Label>
        <div className="flex items-center justify-between">
          <Label htmlFor="enable-filters" className="text-sm font-normal">Activer les filtres</Label>
          <Switch
            id="enable-filters"
            checked={config.enable_filters ?? false}
            onCheckedChange={(v) => onUpdate({ enable_filters: v })}
          />
        </div>
      </div>

      <Separator />

      {/* Création */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase">Création</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-create" className="text-sm font-normal">Créer un utilisateur</Label>
            <Switch
              id="enable-create"
              checked={config.enable_create ?? true}
              onCheckedChange={(v) => onUpdate({ enable_create: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-edit" className="text-sm font-normal">Modifier les utilisateurs</Label>
            <Switch
              id="enable-edit"
              checked={config.enable_edit ?? true}
              onCheckedChange={(v) => onUpdate({ enable_edit: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-edit-profile" className="text-sm font-normal">Modifier le profil</Label>
            <Switch
              id="enable-edit-profile"
              checked={config.enable_edit_profile ?? true}
              onCheckedChange={(v) => onUpdate({ enable_edit_profile: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-activate" className="text-sm font-normal">Activer / désactiver</Label>
            <Switch
              id="enable-activate"
              checked={config.enable_activate_deactivate ?? true}
              onCheckedChange={(v) => onUpdate({ enable_activate_deactivate: v })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Import / Export */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase">Import / Export</Label>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-import" className="text-sm font-normal">Activer l'import</Label>
              <Switch
                id="enable-import"
                checked={config.enable_import ?? false}
                onCheckedChange={(v) => onUpdate({ enable_import: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Permet aux utilisateurs d'importer d'autres utilisateurs.</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-export" className="text-sm font-normal">Activer l'export</Label>
              <Switch
                id="enable-export"
                checked={config.enable_export ?? false}
                onCheckedChange={(v) => onUpdate({ enable_export: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Permet aux utilisateurs d'exporter les utilisateurs.</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Historique */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase">Historique</Label>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-history" className="text-sm font-normal">Accéder à l'historique</Label>
            <Switch
              id="enable-history"
              checked={config.enable_history ?? false}
              onCheckedChange={(v) => onUpdate({ enable_history: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">Permet aux utilisateurs de consulter l'historique des modifications des utilisateurs.</p>
        </div>
      </div>

      <Separator />

      {/* Anonymisation */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase">Anonymisation des colonnes</Label>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setAnonymizationOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5 shrink-0" />
          Configurer l'anonymat
        </Button>
        <p className="text-xs text-muted-foreground">
          Les colonnes anonymisées s'afficheront en ***
        </p>
      </div>

      <UsersAnonymizationDialog
        open={anonymizationOpen}
        onOpenChange={setAnonymizationOpen}
        anonymization={anonymization}
        onSave={(anon) => onUpdate({ anonymization: anon })}
      />
    </div>
  );
}
