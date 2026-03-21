import { StatusChip } from "@/components/ui/status-chip";

const allStatuses = [
  "actif",
  "inactif",
  "pret_a_activer",
  "a_configurer",
  "sans_profil",
  "archive",
  "entite_inactive",
] as const;

export default function StatusChipSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Status Chip
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Tous les statuts</h3>
      <div className="flex flex-wrap gap-3 items-center">
        {allStatuses.map((status) => (
          <div key={status} className="flex flex-col items-center gap-1">
            <StatusChip status={status} />
            <span className="text-[10px] text-muted-foreground font-mono">{status}</span>
          </div>
        ))}
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Dans un contexte de table</h3>
      <div className="border border-border rounded-lg overflow-hidden max-w-md">
        <div className="grid grid-cols-[1fr_auto] bg-muted">
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Client</div>
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Statut</div>
        </div>
        {[
          { name: "Acme Corp", status: "actif" as const },
          { name: "Beta Inc", status: "pret_a_activer" as const },
          { name: "Gamma SA", status: "inactif" as const },
          { name: "Delta Ltd", status: "archive" as const },
        ].map((row) => (
          <div key={row.name} className="grid grid-cols-[1fr_auto] items-center border-t border-border bg-card">
            <div className="px-4 py-3 text-sm">{row.name}</div>
            <div className="px-4 py-3">
              <StatusChip status={row.status} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
