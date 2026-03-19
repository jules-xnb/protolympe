import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, LayoutGrid } from 'lucide-react';

interface GenericNodeData {
  label: string;
  description?: string;
  widgets?: Array<{ id: string; type: string; title?: string }>;
}

export const GenericNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as GenericNodeData;
  const widgetCount = nodeData.widgets?.length || 0;

  return (
    <Card 
      className={`min-w-[200px] max-w-[280px] transition-all ${
        selected 
          ? 'ring-2 ring-primary shadow-lg' 
          : 'shadow-md hover:shadow-lg'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
      
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <span className="font-medium text-sm truncate flex-1">
          {nodeData.label || 'Nouveau nœud'}
        </span>
      </div>

      <CardContent className="p-3">
        {nodeData.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {nodeData.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>
            {widgetCount === 0 
              ? 'Aucun widget' 
              : `${widgetCount} widget${widgetCount > 1 ? 's' : ''}`
            }
          </span>
        </div>
      </CardContent>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </Card>
  );
});

GenericNode.displayName = 'GenericNode';
