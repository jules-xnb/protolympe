import { useState } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MiscSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    toast.success(`Enregistre : ${name} (${email})`);
  };

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Divers
      </h2>

      {/* Separator */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Separator</h3>
        <div className="space-y-4 w-[400px]">
          <div>
            <p className="text-sm">Contenu au-dessus</p>
            <Separator className="my-2" />
            <p className="text-sm">Contenu en-dessous</p>
          </div>
          <div className="flex items-center gap-4 h-5">
            <span className="text-sm">Gauche</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Centre</span>
            <Separator orientation="vertical" />
            <span className="text-sm">Droite</span>
          </div>
        </div>
      </div>

      {/* Skeleton */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Skeleton</h3>
        <div className="flex items-start gap-8">
          <div className="space-y-3 w-[260px]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Area */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Scroll Area</h3>
        <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
          <div className="space-y-4">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="text-sm">
                Element {i + 1} -- Contenu scrollable dans une zone definie
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Form structure */}
      <div>
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Form (structure)</h3>
        <div className="w-[400px] space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="demo-name">Nom</Label>
            <Input
              id="demo-name"
              placeholder="Entrez votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ce nom sera affiche publiquement.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-email">Email</Label>
            <Input
              id="demo-email"
              type="email"
              placeholder="nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit}>Enregistrer</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
