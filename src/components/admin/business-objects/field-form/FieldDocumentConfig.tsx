import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface FieldDocumentConfigProps {
  docMultiple: boolean;
  docMaxSizeMb: number | null;
  docAcceptedFormats: string;
  onMultipleChange: (value: boolean) => void;
  onMaxSizeChange: (value: number | null) => void;
  onFormatsChange: (value: string) => void;
}

const FORMAT_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'doc,docx', label: 'Word' },
  { value: 'xls,xlsx', label: 'Excel' },
  { value: 'ppt,pptx', label: 'PowerPoint' },
  { value: 'jpg,jpeg,png', label: 'Images' },
  { value: 'csv', label: 'CSV' },
  { value: 'txt', label: 'Texte' },
  { value: 'zip,rar', label: 'Archives' },
];

export function FieldDocumentConfig({
  docMultiple,
  docMaxSizeMb,
  docAcceptedFormats,
  onMultipleChange,
  onMaxSizeChange,
  onFormatsChange,
}: FieldDocumentConfigProps) {
  const currentFormats = docAcceptedFormats
    ? docAcceptedFormats.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h4 className="text-sm font-medium">Configuration du document</h4>
      <div className="flex items-center gap-2">
        <Switch
          checked={docMultiple}
          onCheckedChange={onMultipleChange}
        />
        <Label>Fichiers multiples</Label>
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Taille max par fichier (Mo)</Label>
        <Input
          type="number"
          min={1}
          max={50}
          placeholder="10"
          value={docMaxSizeMb || ''}
          onChange={(e) => onMaxSizeChange(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm">Formats acceptés</Label>
        <div className="grid grid-cols-3 gap-2">
          {FORMAT_OPTIONS.map((fmt) => {
            const fmtExts = fmt.value.split(',');
            const isChecked = fmtExts.every(ext => currentFormats.includes(ext));
            return (
              <div key={fmt.value} className="flex items-center gap-2">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    let next: string[];
                    if (checked) {
                      next = [...new Set([...currentFormats, ...fmtExts])];
                    } else {
                      next = currentFormats.filter(ext => !fmtExts.includes(ext));
                    }
                    onFormatsChange(next.join(', '));
                  }}
                />
                <span className="text-sm">{fmt.label}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Décochez les formats que vous ne souhaitez pas accepter</p>
      </div>
    </div>
  );
}
