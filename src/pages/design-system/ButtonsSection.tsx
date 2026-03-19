import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";

const buttonStyles = {
  primary: {
    base: "bg-[#4E3BD7] text-[#FFFFFF]",
    hover: "bg-[#3A2EAD] text-[#FFFFFF]",
    pressed: "bg-[#2A247C] text-[#FFFFFF]",
    disabled: "bg-[#4E3BD7] text-[#FFFFFF] opacity-30",
  },
  secondary: {
    base: "border border-[#4E3BD7] bg-transparent text-[#232332]",
    hover: "border border-[#4E3BD7] bg-[#5342F2]/10 text-[#232332]",
    pressed: "border border-[#4E3BD7] bg-[#C9D3FF]/60 text-[#232332]",
    disabled: "border border-[#4E3BD7] bg-transparent text-[#232332] opacity-30",
  },
  text: {
    base: "bg-transparent text-[#4E3BD7]",
    hover: "bg-transparent text-[#2A247C]",
    pressed: "bg-transparent text-[#2A247C] underline",
    disabled: "bg-transparent text-[#4E3BD7] opacity-30",
  },
};

const sizes = {
  large: "px-[24px] py-[16px] text-[18px]",
  medium: "px-[16px] py-[8px] text-[16px]",
  small: "px-[12px] py-[5px] text-[14px]",
};

const iconSizes = { large: 20, medium: 18, small: 16 };

const states = ["Enabled", "Hovered", "Pressed", "Disabled"] as const;
const stateKeys = { Enabled: "base", Hovered: "hover", Pressed: "pressed", Disabled: "disabled" } as const;

const variants = [
  { label: "Primaire", key: "primary" as const },
  { label: "Secondaire", key: "secondary" as const },
  { label: "Texte", key: "text" as const },
];

const sizeEntries = [
  { label: "Large", key: "large" as const },
  { label: "Medium", key: "medium" as const },
  { label: "Small", key: "small" as const },
];

type IconMode = "none" | "left" | "right" | "both";
const iconModes: { label: string; key: IconMode }[] = [
  { label: "Sans icône", key: "none" },
  { label: "Icône gauche", key: "left" },
  { label: "Icône droite", key: "right" },
  { label: "Icônes gauche + droite", key: "both" },
];

function ButtonSample({
  variant,
  size,
  state,
  iconMode,
}: {
  variant: keyof typeof buttonStyles;
  size: keyof typeof sizes;
  state: (typeof states)[number];
  iconMode: IconMode;
}) {
  const iSize = iconSizes[size];
  const isDisabled = state === "Disabled";
  return (
    <span
      onClick={isDisabled ? undefined : () => toast(`Button clicked: ${variant} / ${size} / ${state}`)}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium select-none ${isDisabled ? "cursor-not-allowed" : "cursor-pointer active:scale-95 transition-transform"} ${sizes[size]} ${buttonStyles[variant][stateKeys[state]]}`}
    >
      {(iconMode === "left" || iconMode === "both") && <Plus size={iSize} />}
      Button
      {(iconMode === "right" || iconMode === "both") && <ArrowRight size={iSize} />}
    </span>
  );
}

/* ── Icon Button ── */

const iconBtnStyles = {
  neutral: {
    base: "bg-transparent text-[#232332]",
    hover: "bg-[#E5E7EF] text-[#232332]",
    pressed: "bg-[#CBCFDE] text-[#232332]",
    disabled: "bg-transparent text-[#232332] opacity-30",
  },
  primary: {
    base: "bg-[#5342F2] text-[#FFFFFF]",
    hover: "bg-[#4E3BD7] text-[#FFFFFF]",
    pressed: "bg-[#3A2EAD] text-[#FFFFFF]",
    disabled: "bg-[#5342F2] text-[#FFFFFF] opacity-30",
  },
  secondary: {
    base: "bg-[#FBAB24] text-[#FFFFFF]",
    hover: "bg-[#F59E0B] text-[#FFFFFF]",
    pressed: "bg-[#D98B06] text-[#FFFFFF]",
    disabled: "bg-[#FBAB24] text-[#FFFFFF] opacity-30",
  },
};

const iconBtnSizes = {
  large: { box: "w-[52px] h-[52px]", icon: 24 },
  medium: { box: "w-[40px] h-[40px]", icon: 20 },
  small: { box: "w-[32px] h-[32px]", icon: 16 },
};

const iconBtnVariants = [
  { label: "Neutral", key: "neutral" as const },
  { label: "Primaire", key: "primary" as const },
  { label: "Secondaire", key: "secondary" as const },
];

function IconButtonSample({
  variant,
  size,
  state,
}: {
  variant: keyof typeof iconBtnStyles;
  size: keyof typeof iconBtnSizes;
  state: (typeof states)[number];
}) {
  const s = iconBtnSizes[size];
  const isDisabled = state === "Disabled";
  return (
    <span
      onClick={isDisabled ? undefined : () => toast(`Icon button clicked: ${variant} / ${size} / ${state}`)}
      className={`inline-flex items-center justify-center rounded-lg select-none ${isDisabled ? "cursor-not-allowed" : "cursor-pointer active:scale-95 transition-transform"} ${s.box} ${iconBtnStyles[variant][stateKeys[state]]}`}
    >
      <Plus size={s.icon} />
    </span>
  );
}

export default function ButtonsSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Boutons
      </h2>
      <div className="space-y-10">
        {/* Standard buttons */}
        {variants.map((variant) => (
          <div key={variant.key}>
            <h3 className="text-[14px] font-semibold text-foreground mb-4">{variant.label}</h3>
            <div className="space-y-6">
              {iconModes.map((mode) => (
                <div key={mode.key}>
                  <p className="text-xs text-muted-foreground font-medium mb-2">{mode.label}</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[120px_repeat(4,1fr)] bg-muted">
                      <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Taille</div>
                      {states.map((s) => (
                        <div key={s} className="px-4 py-2 text-xs font-medium text-muted-foreground text-center">{s}</div>
                      ))}
                    </div>
                    {sizeEntries.map((size) => (
                      <div key={size.key} className="grid grid-cols-[120px_repeat(4,1fr)] items-center border-t border-border bg-card">
                        <div className="px-4 py-4 text-xs text-muted-foreground font-medium">{size.label}</div>
                        {states.map((state) => (
                          <div key={state} className="flex justify-center py-4">
                            <ButtonSample variant={variant.key} size={size.key} state={state} iconMode={mode.key} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Icon Buttons */}
        <div>
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Icon Button</h3>
          <div className="space-y-6">
            {iconBtnVariants.map((variant) => (
              <div key={variant.key}>
                <p className="text-xs text-muted-foreground font-medium mb-2">{variant.label}</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[120px_repeat(4,1fr)] bg-muted">
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Taille</div>
                    {states.map((s) => (
                      <div key={s} className="px-4 py-2 text-xs font-medium text-muted-foreground text-center">{s}</div>
                    ))}
                  </div>
                  {sizeEntries.map((size) => (
                    <div key={size.key} className="grid grid-cols-[120px_repeat(4,1fr)] items-center border-t border-border bg-card">
                      <div className="px-4 py-4 text-xs text-muted-foreground font-medium">{size.label}</div>
                      {states.map((state) => (
                        <div key={state} className="flex justify-center py-4">
                          <IconButtonSample variant={variant.key} size={size.key} state={state} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
