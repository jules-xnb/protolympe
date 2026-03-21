import { useState } from "react";
import { DetailsDrawer } from "@/components/ui/details-drawer";
import { Button } from "@/components/ui/button";

export default function DetailsDrawerSection() {
  const [openDefault, setOpenDefault] = useState(false);
  const [openFooter, setOpenFooter] = useState(false);
  const [openLoading, setOpenLoading] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Details Drawer
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Par défaut (droite)</h3>
      <div className="flex gap-4 items-start">
        <Button variant="outline" onClick={() => setOpenDefault(true)}>
          Ouvrir Drawer
        </Button>
        <DetailsDrawer
          open={openDefault}
          onOpenChange={setOpenDefault}
          title="Détail du client"
          description="Informations principales du client sélectionné."
        >
          <div className="p-4 space-y-2">
            <p className="text-sm">Nom : Acme Corporation</p>
            <p className="text-sm">Statut : Actif</p>
            <p className="text-sm">Modules : 3 actifs</p>
          </div>
        </DetailsDrawer>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec footer</h3>
      <div className="flex gap-4 items-start">
        <Button variant="outline" onClick={() => setOpenFooter(true)}>
          Drawer avec footer
        </Button>
        <DetailsDrawer
          open={openFooter}
          onOpenChange={setOpenFooter}
          title="Modifier le client"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenFooter(false)}>Annuler</Button>
              <Button onClick={() => setOpenFooter(false)}>Enregistrer</Button>
            </div>
          }
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Formulaire de modification ici...</p>
          </div>
        </DetailsDrawer>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">État de chargement</h3>
      <div className="flex gap-4 items-start">
        <Button variant="outline" onClick={() => setOpenLoading(true)}>
          Drawer loading
        </Button>
        <DetailsDrawer
          open={openLoading}
          onOpenChange={setOpenLoading}
          title="Chargement..."
          isLoading
        >
          <div />
        </DetailsDrawer>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Côté gauche</h3>
      <div className="flex gap-4 items-start">
        <Button variant="outline" onClick={() => setOpenLeft(true)}>
          Drawer gauche
        </Button>
        <DetailsDrawer
          open={openLeft}
          onOpenChange={setOpenLeft}
          title="Navigation"
          side="left"
        >
          <div className="p-4">
            <p className="text-sm">Contenu du drawer ouvert à gauche.</p>
          </div>
        </DetailsDrawer>
      </div>
    </section>
  );
}
