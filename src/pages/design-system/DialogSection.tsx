import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DialogSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Dialog & Alert Dialog
      </h2>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Dialog</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Ouvrir Dialog</Button>
          </DialogTrigger>
          <DialogContent className="w-[var(--modal-width)]">
            <DialogHeader>
              <DialogTitle>Modifier le profil</DialogTitle>
              <DialogDescription>
                Modifiez les informations de votre profil ici. Cliquez sur enregistrer quand vous avez terminé.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input id="name" defaultValue="Jean Dupont" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" defaultValue="jean@exemple.com" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Alert Dialog</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Supprimer</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Les données seront définitivement supprimées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction>Confirmer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
