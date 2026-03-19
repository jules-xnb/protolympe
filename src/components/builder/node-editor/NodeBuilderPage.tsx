import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Save, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Widget {
  id: string;
  type: string;
  title?: string;
}

const WIDGET_TYPES = [
  { value: 'stats_card', label: 'Carte statistique' },
  { value: 'chart', label: 'Graphique' },
  { value: 'table', label: 'Tableau' },
  { value: 'recent_items', label: 'Éléments récents' },
  { value: 'quick_links', label: 'Raccourcis' },
  { value: 'form', label: 'Formulaire' },
  { value: 'detail', label: 'Détail' },
  { value: 'list', label: 'Liste' },
];

interface NodeBuilderPageProps {
  nodeId: string;
  nodeName: string;
  initialWidgets: Widget[];
  onSave: (widgets: Widget[]) => void;
  onClose: () => void;
}

export function NodeBuilderPage({ nodeId: _nodeId, nodeName, initialWidgets, onSave, onClose }: NodeBuilderPageProps) {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleAddWidget = useCallback(() => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: 'stats_card',
      title: 'Nouveau widget',
    };
    setWidgets((prev) => [...prev, newWidget]);
    setHasUnsavedChanges(true);
  }, []);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    setHasUnsavedChanges(true);
  }, []);

  const handleWidgetTypeChange = useCallback((widgetId: string, type: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, type } : w))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleWidgetTitleChange = useCallback((widgetId: string, title: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, title } : w))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    onSave(widgets);
    setHasUnsavedChanges(false);
  }, [widgets, onSave]);

  const handleCloseRequest = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleCloseRequest}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg">{nodeName}</h1>
              {hasUnsavedChanges && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Non enregistré
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Configuration des widgets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddWidget}>
            Ajouter un widget
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave}>
            Sauvegarder
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto">
            {widgets.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">
                  Aucun widget configuré pour ce nœud.
                </p>
                <Button variant="outline" onClick={handleAddWidget}>
                  Ajouter votre premier widget
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {widgets.map((widget) => (
                  <Card key={widget.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mt-2" />
                        <div className="flex-1 space-y-3">
                          <Input
                            value={widget.title || ''}
                            onChange={(e) => handleWidgetTitleChange(widget.id, e.target.value)}
                            placeholder="Titre du widget"
                            className="font-medium"
                          />
                          <Select
                            value={widget.type}
                            onValueChange={(value) => handleWidgetTypeChange(widget.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Type de widget" />
                            </SelectTrigger>
                            <SelectContent>
                              {WIDGET_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => handleRemoveWidget(widget.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter sans sauvegarder ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quitter sans sauvegarder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
