import { useRef, useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { ModulesEditor, type ModulesEditorHandle } from '@/components/builder/modules/ModulesEditor';
import { useViewMode } from '@/contexts/ViewModeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle, Plus, FolderPlus, FilePlus, Puzzle } from 'lucide-react';
import { AddModuleDialog } from '@/components/admin/modules/AddModuleDialog';

export default function ModulesPage() {
  const { selectedClient } = useViewMode();
  const editorRef = useRef<ModulesEditorHandle>(null);
  const [navIsEmpty, setNavIsEmpty] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);

  if (!selectedClient) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Aucun client sélectionné"
        description="Veuillez sélectionner un client pour gérer la navigation."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Navigation"
        description="Configurez la structure de navigation de l'application utilisateur"
      >
        <Button variant="outline" onClick={() => editorRef.current?.expandAll()} disabled={navIsEmpty}>
          Tout déplier
        </Button>
        <Button variant="outline" onClick={() => editorRef.current?.collapseAll()} disabled={navIsEmpty}>
          Tout replier
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              Ajouter
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => editorRef.current?.createModule()}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Nouveau groupe
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editorRef.current?.createView()}>
              <FilePlus className="h-4 w-4 mr-2" />
              Nouvelle vue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddModuleOpen(true)}>
              <Puzzle className="h-4 w-4 mr-2" />
              Nouveau module
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>
      <ModulesEditor ref={editorRef} onEmptyChange={setNavIsEmpty} />
      <AddModuleDialog open={addModuleOpen} onOpenChange={setAddModuleOpen} />
    </div>
  );
}
