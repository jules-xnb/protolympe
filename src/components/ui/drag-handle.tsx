import * as React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DragHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Props from dnd-kit's useSortable().attributes */
  attributes?: Record<string, unknown>;
  /** Props from dnd-kit's useSortable().listeners */
  listeners?: Record<string, unknown>;
}

const DragHandle = React.forwardRef<HTMLButtonElement, DragHandleProps>(
  ({ className, attributes, listeners, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "cursor-grab touch-none text-muted-foreground hover:text-foreground",
          className,
        )}
        {...attributes}
        {...listeners}
        {...props}
      >
        {children ?? <GripVertical className="h-4 w-4" />}
      </button>
    );
  },
);
DragHandle.displayName = "DragHandle";

export { DragHandle };
