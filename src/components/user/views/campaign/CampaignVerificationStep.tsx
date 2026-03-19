import React from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Chip } from '@/components/ui/chip';
import { useT } from '@/hooks/useT';
import type { EoVerificationResult } from '@/hooks/useWorkflowRoleVerification';

interface CampaignVerificationStepProps {
  results: EoVerificationResult[];
  isLoading: boolean;
}

export function CampaignVerificationStep({
  results,
  isLoading,
}: CampaignVerificationStepProps) {
  const { t } = useT();

  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.filter(r => !r.isValid).length;
  const allValid = invalidCount === 0 && results.length > 0;

  const handleExportMissing = () => {
    const escapeCSV = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = [['Filiale', 'Code', 'Étape', 'Rôles manquants']];
    results.forEach(r => {
      if (!r.isValid) {
        r.missingByNode.forEach(node => {
          rows.push([
            escapeCSV(r.eoName),
            escapeCSV(r.eoCode || ''),
            escapeCSV(node.nodeName),
            escapeCSV(node.missingRoles.join(', ')),
          ]);
        });
      }
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verification_roles.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{t('campaigns.verification_loading')}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Summary */}
      {allValid ? (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            {t('campaigns.verification_all_valid', { count: validCount })}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex items-center justify-between">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 flex-1">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {t('campaigns.verification_missing', { valid: validCount, invalid: invalidCount })}
            </AlertDescription>
          </Alert>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 shrink-0"
            onClick={handleExportMissing}
          >
            {t('buttons.export')}
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Results table */}
      <ScrollArea className="flex-1 border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('campaigns.table_subsidiaries')}</TableHead>
              <TableHead>{t('campaigns.verification_status')}</TableHead>
              <TableHead>{t('campaigns.verification_details')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map(r => (
              <TableRow key={r.eoId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{r.eoName}</span>
                    {r.eoCode && (
                      <span className="text-xs text-muted-foreground">({r.eoCode})</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {r.isValid ? (
                    <Chip variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('campaigns.verification_ok')}
                    </Chip>
                  ) : (
                    <Chip variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                      <AlertTriangle className="h-3 w-3" />
                      {t('campaigns.verification_incomplete')}
                    </Chip>
                  )}
                </TableCell>
                <TableCell>
                  {!r.isValid && (
                    <div className="space-y-1">
                      {r.missingByNode.map((node, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          <span className="font-medium">{node.nodeName}</span>
                          {' : '}
                          <span className="text-amber-600 dark:text-amber-400">
                            {node.missingRoles.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
