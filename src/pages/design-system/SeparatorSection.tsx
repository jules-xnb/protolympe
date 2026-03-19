import { Separator } from "@/components/ui/separator";

export default function SeparatorSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Separator
      </h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Horizontal</h3>
          <div className="w-[400px]">
            <p className="text-sm">Contenu au-dessus</p>
            <Separator className="my-3" />
            <p className="text-sm">Contenu en-dessous</p>
          </div>
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Vertical</h3>
          <div className="flex items-center gap-4 h-5">
            <span className="text-sm">Gauche</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Centre</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Droite</span>
          </div>
        </div>
      </div>
    </section>
  );
}
