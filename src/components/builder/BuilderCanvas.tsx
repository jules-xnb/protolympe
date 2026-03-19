import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart3,
  Table,
  CreditCard,
  Link2,
  Clock,
  Calendar,
  Puzzle,
  GripVertical,
  X,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ViewConfigWidget } from '@/hooks/useViewConfigs';
import type { WidgetTypeKey } from './widget-palette-utils';

const GRID_COLS = 4;
const GRID_ROWS = 6;
const CELL_SIZE = 120;

const WIDGET_ICONS: Record<WidgetTypeKey, React.ElementType> = {
  stats_card: CreditCard,
  chart: BarChart3,
  table: Table,
  quick_links: Link2,
  recent_items: Clock,
  calendar: Calendar,
  custom: Puzzle,
};

const WIDGET_LABELS: Record<WidgetTypeKey, string> = {
  stats_card: 'Carte statistique',
  chart: 'Graphique',
  table: 'Tableau',
  quick_links: 'Liens rapides',
  recent_items: 'Éléments récents',
  calendar: 'Calendrier',
  custom: 'Widget personnalisé',
};

interface CanvasWidgetProps {
  widget: ViewConfigWidget;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function CanvasWidget({ widget, isSelected, onSelect, onDelete }: CanvasWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    data: {
      type: 'canvas-widget',
      widget,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${widget.width}`,
    gridRow: `span ${widget.height}`,
  };

  const Icon = WIDGET_ICONS[widget.widget_type as WidgetTypeKey] || Puzzle;
  const label = widget.title || WIDGET_LABELS[widget.widget_type as WidgetTypeKey] || 'Widget';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'opacity-50 z-50'
      )}
      onClick={onSelect}
    >
      <Card
        className={cn(
          'h-full cursor-pointer transition-all',
          isSelected
            ? 'ring-2 ring-primary border-primary'
            : 'hover:border-primary/50'
        )}
      >
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2 min-w-0">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-accent rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-sm font-medium truncate">{label}</CardTitle>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 flex items-center justify-center">
          <div className="rounded-lg bg-muted/50 p-4 w-full flex flex-col items-center gap-2">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {widget.width}x{widget.height}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface BuilderCanvasProps {
  widgets: ViewConfigWidget[];
  selectedWidgetId: string | null;
  onSelectWidget: (id: string | null) => void;
  onDeleteWidget: (id: string) => void;
}

export function BuilderCanvas({
  widgets,
  selectedWidgetId,
  onSelectWidget,
  onDeleteWidget,
}: BuilderCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Canvas</CardTitle>
          <span className="text-xs text-muted-foreground">
            {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto">
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-full rounded-lg border-2 border-dashed p-4 transition-colors',
            isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          )}
          style={{
            minHeight: GRID_ROWS * CELL_SIZE,
          }}
          onClick={() => onSelectWidget(null)}
        >
          {widgets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Puzzle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm font-medium">Glissez des widgets ici</p>
              <p className="text-xs">Construisez votre dashboard</p>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
              }}
            >
              {widgets.map((widget) => (
                <CanvasWidget
                  key={widget.id}
                  widget={widget}
                  isSelected={selectedWidgetId === widget.id}
                  onSelect={() => onSelectWidget(widget.id)}
                  onDelete={() => onDeleteWidget(widget.id)}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
