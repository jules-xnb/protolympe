import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import type { ParsedRow } from './types';

interface FieldMappingStepProps {
  csvHeaders: string[];
  csvData: ParsedRow[];
  mapping: Record<string, string>;
  allFields: { id: string; label: string; required: boolean }[];
  usedDbFields: Set<string>;
  canProceedToPreview: boolean;
  onMappingChange: (csvColumn: string, dbField: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function FieldMappingStep({
  csvHeaders,
  csvData,
  mapping,
  allFields,
  usedDbFields,
  canProceedToPreview,
  onMappingChange,
  onBack,
  onNext,
}: FieldMappingStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Retour
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {csvData.length} ligne{csvData.length > 1 ? 's' : ''} détectée{csvData.length > 1 ? 's' : ''}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Colonne CSV</TableHead>
            <TableHead>Aperçu</TableHead>
            <TableHead>Champ cible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {csvHeaders.map((header) => (
            <TableRow key={header}>
              <TableCell className="font-mono text-sm">{header}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                {csvData[0]?.[header] || '—'}
              </TableCell>
              <TableCell>
                <Select
                  value={mapping[header] || '__none__'}
                  onValueChange={(value) => onMappingChange(header, value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Ignorer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ignorer cette colonne</SelectItem>
                    {allFields.map((field) => (
                      <SelectItem
                        key={field.id}
                        value={field.id}
                        disabled={usedDbFields.has(field.id) && mapping[header] !== field.id}
                      >
                        {field.label}
                        {field.required && ' *'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceedToPreview}>
          Suivant
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
