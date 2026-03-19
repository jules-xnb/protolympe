import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function TextareaSection() {
  const [defaultValue, setDefaultValue] = useState("");
  const [filledValue, setFilledValue] = useState("Contenu pré-rempli dans le textarea.");

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Textarea
      </h2>
      <div className="flex items-start gap-8 flex-wrap">
        <div className="w-[300px] space-y-2">
          <Label>Default</Label>
          <Textarea placeholder="Saisissez du texte..." value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} />
        </div>
        <div className="w-[300px] space-y-2">
          <Label>Avec valeur</Label>
          <Textarea value={filledValue} onChange={(e) => setFilledValue(e.target.value)} />
        </div>
        <div className="w-[300px] space-y-2">
          <Label className="opacity-50">Désactivé</Label>
          <Textarea disabled placeholder="Non modifiable" />
        </div>
      </div>
    </section>
  );
}
