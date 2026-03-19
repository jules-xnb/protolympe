import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { type ClientUser } from '@/hooks/useClientUsers';
import { Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserProfileSectionProps {
  user: ClientUser;
  hasNoProfiles: boolean;
  onToggleStatus: () => void;
  isToggling: boolean;
}

function getInitials(name?: string | null, email?: string) {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email?.[0]?.toUpperCase() ?? 'U';
}

export function UserProfileSection({
  user,
  hasNoProfiles,
  onToggleStatus,
  isToggling,
}: UserProfileSectionProps) {
  return (
    <>
      {/* Profile header */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(user.profiles?.full_name, user.profiles?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">
              {user.profiles?.full_name || 'Sans nom'}
            </h3>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 bg-gray-50">
          <Switch
            checked={user.is_active}
            onCheckedChange={onToggleStatus}
            disabled={
              isToggling ||
              (hasNoProfiles && !user.activated_at)
            }
          />
          <div>
            <p className="text-sm font-medium">Compte actif</p>
            <p className="text-xs text-muted-foreground">
              {hasNoProfiles && !user.activated_at
                ? 'Ajoutez au moins un profil avant d\'activer'
                : 'Les comptes inactifs ne peuvent pas se connecter'}
            </p>
          </div>
        </div>
      </div>

      {/* Warning if no profiles */}
      {hasNoProfiles && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-sm text-warning-foreground font-medium">
            Configuration incomplète
          </p>
          <p className="text-xs text-warning-foreground/70 mt-1">
            L'utilisateur n'a aucun profil configuré. Il ne pourra pas accéder à l'application.
          </p>
        </div>
      )}

      <Separator />

      {/* Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{user.profiles?.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            Membre depuis le {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: fr })}
          </span>
        </div>
      </div>
    </>
  );
}
