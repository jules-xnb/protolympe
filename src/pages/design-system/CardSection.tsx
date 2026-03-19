import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CardSection() {
  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Card
      </h2>

      <div className="grid grid-cols-3 gap-6">
        {/* Default */}
        <Card>
          <CardHeader>
            <CardTitle>Card titre</CardTitle>
            <CardDescription>Description de la card avec du contexte.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Contenu de la card.</p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => toast("Button clicked: Annuler")}>Annuler</Button>
            <Button size="sm" onClick={() => toast("Button clicked: Action")}>Action</Button>
          </CardFooter>
        </Card>

        {/* Sans footer */}
        <Card>
          <CardHeader>
            <CardTitle>Card simple</CardTitle>
            <CardDescription>Sans footer, juste header + contenu.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Utilisée pour afficher des informations sans action directe.
            </p>
          </CardContent>
        </Card>

        {/* Compacte */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Card compacte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">42</p>
            <p className="text-xs text-muted-foreground">Statistique exemple</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
