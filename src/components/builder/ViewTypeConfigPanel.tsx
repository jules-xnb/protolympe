import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, List, FileText, FormInput, Workflow } from 'lucide-react';
import { DashboardViewConfig } from './view-types/DashboardViewConfig';
import { ListViewConfig } from './view-types/ListViewConfig';
import { DetailViewConfig } from './view-types/DetailViewConfig';
import { FormViewConfig } from './view-types/FormViewConfig';
import type { ViewConfig } from '@/hooks/useViewConfigs';
import type { Json } from '@/types/database';

interface FieldDefinition {
  id: string;
  name: string;
  field_type: string;
  is_required?: boolean;
  is_readonly?: boolean;
  parent_field_id?: string | null;
}

interface ViewTypeConfigPanelProps {
  viewConfig: ViewConfig;
  fields: FieldDefinition[];
  onConfigChange: (config: Json) => void;
}

const VIEW_TYPE_INFO = {
  dashboard: {
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Grille de widgets personnalisables',
  },
  list: {
    icon: List,
    label: 'Liste',
    description: 'Tableau avec colonnes et filtres',
  },
  detail: {
    icon: FileText,
    label: 'Détail',
    description: 'Affichage d\'un enregistrement',
  },
  form: {
    icon: FormInput,
    label: 'Formulaire',
    description: 'Saisie et modification',
  },
  workflow: {
    icon: Workflow,
    label: 'Workflow',
    description: 'Étapes et transitions',
  },
};

export function ViewTypeConfigPanel({
  viewConfig,
  fields,
  onConfigChange,
}: ViewTypeConfigPanelProps) {
  const typeInfo = VIEW_TYPE_INFO[viewConfig.type] || VIEW_TYPE_INFO.dashboard;
  const Icon = typeInfo.icon;

  const renderConfigPanel = () => {
    switch (viewConfig.type) {
      case 'dashboard':
        return (
          <DashboardViewConfig
            config={viewConfig.config}
            onChange={onConfigChange}
          />
        );
      case 'list':
        return (
          <ListViewConfig
            config={viewConfig.config}
            onChange={onConfigChange}
            fields={fields}
          />
        );
      case 'detail':
        return (
          <DetailViewConfig
            config={viewConfig.config}
            onChange={onConfigChange}
            fields={fields}
          />
        );
      case 'form':
        return (
          <FormViewConfig
            config={viewConfig.config}
            onChange={onConfigChange}
            fields={fields}
          />
        );
      case 'workflow':
        return (
          <div className="text-center text-muted-foreground py-8">
            <Workflow className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Configuration workflow</p>
            <p className="text-xs">Bientôt disponible</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{typeInfo.label}</CardTitle>
            <p className="text-xs text-muted-foreground">{typeInfo.description}</p>
          </div>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-4">
          {renderConfigPanel()}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
