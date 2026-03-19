import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CalendarDays } from "lucide-react";

export default function PopoverSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Popover & Hover Card
      </h2>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Popover</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Ouvrir Popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Dimensions</h4>
                <p className="text-sm text-muted-foreground">Configurez les dimensions du composant.</p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="width">Largeur</Label>
                  <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="height">Hauteur</Label>
                  <Input id="height" defaultValue="auto" className="col-span-2 h-8" />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Hover Card</h3>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="link">@utilisateur</Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex justify-between space-x-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">@utilisateur</h4>
                <p className="text-sm text-muted-foreground">
                  Développeur full-stack — Membre de l'équipe Core.
                </p>
                <div className="flex items-center pt-2">
                  <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
                  <span className="text-xs text-muted-foreground">Inscrit en mars 2024</span>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    </section>
  );
}
