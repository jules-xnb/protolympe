import type { ColumnDef } from '@tanstack/react-table';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/DataTable';
import { AlertTriangle, Plus } from 'lucide-react';
import { EoFieldQuickCreateForm } from '../EoFieldQuickCreateForm';
import type { ParsedRow, FieldOption } from './types';

interface ValidationResult {
  errors: number;
  total: number;
  samples: string[];
}

interface EoMappingStepProps {
  clientId: string;
  csvHeaders: string[];
  csvData: ParsedRow[];
  mapping: Record<string, string>;
  allFields: FieldOption[];
  usedDbFields: Set<string>;
  validationResults: Record<string, ValidationResult>;
  totalValidationErrors: number;
  showFieldForm: boolean;
  onShowFieldFormChange: (show: boolean) => void;
  onMappingChange: (csvColumn: string, dbField: string) => void;
}

type MappingRow = { header: string };

export function EoMappingStep({
  clientId,
  csvHeaders,
  csvData,
  mapping,
  allFields,
  usedDbFields,
  validationResults,
  totalValidationErrors,
  showFieldForm,
  onShowFieldFormChange,
  onMappingChange,
}: EoMappingStepProps) {
  const firstRow = csvData[0] || {};

  const columns: ColumnDef<MappingRow>[] = [
    {
      accessorKey: 'header',
      header: 'Colonne CSV',
      cell: ({ row }) => {
        const validation = validationResults[row.original.header];
        return (
          <div className="flex items-center gap-2 font-medium">
            {row.original.header}
            {validation && (
              <Chip variant="error" className="text-xs">
                {validation.errors} erreur{validation.errors > 1 ? 's' : ''}
              </Chip>
            )}
          </div>
        );
      },
    },
    {
      id: 'preview',
      header: 'Aperçu',
      cell: ({ row }) => {
        const validation = validationResults[row.original.header];
        const sampleValue = firstRow[row.original.header] || '';
        return (
          <div className="text-sm max-w-[200px]">
            <div className="truncate text-muted-foreground">{sampleValue || '—'}</div>
            {validation && (
              <div className="text-xs text-destructive mt-1" title={validation.samples.join(', ')}>
                Ex: {validation.samples.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'target',
      header: 'Champ base de données',
      cell: ({ row }) => {
        const header = row.original.header;
        const mappedField = mapping[header] || '';
        const validation = validationResults[header];
        const isUnmapped = !mappedField;
        const borderClass = validation ? 'border-destructive' : isUnmapped ? 'border-orange-600' : '';

        return (
          <Select
            value={mappedField || '__none__'}
            onValueChange={(value) => onMappingChange(header, value)}
          >
            <SelectTrigger className={`w-full ${borderClass}`}>
              <SelectValue placeholder="Ne pas importer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">Ne pas importer</span>
              </SelectItem>
              {allFields.map(fieldOption => {
                const isCurrentlyMapped = mappedField === fieldOption.id;
                const isUsedElsewhere = usedDbFields.has(fieldOption.id) && !isCurrentlyMapped;
                return (
                  <SelectItem
                    key={fieldOption.id}
                    value={fieldOption.id}
                    disabled={isUsedElsewhere}
                  >
                    <span className="flex items-center gap-1">
                      {fieldOption.label}
                      {fieldOption.required && <span className="text-destructive">*</span>}
                      {fieldOption.isCustom && (
                        <Chip variant="outline" className="ml-1 text-xs py-0">Personnalisé</Chip>
                      )}
                      {isUsedElsewhere && (
                        <span className="text-muted-foreground text-xs ml-1">(déjà mappé)</span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );
      },
    },
  ];

  const tableData: MappingRow[] = csvHeaders.map(header => ({ header }));

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4 py-4">
        {/* Quick create custom field form */}
        {showFieldForm ? (
          <EoFieldQuickCreateForm
            clientId={clientId}
            onSuccess={() => onShowFieldFormChange(false)}
            onCancel={() => onShowFieldFormChange(false)}
          />
        ) : (
          <div className="flex items-center justify-between">
            <Alert className="flex-1">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Mappez les colonnes</AlertTitle>
              <AlertDescription>
                Associez chaque colonne du CSV à un champ de la base de données.
                Les champs "Code" et "Nom" sont obligatoires.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              size="sm"
              className="ml-3 shrink-0"
              onClick={() => onShowFieldFormChange(true)}
            >
              Créer un champ
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        <DataTable
          columns={columns}
          data={tableData}
          hideSearch
          hidePagination
          hideColumnSelector
          getRowClassName={(row) => validationResults[row.header] ? 'bg-destructive/5' : ''}
        />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {csvData.length} lignes détectées dans le fichier
          </span>
          {totalValidationErrors > 0 && (
            <span className="text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {totalValidationErrors} valeur{totalValidationErrors > 1 ? 's' : ''} invalide{totalValidationErrors > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
