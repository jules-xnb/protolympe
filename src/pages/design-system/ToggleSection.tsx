import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";

export default function ToggleSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Toggle / Toggle Group
      </h2>

      {/* ── Toggle individuel ── */}
      <h3 className="text-[14px] font-semibold text-foreground mb-4">Toggle individuel</h3>

      <p className="text-xs text-muted-foreground font-medium mb-2">Variant default</p>
      <div className="flex gap-2 items-center">
        <Toggle aria-label="Bold">
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle aria-label="Italic">
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle aria-label="Underline">
          <Underline className="h-4 w-4" />
        </Toggle>
      </div>

      <p className="text-xs text-muted-foreground font-medium mb-2">Variant outline</p>
      <div className="flex gap-2 items-center">
        <Toggle variant="outline" aria-label="Bold">
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle variant="outline" aria-label="Italic">
          <Italic className="h-4 w-4" />
        </Toggle>
      </div>

      <p className="text-xs text-muted-foreground font-medium mb-2">Tailles</p>
      <div className="flex gap-2 items-center">
        <Toggle size="sm" aria-label="Small">
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle size="default" aria-label="Default">
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle size="lg" aria-label="Large">
          <Bold className="h-4 w-4" />
        </Toggle>
      </div>

      <p className="text-xs text-muted-foreground font-medium mb-2">Désactivé</p>
      <div className="flex gap-2 items-center">
        <Toggle disabled aria-label="Disabled">
          <Bold className="h-4 w-4" />
        </Toggle>
      </div>

      {/* ── Toggle Group ── */}
      <h3 className="text-[14px] font-semibold text-foreground mb-4 mt-8">Toggle Group (single)</h3>
      <div className="flex gap-4 items-center">
        <ToggleGroup type="single" defaultValue="left">
          <ToggleGroupItem value="left" aria-label="Align left">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="justify" aria-label="Justify">
            <AlignJustify className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Toggle Group (multiple)</h3>
      <div className="flex gap-4 items-center">
        <ToggleGroup type="multiple" defaultValue={["bold", "italic"]}>
          <ToggleGroupItem value="bold" aria-label="Bold">
            <Bold className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <Italic className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <Underline className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Toggle Group outline</h3>
      <div className="flex gap-4 items-center">
        <ToggleGroup type="single" variant="outline" defaultValue="center">
          <ToggleGroupItem value="left" aria-label="Align left">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </section>
  );
}
