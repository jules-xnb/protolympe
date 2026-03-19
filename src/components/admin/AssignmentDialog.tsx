import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface AssignmentDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  // Action
  onAssign: (itemId: string) => Promise<void>;
  isAssigning: boolean;
  // UI
  icon?: ReactNode;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  assignLabel?: string;
}

interface AssignmentDialogSelectProps<T> extends AssignmentDialogBaseProps {
  /** Use default Select-based body */
  renderBody?: never;
  // Data
  availableItems: T[];
  isLoading?: boolean;
  // Display
  getItemLabel: (item: T) => string;
  getItemId: (item: T) => string;
  getItemDescription?: (item: T) => string;
  renderSelectItem?: (item: T) => ReactNode;
  // UI
  fieldLabel?: string;
  selectPlaceholder?: string;
  helperText?: string;
  /** Extra content rendered below the select when an item is selected */
  selectedExtra?: (selectedId: string) => ReactNode;
}

interface AssignmentDialogCustomProps extends AssignmentDialogBaseProps {
  /** Provide a fully custom body. Receives selectedId state and setter. */
  renderBody: (props: {
    selectedId: string;
    setSelectedId: (id: string) => void;
  }) => ReactNode;
  // These are still needed for empty/loading checks
  availableItems: { length: number };
  isLoading?: boolean;
  // Not used in custom mode, but typed for union compat
  getItemLabel?: never;
  getItemId?: never;
  getItemDescription?: never;
  renderSelectItem?: never;
  fieldLabel?: never;
  selectPlaceholder?: never;
  helperText?: never;
  selectedExtra?: never;
}

type AssignmentDialogProps<T> = AssignmentDialogSelectProps<T> | AssignmentDialogCustomProps;

export function AssignmentDialog<T>(props: AssignmentDialogProps<T>) {
  const {
    open,
    onOpenChange,
    title,
    description,
    availableItems,
    isLoading = false,
    onAssign,
    isAssigning,
    icon,
    emptyMessage = 'Aucun élément disponible',
    emptyIcon,
    assignLabel = 'Assigner',
  } = props;

  const [selectedId, setSelectedId] = useState<string>('');

  const handleAssign = async () => {
    if (!selectedId) return;
    await onAssign(selectedId);
    setSelectedId('');
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedId('');
    }
    onOpenChange(nextOpen);
  };

  const renderDefaultBody = () => {
    // Only available when renderBody is not provided (Select mode)
    const {
      getItemLabel,
      getItemId,
      getItemDescription,
      renderSelectItem,
      fieldLabel,
      selectPlaceholder = 'Sélectionner...',
      helperText,
      selectedExtra,
    } = props as AssignmentDialogSelectProps<T>;

    const items = availableItems as T[];

    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          {fieldLabel && <Label>{fieldLabel}</Label>}
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder={selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[200px]">
                {items.map((item) => {
                  const id = getItemId(item);
                  return (
                    <SelectItem key={id} value={id}>
                      {renderSelectItem ? (
                        renderSelectItem(item)
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{getItemLabel(item)}</span>
                          {getItemDescription?.(item) && (
                            <span className="text-xs text-muted-foreground">
                              {getItemDescription(item)}
                            </span>
                          )}
                        </div>
                      )}
                    </SelectItem>
                  );
                })}
              </ScrollArea>
            </SelectContent>
          </Select>
          {helperText && (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          )}
          {selectedId && selectedExtra?.(selectedId)}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : availableItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {emptyIcon && (
              <div className="flex justify-center mb-2">{emptyIcon}</div>
            )}
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : props.renderBody ? (
          props.renderBody({ selectedId, setSelectedId })
        ) : (
          renderDefaultBody()
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedId || isAssigning || availableItems.length === 0}
          >
            {assignLabel}
            {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
