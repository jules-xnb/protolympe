import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientModule } from '@/hooks/useModules';
import { getModuleCatalog } from '@/lib/module-catalog';
import { useClientPath } from '@/hooks/useClientPath';
import { ModuleConfigLayout, type ModuleConfigTab } from '@/components/admin/modules/ModuleConfigLayout';
import { Button } from '@/components/ui/button';
import { Plus, Archive } from 'lucide-react';
import { CLIENT_ROUTES } from '@/lib/routes';
import ModuleDisplayPage from './ModuleDisplayPage';
import ModuleRolesPage from './ModuleRolesPage';
import ModulePermissionsPage from './ModulePermissionsPage';
import ModuleBoPage from './ModuleBoPage';
import ModuleWorkflowsPage from './ModuleWorkflowsPage';

export default function ModuleConfigPage() {
  const { clientId, moduleId } = useParams<{ clientId: string; moduleId: string }>();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { data: module } = useClientModule(moduleId);

  const catalog = module ? getModuleCatalog(module.module_slug) : undefined;
  const moduleName = catalog?.label ?? module?.module_slug ?? 'Module';
  const backPath = `/dashboard/${clientId}/modules`;

  // CTA triggers — each tab component watches these booleans to open its dialog
  const [displayOpen, setDisplayOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [boOpen, setBoOpen] = useState(false);
  const [workflowsOpen, setWorkflowsOpen] = useState(false);

  const tabs: ModuleConfigTab[] = [
    {
      key: 'display',
      label: 'Affichage',
      cta: (
        <Button onClick={() => setDisplayOpen(true)}>
          Ajouter une vue <Plus className="h-4 w-4" />
        </Button>
      ),
      content: (
        <ModuleDisplayPage
          externalOpen={displayOpen}
          onExternalOpenChange={setDisplayOpen}
        />
      ),
    },
  ];

  if (catalog?.hasBo) {
    tabs.push({
      key: 'bo',
      label: 'Objets métiers',
      cta: (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS_ARCHIVED))}
          >
            Archives <Archive className="h-4 w-4" />
          </Button>
          <Button onClick={() => setBoOpen(true)}>
            Nouvel objet métier <Plus className="h-4 w-4" />
          </Button>
        </div>
      ),
      content: (
        <ModuleBoPage
          externalOpen={boOpen}
          onExternalOpenChange={setBoOpen}
        />
      ),
    });
  }

  if (catalog?.hasWorkflows) {
    tabs.push({
      key: 'workflows',
      label: 'Workflows',
      cta: (
        <Button onClick={() => setWorkflowsOpen(true)}>
          Nouveau workflow <Plus className="h-4 w-4" />
        </Button>
      ),
      content: (
        <ModuleWorkflowsPage
          externalOpen={workflowsOpen}
          onExternalOpenChange={setWorkflowsOpen}
        />
      ),
    });
  }

  if (catalog?.hasRoles) {
    tabs.push(
      {
        key: 'roles',
        label: 'Rôles',
        cta: (
          <Button onClick={() => setRolesOpen(true)}>
            Ajouter un rôle <Plus className="h-4 w-4" />
          </Button>
        ),
        content: (
          <ModuleRolesPage
            externalOpen={rolesOpen}
            onExternalOpenChange={setRolesOpen}
          />
        ),
      },
      {
        key: 'permissions',
        label: 'Permissions',
        content: <ModulePermissionsPage />,
      },
    );
  }

  return (
    <ModuleConfigLayout
      moduleName={moduleName}
      backPath={backPath}
      tabs={tabs}
    />
  );
}
