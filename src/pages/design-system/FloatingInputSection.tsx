import { useState } from "react";
import { FloatingInput } from "@/components/ui/floating-input";

export default function FloatingInputSection() {
  const [controlled, setControlled] = useState("");

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Floating Input
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Par défaut (vide)</h3>
      <div className="max-w-xs">
        <FloatingInput label="Nom du client" />
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec valeur par défaut</h3>
      <div className="max-w-xs">
        <FloatingInput label="Email" defaultValue="contact@acme.com" />
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Contrôlé</h3>
      <div className="max-w-xs">
        <FloatingInput
          label="Rechercher"
          value={controlled}
          onChange={(e) => setControlled(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">Valeur : "{controlled}"</p>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">État erreur</h3>
      <div className="max-w-xs">
        <FloatingInput label="Champ requis" error defaultValue="valeur invalide" />
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Désactivé</h3>
      <div className="max-w-xs">
        <FloatingInput label="Non modifiable" disabled defaultValue="Lecture seule" />
      </div>
    </section>
  );
}
