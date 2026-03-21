import ChipSection from "./design-system/ChipSection";
import StatusChipSection from "./design-system/StatusChipSection";
import EmptyStateSection from "./design-system/EmptyStateSection";
import LoadingSpinnerSection from "./design-system/LoadingSpinnerSection";
import FileInputSection from "./design-system/FileInputSection";
import FloatingInputSection from "./design-system/FloatingInputSection";
import DragHandleSection from "./design-system/DragHandleSection";
import SearchableSelectSection from "./design-system/SearchableSelectSection";
import TableActionMenuSection from "./design-system/TableActionMenuSection";
import PaginationSection from "./design-system/PaginationSection";
import FormDialogSection from "./design-system/FormDialogSection";
import DetailsDrawerSection from "./design-system/DetailsDrawerSection";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const sections = [
  { id: "chip", label: "Chip" },
  { id: "status-chip", label: "Status Chip" },
  { id: "empty-state", label: "Empty State" },
  { id: "loading-spinner", label: "Loading Spinner" },
  { id: "file-input", label: "File Input" },
  { id: "floating-input", label: "Floating Input" },
  { id: "drag-handle", label: "Drag Handle" },
  { id: "searchable-select", label: "Searchable Select" },
  { id: "table-action-menu", label: "Table Action Menu" },
  { id: "pagination", label: "Unified Pagination" },
  { id: "form-dialog", label: "Form Dialog" },
  { id: "details-drawer", label: "Details Drawer" },
] as const;

type SectionId = (typeof sections)[number]["id"] | "all";

const sectionComponents: Record<Exclude<SectionId, "all">, React.FC> = {
  chip: ChipSection,
  "status-chip": StatusChipSection,
  "empty-state": EmptyStateSection,
  "loading-spinner": LoadingSpinnerSection,
  "file-input": FileInputSection,
  "floating-input": FloatingInputSection,
  "drag-handle": DragHandleSection,
  "searchable-select": SearchableSelectSection,
  "table-action-menu": TableActionMenuSection,
  pagination: PaginationSection,
  "form-dialog": FormDialogSection,
  "details-drawer": DetailsDrawerSection,
};

export default function WrappersPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("all");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      {/* Header avec navigation */}
      <div className="border-b bg-card px-6 py-3 flex items-center gap-6 shrink-0">
        <h1 className="text-lg font-semibold text-foreground mr-4">Design System</h1>
        <button
          onClick={() => navigate("/design-system/composants")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground pb-1"
        >
          Composants shadcn
        </button>
        <button
          className="text-sm font-medium text-primary border-b-2 border-primary pb-1"
        >
          Wrappers custom
        </button>
      </div>

      <div className="full-bleed flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-[16rem] border-r shrink-0 flex flex-col">
          <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
            Wrappers custom
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <button
              onClick={() => setActiveSection("all")}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm transition-colors",
                "hover:bg-accent/50",
                activeSection === "all" && "bg-accent font-medium border-l-2 border-primary"
              )}
            >
              Tout
            </button>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-sm transition-colors",
                  "hover:bg-accent/50",
                  activeSection === s.id && "bg-accent font-medium border-l-2 border-primary"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-5xl">
          {activeSection === "all" ? (
            <div className="space-y-12">
              {sections.map((s) => {
                const Component = sectionComponents[s.id];
                return <Component key={s.id} />;
              })}
            </div>
          ) : (
            (() => { const C = sectionComponents[activeSection]; return <C />; })()
          )}
        </div>
      </div>
    </div>
  );
}
