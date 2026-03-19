import { useState, useRef, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileInput } from '@/components/ui/file-input';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV, parseXLSX } from '@/lib/csv-parser';
import type { ParsedCSV } from './types';

interface UploadStepProps {
  onFileLoaded: (parsed: ParsedCSV) => void;
  templateContent?: () => string;
  templateFileName?: string;
  renderExtra?: () => React.ReactNode;
}

export function UploadStep({
  onFileLoaded,
  templateContent,
  templateFileName,
  renderExtra,
}: UploadStepProps) {
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
      if (/\.(csv|txt|xlsx|xls)$/i.test(file.name)) {
        processFile(file);
      } else {
        toast.error('Veuillez sélectionner un fichier CSV ou Excel');
      }
    }
  };

  const processFile = (file: File) => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = isExcel
        ? parseXLSX(e.target?.result as ArrayBuffer)
        : parseCSV(e.target?.result as string);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error('Le fichier est vide ou invalide');
        return;
      }
      onFileLoaded(parsed);
    };
    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    if (!templateContent) return;
    const blob = new Blob([templateContent()], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = templateFileName || 'template.csv';
    link.click();
  };

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition-colors w-full max-w-2xl ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-lg font-medium mb-2">
          Glissez-déposez votre fichier ici
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          ou cliquez pour parcourir vos fichiers
        </p>
        <Button variant="outline" type="button">
          Sélectionner un fichier
        </Button>
        <FileInput
          ref={fileInputRef}
          accept=".csv,.txt,.xlsx,.xls"
          onChange={processFile}
        />
      </div>
      <div className="w-full max-w-2xl space-y-4 mt-4">
        <p className="text-xs text-muted-foreground">
          Formats acceptés : CSV, Excel (.xlsx)
        </p>
        {templateContent && (
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={handleDownloadTemplate}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Template CSV</p>
                <p className="text-xs text-muted-foreground">Télécharger le modèle d'import</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        )}
        {renderExtra?.()}
      </div>
    </div>
  );
}
