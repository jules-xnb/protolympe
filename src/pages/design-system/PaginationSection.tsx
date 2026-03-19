import { useState } from "react";
import { UnifiedPagination } from "@/components/ui/unified-pagination";

export default function PaginationSection() {
  const [page1, setPage1] = useState(1);
  const [page2, setPage2] = useState(1);
  const [pageSize2, setPageSize2] = useState(30);
  const [page3, setPage3] = useState(1);

  const totalItems2 = 145;
  const totalPages2 = Math.ceil(totalItems2 / pageSize2);

  return (
    <section className="space-y-10">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Pagination
      </h2>

      {/* Standard */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Standard</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pagination par défaut avec compteur de résultats, affichage de plage et navigation.
            Utilisé dans les tableaux admin (DataTable), listes utilisateur (DynamicListView, DynamicPageView), historique EO, etc.
          </p>
          <code className="text-[11px] text-muted-foreground/80 font-mono mt-1 block">
            UnifiedPagination — src/components/ui/unified-pagination.tsx
          </code>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <UnifiedPagination
            totalItems={127}
            currentPage={page1}
            totalPages={3}
            onPageChange={setPage1}
            pageSize={50}
            rangeStart={(page1 - 1) * 50 + 1}
            rangeEnd={Math.min(page1 * 50, 127)}
          />
        </div>
      </div>

      {/* With page size selector */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Avec sélecteur de lignes par page</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoute un sélecteur pour choisir le nombre de lignes par page.
            Utilisé dans les campagnes et vues de réponses.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <UnifiedPagination
            totalItems={totalItems2}
            currentPage={page2}
            totalPages={totalPages2}
            onPageChange={setPage2}
            pageSize={pageSize2}
            onPageSizeChange={(size) => { setPageSize2(size); setPage2(1); }}
            pageSizeOptions={[10, 30, 50]}
            rangeStart={(page2 - 1) * pageSize2 + 1}
            rangeEnd={Math.min(page2 * pageSize2, totalItems2)}
          />
        </div>
      </div>

      {/* Compact */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Compacte</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Version compacte avec boutons plus petits (h-5 w-5).
            Utilisé dans les previews du page builder et les listes EO Card.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <UnifiedPagination
            totalItems={48}
            currentPage={page3}
            totalPages={2}
            onPageChange={setPage3}
            rangeStart={(page3 - 1) * 25 + 1}
            rangeEnd={Math.min(page3 * 25, 48)}
            compact
          />
        </div>
      </div>
    </section>
  );
}
