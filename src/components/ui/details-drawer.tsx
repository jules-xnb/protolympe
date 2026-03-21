import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

/* ------------------------------------------------------------------ */
/*  DetailsDrawer — panneau latéral pour afficher les détails          */
/* ------------------------------------------------------------------ */

interface DetailsDrawerProps {
  /** Contrôle l'ouverture du drawer */
  open: boolean;
  /** Callback quand l'état d'ouverture change */
  onOpenChange: (open: boolean) => void;
  /** Titre affiché dans le header */
  title?: string;
  /** Description optionnelle sous le titre */
  description?: string;
  /** Contenu principal */
  children: React.ReactNode;
  /** Pied de page optionnel (boutons d'action) */
  footer?: React.ReactNode;
  /** Afficher un loader au lieu du contenu */
  isLoading?: boolean;
  /** Côté d'apparition — défaut: "right" */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Classes CSS sur le SheetContent */
  className?: string;
}

export function DetailsDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  isLoading = false,
  side = 'right',
  className,
}: DetailsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={className}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {title && (
              <SheetHeader>
                <SheetTitle>{title}</SheetTitle>
                {description && <SheetDescription>{description}</SheetDescription>}
              </SheetHeader>
            )}
            {children}
            {footer && (
              <div className="shrink-0 border-t pt-4 mt-auto">
                {footer}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
