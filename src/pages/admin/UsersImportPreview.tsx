import type { ColumnDef } from '@tanstack/react-table';
import { Chip } from '@/components/ui/chip';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/admin/DataTable';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  UserCog,
  Download,
  FileSpreadsheet,
  Mail,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCallback } from 'react';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface MappedUser {
  email: string;
  fullName: string | null;
  profileNames: string[];
  templateIds: string[];
  missingProfiles: string[];
  hasError: boolean;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// UsersImportPreview
// ---------------------------------------------------------------------------

export interface UsersImportPreviewProps {
  cachedUsers: MappedUser[];
  cachedErrors: string[];
  onCancel?: () => void;
}

const COLUMNS: ColumnDef<MappedUser>[] = [
  {
    id: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
        {row.original.email}
      </div>
    ),
  },
  {
    id: 'fullName',
    header: 'Nom',
    cell: ({ row }) => row.original.fullName || '-',
  },
  {
    id: 'profiles',
    header: 'Profils',
    cell: ({ row }) => {
      const { profileNames, missingProfiles } = row.original;
      if (profileNames.length === 0) return '-';
      return (
        <div className="flex flex-wrap gap-1">
          {profileNames.map((name, i) => (
            <Chip
              key={i}
              variant={missingProfiles.includes(name) ? 'error' : 'default'}
              className="text-xs"
            >
              <UserCog className="h-3 w-3 mr-1" />
              {name}
            </Chip>
          ))}
        </div>
      );
    },
  },
];

export function UsersImportPreview({ cachedUsers, cachedErrors, onCancel }: UsersImportPreviewProps) {
  const validUsers = cachedUsers.filter(u => !u.hasError);
  const totalUsers = cachedUsers.length;
  const totalValid = validUsers.length;
  const totalErrors = cachedErrors.length;
  const distinctProfiles = new Set(cachedUsers.flatMap(u => u.profileNames)).size;

  return (
    <div className="space-y-4">
      {/* StatBlock grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatBlock icon={<Users className="h-5 w-5" />} value={totalUsers} label="Utilisateurs" />
        <StatBlock icon={<UserCog className="h-5 w-5" />} value={distinctProfiles} label="Profils distincts" />
        <StatBlock icon={<CheckCircle2 className="h-5 w-5 text-success" />} value={totalValid} label="Valides" />
        <StatBlock
          icon={<AlertCircle className="h-5 w-5 text-destructive" />}
          value={totalErrors}
          label="Erreurs"
          valueClassName={totalErrors > 0 ? 'text-destructive' : ''}
        />
      </div>

      {/* Card erreurs */}
      {cachedErrors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <span className="font-semibold text-destructive">Erreurs</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {cachedErrors.map((err, idx) => (
                <p key={idx} className="text-sm text-destructive">{err}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DataTable */}
      <DataTable
        columns={COLUMNS}
        data={validUsers}
        searchColumns={['email', 'fullName']}
        searchPlaceholder="Rechercher un utilisateur..."
        hideColumnSelector
        paginationBelow
        initialPageSize={20}
        toolbarRight={onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} className="border-destructive hover:bg-destructive/10">
            Annuler l'import
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatBlock
// ---------------------------------------------------------------------------

function StatBlock({ icon, value, label, valueClassName = '', iconClassName = 'text-muted-foreground' }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  valueClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-stretch gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className={`flex items-center justify-center rounded-md border border-gray-100 bg-white px-3 shrink-0 ${iconClassName}`}>
        {icon}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={`text-2xl font-semibold leading-tight ${valueClassName}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UsersUploadExtra
// ---------------------------------------------------------------------------

export interface UsersUploadExtraProps {
  templates: Array<{ id: string; name: string }>;
  clientSlug: string | undefined;
}

export function UsersUploadExtra({ templates, clientSlug }: UsersUploadExtraProps) {
  const downloadTemplate = useCallback(() => {
    const headers = ['email', 'full_name', 'profile_names'];
    const sampleData = [
      ['jean.dupont@example.com', 'Jean Dupont', 'Directeur Région;Manager National'],
      ['marie.martin@example.com', 'Marie Martin', 'Gestionnaire'],
      ['pierre.durand@example.com', 'Pierre Durand', ''],
    ];

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(';'),
      ...sampleData.map(row => row.join(';')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_utilisateurs.csv';
    link.click();
  }, []);

  const downloadProfiles = useCallback(() => {
    const headers = ['nom_profil_type'];
    const data = templates.map(t => [t.name]);

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(';'),
      ...data.map(row => row.join(';')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `profils_types_${clientSlug || 'client'}.csv`;
    link.click();
    toast.success(`${templates.length} profils exportés`);
  }, [templates, clientSlug]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={downloadTemplate}>
        <CardContent className="flex items-center gap-3 py-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Template CSV</p>
            <p className="text-xs text-muted-foreground">Modèle d'import</p>
          </div>
          <Download className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={downloadProfiles}>
        <CardContent className="flex items-center gap-3 py-4">
          <div className="p-2 rounded-lg bg-accent">
            <UserCog className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Profils</p>
            <p className="text-xs text-muted-foreground">{templates.length} profils</p>
          </div>
          <Download className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}
