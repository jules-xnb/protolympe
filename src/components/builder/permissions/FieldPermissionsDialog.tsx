import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getFieldTypeLabel } from '@/lib/field-type-registry';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EyeOff, Lock, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ViewPermissionWithRelations } from '@/hooks/useViewPermissions';
import { queryKeys } from '@/lib/query-keys';

interface FieldPermissionsDialogProps {
  permission: ViewPermissionWithRelations;
  boDefinitionId: string | null;
  onClose: () => void;
}

interface FieldOverride {
  hidden?: boolean;
  readonly?: boolean;
}

type FieldDef = {
  id: string;
  name: string;
  field_type: string;
  is_required: boolean;
  display_order: number | null;
};

export function FieldPermissionsDialog({
  permission,
  boDefinitionId,
  onClose,
}: FieldPermissionsDialogProps) {
  const queryClient = useQueryClient();
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, FieldOverride>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch field definitions
  const { data: fields = [], isLoading } = useQuery<FieldDef[]>({
    queryKey: queryKeys.fieldDefinitions.forPermissions(boDefinitionId!),
    queryFn: async () => {
      if (!boDefinitionId) return [];
      const data = await api.get<FieldDef[]>(
        `/api/business-objects/definitions/${boDefinitionId}/fields`
      );
      return data ?? [];
    },
    enabled: !!boDefinitionId,
  });

  // Initialize overrides from permission
  useEffect(() => {
    const existingOverrides = (permission.field_overrides as Record<string, FieldOverride>) || {};
    setFieldOverrides(existingOverrides);
  }, [permission.field_overrides]);

  const toggleFieldOverride = (fieldId: string, type: 'hidden' | 'readonly') => {
    setFieldOverrides((prev) => {
      const current = prev[fieldId] || {};
      const newValue = !current[type];
      
      // If both are false, remove the entry
      const updated = { ...current, [type]: newValue };
      if (!updated.hidden && !updated.readonly) {
        const { [fieldId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [fieldId]: updated };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch(`/api/view-configs/permissions/${permission.id}`, {
        field_overrides: fieldOverrides,
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.viewPermissions.all() });
      toast.success('Permissions des champs enregistrées');
      onClose();
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const getTargetName = () => {
    if (permission.role) return permission.role.name;
    if (permission.category) return permission.category.name;
    return 'Permission';
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="w-[var(--modal-width-lg)]">
        <DialogHeader>
          <DialogTitle>Permissions des champs</DialogTitle>
          <DialogDescription>
            Configurez la visibilité et l'éditabilité des champs pour{' '}
            <Chip variant="outline">{getTargetName()}</Chip>
          </DialogDescription>
        </DialogHeader>

        {!boDefinitionId ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun objet métier associé à cette vue
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun champ défini pour cet objet métier
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Champ</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center w-28">
                    <div className="flex items-center justify-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Masqué
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-28">
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="h-4 w-4" />
                      Readonly
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => {
                  const override = fieldOverrides[field.id] || {};
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.name}</span>
                          {field.is_required && (
                            <Chip variant="error" className="text-xs px-1">
                              Requis
                            </Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip variant="default" className="font-normal">
                          {getFieldTypeLabel(field.field_type)}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={override.hidden || false}
                          onCheckedChange={() => toggleFieldOverride(field.id, 'hidden')}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={override.readonly || false}
                          onCheckedChange={() => toggleFieldOverride(field.id, 'readonly')}
                          disabled={override.hidden}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
          <p>
            <strong>Masqué :</strong> Le champ ne sera pas visible pour cette cible.
          </p>
          <p>
            <strong>Readonly :</strong> Le champ sera visible mais non modifiable.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            Enregistrer
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
