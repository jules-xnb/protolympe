import { useState } from 'react';
import { Plus, Archive, Users, Download, Upload, MoreHorizontal, Pencil, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Chip } from '@/components/ui/chip';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useProfileTemplates, useArchiveProfileTemplate, type ProfileTemplate } from '@/hooks/useProfileTemplates';
import { ProfileTemplateFormDialog } from '@/components/admin/profiles/ProfileTemplateFormDialog';
import { ProfileTemplateDetailsDrawer } from '@/components/admin/profiles/ProfileTemplateDetailsDrawer';
import type { ProfilesBlockConfig } from '@/types/builder-types';



interface ProfilesBlockViewProps {
  config: ProfilesBlockConfig;
}

export function ProfilesBlockView({ config }: ProfilesBlockViewProps) {
  const { selectedClient } = useViewMode();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { data: templates = [], isLoading } = useProfileTemplates(selectedClient?.id);
  const archiveMutation = useArchiveProfileTemplate();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState<ProfileTemplate | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const activeTemplates = templates.filter(t => t.is_active);
  const hasActions = config.enable_edit || config.enable_duplicate || config.enable_delete;

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Profils</h1>
        <div className="flex items-center gap-2">
          {config.enable_delete && (
            <Button variant="ghost" onClick={() => navigate(cp(CLIENT_ROUTES.USER_PROFILES_ARCHIVED))}>
              Archivés
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {(config.enable_import || config.enable_export) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Import / Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {config.enable_import && (
                  <DropdownMenuItem>
                    <Upload className="h-4 w-4" />
                    Importer
                  </DropdownMenuItem>
                )}
                {config.enable_export && (
                  <DropdownMenuItem>
                    <Download className="h-4 w-4" />
                    Exporter
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {config.enable_create && (
            <Button onClick={() => setCreateOpen(true)}>
              Nouveau profil
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : activeTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">Aucun profil</p>
          {config.enable_create && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
              Créer un profil
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Entités</TableHead>
                <TableHead>Regroupements</TableHead>
                <TableHead className="w-[100px] text-center">Utilisateurs</TableHead>
                {hasActions && <TableHead className="w-[40px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTemplates.map((template) => (
                <TableRow
                  key={template.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {Object.entries(
                        template.roles.reduce<Record<string, typeof template.roles>>((acc, r) => {
                          const cat = r.role_category_name || 'Sans catégorie';
                          (acc[cat] ??= []).push(r);
                          return acc;
                        }, {})
                      ).map(([category, roles]) => (
                        <div key={category} className="flex flex-wrap items-center gap-1">
                          <span className="text-xs text-muted-foreground mr-0.5">{category}:</span>
                          {roles.map(r => (
                            <Chip
                              key={r.role_id}
                              variant="outline"
                              className="text-xs gap-1"
                              style={{
                                borderColor: r.role_color || undefined,
                                backgroundColor: r.role_color ? `${r.role_color}10` : undefined,
                              }}
                            >
                              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.role_color || '#6b7280' }} />
                              {r.role_name}
                            </Chip>
                          ))}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.eos.slice(0, 3).map(e => (
                        <Chip key={e.eo_id} variant="default" className="text-xs gap-1">
                          {e.eo_name}
                          {e.include_descendants && <span className="text-primary font-medium">↓</span>}
                        </Chip>
                      ))}
                      {template.eos.length > 3 && <Chip variant="default" className="text-xs">+{template.eos.length - 3}</Chip>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.groups.length > 0
                      ? <div className="flex flex-wrap gap-1">
                          {template.groups.slice(0, 3).map(g => (
                            <Chip key={g.group_id} variant="outline" className="text-xs">{g.group_name}</Chip>
                          ))}
                          {template.groups.length > 3 && <Chip variant="outline" className="text-xs">+{template.groups.length - 3}</Chip>}
                        </div>
                      : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Chip variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      {template._userCount}
                    </Chip>
                  </TableCell>
                  {hasActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {config.enable_edit && (
                            <DropdownMenuItem onClick={() => { setEditTemplate(template); setEditOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          {config.enable_duplicate && (
                            <DropdownMenuItem onClick={() => { setEditTemplate(template); setEditOpen(true); }}>
                              <Copy className="h-4 w-4" />
                              Dupliquer
                            </DropdownMenuItem>
                          )}
                          {config.enable_delete && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => archiveMutation.mutate(template.id)}
                            >
                              <Archive className="h-4 w-4" />
                              Archiver
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {config.enable_create && (
        <ProfileTemplateFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}

      <ProfileTemplateDetailsDrawer
        templateId={selectedTemplateId}
        onClose={() => setSelectedTemplateId(null)}
        onEdit={(template) => {
          setSelectedTemplateId(null);
          setEditTemplate(template);
          setEditOpen(true);
        }}
        onDuplicate={(template) => {
          setSelectedTemplateId(null);
          setEditTemplate(template);
          setEditOpen(true);
        }}
      />

      {config.enable_edit && (
        <ProfileTemplateFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          template={editTemplate}
        />
      )}
    </div>
  );
}
