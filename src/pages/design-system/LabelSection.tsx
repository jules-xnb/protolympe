import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function LabelSection() {
  const [value, setValue] = useState("");

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Label
      </h2>
      <div className="flex items-start gap-8 flex-wrap">
        <div className="space-y-2">
          <Label htmlFor="label-default">Label par défaut</Label>
          <Input id="label-default" placeholder="Champ associé" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label-disabled" className="opacity-50">Label désactivé</Label>
          <Input id="label-disabled" disabled placeholder="Champ désactivé" />
        </div>
      </div>
    </section>
  );
}
