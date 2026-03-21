import { DragHandle } from "@/components/ui/drag-handle";
import { GripVertical, GripHorizontal, Move } from "lucide-react";

export default function DragHandleSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Drag Handle
      </h2>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Par défaut (icône GripVertical)</h3>
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
          <DragHandle />
          <span className="text-sm">Élément glissable</span>
        </div>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Icônes personnalisées</h3>
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
          <DragHandle>
            <GripHorizontal className="h-4 w-4" />
          </DragHandle>
          <span className="text-sm">Grip horizontal</span>
        </div>
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
          <DragHandle>
            <Move className="h-4 w-4" />
          </DragHandle>
          <span className="text-sm">Move icon</span>
        </div>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Dans une liste</h3>
      <div className="space-y-1 max-w-xs">
        {["Premier élément", "Deuxième élément", "Troisième élément"].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card"
          >
            <DragHandle />
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
