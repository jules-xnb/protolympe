import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function FloatingInput({
  label,
  initialValue,
  disabled,
}: {
  label: string;
  initialValue?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [focused, setFocused] = useState(false);

  const hasValue = value.length > 0;
  const isFloating = focused || hasValue;
  const borderColor = focused ? "border-[#4E3BD7] border-2" : "border border-[rgba(0,0,0,0.23)]";
  const labelColor = focused ? "text-[#4E3BD7]" : "text-[#616785]";                       // Blue 700 / Grey 700

  return (
    <div className="inline-block w-[260px]">
      <fieldset
        className={`${borderColor} rounded-lg px-3 ${isFloating ? "pb-2 pt-0" : "py-0 mt-[7px]"} ${disabled ? "opacity-30" : ""}`}
      >
        {isFloating && (
          <legend className={`text-xs font-medium px-1 ml-[-2px] ${labelColor}`}>
            {label}
          </legend>
        )}
        <div className={isFloating ? "py-1" : "h-12 flex items-center"}>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            placeholder={!isFloating ? label : ""}
            className="w-full text-[16px] text-[#232332] placeholder:text-[#979FBE] bg-transparent outline-none border-none focus:ring-0 focus-visible:ring-0"
          />
        </div>
      </fieldset>
    </div>
  );
}

export default function TextInputSection() {
  const [inputDefault, setInputDefault] = useState("");
  const [inputValue, setInputValue] = useState("Valeur saisie");
  const [textareaDefault, setTextareaDefault] = useState("");
  const [textareaValue, setTextareaValue] = useState("Contenu multi-lignes ici...");

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Text Input
      </h2>

      {/* Floating Input (mock DS) */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Floating Input</h3>
        <div className="flex items-start gap-8 flex-wrap">
          <FloatingInput label="Label" />
          <FloatingInput label="Label" initialValue="Value" />
          <FloatingInput label="Label" initialValue="Value" disabled />
        </div>
      </div>

      {/* Input */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Input</h3>
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-[260px] space-y-2">
            <Label>Default</Label>
            <Input placeholder="Placeholder" value={inputDefault} onChange={(e) => setInputDefault(e.target.value)} />
          </div>
          <div className="w-[260px] space-y-2">
            <Label>Avec valeur</Label>
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
          </div>
          <div className="w-[260px] space-y-2">
            <Label>Désactivé</Label>
            <Input placeholder="Disabled" disabled />
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Textarea</h3>
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-[260px] space-y-2">
            <Label>Default</Label>
            <Textarea placeholder="Placeholder" value={textareaDefault} onChange={(e) => setTextareaDefault(e.target.value)} />
          </div>
          <div className="w-[260px] space-y-2">
            <Label>Avec valeur</Label>
            <Textarea value={textareaValue} onChange={(e) => setTextareaValue(e.target.value)} />
          </div>
          <div className="w-[260px] space-y-2">
            <Label>Désactivé</Label>
            <Textarea placeholder="Disabled" disabled />
          </div>
        </div>
      </div>

      {/* Label */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Label</h3>
        <div className="flex items-center gap-6">
          <Label>Label par défaut</Label>
          <Label className="text-destructive">Label erreur</Label>
          <Label className="text-muted-foreground">Label secondaire</Label>
        </div>
      </div>
    </section>
  );
}
