import { useState } from "react";
import { Switch } from "@/components/ui/switch";

type SwitchState = "checked" | "required" | "disabled";

const switchStates: { label: string; key: SwitchState }[] = [
  { label: "Checked", key: "checked" },
  { label: "Required", key: "required" },
  { label: "Disabled", key: "disabled" },
];

function SwitchSample({ state }: { state: SwitchState }) {
  const isDisabled = state === "disabled";
  const isRequired = state === "required";

  const [checked, setChecked] = useState(state === "checked");

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={checked}
        onCheckedChange={setChecked}
        disabled={isDisabled}
        className={
          checked
            ? "data-[state=checked]:bg-[#4E3BD7]"       // Blue 700
            : isDisabled
            ? "data-[state=unchecked]:bg-[#CBCFDE] opacity-50" // Grey 200
            : "data-[state=unchecked]:bg-[#979FBE]"      // Grey 400
        }
      />
      <span
        className={`text-[16px] ${
          isDisabled ? "text-[#B6BBD1]" : "text-foreground" // Grey 300
        }`}
      >
        {isRequired ? "Required" : "Label"}
        {isRequired && <span className="text-[#E53935]">*</span>} {/* Red 600 */}
      </span>
    </div>
  );
}

export default function SwitchSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Switch
      </h2>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-3 bg-muted">
          {switchStates.map((s) => (
            <div key={s.key} className="px-4 py-2 text-xs font-medium text-muted-foreground text-center">{s.label}</div>
          ))}
        </div>
        <div className="grid grid-cols-3 bg-card border-t border-border">
          {switchStates.map((s) => (
            <div key={s.key} className="flex justify-center py-6">
              <SwitchSample state={s.key} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
