import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { type MappedField, getFieldTypeLabel } from './types';

interface FieldPreviewStepProps {
  previewFields: MappedField[];
  previewErrors: string[];
  hasErrors: boolean;
  isImporting: boolean;
  importProgress: { current: number; total: number };
  onBack: () => void;
  onImport: () => void;
}

export function FieldPreviewStep({
  previewFields,
  previewErrors,
  hasErrors,
  isImporting,
  importProgress,
  onBack,
  onImport,
}: FieldPreviewStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isImporting}>
          Retour
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {previewFields.length} champ{previewFields.length > 1 ? 's' : ''} à importer
        </span>
      </div>

      {/* Errors */}
      {previewErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreurs détectées</AlertTitle>
          <AlertDescription>
            <ScrollArea className="h-24 mt-2">
              <ul className="list-disc pl-4 space-y-1">
                {previewErrors.map((error, i) => (
                  <li key={i} className="text-sm">{error}</li>
                ))}
              </ul>
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}

      {/* Import Progress */}
      {isImporting && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Import en cours...</AlertTitle>
          <AlertDescription>
            {importProgress.current} / {importProgress.total} champs traités
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      {previewFields.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Requis</TableHead>
              <TableHead className="text-center">Lecture seule</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewFields.map((field, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{field.name}</TableCell>
                <TableCell>
                  <Chip variant="default" className="text-xs">
                    {getFieldTypeLabel(field.field_type)}
                  </Chip>
                </TableCell>
                <TableCell className="text-center">
                  {field.is_required ? (
                    <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {field.is_readonly ? (
                    <CheckCircle2 className="h-4 w-4 text-warning mx-auto" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {field.description || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {previewFields.length === 0 && !hasErrors && (
        <div className="text-center py-8 text-muted-foreground">
          <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun champ valide détecté</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onImport}
          disabled={hasErrors || isImporting || previewFields.length === 0}
        >
          {isImporting ? (
            <>
              Import en cours...
              <Loader2 className="h-4 w-4 animate-spin" />
            </>
          ) : (
            <>
              Importer {previewFields.length} champ{previewFields.length > 1 ? 's' : ''}
              <CheckCircle2 className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
