import { Users, Plus, Download } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import type { UsersBlockConfig } from './types';

interface BlockPreviewUsersProps {
  config: UsersBlockConfig;
}

const MOCK_USERS = [
  { first_name: 'Alice', last_name: 'Martin', email: 'alice@example.com', profile: 'Admin' },
  { first_name: 'Bob', last_name: 'Dupont', email: 'bob@example.com', profile: 'Lecteur' },
  { first_name: 'Claire', last_name: 'Bernard', email: 'claire@example.com', profile: 'Éditeur' },
];

export function BlockPreviewUsers({ config }: BlockPreviewUsersProps) {
  const permissions = [
    config.enable_create && 'Créer',
    config.enable_edit && 'Modifier',
    config.enable_edit_profile && 'Profil',
    config.enable_activate_deactivate && 'Activer/Désactiver',
  ].filter(Boolean) as string[];

  const hasExport = config.enable_export ?? false;
  const hasAnonymization = (config.anonymization?.length ?? 0) > 0;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1" />
        {config.enable_create && (
          <div className="flex items-center gap-1 text-xs border rounded px-2 py-1 bg-primary/10 text-primary">
            <Plus className="h-3 w-3" />
            Inviter
          </div>
        )}
        {hasExport && (
          <div className="flex items-center gap-1 text-xs border rounded px-2 py-1">
            <Download className="h-3 w-3" />
            Export
          </div>
        )}
      </div>

      {/* Mini table */}
      <div className="border rounded-md overflow-hidden bg-background">
        <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
          <div>Prénom</div>
          <div>Nom</div>
          <div>Email</div>
          <div>Profil</div>
        </div>
        {MOCK_USERS.map((u, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 px-3 py-1.5 text-xs border-t text-muted-foreground">
            <div className="truncate">{u.first_name}</div>
            <div className="truncate">{u.last_name}</div>
            <div className="truncate">{hasAnonymization ? '***' : u.email}</div>
            <div className="truncate">{u.profile}</div>
          </div>
        ))}
      </div>

      {/* Permissions badges */}
      {permissions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {permissions.map((p) => (
            <Chip key={p} variant="default" className="text-xs px-1.5 py-0">
              {p}
            </Chip>
          ))}
        </div>
      )}

      {hasAnonymization && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
          <Users className="h-3 w-3" />
          <span>{config.anonymization!.length} champ(s) anonymisé(s)</span>
        </div>
      )}
    </div>
  );
}
