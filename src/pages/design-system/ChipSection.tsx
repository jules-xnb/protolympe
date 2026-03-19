import { Chip } from "@/components/ui/chip";
import { Check } from "lucide-react";

const variants = [
  { variant: "default",   label: "Default",   description: "Neutre — statut générique, tags" },
  { variant: "primary",   label: "Primary",   description: "Action principale, sélection active" },
  { variant: "secondary", label: "Secondary", description: "Statut secondaire, info complémentaire" },
  { variant: "success",   label: "Success",   description: "Actif, validé, publié" },
  { variant: "warning",   label: "Warning",   description: "En attente, à vérifier" },
  { variant: "error",     label: "Error",     description: "Erreur, rejeté, critique" },
  { variant: "info",      label: "Info",      description: "Information contextuelle" },
  { variant: "outline",   label: "Outline",   description: "Bordure visible, fond transparent" },
] as const;

export default function ChipSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Chip
      </h2>
      <p className="text-sm text-muted-foreground">
        Composant <code className="text-xs bg-muted px-1 py-0.5 rounded">Chip</code> — utilisé pour les
        statuts, tags et labels courts. Couleurs 100% via tokens CSS (pas d'inline styles).
      </p>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_2fr] bg-muted">
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Variante</div>
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Aperçu</div>
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Usage</div>
        </div>
        {variants.map((v) => (
          <div key={v.variant} className="grid grid-cols-[120px_1fr_2fr] items-center border-t border-border bg-card">
            <div className="px-4 py-4 text-xs text-muted-foreground font-medium font-mono">{v.variant}</div>
            <div className="px-4 py-4 flex items-center gap-2">
              <Chip variant={v.variant}>{v.label}</Chip>
              <Chip variant={v.variant}>
                <Check className="h-3 w-3" />
                Avec icône
              </Chip>
            </div>
            <div className="px-4 py-4 text-sm text-muted-foreground">{v.description}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted rounded-lg p-4">
        <p className="font-medium text-foreground">Utilisation</p>
        <p><code className="bg-background px-1 rounded">{"<Chip variant=\"success\">Actif</Chip>"}</code></p>
        <p className="mt-1">Les icônes s'insèrent comme enfants directement — le gap est géré par le composant.</p>
      </div>
    </section>
  );
}
