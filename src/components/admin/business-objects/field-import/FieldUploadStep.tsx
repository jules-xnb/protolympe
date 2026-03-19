import { useState, useRef, DragEvent } from 'react';
import { FileInput } from '@/components/ui/file-input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Upload,
  CheckCircle2,
  Download,
  FileDown,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ── DropZone ─────────────────────────────────────────────

function DropZone({ onFileSelect }: { onFileSelect: (file: File) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        onFileSelect(file);
      } else {
        toast.error('Veuillez sélectionner un fichier CSV');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors w-full ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-base font-medium mb-1">
          Glissez-déposez votre fichier CSV ici
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          ou cliquez pour parcourir vos fichiers
        </p>
        <Button variant="outline" type="button" size="sm">
          Sélectionner un fichier
        </Button>
        <FileInput
          ref={fileInputRef}
          accept=".csv"
          onChange={onFileSelect}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Formats acceptés: CSV (séparateur ; ou ,)
      </p>
    </div>
  );
}

// ── Field type reference list ────────────────────────────

const FIELD_TYPE_LIST = [
  { type: 'text', label: 'Texte court' },
  { type: 'textarea', label: 'Texte long' },
  { type: 'number', label: 'Nombre entier' },
  { type: 'decimal', label: 'Nombre décimal' },
  { type: 'date', label: 'Date' },
  { type: 'datetime', label: 'Date et heure' },
  { type: 'time', label: 'Heure' },
  { type: 'checkbox', label: 'Case à cocher' },
  { type: 'email', label: 'Email' },
  { type: 'phone', label: 'Téléphone' },
  { type: 'url', label: 'URL' },
  { type: 'document', label: 'Document' },
  { type: 'user_reference', label: 'Référence utilisateur' },
  { type: 'eo_reference', label: 'Référence entité org.' },
];

// ── Upload Step ──────────────────────────────────────────

interface FieldUploadStepProps {
  onFileSelect: (file: File) => void;
  onDownloadTemplate: () => void;
  onDownloadDocPdf: () => void;
}

export function FieldUploadStep({
  onFileSelect,
  onDownloadTemplate,
  onDownloadDocPdf,
}: FieldUploadStepProps) {
  return (
    <div className="space-y-4">
      <DropZone onFileSelect={onFileSelect} />
      <div className="flex justify-center">
        <Button variant="link" size="sm" onClick={onDownloadTemplate} className="text-xs">
          Télécharger le template
          <Download className="h-3 w-3" />
        </Button>
      </div>

      {/* Documentation */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground gap-2 group">
            <HelpCircle className="h-4 w-4" />
            <span>Documentation du format CSV</span>
            <ChevronDown className="h-3.5 w-3.5 ml-auto transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border rounded-lg p-4 mt-2 space-y-4 text-sm">
            <div>
              <h4 className="text-sm font-medium mb-2">Colonnes du CSV</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Colonne</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[80px] text-center">Requis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">field_name</TableCell>
                    <TableCell>Nom affiché du champ (ex: "Priorité", "Date de clôture")</TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-3.5 w-3.5 text-success mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">field_type</TableCell>
                    <TableCell>Type technique du champ (voir liste ci-dessous)</TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-3.5 w-3.5 text-success mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">field_description</TableCell>
                    <TableCell>Description / commentaire interne sur le champ</TableCell>
                    <TableCell className="text-center"><span className="text-muted-foreground">—</span></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">field_required</TableCell>
                    <TableCell>Champ obligatoire. Valeurs : <code className="text-xs bg-muted px-1 rounded">oui</code>, <code className="text-xs bg-muted px-1 rounded">non</code>, <code className="text-xs bg-muted px-1 rounded">true</code>, <code className="text-xs bg-muted px-1 rounded">false</code></TableCell>
                    <TableCell className="text-center"><span className="text-muted-foreground">—</span></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">field_readonly</TableCell>
                    <TableCell>Champ en lecture seule. Mêmes valeurs que field_required</TableCell>
                    <TableCell className="text-center"><span className="text-muted-foreground">—</span></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">field_placeholder</TableCell>
                    <TableCell>Texte indicatif affiché dans le champ vide (ex: "Saisissez un titre...")</TableCell>
                    <TableCell className="text-center"><span className="text-muted-foreground">—</span></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Types de champs disponibles</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {FIELD_TYPE_LIST.map(({ type, label }) => (
                  <div key={type} className="flex items-center gap-2 py-0.5">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{type}</code>
                    <span className="text-muted-foreground text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Types non disponibles à l'import</h4>
              <p className="text-xs text-muted-foreground mb-2">Ces types nécessitent une configuration supplémentaire et doivent être créés via le formulaire.</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {[
                  { type: 'select', label: 'Liste déroulante', reason: 'Référentiel requis' },
                  { type: 'multiselect', label: 'Liste à choix multiples', reason: 'Référentiel requis' },
                  { type: 'object_reference', label: 'Réf. objet métier', reason: 'Objet cible requis' },
                  { type: 'calculated', label: 'Champ calculé', reason: 'Formule requise' },
                  { type: 'aggregation', label: 'Référence', reason: 'Champ source requis' },
                ].map(({ type, label, reason }) => (
                  <div key={type} className="flex items-center gap-2 py-0.5">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0 opacity-50">{type}</code>
                    <span className="text-muted-foreground/60 text-xs">{label}</span>
                    <span className="text-muted-foreground/40 text-xs">— {reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p><strong>Format :</strong> CSV avec séparateur <code className="bg-muted px-1 rounded">;</code> ou <code className="bg-muted px-1 rounded">,</code> (détection automatique).</p>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onDownloadDocPdf}>
                Télécharger en PDF
                <FileDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
