import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function ScrollAreaSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Scroll Area
      </h2>
      <div className="flex items-start gap-8 flex-wrap">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Vertical</h3>
          <ScrollArea className="h-[200px] w-[250px] rounded-md border p-4">
            <div className="space-y-4">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="text-sm">
                  Élément {i + 1} — Contenu scrollable
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Avec séparateurs</h3>
          <ScrollArea className="h-[200px] w-[250px] rounded-md border">
            <div className="p-4">
              {Array.from({ length: 15 }, (_, i) => (
                <div key={i}>
                  <div className="text-sm py-2">Tag {i + 1}</div>
                  {i < 14 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}
