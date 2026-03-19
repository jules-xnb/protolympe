import { useState, useEffect } from 'react';
import { Table, Building2, Trash2, ClipboardList, FileCheck, Users, UserCog, LayoutPanelTop, LayoutList, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PageBlock, BlockType, DataTableBlock, EoCardBlock, SurveyCreatorBlock, SurveyResponsesBlock, UsersBlock, ProfilesBlock } from '../types';
import { SurveyCreatorConfigPanel } from '../SurveyCreatorConfigPanel';
import { SurveyResponsesConfigPanel } from '../SurveyResponsesConfigPanel';
import { DataTableConfigSection } from './DataTableConfigSection';
import { EoCardConfigSection } from './EoCardConfigSection';
import { UsersBlockConfigSection } from './UsersBlockConfigSection';
import { ProfilesBlockConfigSection } from './ProfilesBlockConfigSection';

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  data_table: Table,
  eo_card: Building2,
  survey_creator: ClipboardList,
  survey_responses: FileCheck,
  users: Users,
  profiles: UserCog,
  section: LayoutPanelTop,
  sub_section: LayoutList,
  separator: Minus,
};

const BLOCK_LABELS: Record<BlockType, string> = {
  data_table: 'Tableau de données',
  eo_card: 'Organisation',
  survey_creator: 'Questionnaires',
  survey_responses: 'Réponses questionnaires',
  users: 'Utilisateurs',
  profiles: 'Profils',
  section: 'Section',
  sub_section: 'Sous-section',
  separator: 'Séparateur',
};

export interface InheritedRole {
  id: string;
  name: string;
  color: string | null;
  category_id: string | null;
}

interface BlockConfigPanelProps {
  block: PageBlock | null;
  boDefinitions: { id: string; name: string }[];
  inheritedRoles?: InheritedRole[];
  clientId?: string | null;
  onUpdate: (block: PageBlock) => void;
  onDelete: () => void;
}

export function BlockConfigPanel({
  block,
  boDefinitions,
  inheritedRoles = [],
  clientId,
  onUpdate,
  onDelete,
}: BlockConfigPanelProps) {
  const [localTitle, setLocalTitle] = useState(block?.title || '');

  useEffect(() => {
    setLocalTitle(block?.title || '');
  }, [block?.id, block?.title]);

  if (!block) {
    return (
      <div className="h-full flex flex-col">
        <div className="pb-3 border-b shrink-0">
          <h3 className="text-base font-semibold">Configuration</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            Sélectionnez un bloc pour le configurer
          </p>
        </div>
      </div>
    );
  }

  const Icon = BLOCK_ICONS[block.type];

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalTitle(value);
    onUpdate({ ...block, title: value || undefined });
  };

  const updateConfig = <T extends PageBlock>(updates: Partial<T['config']>) => {
    onUpdate({
      ...block,
      config: { ...block.config, ...updates },
    } as PageBlock);
  };

  const renderConfigSection = () => {
    switch (block.type) {
      case 'data_table':
        return (
          <DataTableConfigSection
            block={block as DataTableBlock}
            boDefinitions={boDefinitions}
            onUpdate={updateConfig}
          />
        );
      case 'eo_card':
        return (
          <EoCardConfigSection
            block={block as EoCardBlock}
            clientId={clientId}
            onUpdate={updateConfig}
          />
        );
      case 'survey_creator':
        return <SurveyCreatorConfigPanel block={block as SurveyCreatorBlock} onUpdate={updateConfig} inheritedRoles={inheritedRoles} clientId={clientId} />;
      case 'survey_responses':
        return <SurveyResponsesConfigPanel block={block as SurveyResponsesBlock} onUpdate={updateConfig} clientId={clientId} />;
      case 'users':
        return <UsersBlockConfigSection block={block as UsersBlock} clientId={clientId} onUpdate={updateConfig} />;
      case 'profiles':
        return <ProfilesBlockConfigSection block={block as ProfilesBlock} onUpdate={updateConfig} />;
      case 'section':
      case 'sub_section':
        return (
          <p className="text-xs text-muted-foreground">
            Glissez des blocs métiers dans cette {block.type === 'section' ? 'section' : 'sous-section'} pour structurer votre page.
          </p>
        );
      case 'separator':
        return (
          <div className="space-y-2">
            <Label>Style</Label>
            <div className="flex gap-2">
              <Button
                variant={(block.config as { style?: string }).style === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ style: 'line' })}
              >
                Ligne
              </Button>
              <Button
                variant={(block.config as { style?: string }).style === 'space' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateConfig({ style: 'space' })}
              >
                Espace
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="pb-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">{BLOCK_LABELS[block.type]}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-4 pr-3 space-y-4">
            <div className="space-y-2">
              <Label>Titre du bloc</Label>
              <Input
                value={localTitle}
                onChange={handleTitleChange}
                placeholder={BLOCK_LABELS[block.type]}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-active" className="text-sm font-normal">Actif</Label>
              <Switch
                id="is-active"
                checked={block.isActive}
                onCheckedChange={(checked) => onUpdate({ ...block, isActive: checked })}
              />
            </div>

            <Separator />

            {renderConfigSection()}
          </div>
        </ScrollArea>
    </div>
  );
}
