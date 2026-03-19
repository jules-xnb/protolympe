import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProfileData {
  full_name: string | null;
  email: string;
  created_at: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<ProfileData>(`/api/profile-templates/me`)
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => {});
  }, [user]);

  const nameParts = profile?.full_name?.split(' ') || [];
  const lastName = nameParts.length > 1 ? nameParts.slice(-1).join(' ') : nameParts[0] || '';
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-lg font-semibold">Paramètres</h1>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium">Informations personnelles</h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={lastName} readOnly disabled className="bg-muted/75 opacity-60 cursor-not-allowed" />
          </div>
          <div className="space-y-2">
            <Label>Prénom</Label>
            <Input value={firstName} readOnly disabled className="bg-muted/75 opacity-60 cursor-not-allowed" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Adresse mail</Label>
          <Input value={profile?.email || ''} readOnly disabled className="bg-muted/75 opacity-60 cursor-not-allowed" />
        </div>

        <div className="space-y-2">
          <Label>Date de création du compte</Label>
          <Input value={profile ? format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: fr }) : ''} readOnly disabled className="bg-muted/75 opacity-60 cursor-not-allowed" />
        </div>
      </div>
    </div>
  );
}
