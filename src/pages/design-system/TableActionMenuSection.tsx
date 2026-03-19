import { useState } from "react";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { Pencil, Trash2, Eye, Archive, Copy } from "lucide-react";
import { toast } from "sonner";

export default function TableActionMenuSection() {
  const [archived, setArchived] = useState(false);

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        TableActionMenu
      </h2>
      <p className="text-sm text-muted-foreground">
        Menu d'actions contextuel pour les lignes de tableau. Accepte un tableau{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">items[]</code> avec{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">hidden</code> et{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">destructive</code>.
        Gère <code className="text-xs bg-muted px-1 py-0.5 rounded">stopPropagation</code> automatiquement.
      </p>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_200px_auto] bg-muted px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">Nom</span>
          <span className="text-xs font-medium text-muted-foreground">Statut</span>
          <span className="text-xs font-medium text-muted-foreground w-8" />
        </div>

        {/* Ligne avec toutes les actions visibles */}
        <div className="grid grid-cols-[1fr_200px_auto] items-center border-t border-border px-4 py-3 bg-card hover:bg-accent/30 transition-colors">
          <span className="text-sm text-foreground">Acme Corporation</span>
          <span className="text-sm text-muted-foreground">Actif</span>
          <TableActionMenu
            items={[
              { label: "Voir", icon: Eye, onClick: () => toast.info("Voir") },
              { label: "Modifier", icon: Pencil, onClick: () => toast.info("Modifier") },
              { label: "Dupliquer", icon: Copy, onClick: () => toast.info("Dupliquer") },
              { label: "Supprimer", icon: Trash2, onClick: () => toast.error("Supprimer"), destructive: true },
            ]}
          />
        </div>

        {/* Ligne avec action conditionnelle (hidden) */}
        <div className="grid grid-cols-[1fr_200px_auto] items-center border-t border-border px-4 py-3 bg-card hover:bg-accent/30 transition-colors">
          <span className="text-sm text-foreground">Beta Industries</span>
          <span className="text-sm text-muted-foreground">{archived ? "Archivé" : "Actif"}</span>
          <TableActionMenu
            items={[
              { label: "Modifier", icon: Pencil, onClick: () => toast.info("Modifier"), hidden: archived },
              {
                label: archived ? "Désarchiver" : "Archiver",
                icon: Archive,
                onClick: () => { setArchived(a => !a); toast.info(archived ? "Désarchivé" : "Archivé"); },
              },
              { label: "Supprimer", icon: Trash2, onClick: () => toast.error("Supprimer"), destructive: true },
            ]}
          />
        </div>

        {/* Ligne avec action désactivée */}
        <div className="grid grid-cols-[1fr_200px_auto] items-center border-t border-border px-4 py-3 bg-card hover:bg-accent/30 transition-colors">
          <span className="text-sm text-foreground">Gamma Solutions</span>
          <span className="text-sm text-muted-foreground">En cours</span>
          <TableActionMenu
            items={[
              { label: "Modifier", icon: Pencil, onClick: () => toast.info("Modifier") },
              { label: "Supprimer", icon: Trash2, onClick: () => toast.error("Supprimer"), destructive: true, disabled: true },
            ]}
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted rounded-lg p-4">
        <p className="font-medium text-foreground">Props</p>
        <p><code className="bg-background px-1 rounded">items: TableActionItem[]</code> — liste des actions</p>
        <p><code className="bg-background px-1 rounded">align?: 'start' | 'end'</code> — alignement du dropdown (défaut: 'end')</p>
        <p><code className="bg-background px-1 rounded">triggerClassName?: string</code> — classe du bouton trigger</p>
        <p className="mt-2 font-medium text-foreground">TableActionItem</p>
        <p><code className="bg-background px-1 rounded">label, icon, onClick</code> — requis</p>
        <p><code className="bg-background px-1 rounded">destructive?</code> — rouge, pour les actions irréversibles</p>
        <p><code className="bg-background px-1 rounded">disabled?</code> — désactive l'item</p>
        <p><code className="bg-background px-1 rounded">hidden?</code> — masque l'item (sans le désactiver)</p>
      </div>
    </section>
  );
}
