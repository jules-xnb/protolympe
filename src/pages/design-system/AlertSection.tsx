import { useState } from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Inbox, X, XCircle, Shield, FolderTree, Layers, FolderPlus, FilePlus } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Pattern 1 — Alertes inline (custom)
// ---------------------------------------------------------------------------

const inlineAlerts = [
  {
    label: "Error",
    icon: AlertCircle,
    bg: "#FEEBEE",
    text: "#B71C1C",
    border: "#EF9A9A",
    iconColor: "#D32F2F",
    message: "Une erreur est survenue lors du traitement.",
  },
  {
    label: "Warning",
    icon: AlertTriangle,
    bg: "#FFF8E1",
    text: "#78510F",
    border: "#FFE082",
    iconColor: "#F59E0B",
    message: "Attention, cette action est irréversible.",
  },
  {
    label: "Info",
    icon: Info,
    bg: "#EDF2FF",
    text: "#2A247C",
    border: "#C9D3FF",
    iconColor: "#5342F2",
    message: "Mise à jour disponible pour votre compte.",
  },
  {
    label: "Success",
    icon: CheckCircle2,
    bg: "#E8F5E9",
    text: "#1B5E20",
    border: "#A5D6A7",
    iconColor: "#43A047",
    message: "Opération réalisée avec succès.",
  },
];

// ---------------------------------------------------------------------------
// Pattern 2 — Alert composant (shadcn) avec titre + description
// ---------------------------------------------------------------------------

const componentAlerts = [
  {
    label: "Destructive / Error",
    variant: "destructive" as const,
    icon: XCircle,
    title: "Erreurs détectées",
    description: "Des erreurs ont été trouvées dans le fichier importé. Veuillez vérifier les lignes concernées avant de continuer.",
    usage: "Pages d'import, validation de formulaire",
  },
  {
    label: "Warning",
    variant: "warning" as const,
    icon: AlertTriangle,
    title: "Attention",
    description: "Cette action modifiera les données de plusieurs utilisateurs. Vérifiez les paramètres avant de continuer.",
    usage: "Confirmations critiques, actions irréversibles",
  },
  {
    label: "Info",
    variant: "info" as const,
    icon: Info,
    title: "Information",
    description: "Les modifications seront appliquées à la prochaine connexion des utilisateurs concernés.",
    usage: "Messages contextuels, aide en ligne",
  },
  {
    label: "Success",
    variant: "success" as const,
    icon: CheckCircle2,
    title: "Opération réussie",
    description: "Les données ont été importées avec succès. 42 entrées créées, 3 mises à jour.",
    usage: "Confirmation d'action réussie",
  },
];

// ---------------------------------------------------------------------------
// Pattern 3 — Alert composant (shadcn) Empty state
// ---------------------------------------------------------------------------

const emptyAlerts = [
  {
    label: "Empty — avec 2 boutons (Rôles)",
    icon: Shield,
    title: "Aucun rôle sélectionné",
    description: "Sélectionnez un rôle dans la liste ou commencez par créer une catégorie et un rôle.",
    buttons: [
      { label: "Créer une catégorie de rôle", variant: "outline" as const, icon: FolderTree },
      { label: "Créer un rôle", variant: "default" as const, icon: Shield },
    ],
  },
  {
    label: "Empty — avec 2 boutons (Navigation)",
    icon: Layers,
    title: "Créer la navigation",
    description: "Commencez par créer un groupe ou une vue pour structurer la navigation.",
    buttons: [
      { label: "Créer un groupe", variant: "outline" as const, icon: FolderPlus },
      { label: "Créer une vue", variant: "default" as const, icon: FilePlus },
    ],
  },
  {
    label: "Empty — simple (sans bouton)",
    icon: Inbox,
    title: "Aucune donnée disponible",
    description: "Commencez par ajouter un élément pour le voir apparaître ici.",
    buttons: [],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlertSection() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const dismiss = (label: string) => setHidden((prev) => new Set(prev).add(label));
  const resetAll = () => setHidden(new Set());

  return (
    <section className="space-y-10">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-[20px] font-semibold text-foreground">Alerte</h2>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pattern 1 — Alertes inline */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Pattern 1 — Alertes inline (custom)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Utilisées pour les messages système contextuels, dismissibles.</p>
          </div>
          {hidden.size > 0 && (
            <button onClick={resetAll} className="text-xs text-[#4E3BD7] hover:underline font-medium">
              Reset
            </button>
          )}
        </div>
        <div className="space-y-3">
          {inlineAlerts.map((alert) => {
            if (hidden.has(alert.label)) return null;
            const Icon = alert.icon;
            return (
              <div
                key={alert.label}
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ backgroundColor: alert.bg, border: `1px solid ${alert.border}`, color: alert.text }}
              >
                <Icon size={20} style={{ color: alert.iconColor, flexShrink: 0 }} />
                <span className="text-[14px] font-medium flex-1">{alert.message}</span>
                <button
                  onClick={() => dismiss(alert.label)}
                  className="p-1 rounded hover:bg-black/10 transition-colors flex-shrink-0"
                  style={{ color: alert.iconColor }}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
          {hidden.size === inlineAlerts.length && (
            <p className="text-sm text-muted-foreground italic text-center py-4">Toutes les alertes ont été masquées.</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pattern 2 — Alert composant avec titre */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">Pattern 2 — Alert composant (shadcn) avec titre</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Utilisées pour les erreurs d'import, validations, messages structurés.</p>
        </div>
        <div className="space-y-3">
          {componentAlerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div key={alert.label} className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{alert.label} — <span className="font-normal italic">{alert.usage}</span></p>
                <Alert variant={alert.variant}>
                  <Icon className="h-4 w-4" />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>{alert.description}</AlertDescription>
                </Alert>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pattern 3 — Alert Empty state */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">Pattern 3 — Alert Empty state</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Utilisées quand une section est vide, avec appel à l'action. Page Rôles, Navigation.</p>
        </div>
        <div className="space-y-4">
          {emptyAlerts.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                <Alert variant="empty" className="w-full flex flex-col items-center justify-center text-center gap-3 rounded-lg py-8">
                  <AlertTitle className="flex flex-col items-center gap-3 text-base">
                    <Icon className="h-10 w-10" />
                    {item.title}
                  </AlertTitle>
                  <AlertDescription className="space-y-4">
                    <p>{item.description}</p>
                    {item.buttons.length > 0 && (
                      <div className="flex gap-2 justify-center pt-1">
                        {item.buttons.map((btn) => {
                          const BtnIcon = btn.icon;
                          return (
                            <Button key={btn.label} variant={btn.variant} size="sm">
                              {btn.label}
                              <BtnIcon className="h-4 w-4" />
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
