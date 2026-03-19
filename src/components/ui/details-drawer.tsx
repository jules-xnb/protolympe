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
/*  DetailsDrawer — wrapper générique pour les drawers de détails     */
/* ------------------------------------------------------------------ */

interface DetailsDrawerProps {
  /** Contrôle l'ouverture du drawer */
  open: boolean;
  /** Callback quand l'état d'ouverture change */
  onOpenChange: (open: boolean) => void;

  /** Titre affiché dans le SheetHeader (string ou ReactNode) */
  title?: React.ReactNode;
  /** Description optionnelle sous le titre */
  description?: React.ReactNode;

  /** Contenu principal */
  children: React.ReactNode;

  /** Pied de page optionnel (boutons d'action, etc.) */
  footer?: React.ReactNode;

  /** Classes CSS supplémentaires sur le SheetContent */
  contentClassName?: string;

  /** Afficher le bouton de fermeture par défaut (×) — défaut: true */
  showClose?: boolean;

  /** Style inline passé au SheetContent (ex: thème custom) */
  style?: React.CSSProperties;

  /** Afficher un loader au lieu du contenu */
  isLoading?: boolean;

  /** Élément(s) custom pour le loader (défaut: spinner centré) */
  loadingContent?: React.ReactNode;

  /** Côté d'apparition du drawer — défaut: "right" */
  side?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Contenu rendu en dehors du Sheet mais à l'intérieur du fragment
   * (dialogs de confirmation, etc.)
   */
  outerContent?: React.ReactNode;

  /**
   * Si fourni, remplace entièrement le SheetHeader par défaut.
   * Utile quand le header a une structure très custom.
   */
  customHeader?: React.ReactNode;
}

export function DetailsDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  showClose = true,
  style,
  isLoading = false,
  loadingContent,
  side = 'right',
  outerContent,
  customHeader,
}: DetailsDrawerProps) {
  const defaultLoader = (
    <div className="flex-1 flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const hasHeader = customHeader !== undefined || title !== undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          className={contentClassName}
          showClose={showClose}
          style={style}
        >
          {isLoading ? (
            loadingContent ?? defaultLoader
          ) : (
            <>
              {hasHeader && (
                customHeader !== undefined ? customHeader : (
                  <SheetHeader>
                    {title && (
                      typeof title === 'string'
                        ? <SheetTitle>{title}</SheetTitle>
                        : title
                    )}
                    {description && (
                      typeof description === 'string'
                        ? <SheetDescription>{description}</SheetDescription>
                        : description
                    )}
                  </SheetHeader>
                )
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
      {outerContent}
    </>
  );
}
