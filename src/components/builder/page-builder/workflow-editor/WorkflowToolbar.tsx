import { Button } from '@/components/ui/button';
import { Plus, Trash2, X } from 'lucide-react';

// --- Connection Type Dialog ---

interface ConnectionTypeDialogProps {
  position: { x: number; y: number };
  onSelect: (type: 'approve' | 'reject') => void;
  onCancel: () => void;
}

function ConnectionTypeDialog({ position, onSelect, onCancel }: ConnectionTypeDialogProps) {
  return (
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-2 flex gap-2"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
    >
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => onSelect('approve')}
      >
        ✓ Validation
      </Button>
      <Button
        size="sm"
        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        onClick={() => onSelect('reject')}
      >
        ✗ Rejet
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Canvas Overlay Controls ---

export interface CanvasOverlayProps {
  selectedEdgeId: string | null;
  onDeleteEdge: () => void;
  pendingConnection: { position: { x: number; y: number } } | null;
  onConnectionTypeSelect: (type: 'approve' | 'reject') => void;
  onConnectionCancel: () => void;
}

export function CanvasOverlay({
  selectedEdgeId,
  onDeleteEdge,
  pendingConnection,
  onConnectionTypeSelect,
  onConnectionCancel,
}: CanvasOverlayProps) {
  return (
    <>
      {selectedEdgeId && (
        <div className="absolute top-3 right-3 z-10">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteEdge}
            className="shadow-md"
          >
            Supprimer le lien
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {pendingConnection && (
        <ConnectionTypeDialog
          position={pendingConnection.position}
          onSelect={onConnectionTypeSelect}
          onCancel={onConnectionCancel}
        />
      )}
    </>
  );
}

// --- Bottom Toolbar ---

export interface WorkflowToolbarProps {
  onAddStep: () => void;
}

export function WorkflowToolbar({ onAddStep }: WorkflowToolbarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end py-1.5 px-2 border-t bg-background z-10">
      <Button onClick={onAddStep} size="sm" variant="outline" className="h-7 text-xs">
        Étape
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
