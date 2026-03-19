import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Users, ChevronDown, AlertCircle, X, Eye } from 'lucide-react';
import { RoleSelectorWithCategories } from '../RoleSelectorWithCategories';
import type { ValidationStep } from '../types';
import type { InheritedRole } from '../block-config/BlockConfigPanel';

export interface WorkflowNodePanelProps {
  selectedStep: ValidationStep | null;
  isRespondentSelected: boolean;
  isValidatedSelected: boolean;
  startNodeName?: string;
  endNodeName?: string;
  selectedEdgeId: string | null;
  inheritedRoles: InheritedRole[];
  responderRoles: string[];
  respondentViewerRoles: string[];
  validatedViewerRoles: string[];
  onResponderRolesChange?: (roles: string[]) => void;
  onRespondentViewerRolesChange?: (roles: string[]) => void;
  onValidatedViewerRolesChange?: (roles: string[]) => void;
  onStartNodeNameChange?: (name: string) => void;
  onEndNodeNameChange?: (name: string) => void;
  onUpdateStep: (updates: Partial<ValidationStep>) => void;
  onDeleteStep: () => void;
  onClose: () => void;
}

export function WorkflowNodePanel({
  selectedStep,
  isRespondentSelected,
  isValidatedSelected,
  startNodeName = 'Répondant',
  endNodeName = 'Validé',
  selectedEdgeId,
  inheritedRoles,
  responderRoles,
  respondentViewerRoles,
  validatedViewerRoles,
  onResponderRolesChange,
  onRespondentViewerRolesChange,
  onValidatedViewerRolesChange,
  onStartNodeNameChange,
  onEndNodeNameChange,
  onUpdateStep,
  onDeleteStep,
  onClose,
}: WorkflowNodePanelProps) {
  const [rolesPopoverOpen, setRolesPopoverOpen] = useState(false);
  const [viewerRolesPopoverOpen, setViewerRolesPopoverOpen] = useState(false);

  const selectedRoleNames = selectedStep
    ? inheritedRoles.filter(r => selectedStep.validator_roles?.includes(r.id)).map(r => r.name)
    : isRespondentSelected
      ? inheritedRoles.filter(r => responderRoles.includes(r.id)).map(r => r.name)
      : [];

  const currentRoleIds = selectedStep
    ? selectedStep.validator_roles || []
    : isRespondentSelected
      ? responderRoles
      : [];

  const handleRolesChange = (roleIds: string[]) => {
    if (selectedStep) {
      onUpdateStep({ validator_roles: roleIds });
    } else if (isRespondentSelected && onResponderRolesChange) {
      onResponderRolesChange(roleIds);
    }
  };

  // Viewer roles (for all node types)
  const currentViewerRoleIds = selectedStep
    ? selectedStep.viewer_roles || []
    : isRespondentSelected
      ? respondentViewerRoles
      : isValidatedSelected
        ? validatedViewerRoles
        : [];
  const selectedViewerRoleNames = inheritedRoles
    .filter(r => currentViewerRoleIds.includes(r.id))
    .map(r => r.name);

  const handleViewerRolesChange = (roleIds: string[]) => {
    if (selectedStep) {
      onUpdateStep({ viewer_roles: roleIds });
    } else if (isRespondentSelected && onRespondentViewerRolesChange) {
      onRespondentViewerRolesChange(roleIds);
    } else if (isValidatedSelected && onValidatedViewerRolesChange) {
      onValidatedViewerRolesChange(roleIds);
    }
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col shrink-0 z-30 relative">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {isRespondentSelected ? startNodeName : isValidatedSelected ? endNodeName : selectedEdgeId && !selectedStep ? 'Lien' : 'Configuration'}
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4 py-4">
        <div className="space-y-5">
          {selectedStep && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nom de l'étape</Label>
              <Input
                value={selectedStep.name}
                onChange={(e) => onUpdateStep({ name: e.target.value })}
                placeholder="Nom de l'étape"
              />
            </div>
          )}

          {isRespondentSelected && onStartNodeNameChange && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nom de l'étape</Label>
              <Input
                value={startNodeName}
                onChange={(e) => onStartNodeNameChange(e.target.value)}
                placeholder="Répondant"
              />
            </div>
          )}

          {isValidatedSelected && onEndNodeNameChange && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nom de l'étape</Label>
              <Input
                value={endNodeName}
                onChange={(e) => onEndNodeNameChange(e.target.value)}
                placeholder="Validé"
              />
            </div>
          )}

          {/* Main roles (respondent + validation steps only, not validated) */}
          {!isValidatedSelected && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {isRespondentSelected ? 'Rôles répondants' : 'Rôles validateurs'}
              </Label>
              <Popover open={rolesPopoverOpen} onOpenChange={setRolesPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between h-auto min-h-9 py-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      {selectedRoleNames.length === 0 ? (
                        <span className="text-muted-foreground">Sélectionner...</span>
                      ) : selectedRoleNames.length <= 2 ? (
                        <span className="truncate text-xs">{selectedRoleNames.join(', ')}</span>
                      ) : (
                        <span className="truncate text-xs">
                          {selectedRoleNames.slice(0, 1).join(', ')} +{selectedRoleNames.length - 1}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Chip variant="default" className="text-xs">
                        {currentRoleIds.length}
                      </Chip>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0"
                  align="start"
                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <RoleSelectorWithCategories
                    roles={inheritedRoles}
                    selectedRoles={currentRoleIds}
                    onSelectionChange={handleRolesChange}
                    maxHeight="h-80"
                    noBorder
                  />
                </PopoverContent>
              </Popover>
              {currentRoleIds.length === 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Aucun rôle sélectionné
                </p>
              )}
              {isRespondentSelected && (
                <p className="text-xs text-muted-foreground mt-1">
                  Les utilisateurs avec ces rôles pourront répondre aux questionnaires
                </p>
              )}
            </div>
          )}

          {/* Viewer roles (all node types) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Rôles lecteurs
            </Label>
            <Popover open={viewerRolesPopoverOpen} onOpenChange={setViewerRolesPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between h-auto min-h-9 py-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                    {selectedViewerRoleNames.length === 0 ? (
                      <span className="text-muted-foreground">Aucun</span>
                    ) : selectedViewerRoleNames.length <= 2 ? (
                      <span className="truncate text-xs">{selectedViewerRoleNames.join(', ')}</span>
                    ) : (
                      <span className="truncate text-xs">
                        {selectedViewerRoleNames.slice(0, 1).join(', ')} +{selectedViewerRoleNames.length - 1}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Chip variant="default" className="text-xs">
                      {currentViewerRoleIds.length}
                    </Chip>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0"
                align="start"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
                onWheel={(e) => e.stopPropagation()}
              >
                <RoleSelectorWithCategories
                  roles={inheritedRoles}
                  selectedRoles={currentViewerRoleIds}
                  onSelectionChange={handleViewerRolesChange}
                  maxHeight="h-80"
                  noBorder
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              {isValidatedSelected
                ? 'Ces rôles pourront consulter les objets validés'
                : 'Ces rôles pourront voir les objets à cette étape sans pouvoir agir'}
            </p>
          </div>

          {selectedStep && (
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDeleteStep(); }}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Supprimer cette étape
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
