import { useMemo } from 'react';
import { z } from 'zod';
import { FormDialog } from '@/components/ui/form-dialog';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { FloatingInput } from '@/components/ui/floating-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateWorkflow, useUpdateWorkflow, type WorkflowWithDetails } from '@/hooks/useWorkflows';
import { useBusinessObjectDefinitions } from '@/hooks/useBusinessObjectDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { toast } from 'sonner';
import { WORKFLOW_TYPE_LABELS } from '@/lib/workflow-types';
import type { Database } from '@/types/database';
import { generateSlug } from '@/lib/csv-parser';
import { queryKeys } from '@/lib/query-keys';

type WorkflowType = Database['public']['Enums']['workflow_type'];

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  description: z.string(),
  workflowType: z.string(),
  boDefinitionId: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface WorkflowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: WorkflowWithDetails | null;
  /** Force le type de workflow (masque le sélecteur) */
  forceWorkflowType?: WorkflowType;
}

export function WorkflowFormDialog({ open, onOpenChange, workflow, forceWorkflowType }: WorkflowFormDialogProps) {
  const queryClient = useQueryClient();
  const { selectedClient } = useViewMode();
  const { data: boDefinitions = [] } = useBusinessObjectDefinitions();

  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();

  const isEditing = !!workflow;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const defaultValues = useMemo<FormValues>(() => {
    if (workflow) {
      return {
        name: workflow.name,
        description: workflow.description || '',
        workflowType: workflow.workflow_type as string,
        boDefinitionId: workflow.bo_definition_id || '__none__',
      };
    }
    return { name: '', description: '', workflowType: forceWorkflowType ?? 'value_collection', boDefinitionId: '__none__' };
  }, [workflow]);

  const handleSubmit = async (values: FormValues) => {
    if (!selectedClient?.id) {
      toast.error('Aucun client sélectionné');
      return;
    }

    const slug = workflow?.slug || generateSlug(values.name);
    const boDefId = values.boDefinitionId === '__none__' ? null : values.boDefinitionId;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: workflow.id,
          name: values.name,
          slug,
          description: values.description || null,
          bo_definition_id: boDefId,
        });
        toast.success('Workflow mis à jour');
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          slug,
          description: values.description || null,
          client_id: selectedClient.id,
          workflow_type: values.workflowType as WorkflowType,
          bo_definition_id: boDefId,
        });
        toast.success('Workflow créé');
      }
      // Wait for the list to refetch before closing so the new/updated item is visible
      await queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all() });
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Modifier le workflow' : 'Nouveau workflow'}
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={isEditing ? 'Mettre à jour' : 'Créer'}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <FloatingInput label="Nom *" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Description du workflow..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="boDefinitionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objet métier</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un objet métier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {boDefinitions.filter((bo) => bo.is_active).map((bo) => (
                      <SelectItem key={bo.id} value={bo.id}>
                        {bo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditing && !forceWorkflowType && (
            <FormField
              control={form.control}
              name="workflowType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de workflow *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(WORKFLOW_TYPE_LABELS).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex flex-col">
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {WORKFLOW_TYPE_LABELS[field.value as WorkflowType]?.description}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </FormDialog>
  );
}
