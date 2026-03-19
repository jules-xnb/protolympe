import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { Plus, Download, Upload, ArrowUpDown, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DynamicFilters, type FilterColumn, type FilterRule, type FilterLogic } from '@/components/admin/DynamicFilters';
import { Input } from '@/components/ui/input';
import { StatusChip } from '@/components/ui/status-chip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClientUsers, useRemoveClientUser, type ClientUser } from '@/hooks/useClientUsers';
import { useProfileTemplates } from '@/hooks/useProfileTemplates';
import { useViewMode } from '@/contexts/ViewModeContext';
import { InviteUserDialog } from '@/components/admin/users/InviteUserDialog';
import { UserDetailsDrawer } from '@/components/admin/users/UserDetailsDrawer';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import type { UsersBlockConfig, UserAnonymizableField } from '@/types/builder-types';
import { useT } from '@/hooks/useT';

interface UsersBlockViewProps {
  config: UsersBlockConfig;
}

function isAnonymized(field: UserAnonymizableField, config: UsersBlockConfig): boolean {
  return !!config.anonymization?.find(a => a.field === field);
}

function getUserDisplayValue(user: ClientUser, field: UserAnonymizableField): string {
  switch (field) {
    case 'first_name': {
      const parts = (user.profiles?.full_name || '').split(' ');
      return parts[0] || '-';
    }
    case 'last_name': {
      const parts = (user.profiles?.full_name || '').split(' ');
      return parts.slice(1).join(' ') || '-';
    }
    case 'email':
      return user.profiles?.email || '-';
    case 'profile':
      return (user.profile_template_names ?? []).join(', ') || '-';
    default:
      return '-';
  }
}


export function UsersBlockView({ config }: UsersBlockViewProps) {
  const { t } = useT();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClientUser | null>(null);
  const [archivingUser, setArchivingUser] = useState<ClientUser | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('and');

  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: users = [], isLoading } = useClientUsers();
  const { data: profileTemplates = [] } = useProfileTemplates(selectedClient?.id);
  const removeUser = useRemoveClientUser();

  const filterColumns = useMemo<FilterColumn[]>(() => [
    {
      id: 'status',
      label: 'Le statut',
      type: 'select',
      options: [
        { value: 'actif', label: 'Actif' },
        { value: 'inactif', label: 'Inactif' },
      ],
    },
    {
      id: 'profile',
      label: 'Le profil',
      type: 'multiselect',
      options: profileTemplates.filter(t => t.is_active).map(t => ({ value: t.name, label: t.name })),
    },
  ], [profileTemplates]);

  const handleImport = useCallback(() => navigate(cp(CLIENT_ROUTES.USERS_IMPORT)), [navigate, cp]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = search.trim().toLowerCase();
      if (q) {
        const fullName = (user.profiles?.full_name || '').toLowerCase();
        const email = (user.profiles?.email || '').toLowerCase();
        const profiles = (user.profile_template_names ?? []).join(' ').toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !profiles.includes(q)) return false;
      }
      if (config.enable_filters) {
        const activeRules = filters.filter(f => {
          if (f.value === '') return false;
          try { const a = JSON.parse(f.value); if (Array.isArray(a)) return a.length > 0; } catch { /* not json */ }
          return true;
        });
        if (activeRules.length > 0) {
          const matchesRule = (f: FilterRule): boolean => {
            if (f.columnId === 'status') return f.value === 'actif' ? !!user.is_active : !user.is_active;
            if (f.columnId === 'profile') {
              try {
                const selected = JSON.parse(f.value) as string[];
                return selected.length === 0 || selected.some(p => (user.profile_template_names ?? []).includes(p));
              } catch { return true; }
            }
            return true;
          };
          const matches = filterLogic === 'and' ? activeRules.every(matchesRule) : activeRules.some(matchesRule);
          if (!matches) return false;
        }
      }
      return true;
    });
  }, [users, search, config.enable_filters, filters, filterLogic]);

  useEffect(() => { setCurrentPage(1); }, [search, filters]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const canImport = config.enable_import ?? false;
  const canExport = config.enable_export ?? false;

  const maskValue = (value: string): string => {
    if (value === '-' || value.length <= 2) return value;
    return value.slice(0, 2) + '*'.repeat(value.length - 2);
  };

  const getCell = (user: ClientUser, field: UserAnonymizableField) => {
    const value = getUserDisplayValue(user, field);
    return isAnonymized(field, config) ? maskValue(value) : value;
  };

  const handleExport = () => {
    const fields: UserAnonymizableField[] = ['first_name', 'last_name', 'email', 'profile'];
    const rows = users.map(user => {
      const row: Record<string, string> = {};
      fields.forEach(f => { row[f] = isAnonymized(f, config) ? '***' : getUserDisplayValue(user, f); });
      row['statut'] = user.is_active ? t('users.status_active') : t('users.status_inactive');
      return row;
    });

    const headers = [t('labels.first_name'), t('labels.last_name'), t('labels.email'), t('labels.profile'), t('labels.status')];
    const keys: (UserAnonymizableField | 'statut')[] = ['first_name', 'last_name', 'email', 'profile', 'statut'];
    const csv = [
      headers.join(';'),
      ...rows.map(r => keys.map(k => `"${(r[k] || '').replace(/"/g, '""')}"`).join(';')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utilisateurs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header toolbar */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t('views.users_title')}</h1>
        <div className="flex items-center gap-2">
          {(canImport || canExport) && (
            canImport && canExport ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {t('views.import_export')}
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleImport}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('buttons.import')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    {t('buttons.export')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : canImport ? (
              <Button variant="outline" size="sm" onClick={handleImport}>
                {t('buttons.import')} <Upload className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleExport}>
                {t('buttons.export')} <Download className="h-4 w-4" />
              </Button>
            )
          )}
          {config.enable_create && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              {t('views.invite')} <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t('placeholders.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {config.enable_filters && (
          <div className="ml-auto">
            <DynamicFilters
              columns={filterColumns}
              filters={filters}
              onFiltersChange={setFilters}
              logic={filterLogic}
              onLogicChange={setFilterLogic}
              showBadges={false}
            />
          </div>
        )}
      </div>

      {/* Pagination */}
      <UnifiedPagination
        totalItems={filteredUsers.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={PAGE_SIZE}
        rangeStart={filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
        rangeEnd={Math.min(currentPage * PAGE_SIZE, filteredUsers.length)}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('labels.first_name')}</TableHead>
              <TableHead>{t('labels.last_name')}</TableHead>
              <TableHead>{t('labels.email')}</TableHead>
              <TableHead>{t('views.profiles')}</TableHead>
              <TableHead>{t('labels.status')}</TableHead>
              <TableHead className="w-20">{t('views.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search || filters.some(f => f.value !== '') ? t('empty.no_results') : t('empty.no_users')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map(user => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <TableCell>{getCell(user, 'first_name')}</TableCell>
                  <TableCell>{getCell(user, 'last_name')}</TableCell>
                  <TableCell>{getCell(user, 'email')}</TableCell>
                  <TableCell>{getCell(user, 'profile')}</TableCell>
                  <TableCell>
                    <StatusChip status={user.is_active ? 'actif' : 'inactif'} />
                  </TableCell>
                  <TableCell>
                    {(config.enable_edit || config.enable_archive) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {config.enable_edit && (
                            <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t('buttons.edit')}
                            </DropdownMenuItem>
                          )}
                          {config.enable_archive && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setArchivingUser(user)}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              {t('buttons.archive')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <UserDetailsDrawer
        open={!!selectedUser}
        onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
        user={selectedUser}
        onArchive={config.enable_archive ? () => { setArchivingUser(selectedUser); setSelectedUser(null); } : undefined}
      />
      <DeleteConfirmDialog
        open={!!archivingUser}
        onOpenChange={(open) => { if (!open) setArchivingUser(null); }}
        onConfirm={async () => {
          if (archivingUser) await removeUser.mutateAsync(archivingUser.id);
          setArchivingUser(null);
        }}
        title={t('views.archive_user')}
        description={`${t('views.confirm_archive_user')} ${archivingUser?.profiles?.full_name || t('views.this_user')} ? ${t('views.access_removed')}`}
        isDeleting={removeUser.isPending}
      />
    </div>
  );
}
