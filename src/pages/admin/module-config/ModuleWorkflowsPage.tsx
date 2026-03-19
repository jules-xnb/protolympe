import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialogState } from '@/hooks/useDialogState';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableActionMenu } from '@/components/ui/table-action-menu';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { WorkflowFormDialog } from '@/components/admin/workflows/WorkflowFormDialog';
import {
  useWorkflows,
  useDeleteWorkflow,
  useDuplicateWorkflow,
  type WorkflowWithDetails,
} from '@/hooks/useWorkflows';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  Loader2,
  Workflow,
  Copy,
  Eye,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { WORKFLOW_TYPE_LABELS } from '@/lib/workflow-types';

export default function ModuleWorkflowsPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { data: workflows = [], isLoading } = useWorkflows();
  const deleteMutation = useDeleteWorkflow();
  const duplicateMutation = useDuplicateWorkflow();

  const [searchQuery, setSearchQuery] = useState('');
  const formDialog = useDialogState<WorkflowWithDetails>();
  const deleteDialog = useDialogState<WorkflowWithDetails>();

  const filteredWorkflows = searchQuery
    ? workflows.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : workflows;

  const handleCreate = () => {
    formDialog.open();
  };

  const handleEdit = (workflow: WorkflowWithDetails) => {
    formDialog.open(workflow);
  };

  const handleOpenDetail = (workflow: WorkflowWithDetails) => {
    navigate(cp(CLIENT_ROUTES.WORKFLOW_DETAIL(workflow.id)));
  };

  const handleDeleteClick = (workflow: WorkflowWithDetails) => {
    deleteDialog.open(workflow);
  };

  const handleDelete = async () => {
    if (!deleteDialog.item) return;
    try {
      await deleteMutation.mutateAsync(deleteDialog.item.id);
      toast.success('Workflow supprimé');
      deleteDialog.close();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const handleDuplicate = async (workflow: WorkflowWithDetails) => {
    try {
      await duplicateMutation.mutateAsync(workflow.id);
      toast.success('Workflow dupliqué (nœuds, transitions, formulaires, permissions)');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la duplication');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Workflows"
        description="Gérez les workflows de validation pour vos campagnes et processus métiers."
      >
        <Button onClick={handleCreate}>
          Nouveau workflow
          <Plus className="h-4 w-4" />
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && workflows.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Aucun workflow créé"
          description="Commencez par créer un workflow pour gérer vos processus de validation."
          action={
            <Button variant="outline" size="sm" onClick={handleCreate}>
              Créer un workflow <Plus className="h-4 w-4" />
            </Button>
          }
        />
      )}

      {!isLoading && filteredWorkflows.length > 0 && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[80px]">Nœuds</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.map((workflow) => (
                <TableRow
                  key={workflow.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenDetail(workflow)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-primary" />
                      {workflow.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Chip variant="outline" className="text-xs font-normal">
                      {WORKFLOW_TYPE_LABELS[workflow.workflow_type as keyof typeof WORKFLOW_TYPE_LABELS]?.label || workflow.workflow_type}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-sm">
                    {workflow.is_valid ? (
                      <Chip variant="success" className="text-xs font-normal">
                        Valide
                      </Chip>
                    ) : (
                      <Chip variant="default" className="text-xs font-normal">
                        Non valide
                      </Chip>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {workflow._count?.nodes || 0}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TableActionMenu
                      items={[
                        { label: 'Ouvrir', icon: Eye, onClick: () => handleOpenDetail(workflow) },
                        { label: 'Modifier', icon: Pencil, onClick: () => handleEdit(workflow) },
                        { label: 'Dupliquer', icon: Copy, onClick: () => handleDuplicate(workflow) },
                        { label: 'Supprimer', icon: Trash2, onClick: () => handleDeleteClick(workflow), destructive: true },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <WorkflowFormDialog
        open={formDialog.isOpen}
        onOpenChange={formDialog.onOpenChange}
        workflow={formDialog.item}
        forceWorkflowType="value_collection"
      />

      <DeleteConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={handleDelete}
        title="Supprimer le workflow"
        description={`Êtes-vous sûr de vouloir supprimer le workflow "${deleteDialog.item?.name}" ? Cette action est irréversible.`}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
