import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';
import { StatusChip } from '@/components/ui/status-chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableActionMenu } from '@/components/ui/table-action-menu';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Plus,
  Pencil,
  Archive,
  GripVertical,
  BookOpen,
} from 'lucide-react';
import {
  useEoFieldDefinitions,
  useCreateEoFieldDefinition,
  useUpdateEoFieldDefinition,
  useArchiveEoFieldDefinition,
  EoFieldDefinition,
} from '@/hooks/useEoFieldDefinitions';
import { generateSlug } from '@/lib/csv-parser';
import { FIELD_TYPES, getFieldTypeIcon, getFieldTypeLabel } from '@/lib/field-type-registry';

// EO field types — exclude BO-specific / special types
const EO_EXCLUDED = ['decimal', 'datetime', 'time', 'document', 'file', 'image', 'user_reference', 'eo_reference', 'object_reference', 'calculated', 'aggregation', 'section', 'initials', 'boolean'];
const EO_FIELD_TYPES = FIELD_TYPES.filter((t) => !EO_EXCLUDED.includes(t.value));

interface EoFieldsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function EoFieldsManagementDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: EoFieldsManagementDialogProps) {
  const { data: fields = [], isLoading } = useEoFieldDefinitions(open ? clientId : undefined);
  const createField = useCreateEoFieldDefinition();
  const updateField = useUpdateEoFieldDefinition();
  const archiveField = useArchiveEoFieldDefinition();
  
  const [editingField, setEditingField] = useState<EoFieldDefinition | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    field_type: 'text',
    is_required: false,
    options: [] as string[],
  });
  const [optionInput, setOptionInput] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      field_type: 'text',
      is_required: false,
      options: [],
    });
    setOptionInput('');
    setEditingField(null);
    setShowForm(false);
  };

  const handleEdit = (field: EoFieldDefinition) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      slug: field.slug,
      description: field.description || '',
      field_type: field.field_type,
      is_required: field.is_required,
      options: (field.options || []).map((o: unknown) => typeof o === 'string' ? o : (o as { label?: string; value?: string }).label || (o as { label?: string; value?: string }).value || ''),
    });
    setShowForm(true);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      // Auto-generate slug always (except when editing, keep original)
      slug: editingField ? prev.slug : generateSlug(name),
    }));
  };

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, optionInput.trim()],
      }));
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    const options = formData.options.map(o => ({ value: o, label: o }));
    
    if (editingField) {
      await updateField.mutateAsync({
        id: editingField.id,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        field_type: formData.field_type,
        is_required: formData.is_required,
        options,
      });
    } else {
      await createField.mutateAsync({
        client_id: clientId,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        field_type: formData.field_type,
        is_required: formData.is_required,
        options,
        display_order: fields.length,
      });
    }
    resetForm();
  };

  const handleArchive = async (field: EoFieldDefinition) => {
    await archiveField.mutateAsync(field.id);
  };

  const showOptions = ['select', 'multiselect'].includes(formData.field_type);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[var(--modal-width-lg)] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Champs personnalisés des EO</DialogTitle>
            <DialogDescription>
              Définissez les champs personnalisés pour les entités organisationnelles de {clientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add/Edit Form */}
            {showForm ? (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium">
                  {editingField ? 'Modifier le champ' : 'Nouveau champ'}
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom du champ</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ex: Numéro SIRET"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description (optionnel)</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Aide pour les utilisateurs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Type de champ</Label>
                  <Select
                    value={formData.field_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, field_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EO_FIELD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Options for select/multiselect */}
                {showOptions && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="flex gap-2">
                      <Input
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        placeholder="Ajouter une option"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                      />
                      <Button type="button" variant="outline" onClick={handleAddOption}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.options.map((option, index) => (
                          <Chip
                            key={index}
                            variant="default"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleRemoveOption(index)}
                          >
                            {option} ×
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                  />
                  <Label>Champ obligatoire</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.name || createField.isPending || updateField.isPending}
                  >
                    {editingField ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                Ajouter un champ personnalisé
                <Plus className="h-4 w-4" />
              </Button>
            )}

            {/* Fields List */}
            <ScrollArea className="h-[350px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              ) : fields.length === 0 ? (
                <EmptyState
                  icon={Type}
                  title="Aucun champ personnalisé défini"
                  description="Les champs de base sont toujours disponibles"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Obligatoire</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field) => {
                      const IconComponent = getFieldTypeIcon(field.field_type);
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{field.name}</p>
                              <p className="text-xs text-muted-foreground">{field.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{getFieldTypeLabel(field.field_type)}</span>
                              {(field.settings as Record<string, unknown> | null)?.referential_id && (
                                <Chip variant="outline" className="text-xs gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  Référentiel
                                </Chip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {field.is_required ? (
                              <Chip variant="default" className="text-xs">Oui</Chip>
                            ) : (
                              <Chip variant="default" className="text-xs">Non</Chip>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusChip status={field.is_active ? 'actif' : 'inactif'} />
                          </TableCell>
                          <TableCell>
                            <TableActionMenu
                              items={[
                                { label: 'Modifier', icon: Pencil, onClick: () => handleEdit(field) },
                                { label: 'Archiver', icon: Archive, onClick: () => handleArchive(field), destructive: true },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>

            {/* Core Fields Info */}
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">Champs système (non modifiables) :</p>
              <div className="flex flex-wrap gap-1">
                <Chip variant="outline" className="text-xs">ID (6 chiffres)</Chip>
                <Chip variant="outline" className="text-xs">Nom</Chip>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
