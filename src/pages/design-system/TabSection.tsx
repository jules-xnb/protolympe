import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TabSection() {
  const [active1, setActive1] = useState("tab1");

  return (
    <section className="space-y-10">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Tab
      </h2>

      {/* Standard underline tabs */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tabs standard (underline)</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Composant unique utilisé sur l'ensemble de la plateforme : pages admin, drawers, sheets, formulaires, panneaux.
            Bordure inférieure #5342F2 de 3px, texte actif semibold.
          </p>
          <code className="text-[11px] text-muted-foreground/80 font-mono mt-1 block">
            Tabs / TabsList / TabsTrigger — src/components/ui/tabs.tsx
          </code>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Tabs value={active1} onValueChange={setActive1}>
            <TabsList className="justify-start w-full">
              <TabsTrigger value="tab1">Général</TabsTrigger>
              <TabsTrigger value="tab2">
                Permissions
                <span className="ml-2 bg-muted text-muted-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full">3</span>
              </TabsTrigger>
              <TabsTrigger value="tab3">Historique</TabsTrigger>
              <TabsTrigger value="tab4" disabled>Désactivé</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
