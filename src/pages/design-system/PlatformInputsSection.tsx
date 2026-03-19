import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-6 px-5 py-5 border-b border-border last:border-0">
      <div className="w-52 shrink-0 pt-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
      </div>
      <div className="flex items-start gap-6 flex-wrap flex-1">{children}</div>
    </div>
  );
}

function Variant({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {children}
    </div>
  );
}

export default function PlatformInputsSection() {
  const [inputVal, setInputVal] = useState("Valeur saisie");
  const [textareaVal, setTextareaVal] = useState("Texte multi-lignes...");
  const [selectVal, setSelectVal] = useState("");
  const [selectVal2, setSelectVal2] = useState("option1");

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Tous les inputs de la plateforme
      </h2>
      <p className="text-sm text-muted-foreground">
        Recensement de tous les composants de saisie utilisés dans les vues Admin et Intégrateur.
      </p>

      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">

        {/* Input standard (h-12) */}
        <Row label="Input — standard">
          <Variant label="Vide">
            <div className="w-64 space-y-2">
              <Label>Nom du client</Label>
              <Input placeholder="Ex : Acme Corp." />
            </div>
          </Variant>
          <Variant label="Avec valeur">
            <div className="w-64 space-y-2">
              <Label>Nom du client</Label>
              <Input value={inputVal} onChange={e => setInputVal(e.target.value)} />
            </div>
          </Variant>
          <Variant label="Désactivé">
            <div className="w-64 space-y-2">
              <Label>Nom du client</Label>
              <Input value="Valeur verrouillée" disabled />
            </div>
          </Variant>
          <Variant label="Erreur">
            <div className="w-64 space-y-2">
              <Label className="text-destructive">Nom du client</Label>
              <Input
                placeholder="Champ requis"
                className="border-destructive focus-visible:border-destructive"
              />
              <p className="text-xs text-destructive">Ce champ est obligatoire.</p>
            </div>
          </Variant>
        </Row>

        {/* Input search (h-10 avec icône) */}
        <Row label="Input — recherche (h-10)">
          <Variant label="Défaut">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Rechercher..." className="pl-9 h-10" />
            </div>
          </Variant>
          <Variant label="Avec valeur">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input defaultValue="Acme" className="pl-9 h-10" />
            </div>
          </Variant>
        </Row>

        {/* Input compact (h-10, sans icône) */}
        <Row label="Input — compact (h-10)">
          <Variant label="Défaut">
            <div className="w-64 space-y-2">
              <Label>Slug</Label>
              <Input placeholder="ex: acme-corp" className="h-10" />
            </div>
          </Variant>
          <Variant label="Avec valeur">
            <div className="w-64 space-y-2">
              <Label>Slug</Label>
              <Input value="acme-corp" className="h-10" readOnly />
            </div>
          </Variant>
          <Variant label="Désactivé">
            <div className="w-64 space-y-2">
              <Label>Slug</Label>
              <Input value="verrouillé" className="h-10" disabled />
            </div>
          </Variant>
        </Row>

        {/* Textarea */}
        <Row label="Textarea">
          <Variant label="Vide">
            <div className="w-64 space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Décrivez..." rows={3} />
            </div>
          </Variant>
          <Variant label="Avec valeur">
            <div className="w-64 space-y-2">
              <Label>Description</Label>
              <Textarea value={textareaVal} onChange={e => setTextareaVal(e.target.value)} rows={3} />
            </div>
          </Variant>
          <Variant label="Désactivé">
            <div className="w-64 space-y-2">
              <Label>Description</Label>
              <Textarea value="Contenu verrouillé" disabled rows={3} />
            </div>
          </Variant>
        </Row>

        {/* Select */}
        <Row label="Select">
          <Variant label="Vide (placeholder)">
            <div className="w-64 space-y-2">
              <Label>Type de champ</Label>
              <Select value={selectVal} onValueChange={setSelectVal}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte</SelectItem>
                  <SelectItem value="number">Nombre</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Liste déroulante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Variant>
          <Variant label="Avec valeur">
            <div className="w-64 space-y-2">
              <Label>Type de champ</Label>
              <Select value={selectVal2} onValueChange={setSelectVal2}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Texte court</SelectItem>
                  <SelectItem value="option2">Nombre</SelectItem>
                  <SelectItem value="option3">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Variant>
          <Variant label="Désactivé">
            <div className="w-64 space-y-2">
              <Label>Type de champ</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Verrouillé" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x">Option</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Variant>
        </Row>


      </div>
    </section>
  );
}
