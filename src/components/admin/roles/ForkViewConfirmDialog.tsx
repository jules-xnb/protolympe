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

interface ForkViewConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  roleName: string;
  viewName: string;
  sharedRoleCount: number;
  isPending: boolean;
}

export function ForkViewConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  roleName,
  viewName,
  sharedRoleCount,
  isPending,
}: ForkViewConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Personnaliser la vue pour ce rôle</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                La vue <strong>{viewName}</strong> est actuellement partagée avec{' '}
                <strong>{sharedRoleCount - 1} autre(s) rôle(s)</strong>.
              </p>
              <p>
                Une copie de la vue sera créée avec les mêmes options, dédiée au rôle{' '}
                <strong>{roleName}</strong>. Les autres rôles ne seront pas impactés.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Création...' : 'Personnaliser'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
