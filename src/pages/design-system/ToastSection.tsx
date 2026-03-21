import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ToastSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Toast (Sonner)
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Types de toast</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => toast("Notification par défaut")}
        >
          Default
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.success("Opération réussie")}
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error("Une erreur est survenue")}
        >
          Error
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.warning("Attention, vérifiez les données")}
        >
          Warning
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.info("Information importante")}
        >
          Info
        </Button>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec description</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() =>
            toast.success("Client créé", {
              description: "Le client Acme Corp a été ajouté avec succès.",
            })
          }
        >
          Success + description
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.error("Erreur de validation", {
              description: "Le champ email est invalide.",
            })
          }
        >
          Error + description
        </Button>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec action</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() =>
            toast("Élément archivé", {
              action: {
                label: "Annuler",
                onClick: () => toast.info("Archive annulée"),
              },
            })
          }
        >
          Avec bouton d'action
        </Button>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Promise (async)</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() =>
            toast.promise(
              new Promise((resolve) => setTimeout(resolve, 2000)),
              {
                loading: "Sauvegarde en cours...",
                success: "Données sauvegardées",
                error: "Échec de la sauvegarde",
              },
            )
          }
        >
          Toast promise (2s)
        </Button>
      </div>
    </section>
  );
}
