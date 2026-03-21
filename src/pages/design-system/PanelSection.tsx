import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function PanelSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Sheet (Panneau latéral)
      </h2>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Directions</h3>
        <div className="flex gap-3 flex-wrap">
          {(["right", "left", "top", "bottom"] as const).map((side) => (
            <Sheet key={side}>
              <SheetTrigger asChild>
                <Button variant="outline" className="capitalize">{side}</Button>
              </SheetTrigger>
              <SheetContent side={side}>
                <SheetHeader>
                  <SheetTitle>Sheet — {side}</SheetTitle>
                  <SheetDescription>
                    Panneau latéral ouvert depuis le côté {side}.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">Contenu du panneau.</p>
                </div>
                <SheetFooter>
                  <Button>Confirmer</Button>
                  <Button variant="outline">Annuler</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      </div>
    </section>
  );
}
