import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function LoadingSpinnerSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Loading Spinner
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">
            Compose
          </h3>
          <p className="text-sm text-muted-foreground">
            Lucide <code className="text-xs bg-muted px-1 py-0.5 rounded">Loader2</code> avec animation spin.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">
            Quand l'utiliser
          </h3>
          <p className="text-sm text-muted-foreground">
            Pour indiquer un chargement en cours (Suspense fallback, requêtes async).
            Préférer <code className="text-xs bg-muted px-1 py-0.5 rounded">Skeleton</code> pour les placeholders de contenu structuré.
          </p>
        </div>

        <div className="border border-border rounded-lg p-8">
          <LoadingSpinner />
        </div>
      </div>
    </section>
  );
}
