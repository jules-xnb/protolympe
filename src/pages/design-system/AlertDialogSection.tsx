import { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function AlertDialogSection() {
  const [openDefault, setOpenDefault] = useState(false);
  const [openDestructive, setOpenDestructive] = useState(false);

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Alert Dialog
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Confirmation standard</h3>
      <div className="flex gap-4 items-start">
        <AlertDialog open={openDefault} onOpenChange={setOpenDefault}>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Ouvrir Alert Dialog</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Voulez-vous vraiment continuer ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction>Confirmer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Action destructive</h3>
      <div className="flex gap-4 items-start">
        <AlertDialog open={openDestructive} onOpenChange={setOpenDestructive}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Supprimer</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cet élément sera définitivement supprimé. Cette action ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
