import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function CheckboxSection() {
  const [defaultChecked, setDefaultChecked] = useState(false);
  const [checked, setChecked] = useState(true);

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Checkbox
      </h2>
      <div className="flex items-start gap-8 flex-wrap">
        <div className="flex items-center space-x-2">
          <Checkbox id="cb-default" checked={defaultChecked} onCheckedChange={(v) => setDefaultChecked(!!v)} />
          <Label htmlFor="cb-default">Default</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="cb-checked" checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
          <Label htmlFor="cb-checked">Coché</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="cb-disabled" disabled />
          <Label htmlFor="cb-disabled" className="opacity-50">Désactivé</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="cb-disabled-checked" disabled defaultChecked />
          <Label htmlFor="cb-disabled-checked" className="opacity-50">Désactivé coché</Label>
        </div>
      </div>
    </section>
  );
}
