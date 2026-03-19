import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WIDGET_DEFINITIONS, type WidgetDefinition } from './widget-palette-utils';

interface DraggableWidgetProps {
  widget: WidgetDefinition;
}

function DraggableWidget({ widget }: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${widget.type}`,
    data: {
      type: 'palette-widget',
      widgetType: widget.type,
      defaultWidth: widget.defaultWidth,
      defaultHeight: widget.defaultHeight,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = widget.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
        <CardContent className="p-3 flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{widget.label}</p>
            <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function WidgetPalette() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Widgets</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-3 space-y-2">
          {WIDGET_DEFINITIONS.map((widget) => (
            <DraggableWidget key={widget.type} widget={widget} />
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
