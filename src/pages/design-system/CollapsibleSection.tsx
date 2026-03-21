import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection() {
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(true);

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Collapsible
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Fermé par défaut</h3>
      <div className="max-w-md">
        <Collapsible open={open1} onOpenChange={setOpen1}>
          <div className="flex items-center justify-between border border-border rounded-lg px-4 py-2 bg-card">
            <span className="text-sm font-medium">Section repliable</span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${open1 ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="border border-t-0 border-border rounded-b-lg px-4 py-3 bg-card">
              <p className="text-sm text-muted-foreground">
                Contenu masqué par défaut. Cliquez sur le chevron pour afficher/masquer.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Ouvert par défaut</h3>
      <div className="max-w-md">
        <Collapsible open={open2} onOpenChange={setOpen2}>
          <div className="flex items-center justify-between border border-border rounded-lg px-4 py-2 bg-card">
            <span className="text-sm font-medium">Détails techniques</span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${open2 ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="border border-t-0 border-border rounded-b-lg px-4 py-3 bg-card space-y-1">
              <p className="text-sm">Version : 2.1.0</p>
              <p className="text-sm">Dernière mise à jour : 15/03/2026</p>
              <p className="text-sm">Environnement : Production</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Liste de sections</h3>
      <div className="max-w-md space-y-2">
        {["Informations générales", "Permissions", "Historique"].map((title, i) => (
          <Collapsible key={i} defaultOpen={i === 0}>
            <div className="flex items-center justify-between border border-border rounded-lg px-4 py-2 bg-card">
              <span className="text-sm font-medium">{title}</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="border border-t-0 border-border rounded-b-lg px-4 py-3 bg-card">
                <p className="text-sm text-muted-foreground">Contenu de la section "{title}".</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}
