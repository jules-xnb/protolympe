import { type Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, LayoutGrid, ExternalLink } from 'lucide-react';

interface NodeData {
  label: string;
  description?: string;
  widgets?: Array<{ id: string; type: string; title?: string }>;
}

interface NodeConfigPanelProps {
  node: Node;
  onChange: (data: Record<string, unknown>) => void;
  onClose: () => void;
  onOpenBuilder: () => void;
}

export function NodeConfigPanel({ node, onChange, onClose, onOpenBuilder }: NodeConfigPanelProps) {
  const nodeData = node.data as NodeData;
  const widgetCount = nodeData.widgets?.length || 0;

  const handleLabelChange = (value: string) => {
    onChange({ label: value });
  };

  const handleDescriptionChange = (value: string) => {
    onChange({ description: value });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <span className="font-medium">Configuration du nœud</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <div>
              <FloatingInput
                label="Libellé"
                value={nodeData.label || ''}
                onChange={(e) => handleLabelChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={nodeData.description || ''}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Description de ce nœud..."
                rows={2}
              />
            </div>
          </div>

          {/* Builder button */}
          <div className="space-y-3">
            <Label>Affichage</Label>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={onOpenBuilder}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Ouvrir le builder
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {widgetCount === 0 
                    ? 'Aucun widget' 
                    : `${widgetCount} widget${widgetCount > 1 ? 's' : ''}`
                  }
                </span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </Button>
            <p className="text-xs text-muted-foreground">
              Configurez les widgets qui composent l'affichage de ce nœud.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
