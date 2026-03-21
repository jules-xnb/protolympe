import { useRef, useState } from "react";
import { FileInput } from "@/components/ui/file-input";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function FileInputSection() {
  const csvRef = useRef<HTMLInputElement>(null);
  const anyRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<string | null>(null);
  const [anyFile, setAnyFile] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        File Input
      </h2>
      <p className="text-xs text-muted-foreground">
        Composant masqué (&lt;input type="file" className="hidden"&gt;) destiné à être déclenché via un bouton.
      </p>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Fichier CSV uniquement</h3>
      <div className="flex gap-4 items-center">
        <FileInput
          ref={csvRef}
          accept=".csv"
          onChange={(file) => setCsvFile(file.name)}
        />
        <Button variant="outline" onClick={() => csvRef.current?.click()}>
          Importer CSV <Upload className="h-4 w-4" />
        </Button>
        {csvFile && <span className="text-sm text-muted-foreground">Fichier : {csvFile}</span>}
      </div>

      <h3 className="text-[14px] font-semibold text-foreground mb-4">Tout type de fichier</h3>
      <div className="flex gap-4 items-center">
        <FileInput
          ref={anyRef}
          onChange={(file) => setAnyFile(file.name)}
        />
        <Button variant="outline" onClick={() => anyRef.current?.click()}>
          Choisir un fichier <Upload className="h-4 w-4" />
        </Button>
        {anyFile && <span className="text-sm text-muted-foreground">Fichier : {anyFile}</span>}
      </div>
    </section>
  );
}
