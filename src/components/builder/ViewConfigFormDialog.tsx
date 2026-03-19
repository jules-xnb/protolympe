import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { generateUniqueSlug, generateBaseSlug } from '@/lib/slug-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FloatingInput } from '@/components/ui/floating-input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, FolderOpen, ChevronRight } from 'lucide-react';
import * as icons from 'lucide-react';

const ICON_OPTIONS = [
  'home', 'file-text', 'folder', 'settings', 'users', 'bar-chart-2',
  'calendar', 'square-check', 'clipboard', 'database', 'globe',
  'layers', 'list', 'map', 'package', 'shield', 'tag', 'wrench',
  'trending-up', 'zap', 'triangle-alert', 'archive', 'book',
];
import { useCreateViewConfig, useUpdateViewConfig, type ViewConfig } from '@/hooks/useViewConfigs';
import { useNavigationConfigs, useCreateNavigationConfig, useUpdateNavigationConfig, buildNavigationConfigTree } from '@/hooks/useNavigationConfigs';
import { useViewMode } from '@/contexts/ViewModeContext';

interface ViewConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewConfig?: ViewConfig | null;
  defaultParentId?: string | null;
}

export function ViewConfigFormDialog({
  open,
  onOpenChange,
  viewConfig,
  defaultParentId,
}: ViewConfigFormDialogProps) {
  const { selectedClient } = useViewMode();
  const createMutation = useCreateViewConfig();
  const updateMutation = useUpdateViewConfig();
  const createNavMutation = useCreateNavigationConfig();
  const updateNavMutation = useUpdateNavigationConfig();
  const { data: navConfigs = [] } = useNavigationConfigs();

  const [name, setName] = useState('');
  const [displayLabel, setDisplayLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState<string>('');
  const [icon, setIcon] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const isEditing = !!viewConfig;

  // Get only modules (items without view_config_id) for parent selection
  const modules = useMemo(() => navConfigs.filter(n => !n.view_config_id), [navConfigs]);
  
  // Find which nav config this view is linked to
  const currentNavConfig = useMemo(() => {
    if (!viewConfig) return null;
    return navConfigs.find(n => n.view_config_id === viewConfig.id) || null;
  }, [viewConfig, navConfigs]);

  const currentModuleId = currentNavConfig?.parent_id || '';

  useEffect(() => {
    if (open) {
      if (viewConfig) {
        setName(viewConfig.name);
        setDisplayLabel(currentNavConfig?.display_label || '');
        setSlug(viewConfig.slug);
        setDescription(viewConfig.description || '');
        setModuleId(currentModuleId);
        setIcon(currentNavConfig?.icon || null);
        setIsActive(viewConfig.is_active);
      } else {
        setName('');
        setDisplayLabel('');
        setSlug('');
        setDescription('');
        setModuleId(defaultParentId || '');
        setIcon(null);
        setIsActive(false);
      }
    }
  }, [open, viewConfig, currentModuleId, currentNavConfig?.display_label, currentNavConfig?.icon, defaultParentId]);

  // Auto-generate slug from name (display only, actual slug will include unique suffix)
  useEffect(() => {
    if (!isEditing && name) {
      const generated = generateBaseSlug(name);
      setSlug(generated);
    }
  }, [name, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id) return;
    if (!displayLabel.trim()) {
      toast.error('Le nom d\'affichage est requis');
      return;
    }

    // Generate a unique slug for new views to avoid conflicts
    const uniqueSlug = isEditing ? slug : generateUniqueSlug(name);

    const data = {
      name,
      slug: uniqueSlug,
      description: description || undefined,
      type: 'dashboard' as const, // Default type, will be removed later
      is_active: true, // Always active — visibility controlled by navigation_configs.is_active
    };

    try {
      if (isEditing && viewConfig) {
        await updateMutation.mutateAsync({ id: viewConfig.id, ...data });
        // Also update nav config (icon + active state)
        if (currentNavConfig) {
          await updateNavMutation.mutateAsync({ id: currentNavConfig.id, icon: icon || null, is_active: isActive });
        }
      } else {
        const createdView = await createMutation.mutateAsync({ ...data, client_id: selectedClient.id });
        
        // Create navigation config entry linking view to module
        await createNavMutation.mutateAsync({
          client_id: selectedClient.id,
          label: name,
          display_label: displayLabel || null,
          slug: uniqueSlug,
          icon: icon || null,
          parent_id: moduleId || null,
          view_config_id: createdView.id,
          is_active: isActive,
          display_order: navConfigs.length,
        });
      }
      
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || createNavMutation.isPending;

  // Build flat list with indentation for display
  const getModuleOptions = () => {
    const tree = buildNavigationConfigTree(modules);
    const options: Array<{ id: string; label: string; depth: number }> = [];
    
    const flatten = (items: typeof tree, depth = 0) => {
      items.forEach(item => {
        options.push({ id: item.id, label: item.label, depth });
        if (item.children) {
          flatten(item.children, depth + 1);
        }
      });
    };
    
    flatten(tree);
    return options;
  };

  const moduleOptions = getModuleOptions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la vue' : 'Nouvelle vue'}
          </DialogTitle>
          <DialogDescription>
            Une vue est une page configurable de l'application
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <FloatingInput
              label="Nom interne *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Visible uniquement par les intégrateurs
            </p>
          </div>

          <div className="space-y-1">
            <FloatingInput
              label="Nom d'affichage *"
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Affiché aux utilisateurs finaux
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icône</Label>
            <Select
              value={icon || '__none__'}
              onValueChange={(v) => setIcon(v === '__none__' ? null : v)}
            >
              <SelectTrigger id="icon">
                <SelectValue placeholder="Aucune icône" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucune</SelectItem>
                {ICON_OPTIONS.map((ic) => {
                  const iconName = ic.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                  const LucideIcon = icons[iconName as keyof typeof icons] as React.ElementType | undefined;
                  return (
                    <SelectItem key={ic} value={ic}>
                      <span className="flex items-center gap-2">
                        {LucideIcon && <LucideIcon className="h-4 w-4" />}
                        {ic}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="liste-incidents"
                className="bg-muted"
                readOnly
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="module">Groupe</Label>
            <Select
              value={moduleId || '__none__'}
              onValueChange={(v) => setModuleId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger id="module">
                <SelectValue placeholder="Aucun (racine)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucun (racine)</SelectItem>
                {moduleOptions.map((mod) => (
                  <SelectItem key={mod.id} value={mod.id} className="py-2">
                    <div className="flex items-center gap-1">
                      {mod.depth > 0 && (
                        <span className="text-muted-foreground flex items-center">
                          {Array.from({ length: mod.depth }).map((_, i) => (
                            <span key={i} className="w-4 border-l border-muted-foreground/30 h-4 ml-1" />
                          ))}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </span>
                      )}
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{mod.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Le groupe dans lequel cette vue sera affichée (optionnel)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-active">Actif</Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEditing ? 'Enregistrer' : 'Créer'}
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
