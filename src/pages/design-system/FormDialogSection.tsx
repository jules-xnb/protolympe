import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

export default function FormDialogSection() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openSimple, setOpenSimple] = useState(false);

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        FormDialog
      </h2>
      <p className="text-sm text-muted-foreground">
        Pattern standard pour les formulaires en modale. Structure : header (titre + description optionnelle),
        corps avec <code className="text-xs bg-muted px-1 py-0.5 rounded">space-y-4 py-4</code>,
        footer avec actions. Largeur définie par{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">--modal-width</code> ou{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">--modal-width-lg</code>.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setOpenCreate(true)}>
          Créer (standard) <Plus className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setOpenEdit(true)}>
          Modifier (avec description) <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="secondary" onClick={() => setOpenSimple(true)}>
          Simple (1 champ)
        </Button>
      </div>

      {/* Dialog Créer — standard */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent style={{ width: "var(--modal-width)" }}>
          <DialogHeader>
            <DialogTitle>Créer un client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="d-name">Nom du client</Label>
              <Input id="d-name" placeholder="Ex : Acme Corporation" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-slug">Identifiant (slug)</Label>
              <Input id="d-slug" placeholder="ex: acme-corp" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-type">Type</Label>
              <Select>
                <SelectTrigger id="d-type">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="pme">PME</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Annuler
            </Button>
            <Button onClick={() => setOpenCreate(false)}>
              Créer <Plus className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier — avec description */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent style={{ width: "var(--modal-width)" }}>
          <DialogHeader>
            <DialogTitle>Modifier le workflow</DialogTitle>
            <DialogDescription>
              Les modifications s'appliqueront à toutes les campagnes liées à ce workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="e-name">Nom</Label>
              <Input id="e-name" defaultValue="Onboarding RH" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-desc">Description</Label>
              <Textarea id="e-desc" defaultValue="Processus d'intégration des nouveaux collaborateurs." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>
              Annuler
            </Button>
            <Button onClick={() => setOpenEdit(false)}>
              Enregistrer <Pencil className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Simple — 1 champ */}
      <Dialog open={openSimple} onOpenChange={setOpenSimple}>
        <DialogContent style={{ width: "var(--modal-width)" }}>
          <DialogHeader>
            <DialogTitle>Renommer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Nouveau nom</Label>
              <Input id="s-name" defaultValue="Mon document" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSimple(false)}>
              Annuler
            </Button>
            <Button onClick={() => setOpenSimple(false)}>
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted rounded-lg p-4">
        <p className="font-medium text-foreground">Structure DialogContent</p>
        <p>1. <code className="bg-background px-1 rounded">DialogHeader</code> → <code className="bg-background px-1 rounded">DialogTitle</code> + <code className="bg-background px-1 rounded">DialogDescription?</code></p>
        <p>2. Corps : <code className="bg-background px-1 rounded">&lt;div className="space-y-4 py-4"&gt;</code></p>
        <p>3. <code className="bg-background px-1 rounded">DialogFooter</code> → Annuler (outline) + Action principale</p>
        <p className="mt-2">Largeurs : <code className="bg-background px-1 rounded">style={`{{ width: "var(--modal-width)" }}`}</code> (max 600px) ou <code className="bg-background px-1 rounded">--modal-width-lg</code> (max 900px)</p>
      </div>
    </section>
  );
}
