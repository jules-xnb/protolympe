import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export default function PanelSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Sheet & Drawer
      </h2>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Sheet</h3>
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
              </SheetContent>
            </Sheet>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Drawer</h3>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">Ouvrir Drawer</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer</DrawerTitle>
              <DrawerDescription>Panneau glissant depuis le bas de l'écran.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <p className="text-sm text-muted-foreground">
                Utilisé pour des actions contextuelles ou des formulaires rapides.
              </p>
            </div>
            <DrawerFooter>
              <Button>Confirmer</Button>
              <DrawerClose asChild>
                <Button variant="outline">Annuler</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </section>
  );
}
