import { useMemo } from 'react';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowRight, XCircle } from 'lucide-react';
import type { ImportFieldDefinition, FieldMapping, ParsedRow } from './types';

interface MappingStepProps {
  csvHeaders: string[];
  csvData: ParsedRow[];
  fields: ImportFieldDefinition[];
  mapping: FieldMapping;
  onMappingChange: (mapping: FieldMapping) => void;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
}

export function MappingStep({
  csvHeaders,
  csvData,
  fields,
  mapping,
  onMappingChange,
  onBack,
  onNext,
  canProceed,
}: MappingStepProps) {
  const usedFields = useMemo(() => new Set(Object.values(mapping)), [mapping]);

  const handleMappingChange = (csvColumn: string, fieldId: string) => {
    const newMapping = { ...mapping };
    delete newMapping[csvColumn];
    if (fieldId !== '__none__') {
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === fieldId) delete newMapping[key];
      });
      newMapping[csvColumn] = fieldId;
    }
    onMappingChange(newMapping);
  };

  const firstRow = csvData[0] || {};

  type MappingRow = { header: string };

  const columns: ColumnDef<MappingRow>[] = [
    {
      accessorKey: 'header',
      header: 'Colonne CSV',
      cell: ({ row }) => <span className="font-medium">{row.original.header}</span>,
    },
    {
      id: 'target',
      header: 'Champ cible',
      cell: ({ row }) => (
        <Select
          value={mapping[row.original.header] || '__none__'}
          onValueChange={(value) => handleMappingChange(row.original.header, value)}
        >
          <SelectTrigger className={`w-full ${!(mapping[row.original.header]) ? 'border-orange-600' : ''}`}>
            <SelectValue placeholder="Ignorer cette colonne" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Ignorer —</SelectItem>
            {fields.map((field) => (
              <SelectItem
                key={field.id}
                value={field.id}
                disabled={usedFields.has(field.id) && mapping[row.original.header] !== field.id}
              >
                {field.label}{field.required ? ' *' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'preview',
      header: 'Aperçu',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm max-w-[200px] truncate block">
          {firstRow[row.original.header] || '—'}
        </span>
      ),
    },
  ];

  const tableData: MappingRow[] = csvHeaders.map(header => ({ header }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium">Mapping des colonnes</h3>
            <Chip variant="primary">{csvData.length} lignes détectées</Chip>
          </div>
          <Button variant="outline" size="sm" onClick={onBack} className="border-destructive hover:bg-destructive/10">
            Annuler l'import
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Associez chaque colonne de votre CSV au champ correspondant
        </p>
      </div>

      <DataTable
        columns={columns}
        data={tableData}
        hideSearch
        hidePagination
        hideColumnSelector
      />

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          Suivant
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
