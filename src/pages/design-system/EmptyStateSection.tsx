import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Users, FileText, Search, Plus } from "lucide-react";

export default function EmptyStateSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        EmptyState
      </h2>
      <p className="text-sm text-muted-foreground">
        Affiché quand une liste ou une vue ne contient aucun élément. Utilise la variante{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">variant="empty"</code> de{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">Alert</code>.
      </p>

      <div className="grid grid-cols-1 gap-4">

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Avec icône + description + action</p>
          <EmptyState
            icon={Users}
            title="Aucun utilisateur trouvé"
            description="Invitez des membres pour commencer à collaborer sur cette plateforme."
            action={
              <Button size="sm">
                Inviter un utilisateur <Plus className="h-4 w-4" />
              </Button>
            }
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Avec icône + description, sans action</p>
          <EmptyState
            icon={FileText}
            title="Aucun document disponible"
            description="Les documents créés apparaîtront ici."
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Résultat de recherche vide</p>
          <EmptyState
            icon={Search}
            title="Aucun résultat"
            description='Aucun élément ne correspond à votre recherche "acme".'
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Sans icône (minimal)</p>
          <EmptyState title="Aucun élément" />
        </div>

      </div>
    </section>
  );
}
